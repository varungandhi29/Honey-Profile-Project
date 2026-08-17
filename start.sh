#!/bin/bash
if [ ! -d "frontend/dist" ]; then
  echo "[BUILD] Building frontend..."
  cd frontend && npm install && npm run build && cd ..
fi
cd backend
npm install
node server.js
