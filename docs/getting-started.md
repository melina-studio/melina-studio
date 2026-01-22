# Getting Started

This guide will help you set up Melina Studio for local development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.17 or later ([Download](https://nodejs.org/))
- **Go** 1.21 or later ([Download](https://go.dev/))
- **Docker** and **Docker Compose** ([Download](https://www.docker.com/))
- **Git** ([Download](https://git-scm.com/))

## Quick Start with Docker

The easiest way to get started is using Docker:

```bash
# Clone the repository
git clone https://github.com/melina-studio/melina-studio.git
cd melina-studio

# Copy environment files
cp .env.example .env

# Start all services
docker-compose up
```

Access the application:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8080
- **API Health**: http://localhost:8080/api/v1/health

## Manual Setup

### 1. Clone the Repository

```bash
git clone https://github.com/melina-studio/melina-studio.git
cd melina-studio
```

### 2. Set Up the Database

Start PostgreSQL and Redis using Docker:

```bash
docker-compose up -d db redis
```

Or install them locally:
- PostgreSQL: [Installation Guide](https://www.postgresql.org/download/)
- Redis: [Installation Guide](https://redis.io/download/)

### 3. Configure Environment Variables

```bash
# Copy all environment files
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Edit the files and update the values as needed.

### 4. Set Up the Backend

```bash
cd apps/api

# Install dependencies
go mod download

# Run database migrations (automatic on startup)

# Start the server with hot reload
air

# Or without hot reload
go run cmd/main.go
```

The API will be available at http://localhost:8080

### 5. Set Up the Frontend

```bash
cd apps/web

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at http://localhost:3000

## Verify Installation

1. **Check API health**:
   ```bash
   curl http://localhost:8080/api/v1/health
   ```

2. **Open the frontend** at http://localhost:3000

3. **Try creating an account** and logging in

## Common Issues

### Database Connection Failed

Ensure PostgreSQL is running and the credentials in `.env` are correct:

```bash
# Check if PostgreSQL is running
docker-compose ps db

# View logs
docker-compose logs db
```

### Port Already in Use

If ports 3000 or 8080 are in use:

```bash
# Find process using port
lsof -i :3000
lsof -i :8080

# Kill the process or change ports in .env
```

### Node Modules Issues

```bash
cd apps/web
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- Read the [Architecture Guide](./architecture.md)
- Explore the [API Documentation](./api/README.md)
- Check out the [Contributing Guide](../CONTRIBUTING.md)
