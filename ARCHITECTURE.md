# 🏗️ Architecture Guide - How Everything Works

> A deep dive into svelte-collab's internals with code references

This document explains exactly how svelte-collab works under the hood, linking each feature to the actual implementation code.

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [Core Store Implementation](#core-store-implementation)
3. [Y.js Integration](#yjs-integration)
4. [WebSocket Synchronization](#websocket-synchronization)
5. [IndexedDB Persistence](#indexeddb-persistence)
6. [Connection Management](#connection-management)
7. [Reactivity System](#reactivity-system)
8. [WebSocket Server](#websocket-server)
9. [Demo Application](#demo-application)
10. [Testing](#testing)

---

## Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Svelte Component                          │
│  Uses $store syntax for reactive updates                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│               collabWritable Store                           │
│  Wraps Y.js in Svelte store interface                       │
│  Location: src/lib/core/collabWritable.ts                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    Y.js (CRDT)                               │
│  Y.Doc → Y.Map → CRDT conflict resolution                   │
└────────┬───────────────────────────────┬────────────────────┘
         │                               │
         ↓                               ↓
┌──────────────────┐          ┌──────────────────────┐
│  WebSocket       │          │  IndexedDB           │
│  (Sync)          │          │  (Persistence)       │
│  y-websocket     │          │  y-indexeddb         │
└──────────────────┘          └──────────────────────┘
```

---

## Core Store Implementation

### Creating a Collaborative Store

**File**: `src/lib/core/collabWritable.ts`

```typescript:32-36:src/lib/core/collabWritable.ts
// biome-ignore lint/suspicious/noExplicitAny: Generic object store requires flexible typing
export function collabWritable<T extends Record<string, any>>(
	initialValue: T,
	options: CollabOptions,
): CollabStore<T> {
```

**How it works:**

1. **Generic Type Parameter** - `T extends Record<string, any>` ensures the store value is an object
2. **Initial Value** - Starting state for the store
3. **Options** - Configuration including room ID, server URL, persistence settings

### Store State Structure

**File**: `src/lib/core/collabWritable.ts` (lines 56-71)

The store maintains internal state:

```typescript
const state: StoreState<T> = {
  value: deepClone(initialValue),     // Current reactive value
  ydoc: opts.ydoc || new Y.Doc(),     // Y.js document
  ymap: null as any,                  // Y.Map for state
  providers: {},                      // WebSocket & IndexedDB providers
  connectionState: {                  // Connection tracking
    status: "disconnected",
    retries: 0,
  },
  options: opts,                      // Resolved options
  subscribers: new Set(),             // Svelte subscribers
  connectionSubscribers: new Set(),   // Connection state subscribers
  destroyed: false,                   // Cleanup flag
};
```

**Key Components:**

- **`value`**: The actual data that Svelte components read
- **`ydoc`**: Y.js document container
- **`ymap`**: Y.js Map that syncs across clients
- **`providers`**: Sync (WebSocket) and persistence (IndexedDB)
- **`subscribers`**: Functions to call when data changes

---

## Y.js Integration

### Y.Map Initialization

**File**: `src/lib/core/collabWritable.ts` (lines 76-91)

```typescript:76-91:src/lib/core/collabWritable.ts
// Get or create Y.Map with the specified name
state.ymap = state.ydoc.getMap(opts.stateName);

// Initialize Y.Map with initial value
logger.log("Initializing Y.Map with initial value");
state.ydoc.transact(() => {
  Object.entries(initialValue).forEach(([key, value]) => {
    state.ymap.set(key, value);
  });
});

// Convert Y.Map to plain object for initial value
if (state.ymap.size > 0) {
  state.value = ymapToObject(state.ymap) as T;
}
```

**What happens:**

1. **Get Y.Map** - `ydoc.getMap(name)` creates or retrieves a shared map
2. **Transaction** - Changes are batched for efficiency
3. **Set Initial Values** - Each key-value pair is stored in Y.Map
4. **Convert Back** - Y.Map → plain object for Svelte reactivity

### Y.Map Observer (Sync from Remote)

**File**: `src/lib/core/collabWritable.ts` (lines 93-110)

```typescript:93-110:src/lib/core/collabWritable.ts
// Set up Y.Map observer to update Svelte state
const observer = () => {
  if (state.destroyed) return;
  logger.log("Y.Map changed, updating local state");
  const newValue = ymapToObject(state.ymap) as T;
  state.value = newValue;

  // Notify all subscribers
  state.subscribers.forEach((subscriber) => {
    try {
      subscriber(deepClone(state.value));
    } catch (error) {
      logger.error("Error in subscriber:", error);
    }
  });
};

state.ymap.observe(observer);
```

**How remote changes sync:**

1. **Observer Pattern** - Y.js calls `observer()` when Y.Map changes
2. **Convert Y.Map** - `ymapToObject()` converts CRDT to plain object
3. **Update State** - Store value is updated
4. **Notify Subscribers** - All Svelte components re-render

### Y.Map to Object Conversion

**File**: `src/lib/core/utils.ts` (lines 50-58)

```typescript:50-58:src/lib/core/utils.ts
// biome-ignore lint/suspicious/noExplicitAny: Y.js types are dynamic and require any
export function ymapToObject(ymap: any): any {
	// biome-ignore lint/suspicious/noExplicitAny: Generic object construction requires any
	const obj: any = {};
	// biome-ignore lint/suspicious/noExplicitAny: Y.js forEach callback uses any
	ymap.forEach((value: any, key: string) => {
		obj[key] = convertYType(value);
	});
	return obj;
}
```

**Conversion Process:**

- Iterates Y.Map entries
- Converts each value using `convertYType()` (handles nested Y.js types)
- Returns plain JavaScript object

---

## WebSocket Synchronization

### WebSocket Provider Setup

**File**: `src/lib/core/collabWritable.ts` (lines 138-197)

```typescript:138-197:src/lib/core/collabWritable.ts
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
```

**Event Flow:**

1. **"status"** - Connection state changes (connecting → connected → disconnected)
2. **"sync"** - Initial sync complete, data is up-to-date
3. **"connection-error"** - Network issues or server unavailable

**Automatic Sync:**

When you update the store locally:
```typescript
store.update(s => ({ ...s, count: s.count + 1 }))
```

1. Local Y.Map is updated
2. WebSocket provider detects change
3. Change is sent to server
4. Server broadcasts to other clients
5. Other clients receive update
6. Their observers fire → UI updates

### WebSocket Server

**File**: `server/websocket.ts`

The server manages Y.js document rooms:

```typescript:88-108:server/websocket.ts
wsServer.on("connection", (ws: WebSocket, req: Request) => {
	const url = new URL(req.url || "/", `http://${req.headers.host}`);
	const roomName = url.pathname.slice(1) || "default";

	console.log(`New connection to room: ${roomName}`);

	// Get or create room
	let room = rooms.get(roomName);
	if (!room) {
		room = {
			name: roomName,
			doc: new Y.Doc(),
			conns: new Map(),
			lastActivity: Date.now(),
		};
		rooms.set(roomName, room);
		console.log(`Created new room: ${roomName}`);
	}

	room.lastActivity = Date.now();
	setupWSConnection(ws, req, room);
});
```

**Room Management:**

1. **Room per URL path** - `/demo-room` creates room "demo-room"
2. **Y.Doc per room** - Each room has its own Y.js document
3. **Connection tracking** - Tracks all WebSocket connections
4. **Garbage collection** - Inactive rooms are cleaned up

---

## IndexedDB Persistence

### IndexedDB Provider Setup

**File**: `src/lib/core/collabWritable.ts` (lines 115-137)

```typescript:115-137:src/lib/core/collabWritable.ts
// IndexedDB provider (browser only)
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
```

**How Persistence Works:**

1. **Browser Check** - `typeof indexedDB !== 'undefined'` (won't run in Node.js)
2. **Room Key** - Each room gets its own IndexedDB store
3. **"synced" Event** - Fires when data is restored from IndexedDB
4. **Automatic Save** - Y.js automatically persists changes

**Data Flow:**

```
User makes change → Y.Map updates → IndexedDB saves → Page reload → IndexedDB restores
```

---

## Connection Management

### Connection State Store

**File**: `src/lib/core/collabWritable.ts` (lines 233-248)

```typescript:233-248:src/lib/core/collabWritable.ts
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
```

**Usage in Components:**

```svelte
<script>
  const store = collabWritable(/* ... */);
  const { connectionState } = store;
</script>

<!-- Reactive to connection changes -->
<div>Status: {$connectionState.status}</div>
```

### Connection State Updates

**File**: `src/lib/core/collabWritable.ts` (lines 201-214)

```typescript:201-214:src/lib/core/collabWritable.ts
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
```

**Connection States:**

- **"disconnected"** - No WebSocket connection
- **"connecting"** - Attempting to connect
- **"connected"** - WebSocket open and synced
- **"reconnecting"** - Attempting reconnect after failure
- **"error"** - Connection failed

---

## Reactivity System

### Svelte Store Interface

**File**: `src/lib/core/collabWritable.ts` (lines 220-232)

```typescript:220-232:src/lib/core/collabWritable.ts
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
```

**How `$store` Works:**

When you use `$store.count`:

1. Svelte calls `subscribe()` on mount
2. Initial value is sent immediately
3. Subscriber function stored in `Set`
4. When Y.Map changes, all subscribers called
5. Svelte re-renders component
6. On unmount, unsubscribe function called

### Store Set Method

**File**: `src/lib/core/collabWritable.ts` (lines 250-274)

```typescript:250-274:src/lib/core/collabWritable.ts
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
```

**Transaction Process:**

1. **Transaction Start** - Batches all changes
2. **Remove Old Keys** - Delete keys not in new value
3. **Set New Keys** - Update Y.Map with new data
4. **Transaction Commit** - Y.js syncs changes
5. **Observer Fires** - Subscribers notified

### Store Update Method

**File**: `src/lib/core/collabWritable.ts` (lines 276-287)

```typescript:276-287:src/lib/core/collabWritable.ts
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
```

**Update Pattern:**

```typescript
store.update(state => ({
  ...state,
  count: state.count + 1  // Increment counter
}))
```

---

## Demo Application

### Store Creation

**File**: `src/routes/+page.svelte` (lines 6-22)

```svelte:6-22:src/routes/+page.svelte
// Create a collaborative store
const store = collabWritable(
	{ 
		count: 0, 
		message: 'Hello, collaborative world!',
		items: [] as string[]
	},
	{
		room: 'demo-room',
		serverUrl: 'ws://localhost:1234',
		persist: true,
		debug: true,
		user: {
			name: `User-${Math.floor(Math.random() * 1000)}`,
			color: `hsl(${Math.random() * 360}, 70%, 60%)`
		}
	}
);
```

### Reactive Counter

**File**: `src/routes/+page.svelte` (lines 30-43)

```svelte:30-43:src/routes/+page.svelte
// biome-ignore lint/correctness/noUnusedVariables: Used in Svelte template
function increment() {
	store.update(state => ({
		...state,
		count: state.count + 1
	}));
}

// biome-ignore lint/correctness/noUnusedVariables: Used in Svelte template
function decrement() {
	store.update(state => ({
		...state,
		count: state.count - 1
	}));
}
```

**In Template:**

```svelte:127-129:src/routes/+page.svelte
<div class="text-6xl font-bold text-purple-600 min-w-[120px] text-center">
	{$store.count}
</div>
```

### Connection Status Display

**File**: `src/routes/+page.svelte` (lines 81-89)

```svelte:81-89:src/routes/+page.svelte
// Connection status color
// biome-ignore lint/correctness/noUnusedVariables: Used in Svelte template
const statusColor = $derived.by(() => {
	switch ($connectionState.status) {
		case "connected": return "bg-green-500";
		case "connecting": return "bg-yellow-500";
		case "disconnected": return "bg-gray-500";
		case "error": return "bg-red-500";
		default: return "bg-gray-500";
	}
});
```

**Usage:**

```svelte:100-104:src/routes/+page.svelte
<div class="flex items-center gap-2">
	<div class="w-3 h-3 rounded-full {statusColor} animate-pulse"></div>
	<span class="text-sm font-medium text-gray-700">
		{$connectionState.status}
	</span>
</div>
```

---

## Testing

### Store Tests

**File**: `src/lib/core/collabWritable.test.ts`

Tests verify:

1. **Initialization** - Store creates with initial value
2. **Set/Update** - Store operations work correctly
3. **Y.js Integration** - Y.Map syncs with store
4. **Connection Management** - Connection state tracking works
5. **Cleanup** - Resources are properly cleaned up

Example test:

```typescript:16-24:src/lib/core/collabWritable.test.ts
it("should create a store with initial value", () => {
	store = collabWritable({ count: 0 }, { room: "test-room" });

	// biome-ignore lint/suspicious/noExplicitAny: Test variable needs flexible typing
	let currentValue: any;
	store.subscribe((value) => {
		currentValue = value;
	})();

	expect(currentValue).toEqual({ count: 0 });
});
```

### Utility Tests

**File**: `src/lib/core/utils.test.ts`

Tests verify helper functions:

- `deepClone()` - Deep object cloning
- `ymapToObject()` - Y.Map conversion
- `deepEqual()` - Object comparison
- `generateUserId()` - Unique ID generation
- `debounce()` - Function debouncing

---

## Type System

### Core Types

**File**: `src/lib/core/types.ts`

```typescript:8-53:src/lib/core/types.ts
export interface CollabOptions {
	/**
	 * Unique room/document identifier
	 */
	room: string;

	/**
	 * WebSocket server URL (e.g., 'ws://localhost:1234')
	 * Optional - if not provided, only local state is maintained
	 */
	serverUrl?: string;

	/**
	 * Enable IndexedDB persistence
	 * @default true
	 */
	persist?: boolean;

	/**
	 * User information for presence/awareness
	 */
	user?: UserInfo;

	/**
	 * Custom Y.Doc instance (advanced usage)
	 */
	ydoc?: Y.Doc;

	/**
	 * Name of the Y.Map to use within the document
	 * @default 'state'
	 */
	stateName?: string;

	/**
	 * Connection timeout in milliseconds
	 * @default 5000
	 */
	connectTimeout?: number;

	/**
	 * Enable debug logging
	 * @default false
	 */
	debug?: boolean;
}
```

### Store Interface

**File**: `src/lib/core/types.ts`

```typescript:89-122:src/lib/core/types.ts
export interface CollabStore<T> {
	subscribe: (run: (value: T) => void) => () => void;
	set: (value: T) => void;
	update: (updater: (value: T) => T) => void;

	/**
	 * Get the underlying Y.Doc
	 */
	getDoc: () => Y.Doc;

	/**
	 * Get the Y.Map instance
	 */
	getYMap: () => Y.Map<unknown>;

	/**
	 * Readable store for connection state
	 * Use with $connectionState in Svelte components
	 */
	connectionState: {
		subscribe: (run: (state: ConnectionState) => void) => () => void;
	};

	/**
	 * Manually connect/disconnect
	 */
	connect: () => void;
	disconnect: () => void;

	/**
	 * Destroy the store and clean up resources
	 */
	destroy: () => void;
}
```

---

## Data Flow Summary

### When Local User Makes Change

```
1. User clicks button → increment()
2. store.update() called
3. Y.Map updated in transaction
4. Y.Map observer fires (local)
5. Svelte subscribers called
6. Component re-renders
7. WebSocket provider detects change
8. Change sent to server
9. Server broadcasts to other clients
```

### When Remote User Makes Change

```
1. Remote client updates their Y.Map
2. Their WebSocket sends update to server
3. Server broadcasts to all clients
4. Our WebSocket receives update
5. Y.js applies update to Y.Map
6. Y.Map observer fires
7. ymapToObject() converts to plain object
8. Svelte subscribers called
9. Component re-renders
```

### On Page Load

```
1. collabWritable() called
2. Y.Doc and Y.Map created
3. IndexedDB provider initializes
4. Saved state restored (if exists)
5. WebSocket provider connects
6. Server sync happens
7. "sync" event fires
8. UI shows latest data
```

---

## Key Design Patterns

### 1. **Observer Pattern**
Y.js uses observers to notify of changes:
```typescript
state.ymap.observe(observer);
```

### 2. **Pub/Sub Pattern**
Svelte store subscribers:
```typescript
state.subscribers.forEach(sub => sub(value));
```

### 3. **Transaction Pattern**
Batch multiple Y.js changes:
```typescript
state.ydoc.transact(() => {
  // Multiple changes here
});
```

### 4. **Singleton Pattern**
One Y.Doc per room, shared across providers

### 5. **Facade Pattern**
Simple API hides Y.js complexity

---

## Performance Optimizations

1. **Deep Clone** - Prevents unintended mutations
2. **Transactions** - Batch changes for efficiency
3. **Debouncing** - Utility for high-frequency updates
4. **Frozen Lockfile** - Deterministic installs in CI

---

## Error Handling

1. **Try-Catch Blocks** - Around provider initialization
2. **Subscriber Error Catching** - Prevents one error breaking all
3. **Debug Mode** - Detailed logging when enabled
4. **Graceful Degradation** - Works without server/IndexedDB

---

## Next Steps

To extend this library:

1. **Add Presence API** - Track cursors, typing indicators (Phase 2)
2. **Text Collaboration** - Use Y.Text for rich text (Phase 3)
3. **Room Management** - Join/leave events (Phase 4)
4. **Alternative Transports** - Supabase, WebRTC (Phase 5)

See [PROJECT_SPEC.md](./PROJECT_SPEC.md) for the full roadmap.

---

**Questions?** Check the [README](./README.md) or open an issue!

