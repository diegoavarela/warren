#!/bin/bash

# Test script to simulate Vercel build process locally
# This mirrors the exact build steps that Vercel runs

echo "🧪 Testing Vercel Build Process Locally"
echo "========================================"

# Store original directory
ORIGINAL_DIR=$(pwd)
PROJECT_ROOT="/Users/diegovarela/AI Agents/warren-v2"

cd "$PROJECT_ROOT"

echo "1. Installing warren dependencies..."
cd warren && npm install
if [ $? -ne 0 ]; then
    echo "❌ Warren npm install failed"
    exit 1
fi

echo "2. Installing shared dependencies..."
cd ../shared && npm install
if [ $? -ne 0 ]; then
    echo "❌ Shared npm install failed"
    exit 1
fi

echo "3. Minimal install for Next.js detection..."
cd ../admin-portal && npm install --legacy-peer-deps next react react-dom
if [ $? -ne 0 ]; then
    echo "❌ Admin-portal minimal install failed"
    exit 1
fi

echo "4. Fresh full install admin-portal dependencies..."
rm -rf node_modules && npm install --legacy-peer-deps
if [ $? -ne 0 ]; then
    echo "❌ Admin-portal npm install failed"
    exit 1
fi

echo "5. Debug: Check admin-portal dependencies..."
npm ls --depth=0 | grep tailwind
echo "6. Running admin-portal standalone build..."
npm run build:standalone
if [ $? -eq 0 ]; then
    echo "✅ Vercel build simulation PASSED"
else
    echo "❌ Vercel build simulation FAILED"
    exit 1
fi

cd "$ORIGINAL_DIR"
echo "🎉 Build test completed successfully!"