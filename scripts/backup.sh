#!/usr/bin/env bash
# Backup bazy + plików audio. Włącz do crona, np.:
#   0 3 * * * /opt/mennica/scripts/backup.sh >> /var/log/mennica-backup.log 2>&1
# Trzyma ostatnich 14 backupów.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups"
DATA_DIR="${PROJECT_DIR}/data"
STORAGE_DIR="${PROJECT_DIR}/storage"
TS=$(date -u +"%Y%m%dT%H%M%SZ")

mkdir -p "${BACKUP_DIR}"

# 1) Snapshot bazy (SQLite VACUUM INTO — bezpieczny w trakcie pracy aplikacji)
if [ -f "${DATA_DIR}/app.db" ]; then
    if command -v sqlite3 >/dev/null 2>&1; then
        sqlite3 "${DATA_DIR}/app.db" "VACUUM INTO '${BACKUP_DIR}/app-${TS}.db'"
    else
        cp "${DATA_DIR}/app.db" "${BACKUP_DIR}/app-${TS}.db"
    fi
fi

# 2) Tar nagrań
if [ -d "${STORAGE_DIR}/recordings" ]; then
    tar -czf "${BACKUP_DIR}/recordings-${TS}.tar.gz" -C "${STORAGE_DIR}" recordings
fi

# 3) Czyszczenie starszych backupów (zostaw 14)
ls -1t "${BACKUP_DIR}"/app-*.db 2>/dev/null | tail -n +15 | xargs -r rm -f
ls -1t "${BACKUP_DIR}"/recordings-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "[backup] OK ${TS}"
