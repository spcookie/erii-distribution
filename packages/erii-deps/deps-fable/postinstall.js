const fs = require('fs');
const path = require('path');

const isWindows = process.platform === 'win32';

// Target subdir name is derived from this package's own name:
// @spcookie/deps-haiku -> haiku  (jars land in <root>/lib/deps/haiku)
const pkgName = require('./package.json').name;
const depName = pkgName.replace(/^@spcookie\/deps-/, '');

// Detect install layout (mirrors erii-core/postinstall.js logic)
const spcookieFlat = path.resolve(__dirname, '..');
const spcookieNested = path.join(__dirname, 'node_modules', '@spcookie');
const nestedExists = fs.existsSync(spcookieNested);

function findEriiDir() {
    const candidates = [
        path.join(spcookieFlat, 'erii'),
        path.join(__dirname, 'node_modules', '@spcookie', 'erii'),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(path.join(candidate, 'package.json'))) {
            return candidate;
        }
    }
    return null;
}

const eriiDir = findEriiDir();
const isGlobal = process.env.npm_config_global === 'true';

function findProjectRoot() {
    if (isGlobal && eriiDir) {
        return eriiDir;
    }
    return nestedExists ? __dirname : path.resolve(spcookieFlat, '..', '..');
}

const linkRoot = findProjectRoot();

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
        console.log(`  [WARN] ${pkgName} lib source missing`);
        return;
    }

    const depsRoot = path.join(linkRoot, 'lib', 'deps');
    fs.mkdirSync(depsRoot, {recursive: true});

    const dstDir = path.join(depsRoot, depName);
    const r = createDirLink(srcLib, dstDir);
    const icon = r === 'created' ? '✓' : '○';
    console.log(`  ${icon} lib/deps/${depName}`);
}

main();
