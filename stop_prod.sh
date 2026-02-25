#!/bin/bash

# Exit on any error
set -e

# Sapi3D Production Mode Stop Script
# This script stops production containers

echo "=========================================="
echo "  Sapi3D - Stop Production Mode"
echo "=========================================="
echo ""

echo "💾 Backing up database before stop..."
if docker ps --format '{{.Names}}' | grep -q "sapi3d-db"; then
    mkdir -p backups
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    docker exec sapi3d-db pg_dump -U sapi3d sapi3d > backups/stop_${TIMESTAMP}.sql \
        && echo "✅ Backup saved: backups/stop_${TIMESTAMP}.sql" \
        || echo "⚠️  Backup failed (continuing anyway)"
else
    echo "ℹ️  Database not running, skipping backup"
fi

echo ""
echo "🛑 Stopping production containers..."
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml down

echo ""
echo "✅ Production containers stopped successfully!"
echo ""
echo "⚠️  WARNING: Never run 'down -v' or 'down --volumes' — this permanently deletes the database!"
echo ""
