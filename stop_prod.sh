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
mkdir -p backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/stop_${TIMESTAMP}.sql"
if docker exec sapi3d-db-prod pg_dump -U sapi3d sapi3d > "$BACKUP_FILE" 2>/dev/null; then
    echo "✅ Backup saved: $BACKUP_FILE"
else
    rm -f "$BACKUP_FILE"
    echo "ℹ️  Database not running or backup failed (continuing anyway)"
fi

echo ""
echo "🛑 Stopping production containers..."
docker compose -f docker-compose.prod.yml down

echo ""
echo "✅ Production containers stopped successfully!"
echo ""
echo "⚠️  WARNING: Never run 'down -v' or 'down --volumes' — this permanently deletes the database!"
echo ""
