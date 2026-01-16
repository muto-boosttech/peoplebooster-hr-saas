# ========================================
# PeopleBooster Makefile
# ========================================
# Shortcuts for common development tasks

.PHONY: help setup dev dev-docker build up down stop restart logs clean migrate seed shell test lint format

# Default target
help:
	@echo "PeopleBooster Development Commands"
	@echo "=================================="
	@echo ""
	@echo "Setup:"
	@echo "  make setup          - Install all dependencies"
	@echo "  make setup-env      - Copy environment files"
	@echo ""
	@echo "Development:"
	@echo "  make dev            - Start local development servers"
	@echo "  make dev-docker     - Start Docker development environment"
	@echo ""
	@echo "Docker:"
	@echo "  make up             - Start Docker containers"
	@echo "  make down           - Stop Docker containers"
	@echo "  make stop           - Stop Docker containers (keep volumes)"
	@echo "  make restart        - Restart Docker containers"
	@echo "  make logs           - View Docker logs"
	@echo "  make clean          - Remove Docker containers and volumes"
	@echo "  make rebuild        - Rebuild Docker images"
	@echo ""
	@echo "Database:"
	@echo "  make migrate        - Run database migrations"
	@echo "  make seed           - Seed database with test data"
	@echo "  make studio         - Open Prisma Studio"
	@echo ""
	@echo "Shell Access:"
	@echo "  make shell-backend  - Access backend container shell"
	@echo "  make shell-frontend - Access frontend container shell"
	@echo "  make shell-db       - Access PostgreSQL shell"
	@echo "  make shell-redis    - Access Redis CLI"
	@echo ""
	@echo "Quality:"
	@echo "  make test           - Run tests"
	@echo "  make lint           - Run linters"
	@echo "  make format         - Format code"
	@echo ""

# ========================================
# Setup
# ========================================

setup:
	npm run setup

setup-env:
	npm run setup:env

# ========================================
# Development
# ========================================

dev:
	npm run dev

dev-docker:
	npm run dev:docker

# ========================================
# Docker
# ========================================

up:
	docker-compose up -d

down:
	docker-compose down

stop:
	docker-compose stop

restart:
	docker-compose restart

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

clean:
	docker-compose down -v --remove-orphans

rebuild:
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d

ps:
	docker-compose ps

# ========================================
# Database
# ========================================

migrate:
	docker-compose exec backend npx prisma migrate dev

migrate-deploy:
	docker-compose exec backend npx prisma migrate deploy

migrate-reset:
	docker-compose exec backend npx prisma migrate reset --force

seed:
	docker-compose exec backend npx prisma db seed

studio:
	docker-compose exec backend npx prisma studio

generate:
	docker-compose exec backend npx prisma generate

# ========================================
# Shell Access
# ========================================

shell-backend:
	docker-compose exec backend sh

shell-frontend:
	docker-compose exec frontend sh

shell-db:
	docker-compose exec postgres psql -U postgres -d peoplebooster

shell-redis:
	docker-compose exec redis redis-cli -a redis_password

# ========================================
# Quality
# ========================================

test:
	npm run test

lint:
	npm run lint

lint-fix:
	npm run lint:fix

format:
	npm run format

# ========================================
# Build
# ========================================

build:
	npm run build

build-docker:
	docker-compose build
