import { test, expect } from "@playwright/test";

test.describe("Collaboration E2E Tests", () => {
	let serverProcess: any = null;

	test.beforeAll(async () => {
		// Start the development server
		const { spawn } = await import("node:child_process");
		serverProcess = spawn("npm", ["run", "dev"], {
			stdio: "pipe",
			env: { ...process.env, PORT: "5173" },
		});

		// Wait for server to start
		await new Promise((resolve) => setTimeout(resolve, 3000));
	});

	test.afterAll(async () => {
		if (serverProcess) {
			serverProcess.kill("SIGTERM");
		}
	});

	test("should display the demo page", async ({ page }) => {
		await page.goto("http://localhost:5173");
		
		// Check if the page loads
		await expect(page).toHaveTitle(/Svelte Collab/);
		
		// Check for key elements
		await expect(page.locator("h1")).toContainText("Svelte Collab Demo");
		await expect(page.locator("text=Collaborative Counter")).toBeVisible();
		await expect(page.locator("text=Message Input")).toBeVisible();
		await expect(page.locator("text=Todo List")).toBeVisible();
	});

	test("should show connection status", async ({ page }) => {
		await page.goto("http://localhost:5173");
		
		// Check connection status indicator
		await expect(page.locator("[data-testid='connection-status']")).toBeVisible();
		
		// Should show disconnected initially (no WebSocket server running)
		await expect(page.locator("text=Disconnected")).toBeVisible();
	});

	test("should handle counter operations", async ({ page }) => {
		await page.goto("http://localhost:5173");
		
		// Find counter elements
		const counterDisplay = page.locator("[data-testid='counter-display']");
		const incrementBtn = page.locator("[data-testid='increment-btn']");
		const decrementBtn = page.locator("[data-testid='decrement-btn']");
		
		// Initial state
		await expect(counterDisplay).toContainText("0");
		
		// Test increment
		await incrementBtn.click();
		await expect(counterDisplay).toContainText("1");
		
		// Test multiple increments
		await incrementBtn.click();
		await incrementBtn.click();
		await expect(counterDisplay).toContainText("3");
		
		// Test decrement
		await decrementBtn.click();
		await expect(counterDisplay).toContainText("2");
	});

	test("should handle message input", async ({ page }) => {
		await page.goto("http://localhost:5173");
		
		// Find message input
		const messageInput = page.locator("[data-testid='message-input']");
		const messageDisplay = page.locator("[data-testid='message-display']");
		
		// Type message
		await messageInput.fill("Hello, World!");
		await expect(messageDisplay).toContainText("Hello, World!");
		
		// Clear message
		await messageInput.fill("");
		await expect(messageDisplay).toContainText("");
	});

	test("should handle todo list operations", async ({ page }) => {
		await page.goto("http://localhost:5173");
		
		// Find todo elements
		const todoInput = page.locator("[data-testid='todo-input']");
		const addTodoBtn = page.locator("[data-testid='add-todo-btn']");
		const todoList = page.locator("[data-testid='todo-list']");
		
		// Add todos
		await todoInput.fill("Buy groceries");
		await addTodoBtn.click();
		await expect(todoList).toContainText("Buy groceries");
		
		await todoInput.fill("Walk the dog");
		await addTodoBtn.click();
		await expect(todoList).toContainText("Walk the dog");
		
		// Check that both todos are present
		await expect(todoList.locator("li")).toHaveCount(2);
		
		// Remove a todo
		const removeBtn = page.locator("[data-testid='remove-todo-btn']").first();
		await removeBtn.click();
		await expect(todoList.locator("li")).toHaveCount(1);
	});

	test("should handle clear all functionality", async ({ page }) => {
		await page.goto("http://localhost:5173");
		
		// Add some todos first
		const todoInput = page.locator("[data-testid='todo-input']");
		const addTodoBtn = page.locator("[data-testid='add-todo-btn']");
		const todoList = page.locator("[data-testid='todo-list']");
		
		await todoInput.fill("Todo 1");
		await addTodoBtn.click();
		await todoInput.fill("Todo 2");
		await addTodoBtn.click();
		
		// Verify todos exist
		await expect(todoList.locator("li")).toHaveCount(2);
		
		// Clear all
		const clearAllBtn = page.locator("[data-testid='clear-all-btn']");
		await clearAllBtn.click();
		
		// Verify todos are cleared
		await expect(todoList.locator("li")).toHaveCount(0);
	});

	test("should handle form validation", async ({ page }) => {
		await page.goto("http://localhost:5173");
		
		// Try to add empty todo
		const addTodoBtn = page.locator("[data-testid='add-todo-btn']");
		const todoList = page.locator("[data-testid='todo-list']");
		
		await addTodoBtn.click();
		await expect(todoList.locator("li")).toHaveCount(0);
		
		// Try to add todo with only whitespace
		const todoInput = page.locator("[data-testid='todo-input']");
		await todoInput.fill("   ");
		await addTodoBtn.click();
		await expect(todoList.locator("li")).toHaveCount(0);
	});

	test("should handle rapid user interactions", async ({ page }) => {
		await page.goto("http://localhost:5173");
		
		// Rapid counter clicks
		const incrementBtn = page.locator("[data-testid='increment-btn']");
		const counterDisplay = page.locator("[data-testid='counter-display']");
		
		// Click rapidly
		for (let i = 0; i < 10; i++) {
			await incrementBtn.click();
		}
		
		// Should handle all clicks
		await expect(counterDisplay).toContainText("10");
		
		// Rapid todo additions
		const todoInput = page.locator("[data-testid='todo-input']");
		const addTodoBtn = page.locator("[data-testid='add-todo-btn']");
		const todoList = page.locator("[data-testid='todo-list']");
		
		for (let i = 0; i < 5; i++) {
			await todoInput.fill(`Todo ${i + 1}`);
			await addTodoBtn.click();
		}
		
		// Should handle all additions
		await expect(todoList.locator("li")).toHaveCount(5);
	});

	test("should handle page refresh gracefully", async ({ page }) => {
		await page.goto("http://localhost:5173");
		
		// Add some data
		const counterDisplay = page.locator("[data-testid='counter-display']");
		const incrementBtn = page.locator("[data-testid='increment-btn']");
		const todoInput = page.locator("[data-testid='todo-input']");
		const addTodoBtn = page.locator("[data-testid='add-todo-btn']");
		
		await incrementBtn.click();
		await incrementBtn.click();
		await todoInput.fill("Persistent todo");
		await addTodoBtn.click();
		
		// Refresh page
		await page.reload();
		
		// Should reset to initial state (no persistence without server)
		await expect(counterDisplay).toContainText("0");
		await expect(page.locator("[data-testid='todo-list']").locator("li")).toHaveCount(0);
	});

	test("should handle keyboard interactions", async ({ page }) => {
		await page.goto("http://localhost:5173");
		
		// Test Enter key on todo input
		const todoInput = page.locator("[data-testid='todo-input']");
		const todoList = page.locator("[data-testid='todo-list']");
		
		await todoInput.fill("Keyboard todo");
		await todoInput.press("Enter");
		await expect(todoList).toContainText("Keyboard todo");
		
		// Test message input
		const messageInput = page.locator("[data-testid='message-input']");
		const messageDisplay = page.locator("[data-testid='message-display']");
		
		await messageInput.fill("Keyboard message");
		await expect(messageDisplay).toContainText("Keyboard message");
	});

	test("should handle edge cases", async ({ page }) => {
		await page.goto("http://localhost:5173");
		
		// Test very long input
		const messageInput = page.locator("[data-testid='message-input']");
		const longMessage = "A".repeat(1000);
		await messageInput.fill(longMessage);
		await expect(page.locator("[data-testid='message-display']")).toContainText(longMessage);
		
		// Test special characters
		const todoInput = page.locator("[data-testid='todo-input']");
		const specialTodo = "Todo with émojis 🎉 and spëcial chars!";
		await todoInput.fill(specialTodo);
		await page.locator("[data-testid='add-todo-btn']").click();
		await expect(page.locator("[data-testid='todo-list']")).toContainText(specialTodo);
	});
});
