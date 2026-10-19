#!/bin/bash

set -e

echo "Setting up Refraction test environment from current branch..."

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Building from branch: $CURRENT_BRANCH"

# Step 1: Stop and remove existing Refraction test containers
echo "Step 1: Cleaning up existing Refraction test containers"
REFRACTION_CONTAINERS=$(docker ps -q --filter "name=port888")
if [ -n "$REFRACTION_CONTAINERS" ]; then
  echo "Found running Refraction test containers:"
  docker ps --filter "name=port888" --format "table {{.Names}}\t{{.Status}}"
  if [[ "${SKIP_CONFIRMATION:-}" != "true" ]]; then
    read -p "Stop and remove these containers? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Skipping container cleanup. You may need to manually stop conflicting containers."
      echo "To skip this prompt, set SKIP_CONFIRMATION=true"
      exit 1
    fi
  fi
  echo "Stopping Refraction test containers..."
  docker stop $REFRACTION_CONTAINERS
fi
REFRACTION_CONTAINERS_ALL=$(docker ps -aq --filter "name=port888")
if [ -n "$REFRACTION_CONTAINERS_ALL" ]; then
  echo "Removing Refraction test containers..."
  docker rm $REFRACTION_CONTAINERS_ALL
fi

# Step 2: Prepare environment
echo "Step 2: Installing dependencies"
npm run install:ci

# Step 3: Build project from current branch
echo "Step 3: Building project from $CURRENT_BRANCH"
npm run build:packages
npm run composer:no-dev
npm run scripts
npm run styles
echo "Built Refraction assets from $CURRENT_BRANCH (the plugin tree under build/ is not needed here)"

# Step 4: no theme is downloaded; the test site uses the default WordPress theme

# Step 5: Start local servers
echo "Step 5: Starting WordPress environments"
npm run start-local-server

# Step 6: Setup WordPress environments
echo "Step 6: Configuring WordPress"
npm run test:setup:playwright

echo "Test environment setup completed successfully!"
echo ""
echo "WordPress environments are ready:"
echo "   - Port 8888: http://localhost:8888"
echo "   - Port 8889: http://localhost:8889"
echo "   - Admin panel: http://localhost:8888/wp-admin/"
echo "   - Login: admin / password"
echo ""
echo "Build info:"
echo "   - Branch: $CURRENT_BRANCH"
echo "   - Refraction version: Built from current branch"
echo ""
echo "Ready for testing and development!" 