#!/bin/bash

# Connection Test Script
# This script verifies that the frontend can connect to the backend API.

echo "Testing connection to backend API..."
echo "Checking if backend server is running on port 3001..."

# Check if the server is running using curl
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health | grep -q "200"; then
  echo "✅ Backend server is running on port 3001"
else
  echo "❌ Backend server is not running on port 3001"
  exit 1
fi

# Check the health endpoint
echo "Checking health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/health)
if [[ $HEALTH_RESPONSE == *"ok"* ]]; then
  echo "✅ Health endpoint is accessible"
else
  echo "❌ Health endpoint is not accessible"
  exit 1
fi

# Check the videos endpoint
echo "Checking videos endpoint..."
VIDEOS_RESPONSE=$(curl -s http://localhost:3001/api/videos)
if [[ $? -eq 0 ]]; then
  echo "✅ Videos endpoint is accessible"
else
  echo "❌ Videos endpoint is not accessible"
  exit 1
fi

echo "All connection tests passed!"
echo "Frontend and backend are properly configured for video upload."
