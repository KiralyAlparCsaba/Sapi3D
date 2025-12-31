#!/bin/bash

# Exit on any error
set -e

# Sapi3D Production Mode Stop Script
# This script stops production containers

echo "=========================================="
echo "  Sapi3D - Stop Production Mode"
echo "=========================================="
echo ""

echo "🛑 Stopping production containers..."
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml down

echo ""
echo "✅ Production containers stopped successfully!"
echo ""
echo "💡 To remove volumes as well, run:"
echo "   docker compose -f docker-compose.base.yml -f docker-compose.prod.yml down -v"
echo ""
