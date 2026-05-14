const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

function extractIfNeeded() {
    const tarFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.tar.gz'));
    if (tarFiles.length === 0) return;

    const tarFile = path.join(__dirname, tarFiles[0]);
    const jdkDirs = fs.readdirSync(__dirname).filter(f => f.startsWith('jdk-'));

    if (jdkDirs.length > 0) {
        console.log('JDK already extracted, skipping.');
        return;
    }

    console.log(`Extracting ${tarFiles[0]}...`);
    try {
        execSync(`tar --force-local -xzf "${tarFile}"`, {cwd: __dirname, stdio: 'pipe'});
    } catch {
        execSync(`tar -xzf "${tarFile}"`, {cwd: __dirname});
    }
    fs.unlinkSync(tarFile);
    console.log('Done.');
}

function linkRuntime() {
    const entries = fs.readdirSync(__dirname, {withFileTypes: true});
    const jdk = entries.find(e => e.isDirectory() && e.name.startsWith('jdk-'));
    if (!jdk) {
        console.log('  [WARN] no jdk-* directory found');
        return;
    }
    const jdkPath = path.join(__dirname, jdk.name);
    const linkPath = path.join(linkRoot, 'runtime');
    const r = createDirLink(jdkPath, linkPath);
    const icon = r === 'created' ? '✓' : '○';
    console.log(`  ${icon} runtime`);
}

extractIfNeeded();
linkRuntime();
