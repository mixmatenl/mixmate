#!/bin/bash
set -e

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

# ── Systeem dependencies ──────────────────────
log "Systeem bijwerken en dependencies installeren..."
apt-get update -qq
apt-get install -y -qq \
  git python3 python3-pip python3-venv \
  libatlas-base-dev unclutter

# Chromium (naam verschilt per OS versie)
if apt-cache show chromium &>/dev/null; then
  apt-get install -y -qq chromium
elif apt-cache show chromium-browser &>/dev/null; then
  apt-get install -y -qq chromium-browser
else
  warn "Chromium niet gevonden via apt — sla browserinstallatie over."
fi

# ── Node.js ───────────────────────────────────
if ! command -v node &>/dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
  log "Node.js 20 installeren..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
  apt-get install -y -qq nodejs
fi
log "Node.js $(node -v) — npm $(npm -v)"

# ── Repo clonen of updaten ────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
  log "Bestaande installatie gevonden — updaten naar nieuwste versie..."
  sudo -u $USER git -C "$INSTALL_DIR" fetch origin main
  sudo -u $USER git -C "$INSTALL_DIR" checkout main
  sudo -u $USER git -C "$INSTALL_DIR" reset --hard origin/main
else
  log "Repository downloaden..."
  sudo -u $USER git clone "$REPO" "$INSTALL_DIR"
fi

# ── Python venv + dependencies ────────────────
log "Python omgeving instellen..."
sudo -u $USER python3 -m venv "$INSTALL_DIR/.venv"
sudo -u $USER "$INSTALL_DIR/.venv/bin/pip" install --quiet --upgrade pip
sudo -u $USER "$INSTALL_DIR/.venv/bin/pip" install --quiet -r "$INSTALL_DIR/backend/requirements.txt"

# ── Frontend bouwen ───────────────────────────
log "Frontend installeren en bouwen (dit duurt even)..."
sudo -u $USER npm --prefix "$INSTALL_DIR/frontend" ci --silent
sudo -u $USER npm --prefix "$INSTALL_DIR/frontend" run build

# ── Systemd service ───────────────────────────
log "Systemd service instellen..."
cat > /etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=Mixmate Cocktailmachine
After=network.target

[Service]
User=${USER}
WorkingDirectory=${INSTALL_DIR}
ExecStart=${INSTALL_DIR}/.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
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

# Detecteer chromium binary naam
CHROMIUM_BIN="chromium"
command -v chromium &>/dev/null || CHROMIUM_BIN="chromium-browser"

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
    log "Cursor verbergen ingesteld in $AUTOSTART_FILE"
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
warn "Volgende stap: stel het machine model in via Backoffice → Machine"
echo ""
read -p "  Nu herstarten? (aanbevolen) [j/n]: " REBOOT
if [[ "$REBOOT" =~ ^[Jj]$ ]]; then
  log "Pi herstart over 3 seconden..."
  sleep 3
  reboot
fi
