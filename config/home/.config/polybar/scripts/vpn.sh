#!/bin/bash

if ip a show tun0 >/dev/null 2>&1; then
    ip a show tun0 | awk '/inet / {print $2}' | cut -d/ -f1
else
    echo "No VPN"
fi
