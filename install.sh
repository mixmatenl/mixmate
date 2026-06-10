#!/bin/bash
set -e

echo "=== Mixmate installatie ==="

# Backend
echo ""
echo "-- Python omgeving aanmaken..."
cd "$(dirname "$0")"

python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip -q
pip install -r backend/requirements.txt -q

# Frontend
echo ""
echo "-- Frontend bouwen..."
cd frontend
npm install --silent
npm run build
cd ..

echo ""
echo "=== Installatie klaar! ==="
echo ""
echo "Start de app met:"
echo "  ./start.sh"
