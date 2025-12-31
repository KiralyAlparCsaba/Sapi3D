#!/bin/bash

# Exit on any error
set -e

# Sapi3D Production Mode Startup Script
# This script runs the application in production mode with optimized builds

echo "=========================================="
echo "  Sapi3D - Production Mode"
echo "=========================================="
echo ""

echo "📋 Copying .env.prod.example to .env..."
cp .env.prod.example .env

echo ""
echo "🔍 Validating production configuration..."

# Fail-fast validation for production
if grep -q "CHANGE_THIS" .env; then
    echo "❌ ERROR: Production .env contains placeholder values!"
    echo "   Please update .env.prod.example with secure values before running."
    echo ""
    echo "   Required changes:"
    echo "   - POSTGRES_PASSWORD"
    echo "   - JWT_SECRET (generate with: python -c \"import secrets; print(secrets.token_urlsafe(32))\")"
    echo "   - DATABASE_URL password"
    echo ""
    exit 1
fi

if grep -q "dev-secret-key" .env; then
    echo "❌ ERROR: Development secrets detected in production!"
    exit 1
fi

echo "✅ Configuration validated"

echo ""
echo "🧹 Cleaning up existing containers..."
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml down --remove-orphans --volumes

echo ""
echo "🚀 Starting containers in production mode..."
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d --build --no-cache

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

echo ""
echo "✅ Production environment started!"
echo ""
echo "📍 Services:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo "   ReDoc:     http://localhost:8000/redoc"
echo ""
echo "📊 Container Status:"
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml ps
echo ""
echo "📝 View logs:"
echo "   docker compose -f docker-compose.base.yml -f docker-compose.prod.yml logs -f"
echo ""
echo "🛑 Stop services:"
echo "   ./stop_prod.sh"
echo ""
