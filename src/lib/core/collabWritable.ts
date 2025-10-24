import { IndexeddbPersistence } from "y-indexeddb";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import type {
	CollabOptions,
	CollabStore,
	ConnectionState,
	StoreState,
	UserInfo,
} from "./types.js";
import {
	createLogger,
	deepClone,
	generateUserColor,
	generateUserId,
	ymapToObject,
} from "./utils.js";

/**
 * Validate that a value doesn't contain NaN or other invalid values
 */
function isValidValue(value: unknown): boolean {
	if (value === null || value === undefined) return true;
	if (typeof value === "number" && Number.isNaN(value)) return false;
	if (typeof value === "object" && value !== null) {
		if (Array.isArray(value)) {
			return value.every(isValidValue);
		}
		return Object.values(value).every(isValidValue);
	}
	return true;
}

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
export function collabWritable<T extends Record<string, unknown>>(
	initialValue: T,
	options: CollabOptions,
): CollabStore<T> {
	// Validate options
	if (!options.room) {
		throw new Error("collabWritable: room option is required");
	}

	const user: UserInfo = options.user || {
		id: generateUserId(),
		name: "Anonymous",
		color: generateUserColor(),
	};

	// Set defaults
	const opts: Required<CollabOptions> = {
		room: options.room,
		serverUrl: options.serverUrl || "",
		persist: options.persist !== false,
		user: user,
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
	// Only initialize if the map is truly empty (no existing data)
	const initializeYMap = () => {
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
	};

	// Initialize immediately if no WebSocket provider
	if (!opts.serverUrl) {
		initializeYMap();
	}

	// Set up Y.Map observer to update Svelte state
	const observer = () => {
		if (state.destroyed) return;

		logger.log("Y.Map observer triggered");
		const newValue = ymapToObject(state.ymap) as T;
		logger.log("New value from Y.Map:", newValue);

		// Validate the new value before updating
		if (isValidValue(newValue)) {
			logger.log("Value is valid, updating state");
			state.value = newValue;

			// Notify all subscribers
			state.subscribers.forEach((subscriber) => {
				try {
					logger.log("Notifying subscriber with value:", deepClone(newValue));
					subscriber(deepClone(newValue));
				} catch (error) {
					logger.error("Error in subscriber:", error);
				}
			});
		} else {
			logger.warn(
				"Invalid value from Y.Map observer, keeping current value:",
				newValue,
			);
		}
	};

	state.ymap.observe(observer);

	// Also observe the Y.Doc for changes
	state.ydoc.on("update", () => {
		logger.log("Y.Doc update event triggered");
		// Trigger the observer manually to ensure it runs
		observer();
	});

	// Initialize providers
	function initializeProviders() {
		// IndexedDB persistence (browser only)
		// Check if IndexedDB is available and working
		const isIndexedDBAvailable =
			opts.persist &&
			typeof indexedDB !== "undefined" &&
			!window.location.href.includes("chrome://") && // Avoid chrome:// URLs
			!window.location.href.includes("about:"); // Avoid about: URLs

		if (isIndexedDBAvailable) {
			try {
				logger.log("Initializing IndexedDB persistence");
				state.providers.indexeddb = new IndexeddbPersistence(
					opts.room,
					state.ydoc,
				);

				state.providers.indexeddb.on("synced", () => {
					logger.log("IndexedDB synced");
					// Update value from persisted state
					const persistedValue = ymapToObject(state.ymap) as T;
					// Validate the persisted value to prevent NaN issues
					if (isValidValue(persistedValue)) {
						state.value = persistedValue;
						state.subscribers.forEach((sub) => {
							sub(deepClone(state.value));
						});
					} else {
						logger.warn("Invalid persisted value, using current value");
					}
				});

				// Handle IndexedDB errors gracefully
				state.providers.indexeddb.on("error", (error: Error) => {
					logger.error("IndexedDB error:", error);
					// Continue without persistence
				});
			} catch (error) {
				logger.error("Failed to initialize IndexedDB:", error);
				// Continue without persistence
			}
		} else if (opts.persist) {
			logger.warn(
				"IndexedDB not available (incognito mode or restricted environment), continuing without persistence",
			);
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

						// Only initialize if the map is still empty after sync
						// This prevents overwriting existing data from other clients
						if (state.ymap.size === 0) {
							logger.log(
								"Y.Map is empty after sync, initializing with default values",
							);
							initializeYMap();
						} else {
							logger.log("Y.Map has existing data after sync, loading it");
							state.value = ymapToObject(state.ymap) as T;
						}

						// Update value after sync with validation
						const syncedValue = ymapToObject(state.ymap) as T;
						if (isValidValue(syncedValue)) {
							state.value = syncedValue;
							state.subscribers.forEach((sub) => {
								sub(deepClone(state.value));
							});
						} else {
							logger.warn("Invalid synced value, keeping current value");
						}
					}
				});

				state.providers.websocket.on("connection-error", (event: unknown) => {
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
				logger.log("Inside Y.js transaction");
				// Clear existing keys
				const existingKeys = Array.from(state.ymap.keys());
				logger.log("Existing keys:", existingKeys);
				existingKeys.forEach((key) => {
					if (!(key in value)) {
						logger.log("Deleting key:", key);
						state.ymap.delete(key);
					}
				});

				// Set new values
				Object.entries(value).forEach(([key, val]) => {
					logger.log(`Setting key ${key} to value:`, val);
					state.ymap.set(key, val);
				});
			});

			logger.log("Y.js transaction completed");
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
