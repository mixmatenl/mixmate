#!/bin/bash
# Wordt uitgevoerd door systemd als ExecStartPre voor mixmate.service.
# Checkt of er nieuwe code beschikbaar is en bouwt alleen dan opnieuw.

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_TAG="mixmate-update"

log() { echo "[$LOG_TAG] $*"; }

# Zoek npm
NPM=$(which npm 2>/dev/null || echo "/usr/bin/npm")
PIP="$APP_DIR/.venv/bin/pip"

log "Auto-update check gestart ($(date '+%H:%M:%S'))"

# Netwerk beschikbaar? (zonder internet kunnen we niet updaten)
if ! ping -c1 -W3 8.8.8.8 &>/dev/null; then
    log "Geen internetverbinding — update overgeslagen"
    exit 0
fi

# Fetch remote zonder te mergen
cd "$APP_DIR"
HOME=/home/pi git fetch origin main --quiet 2>/dev/null || {
    log "Git fetch mislukt — update overgeslagen"
    exit 0
}

# Check hoeveel commits achter we lopen
BEHIND=$(git rev-list HEAD..origin/main --count 2>/dev/null || echo "0")

if [ "$BEHIND" -eq 0 ]; then
    log "Al up-to-date"
    exit 0
fi

log "$BEHIND nieuwe commit(s) gevonden — update starten..."

# Houd huidige major versie bij vóór de update
OLD_VERSION=$(grep '"version"' "$APP_DIR/frontend/package.json" 2>/dev/null | head -1 | sed 's/.*: *"\([0-9]*\).*/\1/' || echo "0")

# Code ophalen
git reset --hard origin/main --quiet || { log "Git reset mislukt"; exit 1; }
log "Code bijgewerkt naar $(git rev-parse --short HEAD)"

# Python dependencies
if [ -f "$PIP" ]; then
    "$PIP" install -q -r backend/requirements.txt || log "pip install mislukt (non-fatal)"
fi

# Frontend bouwen (alleen als package.json gewijzigd is)
if git diff HEAD~"$BEHIND" HEAD --name-only | grep -q "frontend/"; then
    log "Frontend bestanden gewijzigd — bouwen..."
    cd "$APP_DIR/frontend"
    "$NPM" ci --prefer-offline --no-audit --no-fund --silent 2>/dev/null && \
    "$NPM" run build --silent || { log "Frontend build mislukt"; exit 1; }
    cd "$APP_DIR"
fi

NEW_VERSION=$(grep '"version"' "$APP_DIR/frontend/package.json" 2>/dev/null | head -1 | sed 's/.*: *"\([0-9]*\).*/\1/' || echo "0")
FULL_VERSION=$(grep '"version"' "$APP_DIR/frontend/package.json" 2>/dev/null | head -1 | sed 's/.*: *"\(.*\)".*/\1/')

log "Update klaar (v$FULL_VERSION)"

# Bij een major versiesprong: vlag aanmaken zodat de service na opstarten herstart
if [ "$NEW_VERSION" != "$OLD_VERSION" ] && [ "$OLD_VERSION" != "0" ]; then
    log "Major versiesprong gedetecteerd ($OLD_VERSION → $NEW_VERSION) — machine herstart na opstarten"
    touch /tmp/mixmate_major_update
fi

exit 0
