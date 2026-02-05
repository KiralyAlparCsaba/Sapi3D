#!/bin/bash

# Sapi3D Mobile Development Mode Stop Script
# This script stops all services started by run_mobile_dev.sh

echo "=========================================="
echo "  Sapi3D - Stopping Mobile Dev Services"
echo "=========================================="
echo ""

echo "🛑 Stopping Docker services..."
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down --remove-orphans

echo ""
echo "🧹 Cleaning up..."

# Kill any running Vite processes (in case they're still running)
if pgrep -f "vite" > /dev/null; then
    echo "   Stopping Vite dev server..."
    pkill -f "vite" || true
fi

echo ""
echo "✅ All mobile development services stopped!"
echo ""
