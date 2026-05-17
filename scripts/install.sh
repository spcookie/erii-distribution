#!/bin/bash
set -e

# Erii Installer Script for Linux / macOS
# Installs NVM → Node.js LTS → @spcookie/erii

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NVM_VERSION="v0.40.2"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}     Erii Installer (Linux/macOS)       ${NC}"
echo -e "${BLUE}========================================${NC}"

# --- Install NVM ---
echo -e "\n${YELLOW}[1/3] Installing NVM ${NVM_VERSION}...${NC}"

if [ -z "$NVM_DIR" ]; then
    export NVM_DIR="$HOME/.nvm"
fi

if [ -d "$NVM_DIR" ]; then
    echo -e "  ${GREEN}✓${NC} NVM already installed at ${NVM_DIR}"
else
    curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
    echo -e "  ${GREEN}✓${NC} NVM installed"
fi

# Source nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# --- Install Node.js LTS ---
echo -e "\n${YELLOW}[2/3] Installing Node.js LTS...${NC}"

if command -v node &> /dev/null; then
    CURRENT_NODE=$(node -v)
    echo -e "  Node.js ${CURRENT_NODE} already installed"
fi

nvm install --lts
nvm use --lts
nvm alias default lts/*

NODE_VER=$(node -v)
NPM_VER=$(npm -v)
echo -e "  ${GREEN}✓${NC} Node.js ${NODE_VER} installed"
echo -e "  ${GREEN}✓${NC} npm ${NPM_VER} installed"

# --- Install Erii ---
echo -e "\n${YELLOW}[3/3] Installing @spcookie/erii globally...${NC}"
npm install -g @spcookie/erii

echo -e "  ${GREEN}✓${NC} @spcookie/erii installed"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}     Installation Complete!             ${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nNext steps:"
echo -e "  ${YELLOW}erii setup${NC}   → Run interactive setup"
echo -e "  ${YELLOW}erii server${NC}  → Start the server"
