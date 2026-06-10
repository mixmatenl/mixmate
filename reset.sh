#!/bin/bash

# ─────────────────────────────────────────────
#  MIXMATE OS — Factory Reset
#  Wist alle klantdata en zet de machine terug als nieuw.
#  Software, pompconfiguratie en OS blijven intact.
#
#  Gebruik: curl -sSL https://raw.githubusercontent.com/mixmatenl/mixmate/main/reset.sh | sudo bash
# ─────────────────────────────────────────────

INSTALL_DIR="/home/pi/mixmate"
SERVICE_NAME="mixmate"

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BOLD="\033[1m"
NC="\033[0m"

log()  { echo -e "${GREEN}[RESET]${NC} $1"; }
warn() { echo -e "${YELLOW}[RESET]${NC} $1"; }
fail() { echo -e "${RED}[RESET] FOUT:${NC} $1"; exit 1; }

# ── Root check ────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  fail "Voer het reset-script uit als root:\n  curl -sSL https://raw.githubusercontent.com/mixmatenl/mixmate/main/reset.sh | sudo bash"
fi

echo ""
echo -e "${BOLD}  MIXMATE OS — Factory Reset${NC}"
echo ""
warn "Dit wist de volgende gegevens van deze machine:"
echo ""
echo "    • Alle recepten, ingrediënten, categorieën en glazen"
echo "    • Pomp-configuratie en kalibratie"
echo "    • Gietgeschiedenis en favorieten"
echo "    • Geüploade foto's"
echo "    • PIN-code (terug naar standaard)"
echo "    • Machine model instelling"
echo ""
warn "De software zelf wordt NIET gewijzigd."
echo ""
read -p "  Weet je het zeker? Type 'reset' om te bevestigen: " CONFIRM
if [ "$CONFIRM" != "reset" ]; then
  echo ""
  log "Geannuleerd. Niets gewijzigd."
  exit 0
fi

echo ""
log "Reset gestart..."

# ── Service stoppen ───────────────────────────
log "Service stoppen..."
systemctl stop $SERVICE_NAME 2>/dev/null || true

# ── Database wissen ───────────────────────────
log "Database wissen..."
rm -f "$INSTALL_DIR/mixmate.db"
rm -f "$INSTALL_DIR/mixmate.db-shm"
rm -f "$INSTALL_DIR/mixmate.db-wal"

# ── Uploads wissen ────────────────────────────
log "Geüploade foto's wissen..."
rm -rf "$INSTALL_DIR/uploads"
mkdir -p "$INSTALL_DIR/uploads"
chown pi:pi "$INSTALL_DIR/uploads"

# ── .env resetten ─────────────────────────────
log ".env terugzetten naar standaardinstellingen..."
cat > "$INSTALL_DIR/.env" <<EOF
# MIXMATE OS — instellingen
# Pas de PINs aan via Backoffice → PIN beheer
MIXMATE_PIN=2580
MIXMATE_ADMIN_PIN=0000
MACHINE_MODEL=
EOF
chown pi:pi "$INSTALL_DIR/.env"

# ── Service herstarten ────────────────────────
log "Service herstarten..."
systemctl start $SERVICE_NAME

# Wacht tot de service online is
echo -n "  Wachten op service"
for i in {1..15}; do
  if curl -s http://localhost:8000/api/recipes > /dev/null 2>&1; then
    echo " ✓"
    break
  fi
  echo -n "."
  sleep 1
done

# ── Klaar ─────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Machine teruggezet naar fabrieksinstellingen  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
log "Standaard bartender PIN : 2580"
log "Standaard admin PIN     : 0000"
log "Machine model           : nog niet ingesteld"
echo ""
warn "Vergeet niet: stel het machine model in via Backoffice → Machine"
echo ""
