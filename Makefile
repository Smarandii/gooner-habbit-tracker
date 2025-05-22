run:
	docker run -p 1488:8000 -d --name my-habbit-hero-app habbit-hero

.PHONY: test test-frontend test-backend test-e2e setup

test-frontend:
	@echo "Running frontend tests..."
	npm test

test-backend:
	@echo "Running backend tests..."
	pytest tests/backend/test_server.py

# Optional: E2E tests - will use the command that was last attempted by the previous worker
# It might fail if the Playwright execution issue persists, but include it for completeness
test-e2e:
	@echo "Running E2E tests..."
	# Ensure server is not already running if Playwright's webServer is configured to start it
	# The playwright.config.js is set to start its own server instance.
	npm run test:e2e 

test: test-frontend test-backend test-e2e
	@echo "All tests completed."

# It's good practice to ensure that npm install and pip install have been run.
# Add a setup target that can be run manually or as a prerequisite if needed.
setup:
	@echo "Installing frontend dependencies..."
	npm install
	@echo "Installing backend dependencies..."
	pip install -r requirements.txt
	@echo "Setup complete."