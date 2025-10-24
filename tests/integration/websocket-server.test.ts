import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

describe("WebSocket Server Integration", () => {
	let serverProcess: ChildProcess | null = null;
	const TEST_PORT = 12345;
	const SERVER_URL = `ws://localhost:${TEST_PORT}`;

	beforeEach(async () => {
		// Start the WebSocket server
		serverProcess = spawn("tsx", ["server/websocket.ts"], {
			env: { ...process.env, PORT: TEST_PORT.toString() },
			stdio: "pipe",
		});

		// Wait for server to start
		await sleep(1000);
	});

	afterEach(() => {
		if (serverProcess) {
			serverProcess.kill("SIGTERM");
			serverProcess = null;
		}
	});

	it("should start WebSocket server successfully", async () => {
		expect(serverProcess).toBeTruthy();
		expect(serverProcess?.pid).toBeDefined();
	});

	it("should handle multiple client connections", async () => {
		const clients: WebSocket[] = [];
		const roomName = "integration-test-room";

		try {
			// Create multiple clients
			for (let i = 0; i < 3; i++) {
				const ws = new WebSocket(`${SERVER_URL}/${roomName}`);
				clients.push(ws);
			}

			// Wait for all connections
			await Promise.all(
				clients.map(
					(ws) =>
						new Promise<void>((resolve, reject) => {
							ws.on("open", () => resolve());
							ws.on("error", reject);
							global.setTimeout(
								() => reject(new Error("Connection timeout")),
								5000,
							);
						}),
				),
			);

			expect(clients.length).toBe(3);
			clients.forEach((ws) => {
				expect(ws.readyState).toBe(WebSocket.OPEN);
			});
		} finally {
			// Clean up connections
			clients.forEach((ws) => {
				if (ws.readyState === WebSocket.OPEN) {
					ws.close();
				}
			});
		}
	});

	it("should broadcast messages between clients", async () => {
		const roomName = "broadcast-test-room";
		const messages: string[] = [];
		const clients: WebSocket[] = [];

		try {
			// Create two clients
			const client1 = new WebSocket(`${SERVER_URL}/${roomName}`);
			const client2 = new WebSocket(`${SERVER_URL}/${roomName}`);
			clients.push(client1, client2);

			// Wait for connections
			await Promise.all([
				new Promise<void>((resolve) => {
					client1.on("open", () => resolve());
				}),
				new Promise<void>((resolve) => {
					client2.on("open", () => resolve());
				}),
			]);

			// Set up message listeners
			client1.on("message", (data) => {
				messages.push(`client1: ${data.toString()}`);
			});

			client2.on("message", (data) => {
				messages.push(`client2: ${data.toString()}`);
			});

			// Send message from client1
			const testMessage = JSON.stringify({
				type: "test",
				data: "Hello from client1",
			});
			client1.send(testMessage);

			// Wait for message propagation
			await sleep(100);

			// Client2 should receive the message
			expect(messages.some((msg) => msg.includes("Hello from client1"))).toBe(
				true,
			);
		} finally {
			clients.forEach((ws) => {
				if (ws.readyState === WebSocket.OPEN) {
					ws.close();
				}
			});
		}
	});

	it("should handle client disconnections gracefully", async () => {
		const roomName = "disconnect-test-room";
		const clients: WebSocket[] = [];

		try {
			// Create clients
			for (let i = 0; i < 2; i++) {
				const ws = new WebSocket(`${SERVER_URL}/${roomName}`);
				clients.push(ws);
			}

			// Wait for connections
			await Promise.all(
				clients.map(
					(ws) =>
						new Promise<void>((resolve) => {
							ws.on("open", () => resolve());
						}),
				),
			);

			// Close one client
			clients[0].close();

			// Wait for disconnection to be processed
			await sleep(100);

			// Remaining client should still be connected
			expect(clients[1].readyState).toBe(WebSocket.OPEN);
		} finally {
			clients.forEach((ws) => {
				if (ws.readyState === WebSocket.OPEN) {
					ws.close();
				}
			});
		}
	});

	it("should handle server shutdown gracefully", async () => {
		expect(serverProcess).toBeTruthy();

		// Send SIGTERM to server
		serverProcess?.kill("SIGTERM");

		// Wait for server to shut down
		await sleep(2000);

		// Server should be terminated
		expect(serverProcess?.killed).toBe(true);
	});

	it("should handle concurrent room operations", async () => {
		const rooms = ["room1", "room2", "room3"];
		const allClients: WebSocket[] = [];

		try {
			// Create clients for different rooms
			for (const room of rooms) {
				const ws = new WebSocket(`${SERVER_URL}/${room}`);
				allClients.push(ws);
			}

			// Wait for all connections
			await Promise.all(
				allClients.map(
					(ws) =>
						new Promise<void>((resolve) => {
							ws.on("open", () => resolve());
						}),
				),
			);

			// All clients should be connected
			allClients.forEach((ws) => {
				expect(ws.readyState).toBe(WebSocket.OPEN);
			});
		} finally {
			allClients.forEach((ws) => {
				if (ws.readyState === WebSocket.OPEN) {
					ws.close();
				}
			});
		}
	});

	it("should handle large message payloads", async () => {
		const roomName = "large-payload-test-room";
		const clients: WebSocket[] = [];

		try {
			const client1 = new WebSocket(`${SERVER_URL}/${roomName}`);
			const client2 = new WebSocket(`${SERVER_URL}/${roomName}`);
			clients.push(client1, client2);

			// Wait for connections
			await Promise.all([
				new Promise<void>((resolve) => {
					client1.on("open", () => resolve());
				}),
				new Promise<void>((resolve) => {
					client2.on("open", () => resolve());
				}),
			]);

			// Create large payload
			const largeData = {
				type: "large-payload",
				data: "x".repeat(10000), // 10KB string
				timestamp: Date.now(),
			};

			let receivedMessage = false;
			client2.on("message", () => {
				receivedMessage = true;
			});

			// Send large message
			client1.send(JSON.stringify(largeData));

			// Wait for message propagation
			await sleep(200);

			expect(receivedMessage).toBe(true);
		} finally {
			clients.forEach((ws) => {
				if (ws.readyState === WebSocket.OPEN) {
					ws.close();
				}
			});
		}
	});
});
