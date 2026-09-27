#!/usr/bin/env bash
set -euo pipefail

curl -fsS http://127.0.0.1:3001/api/health
curl -fsS http://127.0.0.1:3000/ >/dev/null

echo "Health checks passed."
