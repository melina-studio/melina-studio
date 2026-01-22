.PHONY: help dev dev-web dev-api build build-web build-api test test-web test-api lint clean docker-up docker-down docker-build

# Default target
help:
	@echo "Melina Studio - Available Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start all services in development mode"
	@echo "  make dev-web      - Start frontend only"
	@echo "  make dev-api      - Start backend only"
	@echo ""
	@echo "Building:"
	@echo "  make build        - Build all services"
	@echo "  make build-web    - Build frontend"
	@echo "  make build-api    - Build backend"
	@echo ""
	@echo "Testing:"
	@echo "  make test         - Run all tests"
	@echo "  make test-web     - Run frontend tests"
	@echo "  make test-api     - Run backend tests"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up    - Start Docker services"
	@echo "  make docker-down  - Stop Docker services"
	@echo "  make docker-build - Build Docker images"
	@echo ""
	@echo "Utilities:"
	@echo "  make lint         - Run linters"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make setup        - Initial project setup"

# ===========================================
# Development
# ===========================================

dev: docker-up
	@echo "All services started. Frontend: http://localhost:3000, API: http://localhost:8080"

dev-web:
	cd apps/web && npm run dev

dev-api:
	cd apps/api && air

# ===========================================
# Building
# ===========================================

build: build-web build-api

build-web:
	cd apps/web && npm run build

build-api:
	cd apps/api && go build -o bin/api ./cmd/main.go

# ===========================================
# Testing
# ===========================================

test: test-web test-api

test-web:
	cd apps/web && npm test

test-api:
	cd apps/api && go test ./...

# ===========================================
# Docker
# ===========================================

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-build:
	docker-compose build

docker-logs:
	docker-compose logs -f

# ===========================================
# Utilities
# ===========================================

lint: lint-web lint-api

lint-web:
	cd apps/web && npm run lint

lint-api:
	cd apps/api && go vet ./... && go fmt ./...

clean:
	rm -rf apps/web/.next
	rm -rf apps/web/node_modules
	rm -rf apps/api/bin
	rm -rf apps/api/tmp

setup:
	@echo "Setting up Melina Studio..."
	cp -n .env.example .env || true
	cp -n apps/web/.env.example apps/web/.env.local || true
	cp -n apps/api/.env.example apps/api/.env || true
	cd apps/web && npm install
	cd apps/api && go mod download
	@echo "Setup complete! Run 'make dev' to start development."

# ===========================================
# Database
# ===========================================

db-migrate:
	cd apps/api && go run cmd/main.go migrate

db-reset:
	docker-compose down -v
	docker-compose up -d db
	@echo "Database reset complete."
