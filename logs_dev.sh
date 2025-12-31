#!/bin/bash

# Development Environment Logs Script
# This script displays logs from the Sapi3D development environment

set -e

# Default to following all services
SERVICE="${1:-}"
FOLLOW="${2:--f}"

echo "📋 Viewing Sapi3D development logs..."
echo ""

if [ -z "$SERVICE" ]; then
    echo "💡 Showing logs for all services (use Ctrl+C to stop)"
    echo "   Usage: ./logs_dev.sh [backend|frontend|db] [--follow|-f]"
    echo ""
    docker compose -f docker-compose.base.yml -f docker-compose.dev.yml logs $FOLLOW
else
    echo "💡 Showing logs for: $SERVICE"
    echo ""
    docker compose -f docker-compose.base.yml -f docker-compose.dev.yml logs $FOLLOW $SERVICE
fi
