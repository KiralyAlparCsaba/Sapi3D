#!/bin/bash

# Sapi3D Docker Startup Script
# This script cleans up containers, builds, runs, and stops them

echo "🧹 Cleaning up existing containers..."
docker compose down --remove-orphans --volumes

echo "🚀 Building and starting containers..."
docker compose up --build -d

echo "✅ Containers are running!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📖 API Docs: http://localhost:8000/docs"
echo ""
echo "Press any key to stop all containers..."
read -n 1 -s

echo "🛑 Stopping containers..."
docker compose down

echo "✨ All containers stopped successfully!"
