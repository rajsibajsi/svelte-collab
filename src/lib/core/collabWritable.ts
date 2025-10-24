import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import type {
	CollabOptions,
	CollabStore,
	ConnectionState,
	StoreState,
} from "./types.js";
import {
	createLogger,
	deepClone,
	generateUserColor,
	generateUserId,
	ymapToObject,
} from "./utils.js";

/**
 * Creates a collaborative Svelte store backed by Y.js
 *
 * @example
 * ```ts
 * const store = collabWritable({ count: 0 }, {
 *   room: 'my-room',
 *   serverUrl: 'ws://localhost:1234'
 * });
 *
 * // Use like a regular Svelte store
 * $store = { count: 1 };
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic object store requires flexible typing
export function collabWritable<T extends Record<string, any>>(
	initialValue: T,
	options: CollabOptions,
): CollabStore<T> {
	// Validate options
	if (!options.room) {
		throw new Error("collabWritable: room option is required");
	}

	// Set defaults
	const opts: Required<CollabOptions> = {
		room: options.room,
		serverUrl: options.serverUrl || "",
		persist: options.persist !== false,
		user: options.user || {
			id: generateUserId(),
			name: "Anonymous",
			color: generateUserColor(),
		},
		ydoc: options.ydoc || new Y.Doc(),
		stateName: options.stateName || "state",
		connectTimeout: options.connectTimeout || 5000,
		debug: options.debug || false,
	};

	// Ensure user has an ID
	if (!opts.user.id) {
		opts.user.id = generateUserId();
	}

	const logger = createLogger("collabWritable", opts.debug);

	// Initialize state
	const state: StoreState<T> = {
		value: deepClone(initialValue),
		ydoc: opts.ydoc,
		ymap: opts.ydoc.getMap(opts.stateName),
		providers: {},
		connectionState: {
			status: "disconnected",
		},
		options: opts,
		subscribers: new Set(),
		connectionSubscribers: new Set(),
		destroyed: false,
	};

	logger.log("Creating store for room:", opts.room);

	// Initialize Y.Map with initial value if empty
	if (state.ymap.size === 0) {
		logger.log("Initializing Y.Map with initial value");
		state.ydoc.transact(() => {
			Object.entries(initialValue).forEach(([key, value]) => {
				state.ymap.set(key, value);
			});
		});
	} else {
		// Load existing value from Y.Map
		logger.log("Loading existing value from Y.Map");
		state.value = ymapToObject(state.ymap) as T;
	}

	// Set up Y.Map observer to update Svelte state
	const observer = () => {
		if (state.destroyed) return;

		const newValue = ymapToObject(state.ymap) as T;
		state.value = newValue;

		// Notify all subscribers
		state.subscribers.forEach((subscriber) => {
			try {
				subscriber(deepClone(newValue));
			} catch (error) {
				logger.error("Error in subscriber:", error);
			}
		});
	};

	state.ymap.observe(observer);

	// Initialize providers
	function initializeProviders() {
		// IndexedDB persistence (browser only)
		if (opts.persist && typeof indexedDB !== "undefined") {
			try {
				logger.log("Initializing IndexedDB persistence");
				state.providers.indexeddb = new IndexeddbPersistence(
					opts.room,
					state.ydoc,
				);

				state.providers.indexeddb.on("synced", () => {
					logger.log("IndexedDB synced");
					// Update value from persisted state
					state.value = ymapToObject(state.ymap) as T;
					state.subscribers.forEach((sub) => {
						sub(deepClone(state.value));
					});
				});
			} catch (error) {
				logger.error("Failed to initialize IndexedDB:", error);
			}
		}

		// WebSocket provider
		if (opts.serverUrl) {
			try {
				logger.log("Connecting to WebSocket server:", opts.serverUrl);
				updateConnectionState({ status: "connecting" });

				state.providers.websocket = new WebsocketProvider(
					opts.serverUrl,
					opts.room,
					state.ydoc,
					{
						connect: true,
					},
				);

				// Connection event handlers
				state.providers.websocket.on("status", (event: { status: string }) => {
					logger.log("WebSocket status event:", event);

					if (event.status === "connected") {
						updateConnectionState({
							status: "connected",
							lastConnected: new Date(),
						});
					} else if (event.status === "disconnected") {
						updateConnectionState({ status: "disconnected" });
					} else if (event.status === "connecting") {
						updateConnectionState({ status: "connecting" });
					}
				});

				state.providers.websocket.on("sync", (isSynced: boolean) => {
					logger.log("WebSocket sync:", isSynced);
					if (isSynced) {
						// Update connection state when synced
						updateConnectionState({
							status: "connected",
							lastConnected: new Date(),
						});
						// Update value after sync
						state.value = ymapToObject(state.ymap) as T;
						state.subscribers.forEach((sub) => {
							sub(deepClone(state.value));
						});
					}
				});

				// biome-ignore lint/suspicious/noExplicitAny: WebSocket error event type is not well-defined
				state.providers.websocket.on("connection-error", (event: any) => {
					logger.error("WebSocket connection error:", event);
					updateConnectionState({
						status: "error",
						error:
							event instanceof Error ? event : new Error("Connection error"),
					});
				});
			} catch (error) {
				logger.error("Failed to initialize WebSocket provider:", error);
				updateConnectionState({
					status: "error",
					error: error as Error,
				});
			}
		}
	}

	// Helper to update connection state
	function updateConnectionState(update: Partial<ConnectionState>) {
		state.connectionState = { ...state.connectionState, ...update };
		logger.log("Connection state updated:", state.connectionState);

		// Notify all connection subscribers
		state.connectionSubscribers.forEach((subscriber) => {
			try {
				subscriber({ ...state.connectionState });
			} catch (error) {
				logger.error("Error in connection subscriber:", error);
			}
		});
	}

	// Start providers
	initializeProviders();

	// Store interface
	const store: CollabStore<T> = {
		subscribe(run: (value: T) => void) {
			// Immediately call with current value
			run(deepClone(state.value));

			// Add to subscribers
			state.subscribers.add(run);

			// Return unsubscribe function
			return () => {
				state.subscribers.delete(run);
			};
		},

		// Connection state as a readable store
		connectionState: {
			subscribe(run: (connectionState: ConnectionState) => void) {
				// Immediately call with current state
				run({ ...state.connectionState });

				// Add to subscribers
				state.connectionSubscribers.add(run);

				// Return unsubscribe function
				return () => {
					state.connectionSubscribers.delete(run);
				};
			},
		},

		set(value: T) {
			if (state.destroyed) {
				if (opts.debug) {
					logger.warn("Cannot set value on destroyed store");
				}
				return;
			}

			logger.log("Setting value:", value);

			state.ydoc.transact(() => {
				// Clear existing keys
				const existingKeys = Array.from(state.ymap.keys());
				existingKeys.forEach((key) => {
					if (!(key in value)) {
						state.ymap.delete(key);
					}
				});

				// Set new values
				Object.entries(value).forEach(([key, val]) => {
					state.ymap.set(key, val);
				});
			});
		},

		update(updater: (value: T) => T) {
			if (state.destroyed) {
				if (opts.debug) {
					logger.warn("Cannot update value on destroyed store");
				}
				return;
			}

			const currentValue = deepClone(state.value);
			const newValue = updater(currentValue);
			store.set(newValue);
		},

		getDoc() {
			return state.ydoc;
		},

		getYMap() {
			return state.ymap;
		},

		connect() {
			if (
				state.providers.websocket &&
				!state.providers.websocket.shouldConnect
			) {
				logger.log("Connecting WebSocket provider");
				state.providers.websocket.connect();
			}
		},

		disconnect() {
			if (state.providers.websocket?.shouldConnect) {
				logger.log("Disconnecting WebSocket provider");
				state.providers.websocket.disconnect();
				updateConnectionState({ status: "disconnected" });
			}
		},

		destroy() {
			if (state.destroyed) return;

			logger.log("Destroying store");
			state.destroyed = true;

			// Unobserve Y.Map
			state.ymap.unobserve(observer);

			// Destroy providers
			if (state.providers.websocket) {
				state.providers.websocket.destroy();
			}
			if (state.providers.indexeddb) {
				state.providers.indexeddb.destroy();
			}

			// Clear subscribers
			state.subscribers.clear();
			state.connectionSubscribers.clear();

			logger.log("Store destroyed");
		},
	};

	return store;
}
