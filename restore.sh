#!/bin/bash

# Sapi3D Database Restore Script
#
# Usage:
#   ./restore.sh dev                              # List available dev backups
#   ./restore.sh prod                             # List available prod backups
#   ./restore.sh dev  backups/dev_20260226_090000.sql   # Restore specific backup
#   ./restore.sh prod backups/prod_20260226_090000.sql  # Restore specific backup
#
# ⚠️  DESTRUCTIVE: This overwrites the current database contents.
# Make sure the app containers are stopped first (./stop_dev.sh or ./stop_prod.sh).

ENV=${1:-}
BACKUP_FILE=${2:-}

if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
    echo "Usage: ./restore.sh [dev|prod] [backup_file]"
    echo ""
    echo "Examples:"
    echo "   ./restore.sh dev                                     # list available backups"
    echo "   ./restore.sh dev backups/dev_20260226_090000.sql     # restore from file"
    exit 1
fi

if [[ "$ENV" == "dev" ]]; then
    CONTAINER="sapi3d-db"
else
    CONTAINER="sapi3d-db-prod"
fi

DB_USER="sapi3d"
DB_NAME="sapi3d"

# ── No file given: list available backups and exit ────────────────────────────
if [[ -z "$BACKUP_FILE" ]]; then
    echo "=========================================="
    echo "  Available $ENV backups"
    echo "=========================================="
    echo ""
    BACKUPS=( $(ls backups/${ENV}_*.sql 2>/dev/null | sort -r) )
    if [[ ${#BACKUPS[@]} -eq 0 ]]; then
        echo "   No backups found for '$ENV' in backups/"
    else
        for f in "${BACKUPS[@]}"; do
            SIZE=$(du -sh "$f" 2>/dev/null | cut -f1)
            echo "   $f  ($SIZE)"
        done
        echo ""
        echo "Run with a file to restore:"
        echo "   ./restore.sh $ENV <backup_file>"
    fi
    echo ""
    exit 0
fi

# ── File given: validate it exists ────────────────────────────────────────────
if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "❌ ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

if [[ ! -s "$BACKUP_FILE" ]]; then
    echo "❌ ERROR: Backup file is empty: $BACKUP_FILE"
    exit 1
fi

# ── Confirm restore ───────────────────────────────────────────────────────────
echo "=========================================="
echo "  Sapi3D - Database Restore ($ENV)"
echo "=========================================="
echo ""
echo "  Container : $CONTAINER"
echo "  Database  : $DB_NAME"
echo "  Backup    : $BACKUP_FILE"
echo ""
echo "⚠️  WARNING: This will OVERWRITE the current $ENV database!"
echo "⚠️  Make sure the app is stopped: ./stop_${ENV}.sh"
echo ""
read -r -p "Type 'yes' to confirm restore: " CONFIRM

if [[ "$CONFIRM" != "yes" ]]; then
    echo "❌ Restore cancelled."
    exit 1
fi

# ── Check DB container is running ─────────────────────────────────────────────
if ! docker exec "$CONTAINER" echo "" > /dev/null 2>&1; then
    echo "❌ ERROR: Container '$CONTAINER' is not running."
    echo "   Start the database first, then retry."
    exit 1
fi

# ── Wipe schema and restore ───────────────────────────────────────────────────
echo ""
echo "🗑️  Clearing existing database contents..."
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
    -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" > /dev/null

echo "📥 Restoring from $BACKUP_FILE..."
cat "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q

echo ""
echo "✅ Restore complete!"
echo ""
echo "Start the application:"
echo "   ./run_${ENV}.sh"
echo ""
