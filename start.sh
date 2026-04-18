#!/bin/bash

# Install frontend dependencies and build
cd frontend
npm ci
npm run build
cd ..

# Install backend dependencies
cd backend
npm ci

# Start backend with PM2
echo "Starting backend with PM2 on port 5000..."
pm2 start index.js --name techturf-backend
