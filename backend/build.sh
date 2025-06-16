#!/bin/bash
echo "Installing dependencies..."
npm install

echo "Installing TypeScript..."
npm install -g typescript

echo "Building project..."
tsc

echo "Build complete!"