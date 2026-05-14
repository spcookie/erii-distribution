const fs = require('fs');
const path = require('path');

const isWindows = process.platform === 'win32';

// Detect install layout (mirrors erii/postinstall.js logic)
const spcookieFlat = path.resolve(__dirname, '..');
const spcookieNested = path.join(__dirname, 'node_modules', '@spcookie');
const nestedExists = fs.existsSync(spcookieNested);
const linkRoot = nestedExists ? __dirname : path.resolve(spcookieFlat, '..', '..');

function readExistingLink(linkPath) {
    try {
        return fs.readlinkSync(linkPath);
    } catch {
        return null;
    }
}

function createDirLink(target, linkPath) {
    const existing = readExistingLink(linkPath);
    if (existing !== null) {
        const resolved = path.resolve(path.dirname(linkPath), existing);
        if (resolved === path.resolve(target)) return 'skipped';
        console.log(`  [WARN] ${linkPath} exists but points elsewhere, skipping.`);
        return 'skipped';
    }
    if (fs.existsSync(linkPath)) {
        console.log(`  [WARN] ${linkPath} already exists as a regular file/dir, skipping.`);
        return 'skipped';
    }

    if (isWindows) {
        fs.symlinkSync(target, linkPath, 'junction');
    } else {
        fs.symlinkSync(target, linkPath, 'dir');
    }
    return 'created';
}

function main() {
    const srcLib = path.join(__dirname, 'lib');
    if (!fs.existsSync(srcLib)) {
        console.log('  [WARN] erii-core lib source missing');
        return;
    }

    const libRoot = path.join(linkRoot, 'lib');
    fs.mkdirSync(libRoot, {recursive: true});

    const dstDir = path.join(libRoot, 'core');
    const r = createDirLink(srcLib, dstDir);
    const icon = r === 'created' ? '✓' : '○';
    console.log(`  ${icon} lib/core`);
}

main();
