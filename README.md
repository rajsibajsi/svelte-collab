# 🤝 svelte-collab

> Reactive real-time collaboration primitives for Svelte — powered by Y.js CRDTs

Transform any Svelte app into a collaborative experience with just a few lines of code. Built on top of battle-tested Y.js CRDTs, `svelte-collab` provides seamless real-time synchronization with automatic conflict resolution.

## ✨ Features

- **🔄 Real-time Sync** - Changes propagate instantly across all connected clients
- **💾 Persistence** - Automatic IndexedDB persistence (browser only)
- **🌐 WebSocket Provider** - Simple server included for development
- **🎯 Type-Safe** - Full TypeScript support with comprehensive types
- **⚡ Reactive** - Works seamlessly with Svelte's `$` reactivity
- **🧠 CRDT-Powered** - Automatic conflict resolution via Y.js
- **🔌 Connection Management** - Built-in connection state handling
- **🧪 Well-Tested** - 38 passing unit tests

## 📦 Installation

```bash
npm install svelte-collab
# or
pnpm add svelte-collab
# or
yarn add svelte-collab
```

## 🚀 Quick Start

### 1. Start the WebSocket Server

```bash
npm run server
```

The server will start at `ws://localhost:1234`.

### 2. Create a Collaborative Store

```svelte
<script lang="ts">
  import { collabWritable } from 'svelte-collab';
  import { onDestroy } from 'svelte';

  const store = collabWritable(
    { count: 0, message: 'Hello!' },
    {
      room: 'my-room',
      serverUrl: 'ws://localhost:1234',
      persist: true
    }
  );

  // Clean up on component destroy
  onDestroy(() => {
    store.destroy();
  });
</script>

<!-- Use like a normal Svelte store -->
<div>
  <p>Count: {$store.count}</p>
  <button onclick={() => store.update(s => ({ ...s, count: s.count + 1 }))}>
    Increment
  </button>
  
  <input bind:value={$store.message} />
</div>
```

### 3. Open Multiple Tabs

Open the same page in multiple browser tabs and watch changes sync in real-time! ✨

## 📖 API Reference

### `collabWritable(initialValue, options)`

Creates a collaborative Svelte store.

#### Parameters

- **`initialValue`** `T` - Initial store value (must be an object)
- **`options`** `CollabOptions`:
  - **`room`** `string` *(required)* - Unique room identifier
  - **`serverUrl`** `string` *(optional)* - WebSocket server URL
  - **`persist`** `boolean` *(default: `true`)* - Enable IndexedDB persistence
  - **`user`** `UserInfo` *(optional)* - User information for presence
  - **`stateName`** `string` *(default: `'state'`)* - Y.Map name
  - **`debug`** `boolean` *(default: `false`)* - Enable debug logging

#### Returns

A `CollabStore<T>` with the following methods:

- **`subscribe(callback)`** - Subscribe to store changes (standard Svelte store)
- **`set(value)`** - Set the entire store value
- **`update(updater)`** - Update store with a function
- **`getDoc()`** - Get underlying Y.Doc
- **`getYMap()`** - Get underlying Y.Map
- **`getConnectionState()`** - Get current connection state
- **`connect()`** - Manually connect to server
- **`disconnect()`** - Manually disconnect from server
- **`destroy()`** - Clean up and destroy the store

## 🎨 Examples

### Collaborative Counter

```svelte
<script lang="ts">
  import { collabWritable } from 'svelte-collab';
  
  const counter = collabWritable({ count: 0 }, { room: 'counter-room' });
</script>

<button onclick={() => counter.update(s => ({ count: s.count + 1 }))}>
  Count: {$counter.count}
</button>
```

### Collaborative Todo List

```svelte
<script lang="ts">
  import { collabWritable } from 'svelte-collab';
  
  const todos = collabWritable(
    { items: [] as string[] },
    { room: 'todos', serverUrl: 'ws://localhost:1234' }
  );
  
  let newItem = $state('');
  
  function addTodo() {
    if (!newItem.trim()) return;
    todos.update(s => ({
      items: [...s.items, newItem.trim()]
    }));
    newItem = '';
  }
</script>

<input bind:value={newItem} onkeydown={(e) => e.key === 'Enter' && addTodo()} />
<button onclick={addTodo}>Add</button>

<ul>
  {#each $todos.items as item}
    <li>{item}</li>
  {/each}
</ul>
```

### Connection Status

```svelte
<script lang="ts">
  import { collabWritable } from 'svelte-collab';
  
  const store = collabWritable({ data: 'test' }, { 
    room: 'status-demo',
    serverUrl: 'ws://localhost:1234'
  });
  
  let status = $derived(store.getConnectionState());
</script>

<div class="status status-{status.status}">
  {status.status}
</div>
```

## 🖥️ WebSocket Server

### Development Server

The package includes a simple WebSocket server for development:

```bash
npm run server
```

Or run it directly:

```bash
node server/websocket.js
```

### Environment Variables

- **`PORT`** - Server port (default: `1234`)
- **`HOST`** - Server host (default: `localhost`)

### Server Endpoints

- **WebSocket** - `ws://localhost:1234` - Y.js WebSocket connection
- **`GET /`** - Server status page
- **`GET /health`** - Health check endpoint
- **`GET /rooms`** - List active rooms

### Production Deployment

For production, you can:

1. **Use the included server** - Deploy `server/websocket.js` to your hosting platform
2. **Use y-websocket server** - `npx y-websocket`
3. **Custom server** - Build your own using the `y-websocket` package

**Example Deploy to Railway/Render:**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY server ./server
CMD ["node", "server/websocket.js"]
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:unit

# Run type checking
npm run check
```

## 🏗️ How It Works

`svelte-collab` wraps Y.js CRDTs in a Svelte-friendly API:

1. **Y.Doc** - Creates a shared Y.js document
2. **Y.Map** - Maps your store data to a Y.Map (CRDT)
3. **Observers** - Watches for remote changes and updates the Svelte store
4. **Providers** - Syncs via WebSocket and persists to IndexedDB
5. **Reactivity** - Triggers Svelte's reactivity system automatically

```
┌─────────────────┐
│  Svelte Store   │ ← Your app uses this
└────────┬────────┘
         │
    ┌────▼─────┐
    │  Y.Map   │ ← CRDT magic happens here
    └────┬─────┘
         │
    ┌────▼────────────────┐
    │   Providers         │
    │  • WebSocket        │ ← Sync across clients
    │  • IndexedDB        │ ← Local persistence
    └─────────────────────┘
```

## 🎯 Use Cases

- **Collaborative Editors** - Text editors, code editors, Markdown
- **Real-time Dashboards** - Live data updates across users
- **Multiplayer Forms** - Simultaneous form editing
- **Shared Whiteboards** - Drawing and diagramming tools
- **Live Cursors** - See where other users are working
- **Chat Applications** - Real-time messaging
- **Kanban Boards** - Trello-like collaborative boards

## 🔧 Advanced Usage

### Custom Y.Doc

```typescript
import * as Y from 'yjs';
import { collabWritable } from 'svelte-collab';

const ydoc = new Y.Doc();
const store = collabWritable({ data: 'test' }, {
  room: 'custom',
  ydoc // Use your own Y.Doc
});
```

### Without WebSocket Server

```typescript
// Works offline with just local persistence
const store = collabWritable({ data: 'test' }, {
  room: 'offline-room',
  persist: true
  // No serverUrl = offline mode
});
```

### Manual Connection Control

```typescript
const store = collabWritable({ data: 'test' }, { 
  room: 'manual',
  serverUrl: 'ws://localhost:1234'
});

// Disconnect
store.disconnect();

// Reconnect later
store.connect();
```

## 📋 Project Status

**Current Version:** 0.0.1 (MVP)

### ✅ Implemented (Phase 1)

- ✅ Core `collabWritable` store
- ✅ Y.js integration (Y.Map)
- ✅ WebSocket provider
- ✅ IndexedDB persistence
- ✅ Connection state management
- ✅ TypeScript types
- ✅ Unit tests
- ✅ Reference WebSocket server
- ✅ Demo application

### 🚧 Roadmap (Future Phases)

- [ ] Presence API (cursors, typing indicators)
- [ ] Room management (join/leave events)
- [ ] Text collaboration primitives (Y.Text)
- [ ] Conflict resolution UI
- [ ] Offline support with merge on reconnect
- [ ] Supabase Realtime adapter
- [ ] WebRTC provider
- [ ] Automerge support

## 📚 Resources

- **[Y.js Documentation](https://docs.yjs.dev/)** - Learn about CRDTs
- **[Svelte Stores](https://svelte.dev/docs/svelte-store)** - Svelte store API
- **[PROJECT_SPEC.md](./PROJECT_SPEC.md)** - Detailed project specification

## 🤝 Contributing

Contributions are welcome! Please see [PROJECT_SPEC.md](./PROJECT_SPEC.md) for development phases and planned features.

## 📄 License

MIT © [Your Name]

## 🙏 Acknowledgments

- **[Y.js](https://github.com/yjs/yjs)** - The amazing CRDT library that powers this project
- **[Svelte](https://svelte.dev/)** - The best frontend framework
- **[y-websocket](https://github.com/yjs/y-websocket)** - WebSocket provider for Y.js

---

**Made with ❤️ for the Svelte community**

