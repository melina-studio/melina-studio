# Contributing to Melina Studio

Thank you for your interest in contributing to Melina Studio! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Getting Help](#getting-help)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/melina-studio.git
   cd melina-studio
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/melina-studio/melina-studio.git
   ```

## Development Setup

### Prerequisites

- Node.js 18.17 or later
- Go 1.21 or later
- Docker and Docker Compose
- PostgreSQL (or use Docker)

### Environment Setup

1. **Copy environment files**:
   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env.local
   cp apps/api/.env.example apps/api/.env
   ```

2. **Start with Docker** (recommended):
   ```bash
   docker-compose up
   ```

   Or **start manually**:
   ```bash
   # Terminal 1: Frontend
   cd apps/web
   npm install
   npm run dev

   # Terminal 2: Backend
   cd apps/api
   go mod download
   air
   ```

### Verifying Setup

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api/v1/health

## Making Changes

### Branching Strategy

- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Creating a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create your branch
git checkout -b feature/your-feature-name
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/). Each commit message should be structured as:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

### Examples

```
feat(canvas): add shape grouping functionality
fix(auth): resolve token refresh race condition
docs(api): update authentication endpoint docs
```

## Pull Request Process

1. **Update your branch** with the latest changes from `main`:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your changes**:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Open a Pull Request** on GitHub

4. **Fill out the PR template** with:
   - Summary of changes
   - Related issue numbers
   - Test plan
   - Screenshots (for UI changes)

5. **Address review feedback** by pushing additional commits

6. **Once approved**, a maintainer will merge your PR

### PR Requirements

- All CI checks must pass
- At least one maintainer approval
- No merge conflicts
- Follows coding standards

## Coding Standards

### Frontend (TypeScript/React)

- Use TypeScript strict mode
- Follow the existing code style
- Use functional components with hooks
- Run `npm run lint` before committing

```typescript
// Good
interface ButtonProps {
  label: string;
  onClick: () => void;
}

export function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}
```

### Backend (Go)

- Follow [Effective Go](https://go.dev/doc/effective_go) guidelines
- Run `go fmt` and `go vet` before committing
- Write table-driven tests where applicable

```go
// Good
func (s *BoardService) GetByID(ctx context.Context, id string) (*Board, error) {
    board, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("finding board: %w", err)
    }
    return board, nil
}
```

### General Guidelines

- Write clear, self-documenting code
- Add comments for complex logic
- Keep functions small and focused
- Write tests for new functionality
- Update documentation as needed

## Getting Help

- **Questions**: Open a [GitHub Discussion](https://github.com/melina-studio/melina-studio/discussions)
- **Bugs**: Open a [GitHub Issue](https://github.com/melina-studio/melina-studio/issues)
- **Security**: See [SECURITY.md](SECURITY.md)

---

Thank you for contributing to Melina Studio!
