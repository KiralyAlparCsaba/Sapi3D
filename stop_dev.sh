#!/bin/bash

# Exit on any error
set -e

# Sapi3D Development Mode Stop Script
# This script stops development containers

echo "=========================================="
echo "  Sapi3D - Stop Development Mode"
echo "=========================================="
echo ""

./backup.sh dev || true

echo ""
echo "�🛑 Stopping development containers..."
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down

echo ""
echo "✅ Development containers stopped successfully!"
echo ""
echo "⚠️  WARNING: Never run 'down -v' or 'down --volumes' — this permanently deletes the database!"
echo ""
