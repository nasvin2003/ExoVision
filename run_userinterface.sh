#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$ROOT_DIR/frontend"
npm start &
FRONTEND_PID=$!

cd "$ROOT_DIR/backend"
python Exoplanet_Graph.py &
BACKEND_PID=$!

trap "kill $FRONTEND_PID $BACKEND_PID 2>/dev/null || true" EXIT
wait
