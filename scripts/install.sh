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

# Measure latency to a URL (seconds as float). Returns 999 on failure.
# Uses a ranged GET (first byte) so it works on files and API roots alike.
measure_latency() {
    local url=$1
    local t
    t=$(curl -o /dev/null -s -m 4 --connect-timeout 3 -r 0-0 -w '%{time_total}' "$url" 2>/dev/null)
    if [ -z "$t" ]; then echo "999"; else echo "$t"; fi
}

# select_fastest <probe_suffix> <label|base> <label|base> ...
# Prints the base URL with the lowest latency to stdout; progress goes to stderr.
select_fastest() {
    local probe=$1; shift
    local best_base="" best_time=""
    for entry in "$@"; do
        local label="${entry%%|*}"
        local base="${entry#*|}"
        local t
        t=$(measure_latency "${base}${probe}")
        printf "    %-10s %7ss  %s\n" "$label" "$t" "$base" >&2
        if [ -z "$best_time" ] || awk "BEGIN{exit !($t < $best_time)}"; then
            best_time="$t"; best_base="$base"
        fi
    done
    printf "%s\n" "$best_base"
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

# --- Detect WSL ---
is_wsl() {
    # WSL2: uname -r contains "microsoft" or "WSL"
    # WSL1: /proc/sys/kernel/osrelease contains "microsoft" or "WSL"
    if [ "$OS" = "linux" ]; then
        uname -r | grep -qi "microsoft\|WSL" && return 0
        [ -f /proc/sys/kernel/osrelease ] && grep -qi "microsoft\|WSL" /proc/sys/kernel/osrelease && return 0
    fi
    return 1
}

# Check if the node binary is a native Linux executable (not a Windows binary via WSL interop)
is_native_linux_node() {
    local node_path
    node_path=$(command -v node 2>/dev/null || echo "")
    [ -z "$node_path" ] && return 1
    # Windows binaries appear under /mnt/ in WSL
    case "$node_path" in
        /mnt/*) return 1 ;;
        *) return 0 ;;
    esac
}

# --- Select fastest mirrors (China-friendly) ---
echo -e "\n${YELLOW}Selecting fastest mirror (testing latency)...${NC}"

if [ -n "$ERII_NODE_MIRROR" ]; then
    NODE_DIST_BASE="$ERII_NODE_MIRROR"
    echo -e "  ${GREEN}✓${NC} Node.js source from \$ERII_NODE_MIRROR: $NODE_DIST_BASE"
else
    echo -e "  ${BLUE}Node.js mirrors:${NC}"
    NODE_DIST_BASE=$(select_fastest "/index.json" \
        "npmmirror|https://cdn.npmmirror.com/binaries/node" \
        "tuna|https://mirrors.tuna.tsinghua.edu.cn/nodejs-release" \
        "official|https://nodejs.org/dist")
    echo -e "  ${GREEN}✓${NC} Node.js source: $NODE_DIST_BASE"
fi

if [ -n "$ERII_NPM_REGISTRY" ]; then
    NPM_REGISTRY="$ERII_NPM_REGISTRY"
    echo -e "  ${GREEN}✓${NC} npm registry from \$ERII_NPM_REGISTRY: $NPM_REGISTRY"
else
    echo -e "  ${BLUE}npm registries:${NC}"
    NPM_REGISTRY=$(select_fastest "/" \
        "npmmirror|https://registry.npmmirror.com" \
        "official|https://registry.npmjs.org")
    echo -e "  ${GREEN}✓${NC} npm registry: $NPM_REGISTRY"
fi

# --- Install Node.js ---
echo -e "\n${YELLOW}[1/3] Installing Node.js LTS...${NC}"

NEED_NODE_INSTALL=false
if command -v node &> /dev/null; then
    if is_wsl && ! is_native_linux_node; then
        echo -e "  ${YELLOW}⚠${NC} Detected Windows Node.js in WSL: $(node -v) ($(command -v node))"
        echo -e "  ${YELLOW}⚠${NC} Installing Linux-native Node.js to /usr/local..."
        NEED_NODE_INSTALL=true
    else
        echo -e "  ${GREEN}✓${NC} Node.js $(node -v) already installed"
    fi
fi

if ! command -v node &> /dev/null || [ "$NEED_NODE_INSTALL" = true ]; then
    # Resolve latest LTS version from the selected mirror's index.json.
    # index.json is newest-first; LTS releases carry "lts":"<name>", others "lts":false.
    NODE_VERSION=$(curl -fsSL -m 15 "${NODE_DIST_BASE}/index.json" 2>/dev/null \
        | tr '}' '\n' \
        | grep '"lts":"' \
        | head -1 \
        | sed -E 's/.*"version":"v([^"]+)".*/\1/')
    # Fallback to the official latest-lts redirect if parsing failed
    if [ -z "$NODE_VERSION" ]; then
        NODE_VERSION=$(curl -s -o /dev/null -w '%{url_effective}' -L https://nodejs.org/dist/latest-lts/ | sed 's|.*/v||;s|/||')
    fi
    if [ -z "$NODE_VERSION" ]; then
        echo -e "${RED}Failed to resolve Node.js LTS version${NC}"
        exit 1
    fi

    if [ "$OS" = "darwin" ]; then
        TARBALL="node-v${NODE_VERSION}-darwin-${ARCH}.tar.gz"
        DECOMPRESS="tar -xzf"
    else
        TARBALL="node-v${NODE_VERSION}-linux-${ARCH}.tar.xz"
        DECOMPRESS="tar -xJf"
    fi

    echo -e "  Downloading Node.js v${NODE_VERSION} for ${OS}-${ARCH}..."
    curl -fL --progress-bar "${NODE_DIST_BASE}/v${NODE_VERSION}/${TARBALL}" -o "/tmp/${TARBALL}"

    echo -e "  Installing to /usr/local..."
    $(maybe_sudo) $DECOMPRESS "/tmp/${TARBALL}" -C /usr/local --strip-components=1
    rm -f "/tmp/${TARBALL}"

    echo -e "  ${GREEN}✓${NC} Node.js v${NODE_VERSION} installed"

    # On WSL, ensure /usr/local/bin takes precedence over Windows paths
    if is_wsl; then
        export PATH="/usr/local/bin:$PATH"
        echo -e "  ${YELLOW}⚠${NC} WSL detected: /usr/local/bin prepended to PATH for this session"
    fi
fi

echo -e "  ${GREEN}✓${NC} Node.js $(node -v)"
echo -e "  ${GREEN}✓${NC} npm $(npm -v)"

# --- Install Erii ---
echo -e "\n${YELLOW}[2/3] Installing @spcookie/erii globally...${NC}"
npm install -g @spcookie/erii --registry "$NPM_REGISTRY" --loglevel=http

echo -e "  ${GREEN}✓${NC} @spcookie/erii installed"

# --- Run Setup ---
if [ "$OS" = "darwin" ]; then
    echo -e "\n${YELLOW}[3/3] Opening Erii Web Setup...${NC}"
    SETUP_TOKEN=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 12)
    PROBE_URL="http://localhost:9527/?token=${SETUP_TOKEN}"
    SETUP_URL="http://localhost:9527/?token=${SETUP_TOKEN}&cmd=setup"

    echo -e "  ${BLUE}Opening Web Setup:${NC} $SETUP_URL"
    echo -e "  ${BLUE}When setup is complete, press Ctrl+C here to stop the web console.${NC}"
    (
        for _ in $(seq 1 60); do
            if curl -fsS --max-time 1 "$PROBE_URL" >/dev/null 2>&1; then
                open "$SETUP_URL"
                exit 0
            fi
            sleep 0.5
        done
        open "$SETUP_URL"
    ) >/dev/null 2>&1 &
    erii web start --host 127.0.0.1 --port 9527 --token "$SETUP_TOKEN"
else
    echo -e "\n${YELLOW}[3/3] Running erii setup...${NC}"
    erii setup
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}     Setup Complete!                    ${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nStart the server with:"
echo -e "  ${YELLOW}erii server start${NC}"

if is_wsl; then
    echo -e "\n${YELLOW}WSL Notice:${NC} To ensure Linux Node.js is always used, add this to your ~/.bashrc or ~/.zshrc:"
    echo -e "  ${BLUE}export PATH=\"/usr/local/bin:\$PATH\"${NC}"
fi
