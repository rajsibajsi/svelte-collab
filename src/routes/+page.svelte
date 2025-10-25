<script lang="ts">
import { onDestroy } from "svelte";
import { collabWritable } from "$lib/index.js";
import { browser } from "$app/environment";

// Create a collaborative store (only on client side)
let store: any = null;

if (browser) {
	store = collabWritable(
		{
			count: 0,
			message: "Hello, collaborative world!",
			items: [] as string[],
		},
		{
			room: "demo-room",
			serverUrl: "ws://localhost:1234",
			persist: true,
			debug: true,
			user: {
				name: `User-${Math.floor(Math.random() * 1000)}`,
				color: `hsl(${Math.random() * 360}, 70%, 60%)`,
			},
		},
	);
}

let newItem = $state("");
let message = $state("");

// Extract connection state store for easier access
// biome-ignore lint/correctness/noUnusedVariables: Used in Svelte template via $connectionState
const { connectionState } = store || { connectionState: { subscribe: () => () => {} } };

// Update message when store changes
$effect(() => {
	if (store) {
		message = $store?.message || "";
	}
});

// Update store when message changes
$effect(() => {
	if (store && message !== ($store?.message || "")) {
		store.update((s: any) => ({ ...s, message }));
	}
});

// biome-ignore lint/correctness/noUnusedVariables: Used in Svelte template
function increment() {
	if (store) {
		store.update((state: any) => ({
			...state,
			count: (state.count ?? 0) + 1,
		}));
	}
}

// biome-ignore lint/correctness/noUnusedVariables: Used in Svelte template
function decrement() {
	if (store) {
		store.update((state: any) => ({
			...state,
			count: (state.count ?? 0) - 1,
		}));
	}
}

// biome-ignore lint/correctness/noUnusedVariables: Used in Svelte template
function addItem() {
	if (!newItem.trim() || !store) return;

	store.update((state: any) => ({
		...state,
		items: [...(state.items ?? []), newItem.trim()],
	}));

	newItem = "";
}

// biome-ignore lint/correctness/noUnusedVariables: Used in Svelte template
function removeItem(index: number) {
	if (store) {
		store.update((state: any) => ({
			...state,
			items: (state.items ?? []).filter((_: any, i: any) => i !== index),
		}));
	}
}

// biome-ignore lint/correctness/noUnusedVariables: Used in Svelte template
function clearAll() {
	if (store) {
		store.set({
			count: 0,
			message: "Hello, collaborative world!",
			items: [],
		});
	}
}

// Cleanup on destroy
onDestroy(() => {
	if (store) {
		store.destroy();
	}
});

// Connection status color
// biome-ignore lint/correctness/noUnusedVariables: Used in Svelte template
const statusColor = $derived.by(() => {
	if (!connectionState || !store) return "bg-gray-500";
	try {
		switch ($connectionState.status) {
			case "connected":
				return "bg-green-500";
			case "connecting":
				return "bg-yellow-500";
			case "disconnected":
				return "bg-gray-500";
			case "error":
				return "bg-red-500";
			default:
				return "bg-gray-500";
		}
	} catch {
		return "bg-gray-500";
	}
});
</script>

<div class="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
	<div class="max-w-4xl mx-auto">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="text-5xl font-bold text-gray-900 mb-4">
				🤝 svelte-collab
			</h1>
			<p class="text-xl text-gray-600">
				Reactive real-time collaboration primitives for Svelte
			</p>
			
			<!-- Connection Status -->
			<div class="mt-4 flex items-center justify-center gap-3" data-testid="connection-status">
				<div class="flex items-center gap-2">
					<div class="w-3 h-3 rounded-full {statusColor} animate-pulse"></div>
					<span class="text-sm font-medium text-gray-700">
						{connectionState ? $connectionState.status : "disconnected"}
					</span>
				</div>
				<div class="text-sm text-gray-500">
					Room: <code class="bg-white px-2 py-1 rounded">demo-room</code>
				</div>
			</div>
		</div>

		<!-- Demo Cards -->
		<div class="grid md:grid-cols-2 gap-6 mb-8">
			<!-- Counter Card -->
			<div class="bg-white rounded-xl shadow-lg p-6">
				<h2 class="text-2xl font-bold mb-4 text-gray-800">
					🔢 Shared Counter
				</h2>
				
				<div class="flex items-center justify-center gap-4 mb-6">
					<button
						onclick={decrement}
						class="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-lg text-2xl font-bold transition-colors"
						data-testid="decrement-btn"
					>
						−
					</button>
					
					<div class="text-6xl font-bold text-purple-600 min-w-[120px] text-center" data-testid="counter-display">
						{store ? ($store?.count ?? 0) : 0}
					</div>
					
					<button
						onclick={increment}
						class="w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-lg text-2xl font-bold transition-colors"
						data-testid="increment-btn"
					>
						+
					</button>
				</div>
				
				<p class="text-sm text-gray-600 text-center">
					Click the buttons to increment/decrement. Changes sync in real-time!
				</p>
			</div>

			<!-- Message Card -->
			<div class="bg-white rounded-xl shadow-lg p-6">
				<h2 class="text-2xl font-bold mb-4 text-gray-800">
					💬 Shared Message
				</h2>
				
				<input
					type="text"
					bind:value={message}
					class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-lg"
					placeholder="Type a message..."
					data-testid="message-input"
				/>
				<div class="text-sm text-gray-600 mt-4" data-testid="message-display">
					{store ? ($store?.message || "") : ""}
				</div>
				
				<p class="text-sm text-gray-600 mt-4">
					Type to edit. Your changes appear instantly for all connected users!
				</p>
			</div>
		</div>

		<!-- Todo List Card -->
		<div class="bg-white rounded-xl shadow-lg p-6 mb-8">
			<h2 class="text-2xl font-bold mb-4 text-gray-800">
				✅ Shared Todo List
			</h2>
			
			<div class="flex gap-2 mb-4">
				<input
					type="text"
					bind:value={newItem}
					onkeydown={(e) => e.key === 'Enter' && addItem()}
					class="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
					placeholder="Add a new item..."
					data-testid="todo-input"
				/>
				<button
					onclick={addItem}
					class="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
					data-testid="add-todo-btn"
				>
					Add
				</button>
			</div>
			
			{#if store && $store?.items && $store.items.length > 0}
				<ul class="space-y-2" data-testid="todo-list">
					{#each $store.items as item, index}
						<li class="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
							<span class="text-gray-800">{item}</span>
							<button
								onclick={() => removeItem(index)}
								class="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
								data-testid="remove-todo-btn"
							>
								Remove
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-gray-500 text-center py-8">
					No items yet. Add one to get started!
				</p>
			{/if}
		</div>

		<!-- Instructions -->
		<div class="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
			<h3 class="text-lg font-bold text-blue-900 mb-2">
				🎮 Try it out!
			</h3>
			<ol class="list-decimal list-inside space-y-1 text-blue-800">
				<li>Start the WebSocket server: <code class="bg-white px-2 py-1 rounded">npm run server</code></li>
				<li>Open this page in multiple browser tabs or windows</li>
				<li>Make changes in one tab and watch them appear in others instantly!</li>
				<li>Close and reopen tabs - your state is persisted in IndexedDB</li>
			</ol>
		</div>

		<!-- Controls -->
		<div class="flex gap-4 justify-center">
			<button
				onclick={() => store?.disconnect()}
				class="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
			>
				Disconnect
			</button>
			<button
				onclick={() => store?.connect()}
				class="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
			>
				Reconnect
			</button>
			<button
				onclick={clearAll}
				class="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
				data-testid="clear-all-btn"
			>
				Clear All
			</button>
		</div>

		<!-- Footer -->
		<div class="mt-12 text-center text-gray-600">
			<p class="text-sm">
				Built with ❤️ using Y.js and Svelte 5
			</p>
		</div>
	</div>
</div>
