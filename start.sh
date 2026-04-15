#!/bin/bash

set -u

echo "🚀 ORTHOFLOW FULL SYSTEM STARTER"
echo "================================"
echo ""

# -------------------------
# Base directory
# -------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# -------------------------
# System checks
# -------------------------
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js not installed"
    exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "❌ npm not installed"
    exit 1
fi

echo "✅ Node: $(node -v)"
echo "✅ npm: $(npm -v)"
echo ""

# -------------------------
# Globals
# -------------------------
BACKEND_PID=""
FRONTEND_PID=""
CLEANED_UP=0

# -------------------------
# Utilities
# -------------------------
is_port_in_use() {
    lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

wait_for_http() {
    local url="$1"
    local attempts="$2"

    for _ in $(seq 1 "$attempts"); do
        if curl -fsS "$url" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done
    return 1
}

install_if_needed() {
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install || { echo "❌ npm install failed"; exit 1; }
    else
        echo "✅ Dependencies OK"
    fi
}

# -------------------------
# Cleanup (FIXED)
# -------------------------
cleanup() {
    if [ "$CLEANED_UP" -eq 1 ]; then
        return
    fi
    CLEANED_UP=1

    echo ""
    echo "🛑 Shutting down..."
    echo "SIGINT received. Shutting down gracefully..."

    # Kill backend/frontend processes
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
        pkill -P "$BACKEND_PID" 2>/dev/null || true
    fi

    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
        pkill -P "$FRONTEND_PID" 2>/dev/null || true
    fi

    sleep 1

    echo "✅ Shutdown complete"
}

trap cleanup INT TERM EXIT

# -------------------------
# Backend
# -------------------------
echo "📍 Backend Setup"

if [ ! -d "$SCRIPT_DIR/Backend" ]; then
    echo "❌ Backend folder missing"
    exit 1
fi

cd "$SCRIPT_DIR/Backend"

install_if_needed

if is_port_in_use 3000; then
    echo "⚠️ Backend already running on port 3000"
else
    echo "🚀 Starting backend..."
    npm run dev &
    BACKEND_PID=$!
fi

echo ""
echo "⏳ Waiting for backend..."

if ! wait_for_http "http://localhost:3000/health" 20; then
    echo "❌ Backend failed to start (possible DB issue)"
    exit 1
fi

echo "✅ Backend ready"
echo ""

# -------------------------
# Frontend
# -------------------------
echo "📍 Frontend Setup"

cd "$SCRIPT_DIR/Frontend"

install_if_needed

if is_port_in_use 5173; then
    echo "⚠️ Frontend already running"
else
    echo "🚀 Starting frontend..."
    npm run dev &
    FRONTEND_PID=$!
fi

echo ""
echo "⏳ Waiting for frontend..."

if ! wait_for_http "http://localhost:5173" 30; then
    echo "❌ Frontend failed"
    exit 1
fi

echo "✅ Frontend ready"
echo ""

# -------------------------
# Open browser
# -------------------------
echo "🌐 Opening app..."

if command -v open >/dev/null 2>&1; then
    open "http://localhost:5173"
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:5173"
else
    start "http://localhost:5173"
fi

echo ""
echo "🎉 ORTHOFLOW RUNNING"
echo "--------------------"
echo "📍 Backend:  http://localhost:3000"
echo "📍 Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop everything"
echo ""

# -------------------------
# Keep alive (FIXED)
# -------------------------
wait