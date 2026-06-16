#!/bin/bash
# Mixmate display setup — verwijdert alle Raspberry Pi opstartrommel
# Wordt automatisch uitgevoerd bij een OTA update

echo "=== Mixmate display instellen ==="

# 1. Welkomstscherm en blueman verwijderen
sudo rm -f /etc/xdg/autostart/piwiz.desktop
sudo rm -f /etc/xdg/autostart/blueman.desktop
sudo rm -f /etc/xdg/autostart/pprompt.desktop
echo "✓ Welkomstschermen verwijderd"

# 2. Regenboogscherm uitzetten in config.txt
CONFIG="/boot/firmware/config.txt"
if [ ! -f "$CONFIG" ]; then CONFIG="/boot/config.txt"; fi

if ! grep -q "disable_splash=1" "$CONFIG"; then
    echo "disable_splash=1" | sudo tee -a "$CONFIG" > /dev/null
    echo "✓ Regenboogscherm uitgeschakeld"
else
    echo "✓ Regenboogscherm was al uitgeschakeld"
fi

# 3. Stille boot instellen in cmdline.txt
CMDLINE="/boot/firmware/cmdline.txt"
if [ ! -f "$CMDLINE" ]; then CMDLINE="/boot/cmdline.txt"; fi

if ! grep -q "quiet" "$CMDLINE"; then
    sudo sed -i 's/console=tty1/console=tty3/' "$CMDLINE"
    sudo sed -i 's/$/ quiet loglevel=0 logo.nologo vt.global_cursor_default=0/' "$CMDLINE"
    echo "✓ Stille boot ingesteld"
else
    echo "✓ Stille boot was al ingesteld"
fi

# 4. Desktop achtergrond zwart maken
PCMANFM_CONF="/home/pi/.config/pcmanfm/LXDE-pi/desktop-items-0.conf"
if [ -f "$PCMANFM_CONF" ]; then
    sudo sed -i 's/^wallpaper=.*/wallpaper=/' "$PCMANFM_CONF"
    sudo sed -i 's/^desktop_bg=.*/desktop_bg=#000000/' "$PCMANFM_CONF"
    echo "✓ Achtergrond zwart gemaakt"
fi

# 5. Taakbalk verbergen
LXPANEL_CONF="/home/pi/.config/lxpanel/LXDE-pi/panels/panel"
if [ -f "$LXPANEL_CONF" ]; then
    sudo sed -i 's/autohide=0/autohide=1/' "$LXPANEL_CONF"
    echo "✓ Taakbalk verborgen"
fi

# 6. Muiscursor verbergen (unclutter installeren)
if ! command -v unclutter &> /dev/null; then
    sudo apt install -y unclutter > /dev/null 2>&1
    echo "✓ Muiscursor verberger geïnstalleerd"
fi

# 7. Autostart aanpassen — muiscursor verbergen + mixmate starten
AUTOSTART_DIR="/home/pi/.config/autostart"
mkdir -p "$AUTOSTART_DIR"

cat > "$AUTOSTART_DIR/hide-cursor.desktop" << EOF
[Desktop Entry]
Type=Application
Name=Hide Cursor
Exec=unclutter -idle 0.1 -root
X-GNOME-Autostart-enabled=true
EOF

cat > "$AUTOSTART_DIR/mixmate.desktop" << EOF
[Desktop Entry]
Type=Application
Name=Mixmate
Exec=chromium --kiosk --noerrdialogs --disable-infobars --no-first-run --password-store=basic --disable-translate --force-device-scale-factor=1.5 --use-gl=egl --enable-gpu-rasterization --enable-zero-copy --enable-features=VaapiVideoDecoder --disable-features=TranslateUI,UseChromeOSDirectVideoDecoder,UseSkiaRenderer http://localhost:8000
X-GNOME-Autostart-enabled=true
EOF

echo "✓ Autostart ingesteld"
echo ""
echo "=== Klaar! Herstart de Pi om alle wijzigingen toe te passen ==="
