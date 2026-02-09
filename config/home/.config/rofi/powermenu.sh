#!/usr/bin/env bash

DIR="$HOME/.config/rofi"
uptime=$(uptime -p | sed 's/^up //')

shutdown="⏻  Shutdown"
reboot="  Restart"
lock="󰌾  Lock"
logout="󰍃  Logout"

options="$lock\n$logout\n$reboot\n$shutdown"

# ──────────────
# Confirm dialog
# ──────────────
confirm() {
  rofi -dmenu \
    -no-config \
    -i \
    -p "Are you sure?" \
    -theme "$DIR/confirm.rasi"
}

# ──────────────
# POWERMENU (ESTA ES LA CLAVE)
# ──────────────
chosen="$(printf "%b\n" "$options" | rofi \
  -dmenu \
  -i \
  -no-config \
  -theme "$DIR/powermenu.rasi" \
  -p "Uptime: $uptime")"

case "$chosen" in
  "$shutdown")
    [[ "$(confirm)" =~ ^([yY]|yes|YES)$ ]] && systemctl poweroff
    ;;
  "$reboot")
    [[ "$(confirm)" =~ ^([yY]|yes|YES)$ ]] && systemctl reboot
    ;;
  "$lock")
    command -v betterlockscreen >/dev/null && betterlockscreen -l || i3lock -i ~/.lockscreen/lockscreen_1080p.png
    ;;
  "$logout")
    [[ "$(confirm)" =~ ^([yY]|yes|YES)$ ]] && i3-msg exit
    ;;
esac
