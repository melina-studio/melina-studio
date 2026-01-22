<p align="center">
  <img src="apps/web/public/icons/logo.svg" alt="Melina Studio Logo" width="80" height="80" />
</p>

<h1 align="center">Melina Studio</h1>

<p align="center">
  <strong>Cursor for Canvas</strong><br/>
  Describe your intent. Melina handles the canvas.
</p>

<p align="center">
  <a href="https://github.com/melina-studio/melina-studio/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
  </a>
  <a href="https://github.com/melina-studio/melina-studio/stargazers">
    <img src="https://img.shields.io/github/stars/melina-studio/melina-studio" alt="Stars" />
  </a>
  <a href="https://github.com/melina-studio/melina-studio/issues">
    <img src="https://img.shields.io/github/issues/melina-studio/melina-studio" alt="Issues" />
  </a>
</p>

<p align="center">
  <a href="#about">About</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#tech-stack">Tech Stack</a> &bull;
  <a href="#project-structure">Project Structure</a> &bull;
  <a href="#contributing">Contributing</a> &bull;
  <a href="#license">License</a>
</p>

---

## About

Melina Studio is an AI-powered design platform that lets you create stunning visuals through natural language. Simply describe what you want to create, and Melina translates your intent into beautiful designs on the canvas.

## Features

- **AI-Powered Design** - Describe your design intent in natural language
- **Interactive Canvas** - Built with Konva for smooth, performant canvas interactions
- **Real-time Collaboration** - Work together with your team in real-time
- **Modern UI** - Clean, responsive interface built with Tailwind CSS
- **Multiple AI Models** - Support for Anthropic Claude, Google Gemini, and more

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18.17+ (for local development)
- Go 1.21+ (for local development)

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/melina-studio/melina-studio.git
cd melina-studio

# Copy environment files
cp .env.example .env

# Start all services
docker-compose up
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8080

### Local Development

```bash
# Clone the repository
git clone https://github.com/melina-studio/melina-studio.git
cd melina-studio

# Install frontend dependencies
cd apps/web
npm install

# Start frontend dev server
npm run dev

# In another terminal, start backend
cd apps/api
go mod download
air  # or: go run cmd/main.go
```

See the [Getting Started Guide](docs/getting-started.md) for detailed setup instructions.

## Tech Stack

### Frontend (`apps/web`)

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | React framework with App Router |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Tailwind CSS 4](https://tailwindcss.com/) | Styling |
| [Konva](https://konvajs.org/) | 2D canvas rendering |
| [Three.js](https://threejs.org/) | 3D graphics |
| [Zustand](https://zustand-demo.pmnd.rs/) | State management |
| [Vercel AI SDK](https://sdk.vercel.ai/) | AI integration |

### Backend (`apps/api`)

| Technology | Purpose |
|------------|---------|
| [Go](https://go.dev/) | Programming language |
| [Fiber](https://gofiber.io/) | Web framework |
| [GORM](https://gorm.io/) | ORM |
| [PostgreSQL](https://www.postgresql.org/) | Database |
| [Redis](https://redis.io/) | Caching & sessions |

## Project Structure

```
melina-studio/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   ├── components/     # React components
│   │   │   ├── lib/            # Utilities
│   │   │   └── stores/         # Zustand stores
│   │   └── public/             # Static assets
│   └── api/                    # Go backend
│       ├── cmd/                # Entry point
│       └── internal/
│           ├── api/            # HTTP server & routes
│           ├── handlers/       # Request handlers
│           ├── service/        # Business logic
│           ├── repo/           # Data access
│           └── models/         # Data models
├── docs/                       # Documentation
├── scripts/                    # Utility scripts
├── docker-compose.yml          # Docker services
└── Makefile                    # Common commands
```

## Available Commands

```bash
# Development
make dev          # Start all services in development mode
make dev-web      # Start frontend only
make dev-api      # Start backend only

# Building
make build        # Build all services
make build-web    # Build frontend
make build-api    # Build backend

# Testing
make test         # Run all tests
make test-web     # Run frontend tests
make test-api     # Run backend tests

# Docker
make docker-up    # Start Docker services
make docker-down  # Stop Docker services

# Utilities
make lint         # Run linters
make clean        # Clean build artifacts
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Security

If you discover a security vulnerability, please see our [Security Policy](SECURITY.md) for responsible disclosure guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with care by the Melina Studio team
</p>
