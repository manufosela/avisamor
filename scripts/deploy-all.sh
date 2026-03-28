#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Deploying functions..."
"$SCRIPT_DIR/deploy-functions.sh"

echo "==> Deploying PWA..."
"$SCRIPT_DIR/deploy-pwa.sh"

echo "==> Deploying Firestore rules..."
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR" && firebase deploy --only firestore --project avisador-avisamor

echo "==> All deployments completed successfully."
