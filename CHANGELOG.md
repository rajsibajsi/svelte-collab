# Changelog

All notable changes to this project will be documented in this file.

## [0.0.1] - 2025-10-24 - Phase 1 Complete ✅

### 🎉 Initial Release - MVP

First working version of svelte-collab with core collaboration features!

### ✨ Features

#### Core Library
- **`collabWritable` Store** - Main collaborative store with Svelte reactivity
- **Y.js Integration** - Full CRDT support via Y.Map
- **TypeScript Support** - Complete type definitions and strict typing
- **Deep Reactivity** - Automatic reactive updates for nested objects and arrays

#### Networking
- **WebSocket Provider** - Real-time sync across clients via y-websocket
- **Connection Management** - Track connection state (disconnected, connecting, connected, error)
- **Reconnection Logic** - Automatic reconnection handling
- **Manual Control** - `connect()` and `disconnect()` methods

#### Persistence
- **IndexedDB Integration** - Automatic local persistence (browser only)
- **Cross-session State** - Data persists across page reloads
- **Environment Detection** - Gracefully disables in Node.js environments

#### Developer Experience
- **Reference WebSocket Server** - Production-ready server included
- **Debug Mode** - Optional detailed logging
- **Comprehensive Tests** - 38 unit tests covering core functionality
- **Demo Application** - Beautiful demo with counter, todo list, and messaging

### 📦 Package Structure

```
svelte-collab/
├── src/
│   ├── lib/
│   │   ├── core/
│   │   │   ├── collabWritable.ts    # Main store implementation
│   │   │   ├── types.ts             # TypeScript definitions
│   │   │   ├── utils.ts             # Helper utilities
│   │   │   ├── *.test.ts            # Unit tests
│   │   │   └── index.ts             # Exports
│   │   └── index.ts                 # Library entry point
│   └── routes/
│       └── +page.svelte             # Demo application
├── server/
│   └── websocket.js                 # WebSocket server
├── README.md                        # Documentation
├── PROJECT_SPEC.md                  # Project specification
├── QUICKSTART.md                    # Quick start guide
└── package.json
```

### 🧪 Testing

- **38 passing tests** across 2 test suites
- **19 tests** for collabWritable store
- **19 tests** for utility functions
- Tests for: initialization, store operations, Y.js integration, connection management, cleanup, complex data types

### 🛠️ Technical Details

#### Dependencies
- `yjs@^13.6.27` - CRDT framework
- `y-websocket@^3.0.0` - WebSocket provider
- `y-indexeddb@^9.0.12` - IndexedDB persistence
- `y-protocols@^1.0.6` - Y.js protocols

#### API Surface
- `collabWritable()` - Create collaborative store
- `CollabStore` interface - Standard Svelte store + additional methods
- `CollabOptions` - Configuration options
- Utility exports: `deepClone`, `ymapToObject`, `generateUserId`, `generateUserColor`

### 📝 Documentation

- **README.md** - Comprehensive documentation with examples
- **PROJECT_SPEC.md** - Complete project specification with phases
- **QUICKSTART.md** - 5-minute quick start guide
- **CHANGELOG.md** - This file
- **JSDoc comments** - Inline documentation in code

### 🎮 Demo Features

The included demo application showcases:
- ✅ **Shared Counter** - Increment/decrement across clients
- ✅ **Collaborative Message** - Real-time text input
- ✅ **Todo List** - Add/remove items collaboratively
- ✅ **Connection Status** - Visual connection state indicator
- ✅ **Manual Controls** - Disconnect/reconnect/clear buttons

### 🚀 Server

Simple WebSocket server included:
- **Health endpoints** - `/health` and `/rooms`
- **Room management** - Automatic room creation/cleanup
- **Garbage collection** - Cleans up inactive rooms
- **Status page** - Web UI at `/`
- **Environment variables** - `PORT` and `HOST` configuration
- **Graceful shutdown** - Proper SIGINT/SIGTERM handling

### ⚡ Performance

- **Efficient Updates** - Only changed data is synced
- **Debouncing** - Utility function for high-frequency updates
- **Lazy Initialization** - Providers initialized only when needed
- **Memory Management** - Proper cleanup on destroy

### 🐛 Bug Fixes

- Fixed IndexedDB detection in Node.js environments
- Fixed console warning spam in production mode
- Fixed test compatibility with Vitest browser mode
- Fixed Y.Map to object conversion for nested structures

### 📊 Stats

- **Lines of Code**: ~800 (library) + ~150 (server) + ~200 (demo)
- **Test Coverage**: 38 tests, all passing
- **TypeScript**: 100% type coverage
- **Bundle Size**: TBD (will measure in next release)

### 🔜 What's Next (Phase 2+)

See [PROJECT_SPEC.md](./PROJECT_SPEC.md) for the full roadmap:
- Presence API (cursors, typing indicators)
- Text collaboration primitives (Y.Text)
- Room management (join/leave events)
- Offline support with merge on reconnect
- Alternative transports (Supabase, WebRTC)
- Automerge support

### 🙏 Acknowledgments

Built with:
- **Y.js** - The amazing CRDT library
- **Svelte 5** - Modern reactive framework
- **SvelteKit** - Full-stack Svelte framework
- **Vitest** - Fast unit testing
- **TypeScript** - Type safety

---

**Phase 1 Status:** ✅ **COMPLETE**

All MVP features implemented, tested, and documented!

