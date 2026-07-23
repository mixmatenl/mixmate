#!/bin/bash
# Controleer internet. Maak hotspot als er geen verbinding is.
# Wordt uitgevoerd voordat de Mixmate backend start.

HOTSPOT_SSID="MIXMATE-Setup"
HOTSPOT_PASS="mixmate123"
HOTSPOT_IF="wlan0"

check_internet() {
    ping -c 1 -W 5 8.8.8.8 &>/dev/null 2>&1
}

hotspot_active() {
    nmcli con show --active | grep -q "$HOTSPOT_SSID"
}

if check_internet; then
    echo "[network-setup] Internet verbonden — normaal opstarten"
    # Schakel hotspot uit als die nog actief is
    if hotspot_active; then
        echo "[network-setup] Hotspot uitschakelen..."
        nmcli con down "$HOTSPOT_SSID" 2>/dev/null || true
        nmcli con delete "$HOTSPOT_SSID" 2>/dev/null || true
    fi
    exit 0
fi

echo "[network-setup] Geen internet — hotspot starten: $HOTSPOT_SSID"

# Verwijder eventuele oude hotspot-verbinding
nmcli con delete "$HOTSPOT_SSID" 2>/dev/null || true

# Start hotspot (IP wordt 10.42.0.1)
nmcli device wifi hotspot \
    ifname "$HOTSPOT_IF" \
    ssid "$HOTSPOT_SSID" \
    password "$HOTSPOT_PASS" \
    con-name "$HOTSPOT_SSID" \
    &>/dev/null

sleep 2

if hotspot_active; then
    echo "[network-setup] Hotspot actief op 10.42.0.1"
    echo "[network-setup] Verbind tablet met '$HOTSPOT_SSID' (wachtwoord: $HOTSPOT_PASS)"
    echo "[network-setup] Open daarna http://10.42.0.1:8000 om WiFi in te stellen"
else
    echo "[network-setup] Hotspot kon niet worden gestart (NetworkManager beschikbaar?)"
fi

exit 0
