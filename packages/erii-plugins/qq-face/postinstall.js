const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const pkg = require('./package.json');
const isWindows = process.platform === 'win32';

// Detect install layout (mirrors erii/postinstall.js logic)
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

const projectRoot = findProjectRoot();

const TAG = `[${pkg.name}]`;

function extractZip(zipPath, destDir) {
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(destDir, true);
}

function createDirLink(target, linkPath) {
  try {
    const existing = fs.readlinkSync(linkPath);
    const resolved = path.resolve(path.dirname(linkPath), existing);
    if (resolved === path.resolve(target)) return 'skipped';
    console.log(TAG, 'WARN: destination exists but points elsewhere, skipping.');
    return 'skipped';
  } catch {
    // Not a symlink, continue
  }
  if (fs.existsSync(linkPath)) {
    console.log(TAG, 'Destination already exists as regular file/dir, skipping.');
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
  const zipFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.zip'));
  if (zipFiles.length === 0) {
    console.log(TAG, 'No .zip found in package, skipping.');
    return;
  }
  if (zipFiles.length > 1) {
    console.log(TAG, 'WARN: multiple .zip files found, using first:', zipFiles[0]);
  }

  const zipName = zipFiles[0];
  const zipPath = path.join(__dirname, zipName);
  const zipBase = zipName.replace(/\.zip$/, '');
  const pluginDir = path.join(__dirname, zipBase);

  if (!fs.existsSync(pluginDir)) {
    console.log(TAG, `Extracting ${zipName}...`);
    const tmpDir = path.join(__dirname, '.tmp-extract-' + Date.now());
    fs.mkdirSync(tmpDir, {recursive: true});

    try {
      extractZip(zipPath, tmpDir);

      const entries = fs.readdirSync(tmpDir);
      const dirEntries = entries.filter(e => fs.statSync(path.join(tmpDir, e)).isDirectory());

      if (entries.length === 1 && dirEntries.length === 1) {
        // Zip has a single root directory: move it to pluginDir
        fs.renameSync(path.join(tmpDir, entries[0]), pluginDir);
      } else {
        // Zip has no root dir or multiple entries: use zipBase as container
        fs.mkdirSync(pluginDir, {recursive: true});
        for (const entry of entries) {
          fs.renameSync(path.join(tmpDir, entry), path.join(pluginDir, entry));
        }
      }
      console.log(TAG, 'Done.');
    } finally {
      fs.rmSync(tmpDir, {recursive: true, force: true});
    }
  }

  // Link to plugins/
  const pluginsDir = path.join(projectRoot, 'plugins');
  fs.mkdirSync(pluginsDir, { recursive: true });

  const linkName = path.basename(pluginDir);
  const linkPath = path.join(pluginsDir, linkName);

  const r = createDirLink(pluginDir, linkPath);
  if (r === 'created') {
    console.log(TAG, 'Linked:', linkName, '-> plugins/');
  } else if (r === 'skipped') {
    console.log(TAG, 'Already linked, skipping.');
  }
}

main();
