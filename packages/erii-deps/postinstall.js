const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const isWindows = process.platform === 'win32';

// Detect install layout (mirrors erii/postinstall.js logic)
const spcookieFlat = path.resolve(__dirname, '..');
const spcookieNested = path.join(__dirname, 'node_modules', '@spcookie');
const nestedExists = fs.existsSync(spcookieNested);
const linkRoot = nestedExists ? __dirname : path.resolve(spcookieFlat, '..', '..');

const libDir = path.join(__dirname, 'lib');
const tarFile = path.join(libDir, 'deps.tar.gz');

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
    if (!fs.existsSync(tarFile)) return;

  const files = fs.readdirSync(libDir);
  const jarFiles = files.filter(f => f.endsWith('.jar'));

  if (jarFiles.length > 0) {
    console.log('JAR files already extracted, skipping.');
    return;
  }

  console.log('Extracting deps.tar.gz...');
  try {
    execSync(`tar --force-local -xzf "${tarFile}"`, { cwd: libDir, stdio: 'pipe' });
  } catch {
    execSync(`tar -xzf "${tarFile}"`, { cwd: libDir });
  }
  fs.unlinkSync(tarFile);
  console.log('Done.');
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

extractIfNeeded();
linkLib();
