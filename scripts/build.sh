#!/bin/bash
# Load .env.production into environment variables, WITHOUT overriding
# variables that are already set in the environment (e.g. Replit Secrets
# like VITE_YOUTUBE_API_KEY). This ensures real secrets always take
# precedence over placeholder values committed in .env.production.
if [ -f .env.production ]; then
  while IFS='=' read -r key value; do
    # Skip blank lines and comments
    [[ -z "$key" || "$key" == \#* ]] && continue
    if [ -z "${!key}" ]; then
      export "$key=$value"
    fi
  done < .env.production
  echo "Loaded .env.production (existing env vars / secrets take precedence)"
else
  echo "ERROR: .env.production not found!" >&2
  exit 1
fi

# Build frontend with env vars available
NODE_ENV=production vite build

# Build backend
esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
