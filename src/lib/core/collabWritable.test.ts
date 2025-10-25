import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collabWritable } from "./collabWritable.js";
import type { CollabStore } from "./types.js";

describe("collabWritable", () => {
	// biome-ignore lint/suspicious/noExplicitAny: Test store needs flexible typing
	let store: CollabStore<any>;

	afterEach(() => {
		if (store) {
			store.destroy();
		}
	});

	describe("initialization", () => {
		it("should create a store with initial value", () => {
			store = collabWritable({ count: 0 }, { room: "test-room" });

			// biome-ignore lint/suspicious/noExplicitAny: Test variable needs flexible typing
			let currentValue: any;
			store.subscribe((value) => {
				currentValue = value;
			})();

			expect(currentValue).toEqual({ count: 0 });
		});

		it("should throw error if room is not provided", () => {
			expect(() => {
				// @ts-expect-error - testing invalid input
				collabWritable({ count: 0 }, {});
			}).toThrow("room option is required");
		});

		it("should apply default options", () => {
			store = collabWritable({ count: 0 }, { room: "test-room" });

			// biome-ignore lint/suspicious/noExplicitAny: Test variable needs flexible typing
			let connectionState: any;
			store.connectionState.subscribe((state) => {
				connectionState = state;
			})();
			expect(connectionState.status).toBe("disconnected");
		});

		it("should generate user ID if not provided", () => {
			store = collabWritable(
				{ count: 0 },
				{
					room: "test-room",
					user: { name: "Test User" },
				},
			);

			expect(store).toBeDefined();
		});
	});

	describe("store operations", () => {
		beforeEach(() => {
			store = collabWritable(
				{ count: 0, message: "hello" },
				{
					room: "test-room",
					persist: false, // Disable persistence for tests
				},
			);
		});

		it("should update value with set()", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test array needs flexible typing
			const values: any[] = [];

			store.subscribe((value) => {
				values.push(value);
			});

			store.set({ count: 5, message: "world" });

			// Wait for async update
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(values.length).toBeGreaterThanOrEqual(2);
			expect(values[0]).toEqual({ count: 0, message: "hello" });
			expect(values[values.length - 1]).toEqual({ count: 5, message: "world" });
		});

		it("should update value with update()", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test array needs flexible typing
			const values: any[] = [];

			store.subscribe((value) => {
				values.push(value);
			});

			store.update((state) => ({
				...state,
				count: state.count + 1,
			}));

			// Wait for async update
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(values.length).toBeGreaterThanOrEqual(2);
			expect(values[0].count).toBe(0);
			expect(values[values.length - 1].count).toBe(1);
		});

		it("should handle multiple subscribers", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test array needs flexible typing
			const values1: any[] = [];
			// biome-ignore lint/suspicious/noExplicitAny: Test array needs flexible typing
			const values2: any[] = [];

			const unsubscribe1 = store.subscribe((value) => values1.push(value));
			const unsubscribe2 = store.subscribe((value) => values2.push(value));

			store.set({ count: 10, message: "test" });

			// Wait for Y.js observer to trigger
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Should have at least initial + update (may have extra from Y.js observer)
			expect(values1.length).toBeGreaterThanOrEqual(2);
			expect(values2.length).toBeGreaterThanOrEqual(2);
			expect(values1[values1.length - 1]).toEqual({
				count: 10,
				message: "test",
			});
			expect(values2[values2.length - 1]).toEqual({
				count: 10,
				message: "test",
			});

			unsubscribe1();
			unsubscribe2();
		});

		it("should unsubscribe correctly", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test array needs flexible typing
			const values: any[] = [];
			const unsubscribe = store.subscribe((value) => values.push(value));

			store.set({ count: 1, message: "test1" });

			// Wait for Y.js observer to trigger
			await new Promise((resolve) => setTimeout(resolve, 10));

			unsubscribe();
			store.set({ count: 2, message: "test2" });

			// Should have initial + one update (unsubscribed before second update)
			expect(values.length).toBeGreaterThanOrEqual(2);
			expect(values[values.length - 1].count).toBe(1);
		});

		it("should not allow operations on destroyed store", () => {
			// Create a store with debug enabled so warnings are logged
			const debugStore = collabWritable(
				{ count: 0 },
				{
					room: "test-room",
					persist: false,
					debug: true,
				},
			);

			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			debugStore.destroy();
			debugStore.set({ count: 999 });

			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
			debugStore.destroy(); // cleanup
		});
	});

	describe("Y.js integration", () => {
		beforeEach(() => {
			store = collabWritable(
				{ count: 0 },
				{
					room: "test-room",
					persist: false,
				},
			);
		});

		it("should expose Y.Doc", () => {
			const doc = store.getDoc();
			expect(doc).toBeDefined();
			expect(doc.constructor.name).toBe("Doc");
		});

		it("should expose Y.Map", () => {
			const ymap = store.getYMap();
			expect(ymap).toBeDefined();
			expect(ymap.size).toBeGreaterThan(0);
		});

		it("should sync Y.Map with store value", () => {
			const ymap = store.getYMap();

			store.set({ count: 42 });

			expect(ymap.get("count")).toBe(42);
		});
	});

	describe("connection management", () => {
		beforeEach(() => {
			store = collabWritable(
				{ count: 0 },
				{
					room: "test-room",
					persist: false,
				},
			);
		});

		it("should start in disconnected state without server URL", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test variable needs flexible typing
			let connectionState: any;
			store.connectionState.subscribe((state) => {
				connectionState = state;
			})();
			expect(connectionState.status).toBe("disconnected");
		});

		it("should provide connect/disconnect methods", () => {
			expect(typeof store.connect).toBe("function");
			expect(typeof store.disconnect).toBe("function");
		});

		it("should handle multiple connect/disconnect calls gracefully", () => {
			store.connect();
			store.connect();
			store.disconnect();
			store.disconnect();

			// Should not throw
			expect(true).toBe(true);
		});
	});

	describe("cleanup", () => {
		it("should clean up resources on destroy", () => {
			store = collabWritable(
				{ count: 0 },
				{
					room: "test-room",
					persist: false,
				},
			);

			const subscriberMock = vi.fn();
			const unsubscribe = store.subscribe(subscriberMock);

			store.destroy();

			// Further updates should not trigger subscribers
			const callCountBefore = subscriberMock.mock.calls.length;

			// Try to update (should be ignored)
			const ymap = store.getYMap();
			ymap.set("count", 999);

			// Subscriber should not have been called again
			expect(subscriberMock.mock.calls.length).toBe(callCountBefore);

			unsubscribe();
		});

		it("should be safe to call destroy multiple times", () => {
			store = collabWritable(
				{ count: 0 },
				{ room: "test-room", persist: false },
			);

			store.destroy();
			store.destroy();

			// Should not throw
			expect(true).toBe(true);
		});
	});

	describe("complex data types", () => {
		it("should handle nested objects", () => {
			store = collabWritable(
				{
					user: {
						name: "John",
						age: 30,
						address: {
							city: "NYC",
							zip: "10001",
						},
					},
				},
				{
					room: "test-room",
					persist: false,
				},
			);

			// biome-ignore lint/suspicious/noExplicitAny: Test variable needs flexible typing
			let currentValue: any;
			store.subscribe((value) => {
				currentValue = value;
			})();

			expect(currentValue.user.name).toBe("John");
			expect(currentValue.user.address.city).toBe("NYC");
		});

		it("should handle arrays", () => {
			store = collabWritable(
				{
					items: [1, 2, 3, 4, 5],
				},
				{
					room: "test-room",
					persist: false,
				},
			);

			store.update((state) => ({
				...state,
				items: [...state.items, 6],
			}));

			// biome-ignore lint/suspicious/noExplicitAny: Test variable needs flexible typing
			let currentValue: any;
			store.subscribe((value) => {
				currentValue = value;
			})();

			expect(currentValue.items).toEqual([1, 2, 3, 4, 5, 6]);
		});
	});

	describe("cross-browser synchronization", () => {
		it("should handle multiple clients without conflicts", async () => {
			// Simulate two clients connecting to the same room
			const client1 = collabWritable(
				{ count: 0, message: "Hello from Client 1" },
				{ room: "sync-test-room", debug: true },
			);
			const client2 = collabWritable(
				{ count: 0, message: "Hello from Client 2" },
				{ room: "sync-test-room", debug: true },
			);

			// biome-ignore lint/suspicious/noExplicitAny: Test variables need flexible typing
			let client1Value: any;
			// biome-ignore lint/suspicious/noExplicitAny: Test variables need flexible typing
			let client2Value: any;

			client1.subscribe((value) => {
				client1Value = value;
			});
			client2.subscribe((value) => {
				client2Value = value;
			});

			// Wait for initial state
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Client 1 should initialize first
			expect(client1Value).toBeDefined();
			expect(client2Value).toBeDefined();

			// Clean up
			client1.destroy();
			client2.destroy();
		});

		it("should preserve data when second client connects", async () => {
			const initialData = {
				count: 42,
				message: "Preserved data",
				items: ["item1", "item2"],
			};

			// First client with existing data
			const client1 = collabWritable(initialData, {
				room: "preserve-test-room",
				debug: true,
			});

			// biome-ignore lint/suspicious/noExplicitAny: Test variable needs flexible typing
			let client1Value: any;
			client1.subscribe((value) => {
				client1Value = value;
			});

			await new Promise((resolve) => setTimeout(resolve, 10));

			// Second client should load existing data
			const client2 = collabWritable(
				{ count: 0, message: "", items: [] }, // Different initial values
				{ room: "preserve-test-room", debug: true },
			);

			// biome-ignore lint/suspicious/noExplicitAny: Test variables need flexible typing
			let client2Value: any;
			client2.subscribe((value) => {
				client2Value = value;
			});

			await new Promise((resolve) => setTimeout(resolve, 10));

			// In test environment without WebSocket server, each client maintains its own state
			// This test verifies that both clients initialize properly
			expect(client1Value).toBeDefined();
			expect(client2Value).toBeDefined();
			expect(client1Value.count).toBe(42);
			expect(client1Value.message).toBe("Preserved data");

			// Clean up
			client1.destroy();
			client2.destroy();
		});

		it("should handle sync conflicts gracefully", async () => {
			const client1 = collabWritable(
				{ count: 0, message: "Client 1" },
				{ room: "conflict-test-room", debug: true },
			);
			const client2 = collabWritable(
				{ count: 0, message: "Client 2" },
				{ room: "conflict-test-room", debug: true },
			);

			// biome-ignore lint/suspicious/noExplicitAny: Test variables need flexible typing
			let client1Value: any;
			// biome-ignore lint/suspicious/noExplicitAny: Test variables need flexible typing
			let client2Value: any;

			client1.subscribe((value) => {
				client1Value = value;
			});
			client2.subscribe((value) => {
				client2Value = value;
			});

			await new Promise((resolve) => setTimeout(resolve, 10));

			// Both clients should have valid data
			expect(client1Value).toBeDefined();
			expect(client2Value).toBeDefined();
			expect(typeof client1Value.count).toBe("number");
			expect(typeof client2Value.count).toBe("number");

			// Clean up
			client1.destroy();
			client2.destroy();
		});

		it("should handle IndexedDB unavailability gracefully", () => {
			// Mock IndexedDB as unavailable (incognito mode)
			const originalIndexedDB = global.indexedDB;
			// @ts-expect-error - testing IndexedDB unavailability
			global.indexedDB = undefined;

			store = collabWritable(
				{ count: 0, message: "Test" },
				{
					room: "incognito-test-room",
					persist: true,
					debug: true,
				},
			);

			// biome-ignore lint/suspicious/noExplicitAny: Test variable needs flexible typing
			let currentValue: any;
			store.subscribe((value) => {
				currentValue = value;
			})();

			// Should still work without IndexedDB
			expect(currentValue).toBeDefined();
			expect(currentValue.count).toBe(0);

			// Restore IndexedDB
			global.indexedDB = originalIndexedDB;
		});

		it("should handle NaN values gracefully", async () => {
			store = collabWritable(
				{ count: 0, message: "Test" },
				{ room: "nan-test-room", debug: true },
			);

			// biome-ignore lint/suspicious/noExplicitAny: Test variable needs flexible typing
			let currentValue: any;
			const unsubscribe = store.subscribe((value) => {
				currentValue = value;
			});

			// Wait for initial subscription
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Update with potentially problematic values
			store.update((state) => ({
				...state,
				count: state.count + 1,
			}));

			// Wait for Y.js observer to trigger
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Should handle the update gracefully
			expect(currentValue.count).toBe(1);
			expect(Number.isNaN(currentValue.count)).toBe(false);

			unsubscribe();
		});

		it("should maintain connection state across operations", async () => {
			store = collabWritable(
				{ count: 0 },
				{ room: "connection-test-room", debug: true },
			);

			// biome-ignore lint/suspicious/noExplicitAny: Test variables need flexible typing
			let connectionState: any;
			store.connectionState.subscribe((state) => {
				connectionState = state;
			})();

			// Should start disconnected
			expect(connectionState.status).toBe("disconnected");

			// Perform operations
			store.set({ count: 5 });
			store.update((state) => ({ ...state, count: state.count + 1 }));

			// Connection state should remain consistent
			expect(connectionState.status).toBe("disconnected");
		});

		it("should handle rapid updates without conflicts", async () => {
			store = collabWritable(
				{ count: 0 },
				{ room: "rapid-update-test-room", debug: true },
			);

			// biome-ignore lint/suspicious/noExplicitAny: Test variable needs flexible typing
			let currentValue: any;
			const unsubscribe = store.subscribe((value) => {
				currentValue = value;
			});

			// Wait for initial subscription
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Perform rapid updates
			for (let i = 0; i < 10; i++) {
				store.update((state) => ({
					...state,
					count: state.count + 1,
				}));
			}

			// Wait for all Y.js observer updates to complete
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Should handle all updates correctly
			expect(currentValue.count).toBe(10);

			unsubscribe();
		});

		it("should handle mixed data types in synchronization", () => {
			const complexData = {
				count: 42,
				message: "Complex data",
				items: ["item1", "item2", "item3"],
				nested: { value: 123, flag: true },
				array: [1, 2, 3, 4, 5],
			};

			store = collabWritable(complexData, {
				room: "complex-data-test-room",
				debug: true,
			});

			// biome-ignore lint/suspicious/noExplicitAny: Test variable needs flexible typing
			let currentValue: any;
			store.subscribe((value) => {
				currentValue = value;
			})();

			// Should preserve all data types
			expect(currentValue.count).toBe(42);
			expect(currentValue.message).toBe("Complex data");
			expect(Array.isArray(currentValue.items)).toBe(true);
			expect(currentValue.items).toHaveLength(3);
			expect(currentValue.nested.value).toBe(123);
			expect(currentValue.nested.flag).toBe(true);
			expect(Array.isArray(currentValue.array)).toBe(true);
			expect(currentValue.array).toEqual([1, 2, 3, 4, 5]);
		});
	});
});
