import { expect, test } from "@playwright/test";

test.describe("Real-Time Collaboration E2E Tests", () => {
	// biome-ignore lint/suspicious/noExplicitAny: Test process variables need flexible typing
	let serverProcess: any = null;
	// biome-ignore lint/suspicious/noExplicitAny: Test process variables need flexible typing
	let websocketProcess: any = null;

	test.beforeAll(async () => {
		// Start the WebSocket server
		const { spawn } = await import("node:child_process");
		websocketProcess = spawn("tsx", ["server/websocket.ts"], {
			stdio: "pipe",
			env: { ...process.env, PORT: "1234" },
		});

		// Start the development server
		serverProcess = spawn("npm", ["run", "dev"], {
			stdio: "pipe",
			env: { ...process.env, PORT: "5173" },
		});

		// Wait for servers to start
		await new Promise((resolve) => setTimeout(resolve, 5000));
	});

	test.afterAll(async () => {
		if (serverProcess) {
			serverProcess.kill("SIGTERM");
		}
		if (websocketProcess) {
			websocketProcess.kill("SIGTERM");
		}
	});

	test("should sync counter between multiple browser contexts", async ({
		browser,
	}) => {
		// Create two browser contexts (simulating different users)
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();

		const page1 = await context1.newPage();
		const page2 = await context2.newPage();

		try {
			// Navigate both pages to the demo
			await page1.goto("http://localhost:5173");
			await page2.goto("http://localhost:5173");

			// Wait for connection
			await page1.waitForSelector("[data-testid='connection-status']");
			await page2.waitForSelector("[data-testid='connection-status']");

			// Wait for connection to be established
			await page1.waitForSelector("text=Connected", { timeout: 10000 });
			await page2.waitForSelector("text=Connected", { timeout: 10000 });

			// Get counter elements
			const counter1 = page1.locator("[data-testid='counter-display']");
			const counter2 = page2.locator("[data-testid='counter-display']");
			const incrementBtn1 = page1.locator("[data-testid='increment-btn']");
			const incrementBtn2 = page2.locator("[data-testid='increment-btn']");

			// Initial state should be 0
			await expect(counter1).toContainText("0");
			await expect(counter2).toContainText("0");

			// User 1 increments
			await incrementBtn1.click();
			await expect(counter1).toContainText("1");

			// Wait for sync to page 2
			await expect(counter2).toContainText("1", { timeout: 5000 });

			// User 2 increments
			await incrementBtn2.click();
			await expect(counter2).toContainText("2");

			// Wait for sync to page 1
			await expect(counter1).toContainText("2", { timeout: 5000 });

			// User 1 increments again
			await incrementBtn1.click();
			await expect(counter1).toContainText("3");

			// Wait for sync to page 2
			await expect(counter2).toContainText("3", { timeout: 5000 });
		} finally {
			await context1.close();
			await context2.close();
		}
	});

	test("should sync messages between multiple browser contexts", async ({
		browser,
	}) => {
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();

		const page1 = await context1.newPage();
		const page2 = await context2.newPage();

		try {
			await page1.goto("http://localhost:5173");
			await page2.goto("http://localhost:5173");

			// Wait for connection
			await page1.waitForSelector("text=Connected", { timeout: 10000 });
			await page2.waitForSelector("text=Connected", { timeout: 10000 });

			// Get message elements
			const messageInput1 = page1.locator("[data-testid='message-input']");
			const messageInput2 = page2.locator("[data-testid='message-input']");
			const messageDisplay1 = page1.locator("[data-testid='message-display']");
			const messageDisplay2 = page2.locator("[data-testid='message-display']");

			// User 1 types a message
			await messageInput1.fill("Hello from User 1!");
			await expect(messageDisplay1).toContainText("Hello from User 1!");

			// Wait for sync to page 2
			await expect(messageDisplay2).toContainText("Hello from User 1!", {
				timeout: 5000,
			});

			// User 2 types a message
			await messageInput2.fill("Hello from User 2!");
			await expect(messageDisplay2).toContainText("Hello from User 2!");

			// Wait for sync to page 1
			await expect(messageDisplay1).toContainText("Hello from User 2!", {
				timeout: 5000,
			});
		} finally {
			await context1.close();
			await context2.close();
		}
	});

	test("should sync todo list between multiple browser contexts", async ({
		browser,
	}) => {
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();

		const page1 = await context1.newPage();
		const page2 = await context2.newPage();

		try {
			await page1.goto("http://localhost:5173");
			await page2.goto("http://localhost:5173");

			// Wait for connection
			await page1.waitForSelector("text=Connected", { timeout: 10000 });
			await page2.waitForSelector("text=Connected", { timeout: 10000 });

			// Get todo elements
			const todoInput1 = page1.locator("[data-testid='todo-input']");
			const todoInput2 = page2.locator("[data-testid='todo-input']");
			const addTodoBtn1 = page1.locator("[data-testid='add-todo-btn']");
			const addTodoBtn2 = page2.locator("[data-testid='add-todo-btn']");
			const todoList1 = page1.locator("[data-testid='todo-list']");
			const todoList2 = page2.locator("[data-testid='todo-list']");

			// User 1 adds a todo
			await todoInput1.fill("Todo from User 1");
			await addTodoBtn1.click();
			await expect(todoList1).toContainText("Todo from User 1");

			// Wait for sync to page 2
			await expect(todoList2).toContainText("Todo from User 1", {
				timeout: 5000,
			});

			// User 2 adds a todo
			await todoInput2.fill("Todo from User 2");
			await addTodoBtn2.click();
			await expect(todoList2).toContainText("Todo from User 2");

			// Wait for sync to page 1
			await expect(todoList1).toContainText("Todo from User 2", {
				timeout: 5000,
			});

			// Both should have both todos
			await expect(todoList1.locator("li")).toHaveCount(2);
			await expect(todoList2.locator("li")).toHaveCount(2);
		} finally {
			await context1.close();
			await context2.close();
		}
	});

	test("should handle todo removal across contexts", async ({ browser }) => {
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();

		const page1 = await context1.newPage();
		const page2 = await context2.newPage();

		try {
			await page1.goto("http://localhost:5173");
			await page2.goto("http://localhost:5173");

			// Wait for connection
			await page1.waitForSelector("text=Connected", { timeout: 10000 });
			await page2.waitForSelector("text=Connected", { timeout: 10000 });

			// Add todos from both users
			const todoInput1 = page1.locator("[data-testid='todo-input']");
			const todoInput2 = page2.locator("[data-testid='todo-input']");
			const addTodoBtn1 = page1.locator("[data-testid='add-todo-btn']");
			const addTodoBtn2 = page2.locator("[data-testid='add-todo-btn']");

			await todoInput1.fill("Todo 1");
			await addTodoBtn1.click();
			await todoInput2.fill("Todo 2");
			await addTodoBtn2.click();

			// Wait for both todos to sync
			await page1.waitForSelector("[data-testid='todo-list'] li:nth-child(2)", {
				timeout: 5000,
			});
			await page2.waitForSelector("[data-testid='todo-list'] li:nth-child(2)", {
				timeout: 5000,
			});

			// User 1 removes a todo
			const removeBtn1 = page1
				.locator("[data-testid='remove-todo-btn']")
				.first();
			await removeBtn1.click();

			// Wait for sync
			await page1.waitForSelector("[data-testid='todo-list'] li", {
				timeout: 5000,
			});
			await page2.waitForSelector("[data-testid='todo-list'] li", {
				timeout: 5000,
			});

			// Both should have 1 todo remaining
			await expect(page1.locator("[data-testid='todo-list'] li")).toHaveCount(
				1,
			);
			await expect(page2.locator("[data-testid='todo-list'] li")).toHaveCount(
				1,
			);
		} finally {
			await context1.close();
			await context2.close();
		}
	});

	test("should handle clear all across contexts", async ({ browser }) => {
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();

		const page1 = await context1.newPage();
		const page2 = await context2.newPage();

		try {
			await page1.goto("http://localhost:5173");
			await page2.goto("http://localhost:5173");

			// Wait for connection
			await page1.waitForSelector("text=Connected", { timeout: 10000 });
			await page2.waitForSelector("text=Connected", { timeout: 10000 });

			// Add todos from both users
			const todoInput1 = page1.locator("[data-testid='todo-input']");
			const todoInput2 = page2.locator("[data-testid='todo-input']");
			const addTodoBtn1 = page1.locator("[data-testid='add-todo-btn']");
			const addTodoBtn2 = page2.locator("[data-testid='add-todo-btn']");

			await todoInput1.fill("Todo 1");
			await addTodoBtn1.click();
			await todoInput2.fill("Todo 2");
			await addTodoBtn2.click();

			// Wait for both todos to sync
			await page1.waitForSelector("[data-testid='todo-list'] li:nth-child(2)", {
				timeout: 5000,
			});
			await page2.waitForSelector("[data-testid='todo-list'] li:nth-child(2)", {
				timeout: 5000,
			});

			// User 1 clears all
			const clearAllBtn1 = page1.locator("[data-testid='clear-all-btn']");
			await clearAllBtn1.click();

			// Wait for sync
			await page1.waitForSelector("[data-testid='todo-list']", {
				timeout: 5000,
			});
			await page2.waitForSelector("[data-testid='todo-list']", {
				timeout: 5000,
			});

			// Both should have no todos
			await expect(page1.locator("[data-testid='todo-list'] li")).toHaveCount(
				0,
			);
			await expect(page2.locator("[data-testid='todo-list'] li")).toHaveCount(
				0,
			);
		} finally {
			await context1.close();
			await context2.close();
		}
	});

	test("should handle rapid concurrent updates", async ({ browser }) => {
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();

		const page1 = await context1.newPage();
		const page2 = await context2.newPage();

		try {
			await page1.goto("http://localhost:5173");
			await page2.goto("http://localhost:5173");

			// Wait for connection
			await page1.waitForSelector("text=Connected", { timeout: 10000 });
			await page2.waitForSelector("text=Connected", { timeout: 10000 });

			// Rapid counter updates from both users
			const incrementBtn1 = page1.locator("[data-testid='increment-btn']");
			const incrementBtn2 = page2.locator("[data-testid='increment-btn']");
			const counter1 = page1.locator("[data-testid='counter-display']");
			const counter2 = page2.locator("[data-testid='counter-display']");

			// Rapid clicks from both users
			for (let i = 0; i < 5; i++) {
				await incrementBtn1.click();
				await incrementBtn2.click();
			}

			// Wait for all updates to sync
			await page1.waitForTimeout(2000);
			await page2.waitForTimeout(2000);

			// Both should have the same final value
			const finalValue1 = await counter1.textContent();
			const finalValue2 = await counter2.textContent();
			expect(finalValue1).toBe(finalValue2);
			expect(parseInt(finalValue1 || "0", 10)).toBeGreaterThan(0);
		} finally {
			await context1.close();
			await context2.close();
		}
	});

	test("should handle connection state changes", async ({ browser }) => {
		const context1 = await browser.newContext();
		const page1 = await context1.newPage();

		try {
			await page1.goto("http://localhost:5173");

			// Should start disconnected
			await expect(
				page1.locator("[data-testid='connection-status']"),
			).toContainText("Disconnected");

			// Wait for connection attempt
			await page1.waitForSelector("text=Connecting", { timeout: 5000 });

			// Should eventually connect
			await page1.waitForSelector("text=Connected", { timeout: 10000 });

			// Kill WebSocket server
			if (websocketProcess) {
				websocketProcess.kill("SIGTERM");
				websocketProcess = null;
			}

			// Should show disconnected
			await page1.waitForSelector("text=Disconnected", { timeout: 5000 });
		} finally {
			await context1.close();
		}
	});
});
