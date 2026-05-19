#!/bin/bash
set -e

# Erii Installer Script for Linux / macOS
# Installs Node.js LTS → @spcookie/erii

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}     Erii Installer (Linux/macOS)       ${NC}"
echo -e "${BLUE}========================================${NC}"

# --- Install Node.js ---
echo -e "\n${YELLOW}[1/3] Installing Node.js LTS...${NC}"

if command -v node &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} Node.js $(node -v) already installed"
else
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64) ARCH="x64" ;;
        aarch64|arm64) ARCH="arm64" ;;
        *) echo -e "${RED}Unsupported architecture: $ARCH${NC}"; exit 1 ;;
    esac

    # Resolve latest LTS version from redirect URL
    NODE_VERSION=$(curl -s -o /dev/null -w '%{url_effective}' -L https://nodejs.org/dist/latest-lts/ | sed 's|.*/v||;s|/||')

    if [ "$OS" = "darwin" ]; then
        TARBALL="node-v${NODE_VERSION}-darwin-${ARCH}.tar.gz"
        DECOMPRESS="tar -xzf"
    else
        TARBALL="node-v${NODE_VERSION}-linux-${ARCH}.tar.xz"
        DECOMPRESS="tar -xJf"
    fi

    echo -e "  Downloading Node.js v${NODE_VERSION} for ${OS}-${ARCH}..."
    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/${TARBALL}" -o "/tmp/${TARBALL}"

    echo -e "  Installing to /usr/local..."
    sudo $DECOMPRESS "/tmp/${TARBALL}" -C /usr/local --strip-components=1
    rm -f "/tmp/${TARBALL}"

    echo -e "  ${GREEN}✓${NC} Node.js v${NODE_VERSION} installed"
fi

echo -e "  ${GREEN}✓${NC} Node.js $(node -v)"
echo -e "  ${GREEN}✓${NC} npm $(npm -v)"

# --- Install Erii ---
echo -e "\n${YELLOW}[2/3] Installing @spcookie/erii globally...${NC}"
npm install -g @spcookie/erii

echo -e "  ${GREEN}✓${NC} @spcookie/erii installed"

# --- Run Setup ---
echo -e "\n${YELLOW}[3/3] Running erii setup...${NC}"
erii setup

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}     Setup Complete!                    ${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nStart the server with:"
echo -e "  ${YELLOW}erii server${NC}"
