#!/bin/bash
# Load .env.production into environment variables
if [ -f .env.production ]; then
  set -a
  source .env.production
  set +a
  echo "Loaded VITE_GEMINI_API_KEY from .env.production"
else
  echo "ERROR: .env.production not found!" >&2
  exit 1
fi

# Build frontend with env vars available
NODE_ENV=production vite build

# Build backend
esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
