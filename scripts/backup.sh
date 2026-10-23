#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/coupfranc}"
DATE=$(date +%Y-%m-%d_%H%M%S)
APP_DIR="${APP_DIR:-/opt/coupfranc}"

mkdir -p "$BACKUP_DIR"

echo "==> CoupFranc Backup started: $DATE"

# Check if running containerized or standalone
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^coupfranc_app$'; then
  echo "Backing up from running Docker container coupfranc_app..."
  docker exec coupfranc_app tar -czf - -C /app data > "$BACKUP_DIR/coupfranc_backup_$DATE.tar.gz"
elif [ -d "$APP_DIR/data" ]; then
  echo "Backing up from directory $APP_DIR/data..."
  tar -czf "$BACKUP_DIR/coupfranc_backup_$DATE.tar.gz" -C "$APP_DIR" data
elif [ -d "./data" ]; then
  echo "Backing up from local ./data..."
  tar -czf "$BACKUP_DIR/coupfranc_backup_$DATE.tar.gz" data
else
  echo "ERROR: Could not locate CoupFranc data directory." >&2
  exit 1
fi

# Retention policy: remove backups older than 30 days
find "$BACKUP_DIR" -name "coupfranc_backup_*.tar.gz" -type f -mtime +30 -delete 2>/dev/null || true

echo "==> Backup complete: $BACKUP_DIR/coupfranc_backup_$DATE.tar.gz"
