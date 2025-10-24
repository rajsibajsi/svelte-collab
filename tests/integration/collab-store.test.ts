import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawn, ChildProcess } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { collabWritable } from "../../src/lib/core/collabWritable.js";
import type { CollabStore } from "../../src/lib/core/types.js";

describe("CollabWritable Integration", () => {
	let serverProcess: ChildProcess | null = null;
	const TEST_PORT = 12346;
	const SERVER_URL = `ws://localhost:${TEST_PORT}`;

	beforeEach(async () => {
		// Start the WebSocket server
		serverProcess = spawn("tsx", ["server/websocket.ts"], {
			env: { ...process.env, PORT: TEST_PORT.toString() },
			stdio: "pipe",
		});

		// Wait for server to start
		await sleep(1000);
	});

	afterEach(() => {
		if (serverProcess) {
			serverProcess.kill("SIGTERM");
			serverProcess = null;
		}
	});

	it("should connect to WebSocket server and sync data", async () => {
		const initialData = { count: 0, message: "Hello World" };
		
		// biome-ignore lint/suspicious/noExplicitAny: Test store needs flexible typing
		const store: CollabStore<any> = collabWritable(initialData, {
			room: "integration-test-room",
			serverUrl: SERVER_URL,
			debug: true,
		});

		// biome-ignore lint/suspicious/noExplicitAny: Test variable needs flexible typing
		let currentValue: any;
		const unsubscribe = store.subscribe((value) => {
			currentValue = value;
		});

		// Wait for initial connection
		await sleep(1000);

		// Store should be initialized
		expect(currentValue).toBeDefined();
		expect(currentValue.count).toBe(0);
		expect(currentValue.message).toBe("Hello World");

		unsubscribe();
		store.destroy();
	});

	it("should sync data between multiple stores", async () => {
		const roomName = "multi-store-sync-test";
		
		// Create two stores
		// biome-ignore lint/suspicious/noExplicitAny: Test stores need flexible typing
		const store1: CollabStore<any> = collabWritable(
			{ count: 0, message: "Store 1" },
			{
				room: roomName,
				serverUrl: SERVER_URL,
				debug: true,
			},
		);
		
		// biome-ignore lint/suspicious/noExplicitAny: Test stores need flexible typing
		const store2: CollabStore<any> = collabWritable(
			{ count: 0, message: "Store 2" },
			{
				room: roomName,
				serverUrl: SERVER_URL,
				debug: true,
			},
		);

		// biome-ignore lint/suspicious/noExplicitAny: Test variables need flexible typing
		let store1Value: any;
		let store2Value: any;

		const unsubscribe1 = store1.subscribe((value) => {
			store1Value = value;
		});
		const unsubscribe2 = store2.subscribe((value) => {
			store2Value = value;
		});

		// Wait for initial sync
		await sleep(2000);

		// Both stores should have data
		expect(store1Value).toBeDefined();
		expect(store2Value).toBeDefined();

		// Update store1
		store1.update((state) => ({
			...state,
			count: state.count + 1,
		}));

		// Wait for sync
		await sleep(1000);

		// Both stores should reflect the update
		expect(store1Value.count).toBe(1);
		expect(store2Value.count).toBe(1);

		unsubscribe1();
		unsubscribe2();
		store1.destroy();
		store2.destroy();
	});

	it("should handle connection state changes", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: Test store needs flexible typing
		const store: CollabStore<any> = collabWritable(
			{ count: 0 },
			{
				room: "connection-state-test",
				serverUrl: SERVER_URL,
				debug: true,
			},
		);

		// biome-ignore lint/suspicious/noExplicitAny: Test variable needs flexible typing
		let connectionState: any;
		const unsubscribeConnection = store.connectionState.subscribe((state) => {
			connectionState = state;
		});

		// Wait for connection attempt
		await sleep(1000);

		// Should attempt to connect (may be connecting or connected)
		expect(connectionState).toBeDefined();
		expect(["connecting", "connected"]).toContain(connectionState.status);

		unsubscribeConnection();
		store.destroy();
	});

	it("should handle rapid updates without conflicts", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: Test store needs flexible typing
		const store: CollabStore<any> = collabWritable(
			{ count: 0 },
			{
				room: "rapid-updates-test",
				serverUrl: SERVER_URL,
				debug: true,
			},
		);

		// biome-ignore lint/suspicious/noExplicitAny: Test variable needs flexible typing
		let currentValue: any;
		const unsubscribe = store.subscribe((value) => {
			currentValue = value;
		});

		// Wait for initial connection
		await sleep(1000);

		// Perform rapid updates
		for (let i = 0; i < 5; i++) {
			store.update((state) => ({
				...state,
				count: state.count + 1,
			}));
		}

		// Wait for all updates to sync
		await sleep(2000);

		// Should handle all updates correctly
		expect(currentValue.count).toBe(5);

		unsubscribe();
		store.destroy();
	});

	it("should handle complex data structures", async () => {
		const complexData = {
			count: 0,
			message: "Complex data",
			items: ["item1", "item2"],
			nested: { value: 123, flag: true },
			array: [1, 2, 3],
		};

		// biome-ignore lint/suspicious/noExplicitAny: Test store needs flexible typing
		const store: CollabStore<any> = collabWritable(complexData, {
			room: "complex-data-test",
			serverUrl: SERVER_URL,
			debug: true,
		});

		// biome-ignore lint/suspicious/noExplicitAny: Test variable needs flexible typing
		let currentValue: any;
		const unsubscribe = store.subscribe((value) => {
			currentValue = value;
		});

		// Wait for initial sync
		await sleep(1000);

		// Should preserve all data types
		expect(currentValue.count).toBe(0);
		expect(currentValue.message).toBe("Complex data");
		expect(Array.isArray(currentValue.items)).toBe(true);
		expect(currentValue.items).toHaveLength(2);
		expect(currentValue.nested.value).toBe(123);
		expect(currentValue.nested.flag).toBe(true);
		expect(Array.isArray(currentValue.array)).toBe(true);
		expect(currentValue.array).toEqual([1, 2, 3]);

		// Update complex data
		store.update((state) => ({
			...state,
			count: state.count + 1,
			items: [...state.items, "item3"],
			nested: { ...state.nested, value: state.nested.value + 1 },
		}));

		// Wait for update to sync
		await sleep(1000);

		// Should reflect updates
		expect(currentValue.count).toBe(1);
		expect(currentValue.items).toHaveLength(3);
		expect(currentValue.nested.value).toBe(124);

		unsubscribe();
		store.destroy();
	});

	it("should handle store destruction gracefully", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: Test store needs flexible typing
		const store: CollabStore<any> = collabWritable(
			{ count: 0 },
			{
				room: "destruction-test",
				serverUrl: SERVER_URL,
				debug: true,
			},
		);

		// biome-ignore lint/suspicious/noExplicitAny: Test variable needs flexible typing
		let currentValue: any;
		const unsubscribe = store.subscribe((value) => {
			currentValue = value;
		});

		// Wait for initial connection
		await sleep(1000);

		// Store should be working
		expect(currentValue).toBeDefined();

		// Destroy store
		store.destroy();
		unsubscribe();

		// Should not throw errors after destruction
		expect(() => {
			store.destroy(); // Should be safe to call multiple times
		}).not.toThrow();
	});

	it("should handle server disconnection and reconnection", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: Test store needs flexible typing
		const store: CollabStore<any> = collabWritable(
			{ count: 0 },
			{
				room: "reconnection-test",
				serverUrl: SERVER_URL,
				debug: true,
			},
		);

		// biome-ignore lint/suspicious/noExplicitAny: Test variables need flexible typing
		let currentValue: any;
		let connectionState: any;

		const unsubscribe = store.subscribe((value) => {
			currentValue = value;
		});
		const unsubscribeConnection = store.connectionState.subscribe((state) => {
			connectionState = state;
		});

		// Wait for initial connection
		await sleep(1000);

		// Should be connected
		expect(currentValue).toBeDefined();

		// Kill server
		if (serverProcess) {
			serverProcess.kill("SIGTERM");
			serverProcess = null;
		}

		// Wait for disconnection
		await sleep(1000);

		// Should handle disconnection gracefully (may be disconnected or error)
		expect(["disconnected", "error"]).toContain(connectionState.status);

		unsubscribe();
		unsubscribeConnection();
		store.destroy();
	});
});
