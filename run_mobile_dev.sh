#!/bin/bash

# Exit on any error
set -e

# Sapi3D Mobile Development Mode Startup Script
# This script runs backend services with Docker and frontend with Vite in network-exposed mode

echo "=========================================="
echo "  Sapi3D - Mobile Development Mode"
echo "=========================================="
echo ""

# Detect local IP address
detect_local_ip() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        LOCAL_IP=$(hostname -I | awk '{print $1}')
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
    else
        LOCAL_IP="localhost"
    fi
    echo "$LOCAL_IP"
}

LOCAL_IP=$(detect_local_ip)

echo "📋 Copying .env.dev.example to .env..."
cp .env.dev.example .env

echo ""
echo "🧹 Cleaning up existing containers..."
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down --remove-orphans

echo ""
echo "🚀 Starting backend services (db + backend)..."
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d db backend

echo ""
echo "⏳ Waiting for backend to be ready..."
sleep 5

# Check if backend is healthy
echo "🔍 Checking backend health..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  Backend health check timeout, but continuing..."
    fi
    sleep 1
done

echo ""
echo "📱 Starting frontend with network access..."
echo ""
echo "=========================================="
echo "  📍 Access Points"
echo "=========================================="
echo ""
echo "   Desktop (localhost):"
echo "   • Frontend:  http://localhost:5173"
echo "   • Backend:   http://localhost:8000"
echo "   • API Docs:  http://localhost:8000/docs"
echo ""
echo "   Mobile (same WiFi network):"
echo "   • Frontend:  http://$LOCAL_IP:5173"
echo "   • Backend:   http://$LOCAL_IP:8000"
echo ""
echo "=========================================="
echo "  📱 Mobile Testing Instructions"
echo "=========================================="
echo ""
echo "   1. Connect your phone to the same WiFi network"
echo "   2. Open browser on your phone"
echo "   3. Navigate to: http://$LOCAL_IP:5173"
echo ""

# Check if qrencode is available for QR code generation
if command -v qrencode &> /dev/null; then
    echo "   📲 Scan QR code to access on mobile:"
    echo ""
    qrencode -t ANSIUTF8 "http://$LOCAL_IP:5173"
    echo ""
else
    echo "   💡 Tip: Install 'qrencode' for QR code generation"
    echo "      sudo apt install qrencode  (Ubuntu/Debian)"
    echo "      brew install qrencode      (macOS)"
    echo ""
fi

echo "=========================================="
echo "  🛑 Press Ctrl+C to stop all services"
echo "=========================================="
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo ""
    echo "🛑 Stopping services..."
    docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down
    echo "✅ All services stopped!"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup SIGINT SIGTERM

# Start frontend in foreground (so we can see logs and keep script running)
cd frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
    echo ""
fi

npm run dev -- --host

# If npm exits, cleanup
cleanup
