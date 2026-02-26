#!/bin/bash

# Exit on any error
set -e

# Sapi3D Production Mode Startup Script
# This script runs the application in production mode with optimized builds

echo "=========================================="
echo "  Sapi3D - Production Mode"
echo "=========================================="
echo ""

echo ""
echo "📋 Checking for .env file..."
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    exit 1
fi

echo "✅ .env file found"
echo ""

echo "🔍 Validating production configuration..."

if grep -q "dev-secret-key" .env; then
    echo "❌ ERROR: Development secrets detected in production!"
    exit 1
fi

echo "✅ Configuration validated"

echo ""
./backup.sh prod || true

echo ""
echo "🧹 Cleaning up existing containers..."
docker compose -f docker-compose.prod.yml down --remove-orphans

echo ""
echo "🚀 Starting containers in production mode..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

echo ""
echo "✅ Production environment started!"
echo ""
echo "📍 Services:"
echo "   Frontend:  http://localhost:80"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo "   ReDoc:     http://localhost:8000/redoc"
echo ""
echo "📊 Container Status:"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "📝 View logs:"
echo "   docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🛑 Stop services:"
echo "   ./stop_prod.sh"
echo ""
