# svelte-collab - Project Specification

## Overview
**svelte-collab** provides reactive real-time collaboration primitives for Svelte applications, built on top of proven CRDT libraries (Y.js/Automerge).

## Vision
Enable Svelte developers to add collaborative features (shared state, presence, cursors) to their apps with minimal boilerplate, leveraging Svelte's reactivity system.

---

## Technical Feasibility Assessment ✅

### Strengths
- **Y.js**: Battle-tested CRDT with excellent text editing support, WebSocket/WebRTC providers, and strong ecosystem
- **Svelte 5 Runes**: Perfect for wrapping observable state into reactive stores
- **SvelteKit**: Ideal for library development with built-in packaging tools
- **CRDT Guarantees**: Automatic conflict resolution, no server authority needed

### Challenges & Mitigations
| Challenge | Mitigation |
|-----------|-----------|
| Y.js bundle size (~80kb) | Tree-shakeable exports, optional providers |
| Learning curve for CRDTs | Good documentation, sensible defaults |
| WebSocket server needed | Provide simple reference server, document deployment |
| State serialization complexity | Abstract behind clean API, handle edge cases |

### Technology Stack
- **Core**: Y.js (primary), Automerge (stretch goal)
- **Transport**: WebSocket (y-websocket), WebRTC (stretch)
- **Persistence**: IndexedDB (y-indexeddb)
- **Framework**: Svelte 5, TypeScript
- **Testing**: Vitest, Playwright
- **Demo**: SvelteKit app

---

## API Design

### Core Store
```typescript
import { collabWritable } from 'svelte-collab';

const store = collabWritable(initialValue, {
  room: 'my-room-id',
  serverUrl: 'ws://localhost:1234',
  persist: true, // IndexedDB
  user: { name: 'Alice', color: '#ff0000' }
});

// Use like normal Svelte store
$store = { count: 1 };
console.log($store); // reactive!
```

### Presence API
```typescript
import { collabWritable, usePresence } from 'svelte-collab';

const { awareness, peers } = usePresence(store, {
  cursor: { x: 0, y: 0 },
  status: 'idle'
});

// Update local presence
$awareness = { cursor: { x: 10, y: 20 } };

// Subscribe to peers
$peers // [{ user: {...}, cursor: {...}, status: '...' }]
```

### Text Editing (Y.Text)
```typescript
import { collabText } from 'svelte-collab';

const doc = collabText('', { room: 'doc-123' });

doc.insert(0, 'Hello ');
doc.insert(6, 'World');
```

---

## Development Phases

## **Phase 1: Foundation** (Week 1-2)
**Goal**: Core Y.js integration with basic syncing

### Tasks
- [ ] **1.1** Set up Y.js dependencies and types
  - Install: `yjs`, `y-websocket`, `y-indexeddb`, `y-protocols`
  - Configure TypeScript types
  
- [ ] **1.2** Implement `collabWritable` store
  - Create Y.Doc wrapper
  - Map Y.Map to Svelte store
  - Handle subscribe/unsubscribe lifecycle
  - Deep reactivity for nested objects
  
- [ ] **1.3** WebSocket provider integration
  - Connect to y-websocket server
  - Handle connection states (connecting, connected, disconnected)
  - Reconnection logic
  
- [ ] **1.4** Basic tests
  - Unit tests for store creation
  - Integration tests for sync between 2 clients
  - Connection lifecycle tests
  
- [ ] **1.5** Simple reference WebSocket server
  - Node.js server using `y-websocket/bin/server`
  - Docker compose setup for development
  - Documentation for deployment

**Deliverable**: Working `collabWritable` that syncs between clients via WebSocket

---

## **Phase 2: Persistence & Presence** (Week 2-3)
**Goal**: Add IndexedDB persistence and presence/awareness features

### Tasks
- [ ] **2.1** IndexedDB persistence
  - Integrate `y-indexeddb` provider
  - Automatic state restoration on reconnect
  - Clear/reset API
  
- [ ] **2.2** Presence/Awareness API
  - Implement `usePresence` composable
  - Track local user state
  - Subscribe to remote users
  - Handle user join/leave events
  
- [ ] **2.3** Cursor tracking utilities
  - `useCursor` helper for mouse/touch positions
  - Transform cursor coordinates across viewports
  - Cursor interpolation for smooth rendering
  
- [ ] **2.4** Connection state store
  - `$connectionStatus` reactive store
  - Syncing status indicators
  - Error handling and retry logic
  
- [ ] **2.5** Tests
  - Persistence round-trip tests
  - Presence sync tests
  - Multi-client awareness tests

**Deliverable**: Full persistence layer + working presence API

---

## **Phase 3: Text Editing & Demo** (Week 3-4)
**Goal**: Rich text support and polished demo application

### Tasks
- [ ] **3.1** Text collaboration primitives
  - `collabText` for Y.Text
  - Binding helpers for `<textarea>` and `contenteditable`
  - Cursor position preservation during remote edits
  
- [ ] **3.2** Demo: Collaborative text editor
  - Monaco/CodeMirror integration OR simple textarea
  - Show remote cursors with labels
  - Typing indicators
  - User list with online status
  
- [ ] **3.3** Demo: Collaborative whiteboard (stretch)
  - Canvas-based drawing
  - Sync paths/shapes
  - Remote cursor positions
  - Color picker per user
  
- [ ] **3.4** Documentation
  - API reference
  - Getting started guide
  - Deploy guide for WebSocket server
  - Example recipes
  
- [ ] **3.5** Polish
  - Error boundaries
  - Loading states
  - Offline indicators
  - Performance optimization

**Deliverable**: Production-ready MVP with impressive demo

---

## **Phase 4: Advanced Features** (Week 4-5)
**Goal**: Room management, conflict UI, offline support

### Tasks
- [ ] **4.1** Room management
  - `joinRoom(id)` / `leaveRoom()` API
  - Multi-room support in single app
  - Room metadata (created, users count)
  
- [ ] **4.2** Conflict resolution UI
  - Visual indicators for concurrent edits
  - Undo/redo with proper CRDT semantics
  - Operation history viewer
  
- [ ] **4.3** Offline support
  - Queue updates while offline
  - Merge on reconnect
  - Conflict indicators in UI
  
- [ ] **4.4** Performance optimizations
  - Lazy loading for large documents
  - Delta updates (not full state)
  - Debouncing for high-frequency updates
  
- [ ] **4.5** Advanced tests
  - Network partition tests
  - Large document performance tests
  - Concurrent edit stress tests

**Deliverable**: Robust offline-first collaboration library

---

## **Phase 5: Alternative Transports** (Week 5-6)
**Goal**: Adapter pattern for different backends

### Tasks
- [ ] **5.1** Transport abstraction layer
  - Provider interface
  - Pluggable transport adapters
  
- [ ] **5.2** Supabase Realtime adapter
  - Supabase broadcast integration
  - Auth integration
  - Presence via Supabase
  
- [ ] **5.3** WebRTC adapter
  - Peer-to-peer sync using `y-webrtc`
  - Signaling server setup
  - Fallback to WebSocket
  
- [ ] **5.4** Automerge support (alternative to Y.js)
  - `collabWritableAutomerge` variant
  - Comparison guide in docs
  
- [ ] **5.5** Adapter documentation
  - How to create custom adapters
  - Comparison of transports
  - Use case recommendations

**Deliverable**: Flexible library supporting multiple backends

---

## Project Structure

```
svelte-collab/
├── src/
│   ├── lib/
│   │   ├── index.ts                 # Main exports
│   │   ├── core/
│   │   │   ├── collabWritable.ts    # Core store
│   │   │   ├── collabText.ts        # Text editing
│   │   │   ├── types.ts             # TypeScript types
│   │   │   └── utils.ts             # Helpers
│   │   ├── providers/
│   │   │   ├── websocket.ts         # WebSocket transport
│   │   │   ├── indexeddb.ts         # Persistence
│   │   │   ├── supabase.ts          # Supabase adapter
│   │   │   └── webrtc.ts            # WebRTC transport
│   │   ├── presence/
│   │   │   ├── usePresence.ts       # Presence API
│   │   │   ├── useCursor.ts         # Cursor tracking
│   │   │   └── components/          # UI components
│   │   └── room/
│   │       ├── useRoom.ts           # Room management
│   │       └── RoomProvider.svelte  # Context provider
│   ├── routes/                      # Demo app
│   │   ├── +page.svelte            # Landing
│   │   ├── editor/                  # Text editor demo
│   │   ├── whiteboard/              # Whiteboard demo
│   │   └── examples/                # Code examples
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── server/
│   ├── websocket.js                 # Y.js WebSocket server
│   ├── Dockerfile
│   └── docker-compose.yml
├── docs/
│   ├── api/
│   ├── guides/
│   └── examples/
└── package.json
```

---

## Success Metrics

### MVP (Phase 1-3)
- ✅ Two clients can sync a store in real-time
- ✅ State persists across page reloads
- ✅ Presence shows remote cursors/status
- ✅ Demo app is impressive and works flawlessly
- ✅ < 5 minutes to get started (good DX)

### Production-Ready (Phase 4-5)
- ✅ Handles 100+ concurrent users per room
- ✅ Works offline with graceful reconnection
- ✅ Bundle size < 150kb (gzipped)
- ✅ 100% TypeScript coverage
- ✅ 90%+ test coverage
- ✅ Comprehensive documentation

---

## Risks & Contingencies

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Y.js learning curve steep | Medium | High | Extensive docs, examples, abstractions |
| Performance issues with large docs | Medium | Medium | Lazy loading, pagination, benchmarks |
| WebSocket server deployment complex | High | Medium | Provide Docker, Railway/Render templates |
| Bundle size too large | Low | Medium | Tree-shaking, optional providers |
| Svelte 5 API changes | Low | High | Pin versions, monitor Svelte releases |

---

## Timeline Summary

| Phase | Duration | Key Deliverable |
|-------|----------|-----------------|
| Phase 1 | 1-2 weeks | Working `collabWritable` with WebSocket sync |
| Phase 2 | 1 week | Persistence + Presence API |
| Phase 3 | 1-2 weeks | Demo app + Documentation |
| Phase 4 | 1 week | Offline support + Room management |
| Phase 5 | 1 week | Alternative transports |
| **Total** | **5-7 weeks** | Production-ready library |

---

## Go/No-Go Decision ✅

### ✅ GO - Reasons to Proceed
1. **Strong ecosystem**: Y.js is mature and proven
2. **Clear value**: No good Svelte collaboration library exists
3. **Manageable scope**: MVP is achievable in 3-4 weeks
4. **Good architecture**: Svelte stores are perfect for this use case
5. **Extensible**: Easy to add features incrementally

### ⚠️ Challenges to Monitor
1. Developer education around CRDTs
2. Server deployment friction
3. Bundle size management

---

## Next Steps

### Immediate Actions
1. ✅ Review and approve this spec
2. Install Y.js dependencies
3. Create basic project structure
4. Set up testing infrastructure
5. Implement Phase 1.1 & 1.2 (core store)

### Dependencies to Install
```bash
pnpm add yjs y-websocket y-indexeddb y-protocols
pnpm add -D @types/ws ws
```

---

## Questions for Consideration

1. **Primary CRDT**: Start with Y.js only, or support both Y.js and Automerge from day 1?
   - **Recommendation**: Y.js only for MVP, Automerge as stretch goal

2. **Server hosting**: Provide hosted WebSocket server or docs only?
   - **Recommendation**: Reference implementation + deploy guides (Railway, Render, Fly.io)

3. **UI components**: Include pre-built cursor/presence components?
   - **Recommendation**: Yes, optional components in `/presence/components/`

4. **License**: MIT, Apache 2.0, or other?
   - **Recommendation**: MIT (most permissive, best for library adoption)

5. **Monorepo**: Keep server in same repo or separate?
   - **Recommendation**: Same repo, easier development and examples

---

**Status**: 📋 **Spec Complete - Ready to Start Development**

