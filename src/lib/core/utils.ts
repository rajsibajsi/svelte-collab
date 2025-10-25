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

	if (Array.isArray(obj)) {
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

	// biome-ignore lint/suspicious/noExplicitAny: Generic object cloning requires any
	const cloned: any = {};
	for (const key in obj) {
		if (Object.hasOwn(obj, key)) {
			cloned[key] = deepClone(obj[key]);
		}
	}
	return cloned;
}

/**
 * Convert a Y.Map to a plain JavaScript object
 */
// biome-ignore lint/suspicious/noExplicitAny: Y.js types are dynamic and require any
export function ymapToObject(ymap: any): any {
	// biome-ignore lint/suspicious/noExplicitAny: Generic object construction requires any
	const obj: any = {};
	// biome-ignore lint/suspicious/noExplicitAny: Y.js forEach callback uses any
	ymap.forEach((value: any, key: string) => {
		const convertedValue = convertYType(value);
		// Handle NaN values by converting them to 0 for numbers
		if (typeof convertedValue === "number" && Number.isNaN(convertedValue)) {
			obj[key] = 0;
		} else {
			obj[key] = convertedValue;
		}
	});
	return obj;
}

/**
 * Convert Y.js types to plain JavaScript types
 */
// biome-ignore lint/suspicious/noExplicitAny: Y.js types are dynamic and require any
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
		Array.isArray(value) ||
		(value.toArray && typeof value.toArray === "function")
	) {
		const arr = value.toArray ? value.toArray() : value;
		// biome-ignore lint/suspicious/noExplicitAny: Y.js array items are dynamic
		return arr.map((item: any) => convertYType(item));
	}

	// Handle plain objects
	if (typeof value === "object" && value.constructor === Object) {
		// biome-ignore lint/suspicious/noExplicitAny: Generic object conversion requires any
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
// biome-ignore lint/suspicious/noExplicitAny: Generic equality check requires any for flexibility
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
// biome-ignore lint/suspicious/noExplicitAny: Generic debounce needs flexible function signature
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number,
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
		// biome-ignore lint/suspicious/noExplicitAny: Logger accepts any arguments for flexibility
		log: (...args: any[]) => {
			if (debug) console.log(`[${namespace}]`, ...args);
		},
		// biome-ignore lint/suspicious/noExplicitAny: Logger accepts any arguments for flexibility
		warn: (...args: any[]) => {
			if (debug) console.warn(`[${namespace}]`, ...args);
		},
		// biome-ignore lint/suspicious/noExplicitAny: Logger accepts any arguments for flexibility
		error: (...args: any[]) => {
			console.error(`[${namespace}]`, ...args);
		},
	};
}
