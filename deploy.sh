#!/bin/bash
# Quick deployment script for EC2

echo "Building Docker image..."
docker build -t chess-app .

echo "Stopping existing container (if any)..."
docker stop chess-app 2>/dev/null || true
docker rm chess-app 2>/dev/null || true

echo "Starting new container..."
docker run -d -p 5000:5000 --name chess-app --restart unless-stopped chess-app

echo "Checking container status..."
sleep 2
docker ps | grep chess-app

echo ""
echo "Deployment complete! Access your app at:"
echo "  http://localhost:5000"
echo ""
echo "To view logs: docker logs -f chess-app"

