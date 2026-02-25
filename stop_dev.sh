#!/bin/bash

# Exit on any error
set -e

# Sapi3D Development Mode Stop Script
# This script stops development containers

echo "=========================================="
echo "  Sapi3D - Stop Development Mode"
echo "=========================================="
echo ""

echo "💾 Backing up database before stop..."
mkdir -p backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/stop_dev_${TIMESTAMP}.sql"
if docker exec sapi3d-db pg_dump -U sapi3d sapi3d 2>/dev/null | cat > "$BACKUP_FILE" && [ -s "$BACKUP_FILE" ]; then
    echo "✅ Backup saved: $BACKUP_FILE"
else
    rm -f "$BACKUP_FILE"
    echo "ℹ️  Database not running or backup failed (continuing anyway)"
fi

echo ""
echo "�🛑 Stopping development containers..."
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down

echo ""
echo "✅ Development containers stopped successfully!"
echo ""
echo "⚠️  WARNING: Never run 'down -v' or 'down --volumes' — this permanently deletes the database!"
echo ""
