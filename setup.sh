#!/bin/bash

echo "=========================================================="
echo "✈️  Delta FareGuard - Installation & Setup Script"
echo "=========================================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v18+) first."
    exit 1
fi

echo "1. Installing backend dependencies..."
npm install

echo "2. Installing Playwright Chromium browser..."
npx playwright install chromium

echo "3. Installing frontend dependencies & building UI..."
cd src/frontend
npm install
npm run build
cd ../..

echo ""
echo "=========================================================="
echo "✅ Setup Complete!"
echo "To start Delta FareGuard, run:"
echo "   npm start"
echo ""
echo "Then open your browser to: http://localhost:3001"
echo "=========================================================="
