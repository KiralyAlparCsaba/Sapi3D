#!/bin/bash

# Exit on any error
set -e

# Sapi3D Development Mode Startup Script
# This script runs the application in development mode with hot reload

echo "=========================================="
echo "  Sapi3D - Development Mode"
echo "=========================================="
echo ""

echo "📋 Copying .env.dev.example to .env..."
cp .env.dev.example .env

echo ""
echo "🧹 Cleaning up existing containers..."
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down --remove-orphans

echo ""
echo "🚀 Starting containers in development mode..."
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d --build

echo ""
echo "✅ Development environment started!"
echo ""
echo "📍 Services:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:8000"
echo "   Database:  localhost:5432"
echo ""
echo "📝 View logs:"
echo "   ./logs_dev.sh              # All services"
echo "   ./logs_dev.sh backend      # Backend only"
echo "   ./logs_dev.sh frontend     # Frontend only"
echo ""
echo "🛑 Stop services:"
echo "   ./stop_dev.sh"
echo ""
