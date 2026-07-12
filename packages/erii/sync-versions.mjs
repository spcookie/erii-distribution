#!/usr/bin/env node
// 同步 erii/package.json 中 dependencies + optionalDependencies 的版本号,
// 使其与各兄弟包 package.json 里声明的真实 version 保持一致。
//
// 背景:
//   erii 是聚合包,依赖大量 @spcookie/* 子包(deps-*、erii-core、erii-cli-*、
//   erii-runtime-*、erii-browser-driver-* 等)。各子包独立 bump 版本后,
//   erii/package.json 里的版本引用容易忘记同步。此脚本扫描 packages/ 下所有
//   package.json,建立 name -> version 索引,然后回填到 erii 的依赖字段。
//
// 用法:
//   node sync-versions.mjs [--dry-run]
// 例:
//   node sync-versions.mjs             # 写入更新
//   node sync-versions.mjs --dry-run   # 只预览,不写入

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// packages/erii -> packages
const packagesRoot = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// 递归扫描 packages/ 下所有 package.json,建立 name -> version 索引。
// 跳过 node_modules 与 erii 自身(自身版本单独维护)。
function buildIndex(root) {
    const index = new Map();
    const selfPkg = path.join(__dirname, 'package.json');
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
            if (entry.name === 'node_modules') continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            } else if (entry.name === 'package.json') {
                if (path.resolve(full) === selfPkg) continue;
                try {
                    const json = JSON.parse(fs.readFileSync(full, 'utf8'));
                    if (json.name && json.version) index.set(json.name, json.version);
                } catch {
                    // 跳过无法解析的 package.json
                }
            }
        }
    };
    walk(root);
    return index;
}

// 更新一个依赖字段,返回变更记录数组。
function updateDeps(deps, index) {
    const changes = [];
    if (!deps) return changes;
    for (const name of Object.keys(deps)) {
        if (!name.startsWith('@spcookie/')) continue;
        const real = index.get(name);
        if (!real) {
            changes.push({name, from: deps[name], to: null, missing: true});
            continue;
        }
        if (deps[name] !== real) {
            changes.push({name, from: deps[name], to: real});
            deps[name] = real;
        }
    }
    return changes;
}

function main() {
    const pj = path.join(__dirname, 'package.json');
    const json = JSON.parse(fs.readFileSync(pj, 'utf8'));
    const index = buildIndex(packagesRoot);

    console.log(`Indexed ${index.size} sibling package(s)${dryRun ? '  (dry-run)' : ''}\n`);

    const changes = [
        ...updateDeps(json.dependencies, index),
        ...updateDeps(json.optionalDependencies, index),
    ];

    const missing = changes.filter((c) => c.missing);
    const updated = changes.filter((c) => !c.missing);

    for (const c of updated) {
        console.log(`  ✓ ${c.name}  ${c.from} → ${c.to}`);
    }
    for (const c of missing) {
        console.log(`  ⚠ ${c.name}  ${c.from} (no sibling package found, left unchanged)`);
    }
    if (updated.length === 0 && missing.length === 0) {
        console.log('  ○ all dependency versions already in sync');
    }

    if (!dryRun && updated.length > 0) {
        // 保持 2 空格缩进 + 末尾换行,减少 diff 噪音
        fs.writeFileSync(pj, JSON.stringify(json, null, 2) + '\n');
    }

    console.log(`\n${dryRun ? 'Would update' : 'Updated'} ${updated.length} dependency version(s).`);
    if (missing.length > 0) process.exitCode = 1;
}

main();
