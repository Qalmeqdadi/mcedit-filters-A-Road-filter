# Convenience targets. Each one is a plain command you can also run by hand (see README).
.PHONY: install db seed api web test lint

install:
	uv sync
	cd apps/web && npm install

db:
	docker compose up -d --wait db

seed:
	uv run hayat-seed

api:
	uv run uvicorn hayat_api.main:app --reload --port 8000

web:
	cd apps/web && npm run dev

test:
	uv run pytest
	cd apps/web && npm test

lint:
	uv run ruff check .
	uv run ruff format --check .
	cd apps/web && npm run typecheck
