#!/bin/bash

# Exit on any error
set -e

# Sapi3D Production Deployment Script
# This script deploys the application using production configuration

echo "=========================================="
echo "Sapi3D Production Deployment"
echo "=========================================="
echo ""

# Check if .env.prod exists
if [ ! -f .env.prod ]; then
    echo "ERROR: .env.prod file not found!"
    echo "Please create .env.prod from .env.prod.example:"
    exit 1
fi

echo "Cleaning up existing containers..."
docker compose -f docker-compose.deployment.yml down --remove-orphans

echo ""
echo "Building and starting production containers..."
docker compose -f docker-compose.deployment.yml --env-file .env.prod up --build -d

echo ""
echo "Waiting for services to be healthy..."
sleep 5

echo ""
echo "Container Status:"
docker compose -f docker-compose.deployment.yml ps

echo ""
echo "=========================================="
echo "Production Deployment Complete!"
echo "=========================================="
