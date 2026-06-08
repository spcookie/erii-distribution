const fs = require('fs');
const path = require('path');

const isWindows = process.platform === 'win32';

// Detect install layout
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

function createFileLink(target, linkPath) {
    const existing = readExistingLink(linkPath);
    if (existing !== null) {
        const resolved = path.resolve(path.dirname(linkPath), existing);
        if (resolved === path.resolve(target)) return 'skipped';
        console.log(`  [WARN] ${path.basename(linkPath)} exists but points elsewhere, skipping.`);
        return 'skipped';
    }
    if (fs.existsSync(linkPath)) {
        console.log(`  [WARN] ${path.basename(linkPath)} already exists, skipping.`);
        return 'skipped';
    }

    if (isWindows) {
        fs.copyFileSync(target, linkPath);
    } else {
        fs.symlinkSync(target, linkPath, 'file');
    }
    return 'created';
}

function linkLib() {
    if (!fs.existsSync(libDir)) {
        console.log('  [WARN] erii-browser-driver lib source missing');
        return;
    }
    const libRoot = path.join(linkRoot, 'lib');
    fs.mkdirSync(libRoot, {recursive: true});

    const browserDir = path.join(libRoot, 'browser');
    fs.mkdirSync(browserDir, {recursive: true});

    const files = fs.readdirSync(libDir).filter(f => f.endsWith('.jar'));
    for (const f of files) {
        const src = path.join(libDir, f);
        const dst = path.join(browserDir, f);
        const r = createFileLink(src, dst);
        const icon = r === 'created' ? '✓' : '○';
        console.log(`  ${icon} lib/browser/${f}`);
    }
}

linkLib();
