#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

uuid="wall-clock-24h@tos-kamiya.github.com"
zip="${uuid}.shell-extension.zip"

gnome-extensions pack --force --extra-source=clockDraw.js
gnome-extensions install --force "$zip"
rm -f "$zip"

cat <<EOF
Installed ${uuid}.

Enable it with:
  gnome-extensions enable ${uuid}

On Wayland, log out and back in after the first install, then enable it.
Open settings with:
  gnome-extensions prefs ${uuid}
EOF
