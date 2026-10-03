.PHONY: help install test lint format typecheck dev-backend dev-frontend docker-up docker-down clean

# Default target
help:
	@echo "Forensic Recovery Platform - Development Commands"
	@echo ""
	@echo "Backend:"
	@echo "  install       Install backend dependencies"
	@echo "  test          Run backend tests"
	@echo "  lint          Run backend linter (ruff)"
	@echo "  format        Format backend code (ruff + black)"
	@echo "  typecheck     Run mypy type checking"
	@echo "  dev-backend   Run backend dev server"
	@echo ""
	@echo "Frontend:"
	@echo "  frontend-install  Install frontend dependencies"
	@echo "  frontend-test     Run frontend tests"
	@echo "  frontend-lint     Run frontend linter"
	@echo "  frontend-typecheck Run frontend typecheck"
	@echo "  dev-frontend      Run frontend dev server"
	@echo ""
	@echo "Docker:"
	@echo "  docker-up     Start all services"
	@echo "  docker-down   Stop all services"
	@echo "  docker-logs   View logs"
	@echo ""
	@echo "General:"
	@echo "  clean         Clean build artifacts"

# Backend
install:
	cd backend && pip install -e ".[dev]"

test:
	cd backend && pytest -v --cov=app --cov-report=term-missing

lint:
	cd backend && ruff check app/

format:
	cd backend && ruff format app/ && ruff check --fix app/

typecheck:
	cd backend && mypy app/

dev-backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
frontend-install:
	cd frontend && npm install

frontend-test:
	cd frontend && npm test

frontend-lint:
	cd frontend && npm run lint

frontend-typecheck:
	cd frontend && npm run typecheck

dev-frontend:
	cd frontend && npm run dev

# Docker
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

# Clean
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
	rm -rf backend/*.egg-info 2>/dev/null || true
	rm -rf .coverage 2>/dev/null || true