/**
 * Utility functions for svelte-collab
 */

/**
 * Deep clone an object, handling most common types
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item)) as T;
  }

  if (obj instanceof Map) {
    const cloned = new Map();
    obj.forEach((value, key) => {
      cloned.set(key, deepClone(value));
    });
    return cloned as T;
  }

  if (obj instanceof Set) {
    const cloned = new Set();
    obj.forEach((value) => {
      cloned.add(deepClone(value));
    });
    return cloned as T;
  }

  const cloned: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Convert a Y.Map to a plain JavaScript object
 */
export function ymapToObject(ymap: any): any {
  const obj: any = {};
  ymap.forEach((value: any, key: string) => {
    obj[key] = convertYType(value);
  });
  return obj;
}

/**
 * Convert Y.js types to plain JavaScript types
 */
export function convertYType(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle Y.Map
  if (value instanceof Map) {
    return ymapToObject(value);
  }

  // Handle Y.Array
  if (
    value instanceof Array ||
    (value.toArray && typeof value.toArray === "function")
  ) {
    const arr = value.toArray ? value.toArray() : value;
    return arr.map((item: any) => convertYType(item));
  }

  // Handle plain objects
  if (typeof value === "object" && value.constructor === Object) {
    const result: any = {};
    for (const key in value) {
      result[key] = convertYType(value[key]);
    }
    return result;
  }

  // Primitive values
  return value;
}

/**
 * Deep equality check for objects
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every((key) => deepEqual(a[key], b[key]));
}

/**
 * Generate a random user ID
 */
export function generateUserId(): string {
  return `user-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
}

/**
 * Generate a random color for user presence
 */
export function generateUserColor(): string {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
    "#F8B739",
    "#52B788",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Logger utility
 */
export function createLogger(namespace: string, debug: boolean) {
  return {
    log: (...args: any[]) => {
      if (debug) console.log(`[${namespace}]`, ...args);
    },
    warn: (...args: any[]) => {
      if (debug) console.warn(`[${namespace}]`, ...args);
    },
    error: (...args: any[]) => {
      console.error(`[${namespace}]`, ...args);
    },
  };
}
