#!/bin/bash

# svelte-collab Demo Setup Script
# This script helps you quickly set up the demo for recording

echo "🤝 svelte-collab Demo Setup"
echo "=========================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the svelte-collab project root"
    exit 1
fi

echo "🔍 Checking dependencies..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✅ Dependencies ready"
echo ""

echo "🚀 Starting servers..."

# Start WebSocket server in background
echo "Starting WebSocket server..."
npm run server &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Start dev server in background
echo "Starting dev server..."
npm run dev &
DEV_PID=$!

# Wait a moment for dev server to start
sleep 3

echo ""
echo "✅ Servers started!"
echo ""
echo "🌐 Demo URLs:"
echo "   Main demo: http://localhost:5173"
echo "   WebSocket: ws://localhost:1234"
echo ""
echo "📋 Recording Tips:"
echo "   1. Open two browser windows to http://localhost:5173"
echo "   2. Position them side by side"
echo "   3. Start your screen recorder"
echo "   4. Follow the demo script in README.md"
echo ""
echo "🛑 To stop servers:"
echo "   Press Ctrl+C or run: kill $SERVER_PID $DEV_PID"
echo ""

# Keep script running
wait
