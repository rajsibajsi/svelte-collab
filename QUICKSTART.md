# 🚀 Quick Start Guide - svelte-collab

Get up and running with real-time collaboration in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- A Svelte or SvelteKit project

## Step 1: Install

```bash
pnpm add svelte-collab
```

## Step 2: Start the WebSocket Server

Open a terminal and run:

```bash
pnpm run server
```

You should see:

```
╔════════════════════════════════════════════════════════════╗
║  🚀 Y.js WebSocket Server Running                         ║
║  WebSocket: ws://localhost:1234                           ║
║  Ready for collaboration! 🎉                              ║
╚════════════════════════════════════════════════════════════╝
```

Keep this terminal open!

## Step 3: Create Your First Collaborative Component

Create a new Svelte component:

```svelte
<!-- src/lib/components/CollabCounter.svelte -->
<script lang="ts">
  import { collabWritable } from 'svelte-collab';
  import { onDestroy } from 'svelte';

  // Create a collaborative store
  const counter = collabWritable(
    { count: 0 },
    {
      room: 'counter-room',
      serverUrl: 'ws://localhost:1234',
      persist: true
    }
  );

  function increment() {
    counter.update(state => ({
      count: state.count + 1
    }));
  }

  function decrement() {
    counter.update(state => ({
      count: state.count - 1
    }));
  }

  // Clean up when component is destroyed
  onDestroy(() => {
    counter.destroy();
  });
</script>

<div class="counter">
  <h2>Collaborative Counter</h2>
  <div class="display">
    <button onclick={decrement}>−</button>
    <span class="count">{$counter.count}</span>
    <button onclick={increment}>+</button>
  </div>
  <p class="hint">
    Open this page in multiple tabs to see real-time sync! ✨
  </p>
</div>

<style>
  .counter {
    text-align: center;
    padding: 2rem;
  }
  
  .display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin: 2rem 0;
  }
  
  .count {
    font-size: 3rem;
    font-weight: bold;
    min-width: 100px;
  }
  
  button {
    font-size: 2rem;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 2px solid #333;
    background: white;
    cursor: pointer;
  }
  
  button:hover {
    background: #f0f0f0;
  }
  
  .hint {
    color: #666;
    font-size: 0.9rem;
  }
</style>
```

## Step 4: Use It in Your App

Add it to your main page:

```svelte
<!-- src/routes/+page.svelte -->
<script>
  import CollabCounter from '$lib/components/CollabCounter.svelte';
</script>

<CollabCounter />
```

## Step 5: Test It!

1. Run your dev server: `pnpm dev`
2. Open http://localhost:5173 (or your configured port)
3. **Open the same URL in another tab or window**
4. Click the + or − buttons
5. Watch the counter sync in real-time! ✨

## 🎉 Success!

You now have a working collaborative counter! Try these next:

### Add More Features

**Todo List:**
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
    todos.update(s => ({ items: [...s.items, newItem.trim()] }));
    newItem = '';
  }
  
  function removeTodo(index: number) {
    todos.update(s => ({ 
      items: s.items.filter((_, i) => i !== index) 
    }));
  }
</script>

<input bind:value={newItem} onkeydown={(e) => e.key === 'Enter' && addTodo()} />
<button onclick={addTodo}>Add</button>

<ul>
  {#each $todos.items as item, i}
    <li>
      {item}
      <button onclick={() => removeTodo(i)}>×</button>
    </li>
  {/each}
</ul>
```

**Collaborative Text Field:**
```svelte
<script lang="ts">
  import { collabWritable } from 'svelte-collab';
  
  const doc = collabWritable(
    { title: '', content: '' },
    { room: 'doc', serverUrl: 'ws://localhost:1234' }
  );
</script>

<input bind:value={$doc.title} placeholder="Title" />
<textarea bind:value={$doc.content} placeholder="Start writing..."></textarea>
```

## 🛠️ Troubleshooting

### "WebSocket connection failed"
- Make sure the server is running (`pnpm run server`)
- Check that nothing else is using port 1234
- Verify the `serverUrl` is correct

### "Changes not syncing"
- Make sure you're using the same `room` name in both tabs
- Check the browser console for errors
- Restart the WebSocket server

### "indexedDB is not defined"
- This is normal during tests or in Node.js environments
- The library automatically disables IndexedDB in non-browser environments

## 📚 Next Steps

- Read the [full README](./README.md) for advanced usage
- Check out the [PROJECT_SPEC](./PROJECT_SPEC.md) for the roadmap
- Run `pnpm dev` to see the included demo app
- Explore the [examples in the demo](./src/routes/+page.svelte)

## 💡 Tips

1. **Unique Rooms**: Use unique room IDs for different parts of your app
2. **Clean Up**: Always call `store.destroy()` in `onDestroy()`
3. **Persistence**: Set `persist: false` if you don't want local caching
4. **Debug Mode**: Enable `debug: true` to see detailed logs
5. **Connection State**: Use `store.getConnectionState()` to show connection status

## 🎮 Try the Full Demo

Run the included demo application:

```bash
pnpm dev
```

Then visit http://localhost:5173 to see:
- ✅ Shared counter
- ✅ Collaborative message input
- ✅ Real-time todo list
- ✅ Connection status indicator

---

**Happy Collaborating! 🤝**

