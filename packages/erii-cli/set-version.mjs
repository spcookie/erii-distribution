#!/usr/bin/env node
// 批量修改 erii-cli 各平台子包的 version 字段。
//
// 用法:
//   node set-version.mjs <version> [--dry-run]
// 例:
//   node set-version.mjs 1.3.4
//   node set-version.mjs 1.3.4 --dry-run   # 只预览,不写入
//
// 扫描本脚本所在目录下的 <os>/<arch>/package.json,统一改为指定版本。

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const version = args.find((a) => !a.startsWith('--'));

if (!version) {
    console.error('Usage: node set-version.mjs <version> [--dry-run]');
    process.exit(1);
}
// 基础 semver 校验(允许 1.2.3 / 1.2.3-beta.1 形式)
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    console.error(`Invalid version: ${version} (expected e.g. 1.3.4 or 1.3.4-beta.1)`);
    process.exit(1);
}

// 收集 <os>/<arch>/package.json
function findPkgJsons(root) {
    const found = [];
    for (const os of fs.readdirSync(root, {withFileTypes: true})) {
        if (!os.isDirectory()) continue;
        const osDir = path.join(root, os.name);
        for (const arch of fs.readdirSync(osDir, {withFileTypes: true})) {
            if (!arch.isDirectory()) continue;
            const pj = path.join(osDir, arch.name, 'package.json');
            if (fs.existsSync(pj)) found.push(pj);
        }
    }
    return found.sort();
}

const pkgs = findPkgJsons(__dirname);
if (pkgs.length === 0) {
    console.error(`No sub-package package.json found (${__dirname}/<os>/<arch>/)`);
    process.exit(1);
}

console.log(`Target version: ${version}${dryRun ? '  (dry-run)' : ''}\n`);

let changed = 0;
for (const pj of pkgs) {
    const raw = fs.readFileSync(pj, 'utf8');
    const json = JSON.parse(raw);
    const old = json.version;
    const rel = path.relative(__dirname, pj);
    if (old === version) {
        console.log(`  ○ ${json.name}  already ${version}`);
        continue;
    }
    json.version = version;
    if (!dryRun) {
        // 保持 2 空格缩进 + 末尾换行,减少 diff 噪音
        fs.writeFileSync(pj, JSON.stringify(json, null, 2) + '\n');
    }
    console.log(`  ✓ ${json.name}  ${old} → ${version}`);
    changed += 1;
}

console.log(`\n${dryRun ? 'Would update' : 'Updated'} ${changed} of ${pkgs.length} sub-package(s).`);
