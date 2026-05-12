const fs = require('fs');
const path = require('path');

const isWindows = process.platform === 'win32';
const spcookieFlat = path.resolve(__dirname, '..');
const projectRoot = path.resolve(spcookieFlat, '..', '..');

const TAG = '[erii-plugin-qq-face]';

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
  const src = path.join(__dirname, zipName);

  const pluginsDir = path.join(projectRoot, 'plugins');
  fs.mkdirSync(pluginsDir, { recursive: true });

  const dst = path.join(pluginsDir, zipName);

  // Check existing symlink
  try {
    const existing = fs.readlinkSync(dst);
    const resolved = path.resolve(pluginsDir, existing);
    if (resolved === path.resolve(src)) {
      console.log(TAG, 'Already linked, skipping.');
      return;
    }
    console.log(TAG, 'WARN: destination exists but points elsewhere, skipping.');
    return;
  } catch {
    // Not a symlink, continue
  }

  if (fs.existsSync(dst)) {
    console.log(TAG, 'Destination already exists as regular file, skipping.');
    return;
  }

  if (!isWindows) {
    fs.symlinkSync(src, dst, 'file');
  } else {
    try {
      fs.linkSync(src, dst);
    } catch {
      fs.copyFileSync(src, dst);
    }
  }

  console.log(TAG, 'Linked:', zipName, '-> plugins/');
}

main();
