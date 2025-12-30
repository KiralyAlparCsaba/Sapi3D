#!/bin/bash

# Exit on any error
set -e

# Sapi3D Development Mode Startup Script
# This script runs the application in development mode with hot reload

echo "=========================================="
echo "  Sapi3D - Development Mode"
echo "=========================================="
echo ""

echo "🧹 Cleaning up existing containers..."
docker compose -f docker-compose.dev.yml down --remove-orphans

echo ""
echo "🔨 Building development containers..."
docker compose -f docker-compose.dev.yml build

echo ""
echo "🚀 Starting containers in development mode..."
echo "   - Backend: Hot reload enabled (uvicorn --reload)"
echo "   - Frontend: Vite dev server with HMR"
echo "   - Database: PostgreSQL 16"
echo ""
echo "📝 Code changes will be reflected automatically!"
echo ""

docker compose -f docker-compose.dev.yml up

echo ""
echo "🛑 Containers stopped."
