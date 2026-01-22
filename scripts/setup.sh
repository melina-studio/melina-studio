#!/bin/bash

# ===========================================
# Melina Studio - Setup Script
# ===========================================

set -e

echo "🚀 Setting up Melina Studio..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required tools
check_requirements() {
    echo "Checking requirements..."

    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js is not installed. Please install Node.js 18.17 or later.${NC}"
        exit 1
    fi

    if ! command -v go &> /dev/null; then
        echo -e "${RED}Go is not installed. Please install Go 1.21 or later.${NC}"
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}Docker is not installed. You can still run without Docker.${NC}"
    fi

    echo -e "${GREEN}All requirements met!${NC}"
    echo ""
}

# Copy environment files
setup_env() {
    echo "Setting up environment files..."

    if [ ! -f .env ]; then
        cp .env.example .env
        echo "Created .env"
    else
        echo ".env already exists, skipping"
    fi

    if [ ! -f apps/web/.env.local ]; then
        cp apps/web/.env.example apps/web/.env.local
        echo "Created apps/web/.env.local"
    else
        echo "apps/web/.env.local already exists, skipping"
    fi

    if [ ! -f apps/api/.env ]; then
        cp apps/api/.env.example apps/api/.env
        echo "Created apps/api/.env"
    else
        echo "apps/api/.env already exists, skipping"
    fi

    echo -e "${GREEN}Environment files ready!${NC}"
    echo ""
}

# Install frontend dependencies
setup_frontend() {
    echo "Setting up frontend..."
    cd apps/web
    npm install
    cd ../..
    echo -e "${GREEN}Frontend dependencies installed!${NC}"
    echo ""
}

# Install backend dependencies
setup_backend() {
    echo "Setting up backend..."
    cd apps/api
    go mod download
    cd ../..
    echo -e "${GREEN}Backend dependencies installed!${NC}"
    echo ""
}

# Start services with Docker
start_docker() {
    if command -v docker &> /dev/null; then
        echo "Starting Docker services..."
        docker-compose up -d db redis
        echo -e "${GREEN}Docker services started!${NC}"
    else
        echo -e "${YELLOW}Docker not available. Please start PostgreSQL and Redis manually.${NC}"
    fi
    echo ""
}

# Main
main() {
    check_requirements
    setup_env
    setup_frontend
    setup_backend
    start_docker

    echo "============================================"
    echo -e "${GREEN}Setup complete!${NC}"
    echo ""
    echo "To start development:"
    echo "  1. Start backend: cd apps/api && air"
    echo "  2. Start frontend: cd apps/web && npm run dev"
    echo ""
    echo "Or use Docker:"
    echo "  docker-compose up"
    echo ""
    echo "Access the app at http://localhost:3000"
    echo "============================================"
}

main
