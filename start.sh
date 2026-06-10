#!/bin/bash
cd "$(dirname "$0")"
source .venv/bin/activate
echo "Mixmate gestart op http://localhost:8000"
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
