const fs = require('fs');
const path = require('path');

// Detect install layout (mirrors erii/postinstall.js logic)
const spcookieFlat = path.resolve(__dirname, '..');
const spcookieNested = path.join(__dirname, 'node_modules', '@spcookie');
const nestedExists = fs.existsSync(spcookieNested);
const linkRoot = nestedExists ? __dirname : path.resolve(spcookieFlat, '..', '..');

function copyDir(srcDir, dstDir, results) {
    fs.mkdirSync(dstDir, {recursive: true});
    const entries = fs.readdirSync(srcDir, {withFileTypes: true});
    let copied = 0;

    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const dstPath = path.join(dstDir, entry.name);

        if (entry.isDirectory()) {
            copied += copyDir(srcPath, dstPath, results);
        } else if (!fs.existsSync(dstPath)) {
            fs.copyFileSync(srcPath, dstPath);
            copied++;
        }
    }
    return copied;
}

function copyDirAlways(srcDir, dstDir) {
    fs.mkdirSync(dstDir, {recursive: true});
    const entries = fs.readdirSync(srcDir, {withFileTypes: true});
    let copied = 0;

    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const dstPath = path.join(dstDir, entry.name);

        if (entry.isDirectory()) {
            copied += copyDirAlways(srcPath, dstPath);
        } else {
            fs.copyFileSync(srcPath, dstPath);
            copied++;
        }
    }
    return copied;
}

function main() {
    console.log('Setting up Erii config...');

    const results = [];

    // 1. .conf/ directory
    const confSrc = path.join(__dirname, '.conf');
    const confDst = path.join(linkRoot, '.conf');
    if (fs.existsSync(confSrc)) {
        const n = copyDir(confSrc, confDst, results);
        const hasExisting = fs.existsSync(confDst);
        results.push({
            name: '.conf',
            status: n > 0 ? 'created' : (hasExisting ? 'up-to-date' : 'failed'),
            reason: hasExisting && n === 0 ? 'already exists' : undefined
        });

        // If target already existed, copy source to .update-conf/ for later reload merge
        if (hasExisting && n === 0) {
            const updateDst = path.join(linkRoot, '.update-conf', '.conf');
            const m = copyDirAlways(confSrc, updateDst);
            results.push({name: '.update-conf/.conf', status: m > 0 ? 'updated' : 'up-to-date'});
        }
    } else {
        results.push({name: '.conf', status: 'failed', reason: 'source not found: ' + confSrc});
    }

    // 2. conf/ directory
    const appConfSrc = path.join(__dirname, 'conf');
    const appConfDst = path.join(linkRoot, 'conf');
    if (fs.existsSync(appConfSrc)) {
        const n = copyDir(appConfSrc, appConfDst, results);
        const hasExisting = fs.existsSync(appConfDst);
        results.push({
            name: 'conf',
            status: n > 0 ? 'created' : (hasExisting ? 'up-to-date' : 'failed'),
            reason: hasExisting && n === 0 ? 'already exists' : undefined
        });

        // If target already existed, copy source to .update-conf/ for later reload merge
        if (hasExisting && n === 0) {
            const updateDst = path.join(linkRoot, '.update-conf', 'conf');
            const m = copyDirAlways(appConfSrc, updateDst);
            results.push({name: '.update-conf/conf', status: m > 0 ? 'updated' : 'up-to-date'});
        }
    } else {
        results.push({name: 'conf', status: 'failed', reason: 'source not found: ' + appConfSrc});
    }

    for (const r of results) {
        const icon = r.status === 'failed' ? '✗' : r.status === 'up-to-date' ? '●' : '✓';
        const detail = r.reason ? ` (${r.reason})` : '';
        console.log(`  ${icon} ${r.name}${detail}`);
    }
}

main();
