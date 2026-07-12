#!/usr/bin/env node
// 把一份 JVM jar 目录按文件名排序、均衡切分到 4 个子包的 lib/ 中。
//
// 用法:
//   node split.mjs <源lib目录>
// 例:
//   node split.mjs /path/to/erii-core/build/install/erii-core/lib
//
// 算法: "最小化最大分组"的连续切分(二分容量 + 贪心装箱),
// 保持文件名顺序,让 4 个分片体积尽量接近,且都远低于 80MB 上限。
//
// 分片命名固定为 haiku / sonnet / opus / fable, 对应 @spcookie/deps-<name>。

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PARTS = ['haiku', 'sonnet', 'opus', 'fable'];
const LIMIT = 80 * 1024 * 1024; // 单包同步上限

const srcDir = process.argv[2];
if (!srcDir) {
    console.error('Usage: node split.mjs <source-lib-dir>');
    process.exit(1);
}
if (!fs.existsSync(srcDir)) {
    console.error(`Source directory not found: ${srcDir}`);
    process.exit(1);
}

const jars = fs.readdirSync(srcDir)
    .filter((f) => f.endsWith('.jar'))
    .sort();
if (jars.length === 0) {
    console.error(`No jar files in source directory: ${srcDir}`);
    process.exit(1);
}

const sizes = jars.map((f) => ({f, s: fs.statSync(path.join(srcDir, f)).size}));
const total = sizes.reduce((a, b) => a + b.s, 0);

// 二分最小可行容量,使连续贪心装箱不超过 PARTS.length 组
function fits(cap) {
    let groups = 1;
    let acc = 0;
    for (const {s} of sizes) {
        if (s > cap) return false;
        if (acc + s > cap) {
            groups += 1;
            acc = s;
        } else {
            acc += s;
        }
    }
    return groups <= PARTS.length;
}

let lo = Math.max(...sizes.map((x) => x.s));
let hi = total;
while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid)) hi = mid; else lo = mid + 1;
}
const cap = lo;

// 按容量连续切分
const groups = [[]];
let acc = 0;
for (const item of sizes) {
    if (groups[groups.length - 1].length && acc + item.s > cap) {
        groups.push([]);
        acc = 0;
    }
    groups[groups.length - 1].push(item);
    acc += item.s;
}
while (groups.length < PARTS.length) groups.push([]);

const mb = (n) => (n / 1024 / 1024).toFixed(1);
console.log(`Source: ${srcDir}`);
console.log(`${jars.length} jars, ${mb(total)}MB total, optimal chunk cap ${mb(cap)}MB\n`);

let over = false;
PARTS.forEach((name, i) => {
    const g = groups[i] || [];
    const gsz = g.reduce((a, b) => a + b.s, 0);
    if (gsz > LIMIT) over = true;
    const range = g.length ? `[${g[0].f} .. ${g[g.length - 1].f}]` : '(empty)';
    console.log(`deps-${name}: ${g.length} jars, ${mb(gsz)}MB ${range}`);
});
if (over) {
    console.error(`\n[ERROR] A chunk exceeds the ${mb(LIMIT)}MB limit; increase chunk count or review dependencies`);
    process.exit(1);
}

// 写入各子包 lib/(先清空旧 jar 再复制)
console.log('\nDistributing jars...');
PARTS.forEach((name, i) => {
    const g = groups[i] || [];
    const dstLib = path.join(__dirname, `deps-${name}`, 'lib');
    fs.mkdirSync(dstLib, {recursive: true});
    for (const old of fs.readdirSync(dstLib)) {
        if (old.endsWith('.jar')) fs.rmSync(path.join(dstLib, old));
    }
    for (const {f} of g) {
        fs.copyFileSync(path.join(srcDir, f), path.join(dstLib, f));
    }
    console.log(`  ✓ deps-${name}/lib  (${g.length} jars)`);
});
console.log('\nDone.');
