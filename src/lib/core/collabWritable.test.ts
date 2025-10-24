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

		it("should handle multiple subscribers", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test array needs flexible typing
			const values1: any[] = [];
			// biome-ignore lint/suspicious/noExplicitAny: Test array needs flexible typing
			const values2: any[] = [];

			const unsubscribe1 = store.subscribe((value) => values1.push(value));
			const unsubscribe2 = store.subscribe((value) => values2.push(value));

			store.set({ count: 10, message: "test" });

			expect(values1.length).toBe(2); // initial + update
			expect(values2.length).toBe(2);
			expect(values1[1]).toEqual({ count: 10, message: "test" });
			expect(values2[1]).toEqual({ count: 10, message: "test" });

			unsubscribe1();
			unsubscribe2();
		});

		it("should unsubscribe correctly", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test array needs flexible typing
			const values: any[] = [];
			const unsubscribe = store.subscribe((value) => values.push(value));

			store.set({ count: 1, message: "test1" });
			unsubscribe();
			store.set({ count: 2, message: "test2" });

			expect(values.length).toBe(2); // initial + one update only
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
});
