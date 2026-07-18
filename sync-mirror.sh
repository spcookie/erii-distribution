#!/usr/bin/env bash
set -euo pipefail

REGISTRY="https://registry.npmmirror.com"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ERII_PKG="$SCRIPT_DIR/packages/erii/package.json"

DRY_RUN=false
NO_WAIT=false
POLL_INTERVAL=3
POLL_TIMEOUT=120

for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        --no-wait) NO_WAIT=true ;;
        --help|-h)
            echo "Usage: $0 [--dry-run] [--no-wait]"
            echo "  --dry-run   List packages that would be synced"
            echo "  --no-wait   Trigger sync without polling for confirmation"
            exit 0
            ;;
        *) echo "Unknown option: $arg" >&2; exit 1 ;;
    esac
done

if [[ ! -f "$ERII_PKG" ]]; then
    echo "package.json not found: $ERII_PKG" >&2
    exit 1
fi

if ! command -v jq &>/dev/null; then
    echo "Error: jq is required but not installed." >&2
    echo "Install: brew install jq" >&2
    exit 1
fi

# URL encode: replace / with %2f
encode_pkg() {
    echo "${1//\//%2f}"
}

# Collect all @spcookie/* packages (name version pairs) sorted by name.
# Includes erii itself plus all deps/optionalDeps starting with @spcookie/.
collect_packages() {
    jq -r '
        . as $root |
        [
            [$root.name, $root.version],
            (
                ($root.dependencies // {}) + ($root.optionalDependencies // {}) |
                to_entries[] |
                select(.key | test("^@spcookie/")) |
                [.key, .value]
            )
        ] |
        sort_by(.[0])[] |
        @tsv
    ' "$ERII_PKG"
}

main() {
    echo "Registry: $REGISTRY"

    local names=()
    local versions=()
    while IFS=$'\t' read -r name version; do
        names+=("$name")
        versions+=("$version")
    done < <(collect_packages)

    local pkg_count=${#names[@]}
    if $DRY_RUN; then
        echo "Packages: $pkg_count  (dry-run)"
    else
        echo "Packages: $pkg_count"
    fi
    echo ""

    if $DRY_RUN; then
        for i in "${!names[@]}"; do
            echo "  · ${names[$i]}@${versions[$i]}"
        done
        echo ""
        echo "Would trigger sync for $pkg_count package(s)."
        return
    fi

    # ---- Phase 1: Trigger all sync tasks ----
    echo "[1/2] Triggering sync tasks..."
    local failed=()
    local -a synced_idx=()
    for i in "${!names[@]}"; do
        local name="${names[$i]}"
        local version="${versions[$i]}"
        local encoded url response
        encoded=$(encode_pkg "$name")
        url="${REGISTRY}/-/package/${encoded}/syncs"

        if response=$(curl -sS -X PUT "$url" 2>&1); then
            local state
            state=$(echo "$response" | jq -r '.state // "ok"')
            echo "  ✓ ${name}@${version}  (state: $state)"
            synced_idx+=("$i")
        else
            echo "  ✗ ${name}@${version}  ${response}"
            failed+=("$name")
        fi
    done

    if $NO_WAIT; then
        echo ""
        echo "Sync triggered (--no-wait, skipping confirmation)."
        [[ ${#failed[@]} -gt 0 ]] && exit 1
        return
    fi

    # ---- Phase 2: Poll until all versions appear on mirror ----
    echo ""
    echo "[2/2] Waiting for versions to appear on mirror..."

    local -A confirmed
    local pending=${#synced_idx[@]}
    local deadline=$(($(date +%s) + POLL_TIMEOUT))

    while [[ $pending -gt 0 ]] && [[ $(date +%s) -lt $deadline ]]; do
        for idx in "${synced_idx[@]}"; do
            [[ ${confirmed[$idx]:-0} -eq 1 ]] && continue

            local name="${names[$idx]}"
            local version="${versions[$idx]}"
            local encoded url
            encoded=$(encode_pkg "$name")
            url="${REGISTRY}/${encoded}"

            if curl -sS -H "Accept: application/json" "$url" | jq -e ".versions[\"$version\"] != null" > /dev/null 2>&1; then
                echo "  ✓ ${name}@${version}"
                confirmed[$idx]=1
                pending=$((pending - 1))
            fi
        done

        if [[ $pending -gt 0 ]]; then
            sleep "$POLL_INTERVAL"
        fi
    done

    echo ""
    if [[ $pending -gt 0 ]]; then
        echo "$pending package(s) not confirmed within ${POLL_TIMEOUT}s:"
        for idx in "${synced_idx[@]}"; do
            [[ ${confirmed[$idx]:-0} -eq 1 ]] && continue
            echo "  ⏳ ${names[$idx]}@${versions[$idx]}"
        done
        echo "Mirror may still be syncing; re-run to re-check."
        exit 1
    else
        echo "All $pkg_count package(s) confirmed on mirror."
    fi
}

main
