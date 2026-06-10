#!/bin/bash
# Installeert Mixmate als systemd service zodat hij automatisch opstart bij boot.
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
USER="$(whoami)"

echo "=== Mixmate service installeren ==="
echo "Map: $APP_DIR"
echo "Gebruiker: $USER"
echo ""

SERVICE_FILE="/etc/systemd/system/mixmate.service"

sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Mixmate Cocktailmachine
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=$APP_DIR/.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable mixmate
sudo systemctl restart mixmate

echo ""
echo "=== Service actief! ==="
echo ""
echo "Handige commando's:"
echo "  sudo systemctl status mixmate    - Status bekijken"
echo "  sudo systemctl stop mixmate      - Stoppen"
echo "  sudo journalctl -u mixmate -f    - Live logs bekijken"
