#!/bin/bash

# Simple test runner - run from backend/ directory only

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Sapi3D Backend Test Runner${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Navigate to project root
cd ..

# Step 1: Clean up
echo -e "${YELLOW}[1/4] Cleaning up...${NC}"
docker-compose down
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

# Step 2: Start services
echo -e "${YELLOW}[2/4] Starting services...${NC}"
docker-compose up -d --build db backend
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to start services${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Step 3: Wait for database
echo -e "${YELLOW}[3/4] Waiting for database...${NC}"
timeout=60
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker-compose exec -T db pg_isready -U sapi3d > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database ready${NC}"
        break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
    echo -n "."
done

if [ $elapsed -ge $timeout ]; then
    echo -e "${RED}✗ Database timeout${NC}"
    docker-compose down
    exit 1
fi
echo ""

# Step 4: Run tests
echo -e "${YELLOW}[4/4] Running tests...${NC}"
echo "----------------------------------------"
docker-compose exec -T backend pytest -vv --tb=short
TEST_EXIT_CODE=$?
echo "----------------------------------------"
echo ""

# Results
echo -e "${YELLOW}========================================${NC}"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    echo -e "${YELLOW}========================================${NC}"
    exit 0
else
    echo -e "${RED}✗ TESTS FAILED${NC}"
    echo -e "${YELLOW}========================================${NC}"
    exit 1
fi
