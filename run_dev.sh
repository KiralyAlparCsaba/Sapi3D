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
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Check if running in WSL
        if grep -qi microsoft /proc/version 2>/dev/null || grep -qi wsl /proc/version 2>/dev/null; then
            # WSL: Get Windows host IP from ipconfig.exe
            LOCAL_IP=$(ipconfig.exe 2>/dev/null | grep "IPv4 Address" | grep -v "169\." | grep -v "172\." | head -1 | awk '{print $NF}' | sed 's/\r$//')
            if [ -z "$LOCAL_IP" ]; then
                # Fallback: try first IPv4 that is not localhost
                LOCAL_IP=$(ipconfig.exe 2>/dev/null | grep -i "ipv4" | grep -v "169\." | grep -v "172\." | head -1 | awk '{print $NF}' | sed 's/\r$//')
            fi
        else
            # Native Linux
            LOCAL_IP=$(hostname -I | awk '{print $1}')
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
    else
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

echo "📋 Checking for .env file..."
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    exit 1
fi

echo "✅ .env file found"
echo ""

# If mobile mode, update VITE_API_URL with the detected IP
if [ "$MOBILE_MODE" = true ]; then
    LOCAL_IP=$(detect_local_ip)
    echo "📱 Updating VITE_API_URL for mobile access: http://$LOCAL_IP:8000"
    
    # Update .env file with the detected IP for both API and frontend
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=http://$LOCAL_IP:8000|g" .env

fi

echo ""
echo "💾 Backing up database before restart..."
if docker ps --format '{{.Names}}' | grep -q "sapi3d-db"; then
    mkdir -p backups
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    docker exec sapi3d-db pg_dump -U sapi3d sapi3d > backups/pre_deploy_dev_${TIMESTAMP}.sql \
        && echo "✅ Backup saved: backups/pre_deploy_dev_${TIMESTAMP}.sql" \
        || echo "⚠️  Backup failed (continuing anyway)"
else
    echo "ℹ️  Database not running, skipping backup"
fi

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
