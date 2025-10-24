import { describe, expect, it } from "vitest";
import {
  debounce,
  deepClone,
  deepEqual,
  generateUserColor,
  generateUserId,
  ymapToObject,
} from "./utils.js";

describe("utils", () => {
  describe("deepClone", () => {
    it("should clone primitive values", () => {
      expect(deepClone(5)).toBe(5);
      expect(deepClone("hello")).toBe("hello");
      expect(deepClone(true)).toBe(true);
      expect(deepClone(null)).toBe(null);
    });

    it("should clone arrays", () => {
      const arr = [1, 2, 3];
      const cloned = deepClone(arr);

      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
    });

    it("should clone nested objects", () => {
      const obj = {
        name: "John",
        age: 30,
        address: {
          city: "NYC",
          zip: "10001",
        },
      };

      const cloned = deepClone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.address).not.toBe(obj.address);
    });

    it("should clone dates", () => {
      const date = new Date("2024-01-01");
      const cloned = deepClone(date);

      expect(cloned.getTime()).toBe(date.getTime());
      expect(cloned).not.toBe(date);
    });

    it("should clone Maps", () => {
      const map = new Map([
        ["key1", "value1"],
        ["key2", "value2"],
      ]);
      const cloned = deepClone(map);

      expect(cloned.get("key1")).toBe("value1");
      expect(cloned).not.toBe(map);
    });

    it("should clone Sets", () => {
      const set = new Set([1, 2, 3]);
      const cloned = deepClone(set);

      expect(cloned.has(1)).toBe(true);
      expect(cloned).not.toBe(set);
    });
  });

  describe("ymapToObject", () => {
    it("should convert Map to object", () => {
      const map = new Map<string, any>([
        ["name", "Alice"],
        ["age", 25],
      ]);

      const obj = ymapToObject(map);

      expect(obj).toEqual({ name: "Alice", age: 25 });
    });

    it("should handle nested Maps", () => {
      const innerMap = new Map<string, any>([["city", "NYC"]]);
      const outerMap = new Map<string, any>([
        ["name", "Alice"],
        ["address", innerMap],
      ]);

      const obj = ymapToObject(outerMap);

      expect(obj).toEqual({
        name: "Alice",
        address: { city: "NYC" },
      });
    });
  });

  describe("deepEqual", () => {
    it("should compare primitive values", () => {
      expect(deepEqual(5, 5)).toBe(true);
      expect(deepEqual(5, 6)).toBe(false);
      expect(deepEqual("hello", "hello")).toBe(true);
      expect(deepEqual("hello", "world")).toBe(false);
    });

    it("should compare objects", () => {
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    });

    it("should compare nested objects", () => {
      const obj1 = { user: { name: "John", age: 30 } };
      const obj2 = { user: { name: "John", age: 30 } };
      const obj3 = { user: { name: "Jane", age: 30 } };

      expect(deepEqual(obj1, obj2)).toBe(true);
      expect(deepEqual(obj1, obj3)).toBe(false);
    });

    it("should compare arrays", () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it("should handle null and undefined", () => {
      expect(deepEqual(null, null)).toBe(true);
      expect(deepEqual(null, undefined)).toBe(false);
      expect(deepEqual(undefined, undefined)).toBe(true);
    });
  });

  describe("generateUserId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateUserId();
      const id2 = generateUserId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^user-/);
      expect(id2).toMatch(/^user-/);
    });

    it("should generate IDs with expected format", () => {
      const id = generateUserId();
      expect(id).toMatch(/^user-[a-z0-9]+-\d+$/);
    });
  });

  describe("generateUserColor", () => {
    it("should generate valid hex colors", () => {
      const color = generateUserColor();
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it("should generate colors from predefined palette", () => {
      const colors = new Set();

      // Generate multiple colors
      for (let i = 0; i < 20; i++) {
        colors.add(generateUserColor());
      }

      // Should be from a limited palette
      expect(colors.size).toBeLessThanOrEqual(10);
    });
  });

  describe("debounce", () => {
    it("should debounce function calls", async () => {
      let callCount = 0;
      const fn = () => callCount++;
      const debounced = debounce(fn, 50);

      // Call multiple times quickly
      debounced();
      debounced();
      debounced();

      // Should not have been called yet
      expect(callCount).toBe(0);

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Should have been called once
      expect(callCount).toBe(1);
    });

    it("should pass arguments correctly", async () => {
      let lastArgs: any[] = [];
      const fn = (...args: any[]) => {
        lastArgs = args;
      };
      const debounced = debounce(fn, 50);

      debounced(1, 2, 3);

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(lastArgs).toEqual([1, 2, 3]);
    });
  });
});
