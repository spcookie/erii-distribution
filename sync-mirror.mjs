#!/usr/bin/env node
// 手动遍历并触发 npmmirror 同步全部 @spcookie/* 包。
//
// 背景:
//   npmmirror(cnpmcore)按需 + 异步任务队列同步。发布到官方 npm 后,
//   镜像不会自动同步,国内用户安装会 404。此脚本读取 erii/package.json 的
//   dependencies + optionalDependencies,加上 @spcookie/erii 自身,
//   对每个包发送 PUT .../syncs 触发同步,然后轮询确认版本已就绪。
//
// 用法:
//   node sync-mirror.mjs [--dry-run] [--no-wait]
// 例:
//   node sync-mirror.mjs              # 触发同步并轮询确认
//   node sync-mirror.mjs --dry-run    # 只打印将要同步的包,不发请求
//   node sync-mirror.mjs --no-wait    # 只触发,不轮询确认

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REGISTRY = 'https://registry.npmmirror.com';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const noWait = args.includes('--no-wait');

// 轮询参数
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120000;

// 读取 erii/package.json,收集全部 @spcookie/* 依赖(含自身)。
function collectPackages() {
    const pj = path.join(__dirname, 'packages', 'erii', 'package.json');
    if (!fs.existsSync(pj)) {
        console.error(`package.json not found: ${pj}`);
        process.exit(1);
    }
    const json = JSON.parse(fs.readFileSync(pj, 'utf8'));
    const deps = {
        ...(json.dependencies || {}),
        ...(json.optionalDependencies || {}),
    };
    const map = new Map();
    // 自身也需要同步
    map.set(json.name, json.version);
    for (const [name, version] of Object.entries(deps)) {
        if (name.startsWith('@spcookie/')) map.set(name, version);
    }
    return [...map.entries()]
        .map(([name, version]) => ({name, version}))
        .sort((a, b) => a.name.localeCompare(b.name));
}

// scope 中的 / 需要 URL 编码为 %2f
function encodePkg(name) {
    return name.replace('/', '%2f');
}

// 触发一次同步任务,返回 {ok, id, state} 或抛错。
async function triggerSync(name) {
    const url = `${REGISTRY}/-/package/${encodePkg(name)}/syncs`;
    const res = await fetch(url, {method: 'PUT'});
    const text = await res.text();
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return JSON.parse(text);
}

// 检查镜像上指定版本是否已就绪(metadata 含该版本)。
async function isVersionReady(name, version) {
    const url = `${REGISTRY}/${encodePkg(name)}`;
    const res = await fetch(url, {headers: {Accept: 'application/json'}});
    if (!res.ok) return false;
    const json = await res.json();
    return Boolean(json.versions && json.versions[version]);
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function main() {
    const pkgs = collectPackages();
    console.log(`Registry: ${REGISTRY}`);
    console.log(`Packages: ${pkgs.length}${dryRun ? '  (dry-run)' : ''}\n`);

    if (dryRun) {
        for (const {name, version} of pkgs) {
            console.log(`  · ${name}@${version}`);
        }
        console.log(`\nWould trigger sync for ${pkgs.length} package(s).`);
        return;
    }

    // 阶段 1: 触发全部同步任务
    console.log('[1/2] Triggering sync tasks...');
    const failed = [];
    for (const {name, version} of pkgs) {
        try {
            const r = await triggerSync(name);
            console.log(`  ✓ ${name}@${version}  (state: ${r.state || 'ok'})`);
        } catch (err) {
            console.log(`  ✗ ${name}@${version}  ${err.message}`);
            failed.push(name);
        }
    }

    if (noWait) {
        console.log('\nSync triggered (--no-wait, skipping confirmation).');
        if (failed.length) process.exitCode = 1;
        return;
    }

    // 阶段 2: 轮询确认版本就绪
    console.log('\n[2/2] Waiting for versions to appear on mirror...');
    const pending = new Set(pkgs.map((p) => `${p.name}@${p.version}`));
    const byKey = new Map(pkgs.map((p) => [`${p.name}@${p.version}`, p]));
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (pending.size > 0 && Date.now() < deadline) {
        for (const key of [...pending]) {
            const {name, version} = byKey.get(key);
            if (await isVersionReady(name, version)) {
                console.log(`  ✓ ${key}`);
                pending.delete(key);
            }
        }
        if (pending.size > 0) await sleep(POLL_INTERVAL_MS);
    }

    if (pending.size > 0) {
        console.log(`\n${pending.size} package(s) not confirmed within ${POLL_TIMEOUT_MS / 1000}s:`);
        for (const key of pending) console.log(`  ⏳ ${key}`);
        console.log('Mirror may still be syncing; re-run to re-check.');
        process.exitCode = 1;
    } else {
        console.log(`\nAll ${pkgs.length} package(s) confirmed on mirror.`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
