#!/bin/bash

# Sapi3D Database Backup Script
#
# Usage:
#   ./backup.sh dev    # Backup development database
#   ./backup.sh prod   # Backup production database
#
# Output: backups/dev_TIMESTAMP.sql  or  backups/prod_TIMESTAMP.sql
# Exit 0 on success, exit 1 on failure.

ENV=${1:-}

if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
    echo "Usage: ./backup.sh [dev|prod]"
    exit 1
fi

if [[ "$ENV" == "dev" ]]; then
    CONTAINER="sapi3d-db"
else
    CONTAINER="sapi3d-db-prod"
fi

DB_USER="sapi3d"
DB_NAME="sapi3d"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p backups

BACKUP_FILE="backups/${ENV}_${TIMESTAMP}.sql"

echo "💾 Backing up database ($ENV)..."
if docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" 2>/dev/null | cat > "$BACKUP_FILE" && [ -s "$BACKUP_FILE" ]; then
    echo "✅ Backup saved: $BACKUP_FILE"
    exit 0
else
    rm -f "$BACKUP_FILE"
    echo "ℹ️  Database not running or backup failed (skipping)"
    exit 1
fi
