#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# 解析 package.json workspaces 配置，展开 glob 匹配，找出所有 workspace 包
node -e "
  const fs = require('fs');
  const path = require('path');
  const { workspaces } = require('./package.json');
  const results = [];

  function expand(dir, patternIdx, patterns) {
    if (patternIdx >= patterns.length) {
      if (fs.existsSync(path.join(dir, 'package.json'))) {
        results.push(dir);
      }
      return;
    }
    const seg = patterns[patternIdx];
    if (seg === '*' || seg === '**') {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          expand(path.join(dir, entry.name), patternIdx + 1, patterns);
        }
      }
    } else {
      const next = path.join(dir, seg);
      if (fs.existsSync(next)) {
        expand(next, patternIdx + 1, patterns);
      }
    }
  }

  for (const pattern of workspaces || []) {
    const parts = pattern.split(/[\\/]/);
    const base = parts[0];
    const rest = parts.slice(1);
    if (fs.existsSync(base)) {
      expand(base, 0, rest);
    }
  }

  console.log(results.join('\n'));
" | while IFS= read -r pkg_path; do
    pkg_json="$pkg_path/package.json"
    if [[ ! -f "$pkg_json" ]]; then
        echo "skip: $pkg_path (no package.json)"
        continue
    fi

    name=$(node -p "require('./$pkg_json').name")
    version=$(node -p "require('./$pkg_json').version")

    if [[ -z "$name" || "$name" == "undefined" || -z "$version" || "$version" == "undefined" ]]; then
        echo "skip: $pkg_path (name/version empty)"
        continue
    fi

    echo -n "check $name@$version ... "

    if npm view "$name@$version" version >/dev/null 2>&1; then
        echo "already exists, skip"
        continue
    fi

    echo "publishing"
    npm publish -w "$pkg_path" --access public
done

echo "done"
