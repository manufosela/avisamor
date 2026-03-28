#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Building PWA..."
cd "$ROOT_DIR/pwa" && npm run build

echo "==> Deploying hosting..."
cd "$ROOT_DIR" && firebase deploy --only hosting --project avisador-avisamor

echo "==> Hosting deployed successfully."
