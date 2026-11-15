#!/bin/bash
# EasyKitchen – macOS-Starter.
# Startet die native App; falls sie noch nicht gebaut ist, wird sie zuerst gebaut.
DIR="$(cd "$(dirname "$0")" && pwd)"
if [ ! -d "$DIR/EasyKitchen.app" ]; then
  bash "$DIR/build_mac_app.sh" || { open "$DIR/app/index.html"; exit 0; }
fi
open "$DIR/EasyKitchen.app"
