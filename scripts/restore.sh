#!/bin/bash
set -euo pipefail

BACKUP_FILE="${1:-}"
APP_DIR="${APP_DIR:-/opt/coupfranc}"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage: $0 /path/to/coupfranc_backup_YYYY-MM-DD_HHMMSS.tar.gz" >&2
  exit 1
fi

echo "==> Restoring CoupFranc data from: $BACKUP_FILE"

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^coupfranc_app$'; then
  echo "Restoring into running Docker container coupfranc_app..."
  cat "$BACKUP_FILE" | docker exec -i coupfranc_app tar -xzf - -C /app
  echo "Restarting coupfranc_app container..."
  docker restart coupfranc_app
elif [ -d "$APP_DIR" ]; then
  echo "Restoring into directory $APP_DIR..."
  tar -xzf "$BACKUP_FILE" -C "$APP_DIR"
elif [ -d "." ]; then
  echo "Restoring into current directory..."
  tar -xzf "$BACKUP_FILE"
else
  echo "ERROR: Target directory not found." >&2
  exit 1
fi

echo "==> Restore completed successfully."
