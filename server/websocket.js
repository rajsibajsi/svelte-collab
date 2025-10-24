#!/usr/bin/env node

/**
 * Simple Y.js WebSocket server for development
 * 
 * Usage:
 *   node server/websocket.js [port]
 *   npm run server
 * 
 * Environment variables:
 *   PORT - Server port (default: 1234)
 *   HOST - Server host (default: localhost)
 */

import * as http from 'http';
import * as map from 'lib0/map';
import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 1234;
const HOST = process.env.HOST || 'localhost';

// Store for active documents
const docs = new Map();

// Garbage collection interval for inactive rooms
const GC_INTERVAL = 30000; // 30 seconds

/**
 * Get or create a document room
 */
function getDoc(docName) {
	return map.setIfUndefined(docs, docName, () => {
		const doc = {
			name: docName,
			connections: new Map(),
			created: Date.now(),
			lastActivity: Date.now()
		};
		console.log(`📄 Created room: ${docName}`);
		return doc;
	});
}

/**
 * Clean up inactive rooms
 */
function garbageCollect() {
	const now = Date.now();
	const timeout = 5 * 60 * 1000; // 5 minutes

	docs.forEach((doc, docName) => {
		if (doc.connections.size === 0 && now - doc.lastActivity > timeout) {
			console.log(`🗑️  Removing inactive room: ${docName}`);
			docs.delete(docName);
		}
	});
}

// Create HTTP server
const server = http.createServer((req, res) => {
	if (req.url === '/health') {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({
			status: 'ok',
			rooms: docs.size,
			uptime: process.uptime()
		}));
	} else if (req.url === '/rooms') {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		const rooms = Array.from(docs.entries()).map(([name, doc]) => ({
			name,
			connections: doc.connections.size,
			created: doc.created,
			lastActivity: doc.lastActivity
		}));
		res.end(JSON.stringify({ rooms }));
	} else {
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end(`
<!DOCTYPE html>
<html>
<head>
	<title>Y.js WebSocket Server</title>
	<style>
		body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; }
		h1 { color: #ff3e00; }
		.status { background: #f0f0f0; padding: 20px; border-radius: 8px; }
		.endpoint { background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin: 10px 0; }
		code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
	</style>
</head>
<body>
	<h1>🚀 Y.js WebSocket Server</h1>
	<div class="status">
		<p><strong>Status:</strong> Running</p>
		<p><strong>WebSocket URL:</strong> <code>ws://${HOST}:${PORT}</code></p>
		<p><strong>Active Rooms:</strong> <span id="rooms">${docs.size}</span></p>
	</div>
	
	<h2>Endpoints</h2>
	<div class="endpoint">
		<strong>GET /health</strong> - Health check
	</div>
	<div class="endpoint">
		<strong>GET /rooms</strong> - List active rooms
	</div>
	<div class="endpoint">
		<strong>WebSocket</strong> - Connect with Y.js client
	</div>

	<h2>Usage Example</h2>
	<pre><code>import { collabWritable } from 'svelte-collab';

const store = collabWritable({ count: 0 }, {
  room: 'my-room',
  serverUrl: 'ws://${HOST}:${PORT}'
});</code></pre>

	<script>
		// Auto-refresh room count
		setInterval(() => {
			fetch('/rooms')
				.then(r => r.json())
				.then(data => {
					document.getElementById('rooms').textContent = data.rooms.length;
				});
		}, 2000);
	</script>
</body>
</html>
		`);
	}
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
	// Parse room name from URL
	const url = new URL(req.url, `http://${req.headers.host}`);
	const roomName = url.searchParams.get('room') || url.pathname.slice(1) || 'default';
	
	const doc = getDoc(roomName);
	doc.lastActivity = Date.now();

	const connId = Math.random().toString(36).slice(2, 11);
	doc.connections.set(connId, ws);

	console.log(`👤 Client connected to room: ${roomName} (${doc.connections.size} total)`);

	// Set up message handling
	ws.on('message', (message) => {
		doc.lastActivity = Date.now();
		
		// Broadcast to all other connections in the same room
		doc.connections.forEach((conn, id) => {
			if (id !== connId && conn.readyState === ws.OPEN) {
				conn.send(message);
			}
		});
	});

	ws.on('close', () => {
		doc.connections.delete(connId);
		console.log(`👋 Client disconnected from room: ${roomName} (${doc.connections.size} remaining)`);
		
		if (doc.connections.size === 0) {
			doc.lastActivity = Date.now();
		}
	});

	ws.on('error', (error) => {
		console.error(`❌ WebSocket error in room ${roomName}:`, error.message);
	});
});

// Start garbage collection
setInterval(garbageCollect, GC_INTERVAL);

// Start server
server.listen(PORT, HOST, () => {
	console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  🚀 Y.js WebSocket Server Running                         ║
║                                                            ║
║  WebSocket: ws://${HOST}:${PORT}                    ║
║  HTTP:      http://${HOST}:${PORT}                  ║
║                                                            ║
║  Ready for collaboration! 🎉                              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
	`);
});

// Graceful shutdown
process.on('SIGINT', () => {
	console.log('\n🛑 Shutting down server...');
	wss.close(() => {
		server.close(() => {
			console.log('👋 Server stopped');
			process.exit(0);
		});
	});
});

process.on('SIGTERM', () => {
	console.log('\n🛑 Shutting down server...');
	wss.close(() => {
		server.close(() => {
			console.log('👋 Server stopped');
			process.exit(0);
		});
	});
});

