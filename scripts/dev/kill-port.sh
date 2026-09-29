#!/usr/bin/env bash
# Dev helper (Windows Git Bash): kill whatever listens on the given port.
for pid in $(netstat -ano | grep -E "LISTENING" | grep -E "[:.]$1 " | awk '{print $NF}' | sort -u); do
  taskkill //PID "$pid" //F > /dev/null 2>&1 && echo "killed $pid on :$1"
done
