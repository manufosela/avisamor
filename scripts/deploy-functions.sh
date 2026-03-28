#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Building functions..."
cd "$ROOT_DIR/functions" && npm run build

echo "==> Deploying functions..."
cd "$ROOT_DIR" && firebase deploy --only functions --project avisador-avisamor

echo "==> Functions deployed successfully."
