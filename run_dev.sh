#!/bin/bash

# Exit on any error
set -e

# Sapi3D Development Mode Startup Script
# This script runs the application in development mode with hot reload
#
# Usage:
#   ./run_dev.sh          # Normal development mode
#   ./run_dev.sh --mobile # Mobile testing mode (shows IP and QR code)

# Parse arguments
MOBILE_MODE=false
if [[ "$1" == "--mobile" ]]; then
    MOBILE_MODE=true
fi

# Detect local IP address (for mobile mode)
detect_local_ip() {
    LOCAL_IP=""

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        LOCAL_IP=$(hostname -I | awk '{print $1}')
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        # cSpell:disable-next-line
        LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
    elif [[ "$OSTYPE" == "msys"* ]]; then
        # Windows (Git Bash/mingw64)
        LOCAL_IP=$(ipconfig.exe | grep -i "IPv4" | grep -v "127.0.0.1" | awk '{print $NF}' | head -n1 | tr -d '\r')
    fi

    # Fallback to localhost if no IP detected
    if [[ -z "$LOCAL_IP" ]]; then
        LOCAL_IP="localhost"
    fi

    echo "$LOCAL_IP"
}

if [ "$MOBILE_MODE" = true ]; then
    echo "=========================================="
    echo "  Sapi3D - Mobile Development Mode"
    echo "=========================================="
else
    echo "=========================================="
    echo "  Sapi3D - Development Mode"
    echo "=========================================="
fi
echo ""

echo "📋 Copying .env.dev.example to .env..."
cp .env.dev.example .env

echo ""
echo "🧹 Cleaning up existing containers..."
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down --remove-orphans

echo ""
echo "🚀 Starting containers in development mode..."
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d --build

echo ""

if [ "$MOBILE_MODE" = true ]; then
    # Mobile testing mode - show IP and QR code
    LOCAL_IP=$(detect_local_ip)
    
    echo "✅ Development environment started!"
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
    
    # Wait for frontend container to be ready
    echo "⏳ Waiting for frontend container..."
    sleep 3
    
    # Try to generate QR code from container
    echo "   📲 QR Code for mobile access:"
    echo ""
    if docker exec sapi3d-frontend qrencode -t ANSIUTF8 "http://$LOCAL_IP:5173" 2>/dev/null; then
        echo ""
    else
        echo "   ⚠️  QR code generation failed (container may still be starting)"
        echo "   💡 Try running: docker exec sapi3d-frontend qrencode -t ANSIUTF8 \"http://$LOCAL_IP:5173\""
        echo ""
    fi
    
    echo "=========================================="
    echo ""
else
    # Normal development mode
    echo "✅ Development environment started!"
    echo ""
    echo "📍 Services:"
    echo "   Frontend:  http://localhost:5173"
    echo "   Backend:   http://localhost:8000"
    echo "   Database:  localhost:5432"
    echo ""
fi

echo "📝 View logs:"
echo "   ./logs_dev.sh              # All services"
echo "   ./logs_dev.sh backend      # Backend only"
echo "   ./logs_dev.sh frontend     # Frontend only"
echo ""
echo "🛑 Stop services:"
echo "   ./stop_dev.sh"
echo ""
