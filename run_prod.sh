#!/bin/bash

# Exit on any error
set -e

# Sapi3D Production Mode Startup Script
# This script runs the application in production mode with optimized builds

echo "=========================================="
echo "  Sapi3D - Production Mode"
echo "=========================================="
echo ""

echo "🧹 Cleaning up existing containers..."
docker compose -f docker-compose.prod.yml down --remove-orphans --volumes

echo ""
echo "🔨 Building production containers..."
echo "   - Backend: Optimized Python image"
echo "   - Frontend: Multi-stage build with Nginx"
echo "   - Database: PostgreSQL 16"
echo ""
docker compose -f docker-compose.prod.yml build --no-cache

echo ""
echo "🚀 Starting containers in production mode (detached)..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

echo ""
echo "📊 Container Status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Services are running!"
echo ""
echo "🌐 Access Points:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo "   ReDoc:     http://localhost:8000/redoc"
echo ""
echo "📝 Useful Commands:"
echo "   View logs:        docker compose -f docker-compose.prod.yml logs -f"
echo "   Stop services:    docker compose -f docker-compose.prod.yml down"
echo "   Restart:          docker compose -f docker-compose.prod.yml restart"
echo "   View status:      docker compose -f docker-compose.prod.yml ps"
echo ""
