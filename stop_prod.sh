#!/bin/bash

# Exit on any error
set -e

# Sapi3D Production Mode Stop Script
# This script stops production containers

echo "=========================================="
echo "  Sapi3D - Stop Production Mode"
echo "=========================================="
echo ""

./backup.sh prod || true

echo ""
echo "🛑 Stopping production containers..."
docker compose -f docker-compose.prod.yml down

echo ""
echo "✅ Production containers stopped successfully!"
echo ""
echo "⚠️  WARNING: Never run 'down -v' or 'down --volumes' — this permanently deletes the database!"
echo ""
