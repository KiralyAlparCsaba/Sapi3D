#!/bin/bash

# Exit on any error
set -e

# Sapi3D Development Mode Stop Script
# This script stops development containers

echo "=========================================="
echo "  Sapi3D - Stop Development Mode"
echo "=========================================="
echo ""

echo "🛑 Stopping development containers..."
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down

echo ""
echo "✅ Development containers stopped successfully!"
echo ""
echo "💡 To remove volumes as well, run:"
echo "   docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down -v"
echo ""
