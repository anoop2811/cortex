.PHONY: help build build-local docker-build docker-run docker-shell clean test test-acceptance test-acceptance-cli test-acceptance-web test-unit test-all coverage watch install-deps upgrade-deps install

# Variables
BINARY_NAME=cortex
DOCKER_IMAGE=cortex
DOCKER_TAG=latest
GO=go
GINKGO=ginkgo
PLAYWRIGHT=npx playwright
COVERAGE_DIR=coverage
COVERAGE_THRESHOLD=90

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build-frontend: ## Build frontend and copy to server
	@echo "$(GREEN)Building frontend...$(NC)"
	@if [ -d "web/frontend" ]; then \
		if [ ! -d "web/frontend/node_modules" ]; then \
			echo "$(YELLOW)Installing frontend dependencies...$(NC)"; \
			cd web/frontend && npm install; \
		fi; \
		cd web/frontend && npm run build && \
		rm -rf ../server/frontend && \
		mkdir -p ../server/frontend && \
		cp -r dist/* ../server/frontend/ && \
		echo "$(GREEN)✓ Frontend built and copied to server$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Frontend directory not found, skipping frontend build$(NC)"; \
	fi

build-local: build-frontend ## Build cortex binary locally with frontend
	$(GO) build -o $(BINARY_NAME) .
	@echo "✓ Built $(BINARY_NAME)"

build: build-local ## Alias for build-local

docker-build: ## Build Docker image (CLI only, no UI)
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .
	@echo "✓ Built Docker image: $(DOCKER_IMAGE):$(DOCKER_TAG)"

docker-build-ui: ## Build Docker image with Web UI (recommended)
	@echo "$(GREEN)Building Cortex with Web UI in Docker...$(NC)"
	docker build -f Dockerfile.ui -t $(DOCKER_IMAGE)-ui:$(DOCKER_TAG) .
	@echo "$(GREEN)✓ Built Docker image with UI: $(DOCKER_IMAGE)-ui:$(DOCKER_TAG)$(NC)"

docker-run-ui: ## Run Cortex UI in Docker
	@echo "$(GREEN)Starting Cortex UI in Docker...$(NC)"
	docker run --rm -it -p 9090:8080 $(DOCKER_IMAGE)-ui:$(DOCKER_TAG) cortex ui --host 0.0.0.0 --port 8080

docker-run: ## Run cortex in Docker (pass ARGS="your-command")
	docker run --rm -it \
		-v $(HOME)/.kube:/root/.kube:ro \
		-v $(PWD)/example:/cortex/example \
		$(DOCKER_IMAGE):$(DOCKER_TAG) \
		cortex $(ARGS)

docker-shell: ## Open shell in Docker container
	docker run --rm -it \
		-v $(HOME)/.kube:/root/.kube:ro \
		-v $(PWD)/example:/cortex/example \
		$(DOCKER_IMAGE):$(DOCKER_TAG) \
		/bin/bash

docker-k8s-example: ## Run K8s health check example in Docker
	docker run --rm -it \
		-v $(HOME)/.kube:/root/.kube:ro \
		-e NAMESPACE=default \
		$(DOCKER_IMAGE):$(DOCKER_TAG) \
		cortex exec -p /cortex/example/k8s/k8s_cluster_health

docker-system-example: ## Run system health check example in Docker
	docker run --rm -it \
		$(DOCKER_IMAGE):$(DOCKER_TAG) \
		cortex exec -p /cortex/example/system_health_check

clean: ## Clean built binaries and test artifacts
	rm -f $(BINARY_NAME)
	rm -rf $(COVERAGE_DIR)
	find . -name "*.test" -type f -delete
	find . -name "*.out" -type f -delete
	@if [ -d "acceptance/web-ui" ]; then \
		cd acceptance/web-ui && rm -rf test-results playwright-report; \
	fi
	docker rmi $(DOCKER_IMAGE):$(DOCKER_TAG) 2>/dev/null || true
	@echo "✓ Cleaned"

## Testing Targets (TDD with Ginkgo v2 + Gomega + Playwright)

install-deps: ## Install Ginkgo v2, Gomega, Playwright
	@echo "$(GREEN)Installing Go testing dependencies...$(NC)"
	$(GO) install github.com/onsi/ginkgo/v2/ginkgo@latest
	$(GO) get -u github.com/onsi/ginkgo/v2
	$(GO) get -u github.com/onsi/gomega
	@echo "$(GREEN)Installing Playwright (Chromium only) for E2E tests...$(NC)"
	@if [ -d "acceptance/web-ui" ]; then \
		cd acceptance/web-ui && npm install && $(PLAYWRIGHT) install chromium --with-deps; \
	fi
	@echo "$(GREEN)All dependencies installed!$(NC)"

upgrade-deps: ## Upgrade Ginkgo and Gomega to v2
	@echo "$(GREEN)Upgrading Ginkgo and Gomega to v2...$(NC)"
	$(GO) get -u github.com/onsi/ginkgo/v2
	$(GO) get -u github.com/onsi/gomega
	$(GO) mod tidy
	@echo "$(GREEN)Dependencies upgraded!$(NC)"

test-acceptance-cli: ## Run CLI acceptance tests (outer loop TDD)
	@echo "$(GREEN)Running CLI acceptance tests...$(NC)"
	@if ! command -v $(GINKGO) > /dev/null; then \
		echo "$(RED)Ginkgo not found. Run 'make install-deps'$(NC)"; \
		exit 1; \
	fi
	@mkdir -p $(COVERAGE_DIR)
	$(GINKGO) -r -v --race --trace --label-filter="acceptance" ./acceptance/cli/
	@echo "$(GREEN)CLI acceptance tests completed!$(NC)"

test-acceptance-web: ## Run Web UI E2E tests with Playwright
	@echo "$(GREEN)Running Web UI E2E tests...$(NC)"
	@if [ -d "acceptance/web-ui" ] && [ -f "acceptance/web-ui/package.json" ]; then \
		cd acceptance/web-ui && $(PLAYWRIGHT) test; \
		echo "$(GREEN)Web UI E2E tests completed!$(NC)"; \
	else \
		echo "$(YELLOW)Web UI tests not set up. Skipping.$(NC)"; \
	fi

test-acceptance: test-acceptance-cli test-acceptance-web ## Run ALL acceptance tests
	@echo "$(GREEN)All acceptance tests completed!$(NC)"

test-unit: ## Run unit tests (inner loop TDD)
	@echo "$(GREEN)Running unit tests...$(NC)"
	@if ! command -v $(GINKGO) > /dev/null; then \
		echo "$(RED)Ginkgo not found. Run 'make install-deps'$(NC)"; \
		exit 1; \
	fi
	@mkdir -p $(COVERAGE_DIR)
	$(GINKGO) -r -v --race --trace ./internal/
	@echo "$(GREEN)Unit tests completed!$(NC)"

test-all: test-unit test-acceptance ## Run ALL tests (unit + acceptance)
	@echo "$(GREEN)All tests completed successfully!$(NC)"

test: test-all ## Alias for test-all

coverage: ## Generate test coverage report
	@echo "$(GREEN)Generating coverage report...$(NC)"
	@mkdir -p $(COVERAGE_DIR)
	$(GO) test -v -race -coverprofile=$(COVERAGE_DIR)/coverage.out -covermode=atomic ./...
	$(GO) tool cover -html=$(COVERAGE_DIR)/coverage.out -o $(COVERAGE_DIR)/coverage.html
	@echo "$(GREEN)Coverage report: $(COVERAGE_DIR)/coverage.html$(NC)"

watch: ## Run tests in watch mode (TDD workflow)
	@echo "$(GREEN)Starting TDD watch mode...$(NC)"
	$(GINKGO) watch -r -v --race

install: build-local ## Install cortex to /usr/local/bin (requires sudo)
	sudo mv $(BINARY_NAME) /usr/local/bin/
	@echo "✓ Installed to /usr/local/bin/$(BINARY_NAME)"

# Example neurons and synapses
create-neuron: ## Create a new neuron (NEURON_NAME=name TYPE=check|mutate)
	./$(BINARY_NAME) create-neuron $(NEURON_NAME) -t $(TYPE)

create-synapse: ## Create a new synapse (SYNAPSE_NAME=name)
	./$(BINARY_NAME) create-synapse $(SYNAPSE_NAME)

# Docker Compose targets
compose-up: ## Start services with docker-compose
	docker-compose up -d

compose-down: ## Stop services
	docker-compose down

compose-logs: ## View logs
	docker-compose logs -f

# CI/CD helpers
ci-build: ## Build for CI
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o $(BINARY_NAME)-linux-amd64 .
	CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -o $(BINARY_NAME)-darwin-amd64 .
	CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -o $(BINARY_NAME)-darwin-arm64 .
	@echo "✓ Built binaries for multiple platforms"

# Quick examples
example-system: build-local ## Run system health check example
	cd example/system_health_check && ../../$(BINARY_NAME) exec -p .

example-k8s: build-local ## Run K8s health check example
	cd example/k8s/k8s_cluster_health && ../../../$(BINARY_NAME) exec -p .

## Web UI targets

ui-dev: ## Start frontend dev server with hot reload (requires backend running)
	@echo "$(GREEN)Starting Vite dev server...$(NC)"
	@echo "$(YELLOW)Make sure backend is running: make ui-backend$(NC)"
	cd web/frontend && npm run dev

ui-backend: ## Start backend server for UI development
	@echo "$(GREEN)Starting backend server...$(NC)"
	$(GO) build -o $(BINARY_NAME) .
	./$(BINARY_NAME) ui --port 9090 --verbose 3

ui-build: build-frontend ## Build frontend only (alias for build-frontend)
	@echo "$(GREEN)✓ Frontend built$(NC)"

ui-install: ## Install frontend dependencies
	@echo "$(GREEN)Installing frontend dependencies...$(NC)"
	cd web/frontend && npm install
	@echo "$(GREEN)✓ Frontend dependencies installed$(NC)"

ui-clean-install: ## Clean install frontend dependencies (fixes ARM64 Mac issues)
	@echo "$(YELLOW)Cleaning frontend dependencies...$(NC)"
	cd web/frontend && rm -rf node_modules package-lock.json
	@echo "$(GREEN)Installing fresh dependencies...$(NC)"
	cd web/frontend && npm install
	@echo "$(GREEN)✓ Frontend dependencies cleanly installed$(NC)"

ui-fix-arm64: ## Fix Rollup ARM64 issue on Apple Silicon Macs
	@echo "$(YELLOW)Fixing ARM64 dependency issue...$(NC)"
	cd web/frontend && rm -rf node_modules package-lock.json && npm cache clean --force
	@echo "$(GREEN)Reinstalling with force flag...$(NC)"
	cd web/frontend && npm install --force
	@echo "$(GREEN)✓ ARM64 dependencies fixed$(NC)"

ui-lint: ## Lint frontend code
	@echo "$(GREEN)Linting frontend...$(NC)"
	cd web/frontend && npm run lint

ui-typecheck: ## Type check frontend code
	@echo "$(GREEN)Type checking frontend...$(NC)"
	cd web/frontend && npm run typecheck

ui: build ## Build everything and start UI server
	@echo "$(GREEN)Starting Cortex UI...$(NC)"
	./$(BINARY_NAME) ui --port 9090

ui-full: ui-install build ui ## Full build and start UI (install deps, build, start)
