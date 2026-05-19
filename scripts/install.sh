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

# --- Helper functions ---

detect_pkg_manager() {
    if command -v apt-get &> /dev/null; then echo "apt-get"
    elif command -v dnf &> /dev/null; then echo "dnf"
    elif command -v yum &> /dev/null; then echo "yum"
    elif command -v apk &> /dev/null; then echo "apk"
    elif command -v pacman &> /dev/null; then echo "pacman"
    elif command -v brew &> /dev/null; then echo "brew"
    else echo ""; fi
}

maybe_sudo() {
    if [ "$(id -u)" -eq 0 ]; then
        echo ""
    else
        command -v sudo &> /dev/null && echo "sudo" || echo ""
    fi
}

ensure_tool() {
    local tool=$1
    local pkg=${2:-$tool}

    if ! command -v "$tool" &> /dev/null; then
        echo -e "  ${YELLOW}⚠${NC} $tool not found, installing '$pkg'..."
        local pm=$(detect_pkg_manager)
        local SUDO=$(maybe_sudo)

        case "$pm" in
            apt-get) $SUDO apt-get update -qq && $SUDO apt-get install -y -qq "$pkg" ;;
            dnf)     $SUDO dnf install -y -q "$pkg" ;;
            yum)     $SUDO yum install -y -q "$pkg" ;;
            apk)     $SUDO apk add --no-cache "$pkg" ;;
            pacman)  $SUDO pacman -S --noconfirm "$pkg" ;;
            brew)    brew install "$pkg" ;;
            "")
                echo -e "${RED}Cannot install '$tool': no supported package manager detected${NC}"
                echo -e "Supported: apt-get, dnf, yum, apk, pacman, brew"
                echo -e "Please install '$tool' manually and re-run this script."
                exit 1
                ;;
        esac

        if ! command -v "$tool" &> /dev/null; then
            echo -e "${RED}Failed to install '$tool'${NC}"
            exit 1
        fi
        echo -e "  ${GREEN}✓${NC} $tool installed"
    fi
}

# --- Check prerequisites ---
echo -e "\n${YELLOW}Checking prerequisites...${NC}"
ensure_tool curl
ensure_tool tar
echo -e "  ${GREEN}✓${NC} All prerequisites satisfied"

# --- Detect platform ---
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case "$ARCH" in
    x86_64) ARCH="x64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *) echo -e "${RED}Unsupported architecture: $ARCH${NC}"; exit 1 ;;
esac

# On Linux, ensure xz support for .tar.xz extraction
if [ "$OS" != "darwin" ] && ! command -v xz &> /dev/null; then
    ensure_tool xz "xz-utils"
fi

# --- Install Node.js ---
echo -e "\n${YELLOW}[1/3] Installing Node.js LTS...${NC}"

if command -v node &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} Node.js $(node -v) already installed"
else
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
    $(maybe_sudo) $DECOMPRESS "/tmp/${TARBALL}" -C /usr/local --strip-components=1
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
