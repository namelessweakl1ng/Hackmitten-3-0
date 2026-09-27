#!/usr/bin/env bash
set -euo pipefail

if [ ! -f "frontend/package.json" ] || [ ! -f "backend/package.json" ]; then
  echo "Missing workspace package manifests" >&2
  exit 1
fi

echo "Frontend and backend package manifests are present."
echo "Manual verification: ensure PostgreSQL, nginx, and systemd are configured on the target host."
