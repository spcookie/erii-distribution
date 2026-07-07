const fs = require('fs');
const path = require('path');

const isWindows = process.platform === 'win32';

// Detect install layout (mirrors erii/postinstall.js logic)
const spcookieFlat = path.resolve(__dirname, '..');
const spcookieNested = path.join(__dirname, 'node_modules', '@spcookie');
const nestedExists = fs.existsSync(spcookieNested);
const linkRoot = nestedExists ? __dirname : path.resolve(spcookieFlat, '..', '..');

const libDir = path.join(__dirname, 'lib');

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

function linkLib() {
    if (!fs.existsSync(libDir)) {
        console.log('  [WARN] erii-deps lib source missing');
        return;
    }
    const libRoot = path.join(linkRoot, 'lib');
    fs.mkdirSync(libRoot, {recursive: true});

    const dstDir = path.join(libRoot, 'deps');
    const r = createDirLink(libDir, dstDir);
    const icon = r === 'created' ? '✓' : '○';
    console.log(`  ${icon} lib/deps`);
}

function linkOpts() {
    const optsDir = path.join(__dirname, 'opts');
    if (!fs.existsSync(optsDir)) {
        console.log('  [WARN] erii-deps opts source missing');
        return;
    }
    const dstDir = path.join(linkRoot, 'opts');
    const r = createDirLink(optsDir, dstDir);
    const icon = r === 'created' ? '✓' : '○';
    console.log(`  ${icon} opts`);
}

linkLib();
linkOpts();
