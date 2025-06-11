#!/usr/bin/env bash
# Build standalone macOS (Apple Silicon) client executable using PyInstaller.
# Usage: ./bundle_client.sh [--onefile]

set -e

ONEFILE="--onefile"
# Optional flag to disable single-file mode for faster build
if [[ "$1" == "--dir" ]]; then
  ONEFILE=""
fi

# Ensure PyInstaller is available; if installed in user base PATH may not contain it.
if ! command -v pyinstaller &> /dev/null; then
  echo "PyInstaller not found – installing locally..."
  python -m pip install --user pyinstaller
fi

# Determine the invocable PyInstaller command
if command -v pyinstaller &> /dev/null; then
  PYI_CMD="pyinstaller"
else
  # Fallback to module execution (works regardless of PATH)
  PYI_CMD="python -m PyInstaller"
fi

# Clean previous builds
rm -rf build dist __pycache__

# Build the executable
$PYI_CMD $ONEFILE \
  --target-arch arm64 \
  --name online-card-game-client \
  --hidden-import websockets \
  --hidden-import rich \
  --hidden-import colorama \
  client.py

echo "\nBuild complete. Find your Apple Silicon binary inside the 'dist' directory (online-card-game-client)." 