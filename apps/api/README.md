# Melina Studio Backend

A clean, scalable Go backend built with Fiber framework, GORM, and PostgreSQL.

## 🏗️ Project Structure

```
melina-studio-backend/
├─ cmd/
│  └─ main.go                # Application entry point
├─ internal/
│  ├─ api/
│  │  ├─ server.go           # Fiber server setup
│  │  └─ routes/             # Route definitions
│  │     ├─ index.go         # Route registration
│  │     └─ v1/              # API v1 routes
│  │        ├─ routes.go     # v1 route registration
│  │        ├─ health.go     # Health check routes
│  │        └─ todos.go      # Todo CRUD routes
│  ├─ handlers/              # HTTP handlers
│  │  ├─ health_handler.go
│  │  └─ todos_handler.go
│  ├─ service/               # Business logic
│  │  └─ todo_service.go
│  ├─ repo/                  # Database access layer
│  │  └─ todo_repo.go
│  ├─ models/                # Data models & DTOs
│  │  └─ todo.go
│  └─ config/
│     └─ db.go               # Database configuration
├─ .env                      # Environment variables
├─ .air.toml                 # Air configuration for hot reload
├─ go.mod
└─ go.sum
```

## 🚀 Getting Started

### Prerequisites

- Go 1.21 or higher
- PostgreSQL
- Air (for hot reloading)

### Installation

1. **Install dependencies:**
   ```bash
   go mod download
   ```

2. **Set up PostgreSQL database:**
   ```bash
   createdb melina_studio
   ```

3. **Configure environment variables:**
   
   Update `.env` file with your database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=melina_studio
   DB_SSLMODE=disable

   PORT=3000
   ```

### Running the Application

**With Air (hot reload):**
```bash
air
```

**Without Air:**
```bash
go run cmd/main.go
```

The server will start on `http://localhost:3000`

## 📡 API Endpoints

### Health Check
- `GET /api/v1/health` - Check server health

### Todos
- `POST /api/v1/todos` - Create a new todo
- `GET /api/v1/todos` - Get all todos
- `GET /api/v1/todos/:id` - Get a specific todo
- `PUT /api/v1/todos/:id` - Update a todo
- `DELETE /api/v1/todos/:id` - Delete a todo

### Example Requests

**Create Todo:**
```bash
curl -X POST http://localhost:3000/api/v1/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Go", "description": "Study Fiber framework"}'
```

**Get All Todos:**
```bash
curl http://localhost:3000/api/v1/todos
```

**Update Todo:**
```bash
curl -X PUT http://localhost:3000/api/v1/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

## 🏛️ Architecture

This project follows a clean architecture pattern:

- **Handlers**: Handle HTTP requests/responses
- **Services**: Contain business logic
- **Repositories**: Handle database operations
- **Models**: Define data structures and DTOs

This separation ensures:
- Easy testing
- Better maintainability
- Clear separation of concerns
- Scalability

## 🛠️ Development

### Database Migrations

Migrations run automatically on startup via GORM AutoMigrate in `cmd/main.go`.

### Adding New Features

1. Create model in `internal/models/`
2. Create repository in `internal/repo/`
3. Create service in `internal/service/`
4. Create handler in `internal/handlers/`
5. Register routes in `internal/api/routes/v1/`

## 📦 Dependencies

- [Fiber](https://gofiber.io/) - Web framework
- [GORM](https://gorm.io/) - ORM library
- [PostgreSQL Driver](https://github.com/jackc/pgx) - Database driver
- [godotenv](https://github.com/joho/godotenv) - Environment variable loader
- [Air](https://github.com/air-verse/air) - Hot reload utility
# melina-studiov2-backend
