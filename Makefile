.PHONY: help build start stop dev lint test test-watch preview clean install status

DEV_PID_FILE := .dev-server.pid
DEV_PORT := 5180

help:
	@echo "Odorik Dash - Available commands:"
	@echo ""
	@echo "  make start        Start dev server (background)"
	@echo "  make stop         Stop dev server"
	@echo "  make status       Show if dev server is running"
	@echo "  make dev          Start dev server (foreground)"
	@echo "  make build        Build production version"
	@echo "  make preview      Preview production build"
	@echo "  make lint         Run code linting"
	@echo "  make test         Run tests"
	@echo "  make test-watch   Run tests in watch mode"
	@echo "  make clean        Remove build artifacts"
	@echo "  make install      Install dependencies"
	@echo ""
	@echo "Examples:"
	@echo "  make start        # Start dev server in background"
	@echo "  make stop         # Stop dev server"
	@echo "  make dev          # Start dev server in terminal"

build:
	npm run build
	mkdir -p docs/locales && cp src/i18n/locales/*.json docs/locales/
	cp src/CNAME docs/CNAME

start:
	@if [ -f $(DEV_PID_FILE) ] && kill -0 $$(cat $(DEV_PID_FILE)) 2>/dev/null; then \
		echo "Dev server already running on http://localhost:$(DEV_PORT)"; \
	else \
		echo "Starting dev server on http://localhost:$(DEV_PORT)..."; \
		npx vite --port $(DEV_PORT) &>/dev/null & \
		echo $$! > $(DEV_PID_FILE); \
		sleep 2; \
		open http://localhost:$(DEV_PORT); \
		echo "Dev server started"; \
	fi

stop:
	@if [ -f $(DEV_PID_FILE) ]; then \
		PID=$$(cat $(DEV_PID_FILE)); \
		if kill -0 $$PID 2>/dev/null; then \
			kill $$PID; \
			rm -f $(DEV_PID_FILE); \
			echo "Dev server stopped"; \
		else \
			echo "Dev server not running (stale PID file removed)"; \
			rm -f $(DEV_PID_FILE); \
		fi; \
	else \
		echo "Dev server not running"; \
	fi

status:
	@if [ -f $(DEV_PID_FILE) ] && kill -0 $$(cat $(DEV_PID_FILE)) 2>/dev/null; then \
		echo "Dev server running on http://localhost:$(DEV_PORT) (PID: $$(cat $(DEV_PID_FILE)))"; \
	else \
		echo "Dev server not running"; \
	fi

dev:
	npm run dev

lint:
	npm run lint

preview:
	npm run preview

test:
	npm run test

test-watch:
	npm run test:watch

clean:
	rm -rf node_modules/.cache docs/
	@echo "Cleaned cache and build artifacts"

install:
	npm install