#!/bin/bash

# ─────────────────────────────────────────────
#  MIXMATE OS — Installer
#  Doel: Raspberry Pi OS Lite 64-bit
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
echo "  Installer — $(date '+%Y-%m-%d %H:%M')"
echo ""

# ── Root check ────────────────────────────────
[ "$EUID" -ne 0 ] && fail "Voer de installer uit als root:\n  curl -sSL https://raw.githubusercontent.com/mixmatenl/mixmate/main/install.sh | sudo bash"

# ── Machine model selecteren ──────────────────
echo ""
echo "  Selecteer het machine model:"
echo ""
echo "  [1] MATE.1"
echo "  [2] MATE.1 CO2"
echo "  [3] MATE.1 PRO"
echo ""
while true; do
  read -rp "  Keuze (1/2/3): " MODEL_CHOICE </dev/tty
  case "$MODEL_CHOICE" in
    1) MACHINE_MODEL="MATE.1"; break ;;
    2) MACHINE_MODEL="MATE.1 CO2"; break ;;
    3) MACHINE_MODEL="MATE.1 PRO"; break ;;
    *) echo "  Ongeldige keuze — voer 1, 2 of 3 in." ;;
  esac
done
log "Machine model: $MACHINE_MODEL"

# ── Versie ophalen en compatibiliteit controleren ──
APP_VERSION=$(curl -sSL "https://raw.githubusercontent.com/mixmatenl/mixmate/main/frontend/package.json" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('version','?'))" 2>/dev/null || echo "?")
COMPAT_JSON=$(curl -sSL "https://raw.githubusercontent.com/mixmatenl/mixmate/main/compat.json" 2>/dev/null || echo "{}")

COMPAT_OK=$(python3 - <<PYEOF
import json, sys
try:
    data = json.loads('''$COMPAT_JSON''')
    versions = data.get("versions", {})
    app_ver = "$APP_VERSION"
    model = "$MACHINE_MODEL"
    # Bepaal minor-lijn (x.y) van de te installeren versie
    parts = app_ver.split(".")
    minor = f"{parts[0]}.{parts[1]}" if len(parts) >= 2 else app_ver
    allowed = versions.get(minor) or versions.get(app_ver)
    if allowed is None:
        print("ok")  # geen restrictie bekend → toestaan
    elif model in allowed:
        print("ok")
    else:
        print(",".join(allowed))
except Exception:
    print("ok")  # bij twijfel toestaan
PYEOF
)

if [ "$COMPAT_OK" != "ok" ]; then
  echo ""
  echo -e "${RED}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║   INSTALLATIE GEBLOKKEERD                              ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${RED}  v${APP_VERSION} is niet beschikbaar voor ${MACHINE_MODEL}.${NC}"
  echo -e "${RED}  Beschikbaar voor: ${COMPAT_OK}${NC}"
  echo ""
  echo "  Neem contact op met MIXMATE voor meer informatie."
  echo ""
  exit 1
fi
log "Compatibiliteit: OK (v${APP_VERSION} voor ${MACHINE_MODEL})"

# ── Systeem updaten ───────────────────────────
log "Pakketlijsten bijwerken..."
apt-get update -qq

# ── Basis dependencies ────────────────────────
log "Basis dependencies installeren..."
apt-get install -y -qq git python3 python3-full curl ca-certificates \
  plymouth plymouth-themes \
  || fail "Kan basispackages niet installeren."

# ── X11 kiosk display stack ───────────────────
log "X11 kiosk display installeren..."
apt-get install -y -qq \
  --no-install-recommends \
  xserver-xorg \
  xinit \
  openbox \
  x11-xserver-utils \
  xdg-utils \
  unclutter \
  || fail "Kan X11 packages niet installeren."

# xset zit in x11-xserver-utils, controleer of het beschikbaar is
command -v xset &>/dev/null || apt-get install -y -qq x11-utils 2>/dev/null || true

# ── Chromium ──────────────────────────────────
log "Chromium installeren..."
if apt-cache show chromium &>/dev/null; then
  apt-get install -y -qq chromium
  CHROMIUM_BIN="chromium"
elif apt-cache show chromium-browser &>/dev/null; then
  apt-get install -y -qq chromium-browser
  CHROMIUM_BIN="chromium-browser"
else
  fail "Chromium niet gevonden. Controleer of je Raspberry Pi OS gebruikt."
fi
log "Chromium: $CHROMIUM_BIN"

# ── Node.js ───────────────────────────────────
if ! command -v node &>/dev/null || [[ $(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
  log "Node.js 20 installeren..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
  apt-get install -y -qq nodejs || fail "Kan Node.js niet installeren."
fi
log "Node.js $(node -v) — npm $(npm -v)"

# ── Repo clonen of updaten ────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
  log "Bestaande installatie gevonden — updaten..."
  sudo -u $USER git -C "$INSTALL_DIR" fetch origin main
  sudo -u $USER git -C "$INSTALL_DIR" reset --hard origin/main
else
  log "Repository downloaden..."
  sudo -u $USER git clone "$REPO" "$INSTALL_DIR" \
    || fail "Kan repository niet downloaden."
fi

# ── Machine model opslaan in .env ────────────
ENV_FILE="$INSTALL_DIR/.env"
if [ -f "$ENV_FILE" ] && grep -q "^MACHINE_MODEL=" "$ENV_FILE"; then
  sed -i "s/^MACHINE_MODEL=.*/MACHINE_MODEL=${MACHINE_MODEL}/" "$ENV_FILE"
else
  echo "MACHINE_MODEL=${MACHINE_MODEL}" >> "$ENV_FILE"
fi
chown ${USER}:${USER} "$ENV_FILE"
log "Machine model opgeslagen in .env"

# ── Python venv ───────────────────────────────
log "Python omgeving instellen..."
PYVER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
log "Python versie: ${PYVER}"

# Installeer versie-specifiek venv package (vereist op Debian trixie)
if apt-cache show "python${PYVER}-venv" &>/dev/null; then
  apt-get install -y -qq "python${PYVER}-venv" \
    || warn "python${PYVER}-venv installatie mislukt — probeer door te gaan"
else
  apt-get install -y -qq python3-venv python3-full \
    || warn "python3-venv installatie mislukt — probeer door te gaan"
fi

# Maak venv aan zonder pip (--without-pip vermijdt PEP 668 bootstrap-conflict op Debian trixie)
rm -rf "$INSTALL_DIR/.venv"
python3 -m venv --without-pip "$INSTALL_DIR/.venv" \
  || fail "Kan Python venv niet aanmaken. Probeer: sudo apt install python${PYVER}-venv"

# Bootstrap pip via get-pip.py (werkt altijd, omzeilt systeem-pip en PEP 668)
log "pip installeren..."
curl -sSL https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py \
  || fail "Kan get-pip.py niet downloaden."
"$INSTALL_DIR/.venv/bin/python3" /tmp/get-pip.py \
  || fail "Kan pip niet installeren."
rm -f /tmp/get-pip.py

chown -R ${USER}:${USER} "$INSTALL_DIR/.venv"

# Installeer Python packages
log "Python packages installeren..."
sudo -u $USER "$INSTALL_DIR/.venv/bin/pip" install --quiet \
  -r "$INSTALL_DIR/backend/requirements.txt" \
  || fail "Kan Python packages niet installeren."

# Controleer of uvicorn binary aanwezig is
# (kan ontbreken ondanks succesvolle pip install bij edge cases)
if [ ! -f "$INSTALL_DIR/.venv/bin/uvicorn" ]; then
  warn "uvicorn binary ontbreekt — force-reinstall..."
  sudo -u $USER "$INSTALL_DIR/.venv/bin/pip" install --quiet --force-reinstall "uvicorn[standard]" \
    || fail "Kan uvicorn niet installeren."
  [ ! -f "$INSTALL_DIR/.venv/bin/uvicorn" ] && fail "uvicorn binary nog steeds ontbrekend na reinstall."
fi
log "uvicorn: OK"

# ── Frontend bouwen ───────────────────────────
log "Frontend bouwen (dit duurt even)..."
rm -rf "$INSTALL_DIR/frontend/node_modules" "$INSTALL_DIR/frontend/dist"
sudo -u $USER npm --prefix "$INSTALL_DIR/frontend" install --silent \
  || fail "npm install mislukt."
sudo -u $USER npm --prefix "$INSTALL_DIR/frontend" run build \
  || fail "Frontend build mislukt."
[ ! -f "$INSTALL_DIR/frontend/dist/index.html" ] && fail "Frontend build heeft geen index.html opgeleverd."
log "Frontend: OK"

# ── Plymouth boot splash ──────────────────────
log "Plymouth boot splash instellen..."
THEME_DIR="/usr/share/plymouth/themes/mixmate"
mkdir -p "$THEME_DIR"

# Theme bestanden kopiëren vanuit repo
cp "$INSTALL_DIR/plymouth/mixmate/mixmate.plymouth" "$THEME_DIR/"
cp "$INSTALL_DIR/plymouth/mixmate/mixmate.script"   "$THEME_DIR/"
cp "$INSTALL_DIR/frontend/public/logo.png"          "$THEME_DIR/"

# Plymouth activeren
plymouth-set-default-theme mixmate 2>/dev/null || warn "Plymouth theme instellen mislukt — doorgaan"
update-initramfs -u 2>/dev/null || warn "initramfs update mislukt — doorgaan"

# Boottext verbergen: voeg quiet splash toe aan cmdline.txt
CMDLINE="/boot/cmdline.txt"
if [ -f "$CMDLINE" ] && ! grep -q "quiet" "$CMDLINE"; then
  sed -i 's/$/ quiet splash plymouth.ignore-serial-consoles/' "$CMDLINE"
  log "Boot parameters aangepast"
fi

# ── Systemd backend service ───────────────────
log "Backend service instellen..."
cat > /etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=Mixmate Cocktailmachine Backend
After=network.target

[Service]
User=${USER}
WorkingDirectory=${INSTALL_DIR}
ExecStart=${INSTALL_DIR}/.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
Environment=PYTHONPATH=${INSTALL_DIR}
EnvironmentFile=-${INSTALL_DIR}/.env

[Install]
WantedBy=multi-user.target
EOF

# ── Auto-login op tty1 ────────────────────────
log "Auto-login instellen..."
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf <<EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${USER} --noclear %I \$TERM
EOF

# ── Kiosk autostart via .profile ─────────────
# .profile werkt voor zowel bash als sh op Debian/Pi OS Lite
cat > /home/${USER}/.profile <<'PROFILE'
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
  exec startx -- -nocursor 2>/dev/null
fi
PROFILE
chown ${USER}:${USER} /home/${USER}/.profile

# ── X11 sessie: openbox + chromium ───────────
cat > /home/${USER}/.xinitrc <<XINITRC
#!/bin/bash

# Schermbeveiliging en energiebeheer uitschakelen
xset s off
xset s noblank
xset -dpms

# Cursor verbergen na 0.5s inactiviteit
unclutter -idle 0.5 -root &

# Openbox starten als vensterbeheerder
openbox &

# Wacht tot de backend beschikbaar is (max 30s)
TRIES=0
until curl -sf http://localhost:8000 > /dev/null 2>&1 || [ \$TRIES -ge 30 ]; do
  sleep 1
  TRIES=\$((TRIES + 1))
done

# Chromium starten in kiosk-modus
exec ${CHROMIUM_BIN} \\
  --kiosk \\
  --noerrdialogs \\
  --disable-infobars \\
  --no-first-run \\
  --password-store=basic \\
  --disable-translate \\
  --disable-features=TranslateUI \\
  --force-device-scale-factor=1.5 \\
  --disable-pinch \\
  --overscroll-history-navigation=0 \\
  --check-for-update-interval=31536000 \\
  http://localhost:8000
XINITRC
chown ${USER}:${USER} /home/${USER}/.xinitrc
chmod +x /home/${USER}/.xinitrc

# ── Services starten ──────────────────────────
systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl restart $SERVICE_NAME

# ── Versie ophalen ────────────────────────────
VERSION=$(python3 -c "
import json
try:
    print(json.load(open('$INSTALL_DIR/frontend/package.json'))['version'])
except:
    print('onbekend')
" 2>/dev/null)

# ── Klaar ─────────────────────────────────────
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   MIXMATE OS succesvol geïnstalleerd!  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
log "Versie  : v${VERSION}"
log "Model   : ${MACHINE_MODEL}"
log "Backend : http://localhost:8000"
echo ""
log "Pi herstart over 5 seconden..."
sleep 5
reboot
