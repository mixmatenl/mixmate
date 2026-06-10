#!/bin/bash

# ─────────────────────────────────────────────
#  MIXMATE OS — Installer
#  Gebruik: curl -sSL https://raw.githubusercontent.com/mixmatenl/mixmate/main/install.sh | sudo bash
# ─────────────────────────────────────────────

REPO="https://github.com/mixmatenl/mixmate.git"
INSTALL_DIR="/home/pi/mixmate"
SERVICE_NAME="mixmate"
USER="pi"

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

log()  { echo -e "${GREEN}[MIXMATE]${NC} $1"; }
warn() { echo -e "${YELLOW}[MIXMATE]${NC} $1"; }
fail() { echo -e "${RED}[MIXMATE] FOUT:${NC} $1"; exit 1; }

# Installeer een package, sla over als niet beschikbaar
try_install() {
  for pkg in "$@"; do
    if apt-cache show "$pkg" &>/dev/null; then
      apt-get install -y -qq "$pkg" && log "$pkg geïnstalleerd" || warn "$pkg installatie mislukt — doorgaan"
    else
      warn "$pkg niet beschikbaar op dit systeem — overgeslagen"
    fi
  done
}

echo ""
echo "  ███╗   ███╗██╗██╗  ██╗███╗   ███╗ █████╗ ████████╗███████╗"
echo "  ████╗ ████║██║╚██╗██╔╝████╗ ████║██╔══██╗╚══██╔══╝██╔════╝"
echo "  ██╔████╔██║██║ ╚███╔╝ ██╔████╔██║███████║   ██║   █████╗  "
echo "  ██║╚██╔╝██║██║ ██╔██╗ ██║╚██╔╝██║██╔══██║   ██║   ██╔══╝  "
echo "  ██║ ╚═╝ ██║██║██╔╝ ██╗██║ ╚═╝ ██║██║  ██║   ██║   ███████╗"
echo "  ╚═╝     ╚═╝╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝"
echo ""
echo "  Installer — $(date '+%Y-%m-%d')"
echo ""

# ── Root check ────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  fail "Voer de installer uit als root:\n  curl -sSL https://raw.githubusercontent.com/mixmatenl/mixmate/main/install.sh | sudo bash"
fi

# ── Systeem updaten ───────────────────────────
log "Pakketlijsten bijwerken..."
apt-get update -qq

# ── Verplichte packages ───────────────────────
log "Basis dependencies installeren..."
apt-get install -y -qq git python3 python3-pip python3-venv python3-full curl || fail "Kan basispackages niet installeren. Controleer de internetverbinding."

# ── Optionele packages ────────────────────────
log "Optionele packages installeren..."
try_install unclutter

# ── Chromium ─────────────────────────────────
log "Chromium installeren..."
if apt-cache show chromium &>/dev/null; then
  apt-get install -y -qq chromium
  CHROMIUM_BIN="chromium"
elif apt-cache show chromium-browser &>/dev/null; then
  apt-get install -y -qq chromium-browser
  CHROMIUM_BIN="chromium-browser"
else
  warn "Chromium niet gevonden — browserinstallatie overgeslagen"
  CHROMIUM_BIN="chromium"
fi

# ── Node.js ───────────────────────────────────
if ! command -v node &>/dev/null || [[ $(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
  log "Node.js 20 installeren..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
  apt-get install -y -qq nodejs || fail "Kan Node.js niet installeren"
fi
log "Node.js $(node -v) — npm $(npm -v)"

# ── Repo clonen of updaten ────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
  log "Bestaande installatie gevonden — updaten..."
  sudo -u $USER git -C "$INSTALL_DIR" fetch origin main
  sudo -u $USER git -C "$INSTALL_DIR" checkout main
  sudo -u $USER git -C "$INSTALL_DIR" reset --hard origin/main
else
  log "Repository downloaden..."
  sudo -u $USER git clone "$REPO" "$INSTALL_DIR" || fail "Kan repository niet downloaden. Controleer de internetverbinding."
fi

# ── Python dependencies ───────────────────────
log "Python dependencies installeren..."
pip3 install --quiet --break-system-packages -r "$INSTALL_DIR/backend/requirements.txt" \
  || pip3 install --quiet -r "$INSTALL_DIR/backend/requirements.txt" \
  || fail "Kan Python packages niet installeren"
UVICORN_BIN="$(which uvicorn || echo uvicorn)"

# ── Frontend bouwen ───────────────────────────
log "Frontend installeren en bouwen (dit duurt even)..."
# Verwijder oude node_modules/dist om rechten-problemen te voorkomen
rm -rf "$INSTALL_DIR/frontend/node_modules" "$INSTALL_DIR/frontend/dist"
sudo -u $USER npm --prefix "$INSTALL_DIR/frontend" ci --silent || fail "npm ci mislukt"
sudo -u $USER npm --prefix "$INSTALL_DIR/frontend" run build || fail "Frontend build mislukt"

# ── Systemd service ───────────────────────────
log "Systemd service instellen..."
cat > /etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=Mixmate Cocktailmachine
After=network.target

[Service]
User=${USER}
WorkingDirectory=${INSTALL_DIR}
ExecStart=${UVICORN_BIN} backend.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
Environment=PYTHONPATH=${INSTALL_DIR}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl restart $SERVICE_NAME

# ── Chromium autostart ────────────────────────
log "Chromium kiosk autostart instellen..."
AUTOSTART_DIR="/home/${USER}/.config/autostart"
mkdir -p "$AUTOSTART_DIR"

cat > "${AUTOSTART_DIR}/mixmate.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Mixmate
Exec=${CHROMIUM_BIN} --kiosk --noerrdialogs --disable-infobars --no-first-run --password-store=basic --disable-translate --force-device-scale-factor=1.5 http://localhost:8000
X-GNOME-Autostart-enabled=true
EOF

chown -R ${USER}:${USER} "$AUTOSTART_DIR"

# ── Cursor verbergen ──────────────────────────
for AUTOSTART_FILE in \
  "/etc/xdg/lxsession/LXDE-pi/autostart" \
  "/etc/xdg/lxsession/rpd-x/autostart"; do
  if [ -f "$AUTOSTART_FILE" ] && ! grep -q "unclutter" "$AUTOSTART_FILE"; then
    echo "@unclutter -idle 0" >> "$AUTOSTART_FILE"
  fi
done

# ── Versie ophalen ────────────────────────────
VERSION=$(python3 -c "import json; print(json.load(open('$INSTALL_DIR/frontend/package.json'))['version'])" 2>/dev/null || echo "onbekend")

# ── Klaar ─────────────────────────────────────
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   MIXMATE OS succesvol geïnstalleerd!  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
log "Versie : v${VERSION}"
log "Adres  : http://localhost:8000"
echo ""
warn "Vergeet niet: stel het machine model in via Backoffice → Machine"
echo ""
log "Pi herstart over 5 seconden..."
sleep 5
reboot
