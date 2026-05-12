const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// npm hides lifecycle script output on success by design.
// Output is visible with --foreground-scripts, or on error.

// __dirname = <project>/node_modules/@spcookie/erii  (flat) or
//             <global>/node_modules/@spcookie/erii (global, deps nested)
const spcookieFlat = path.resolve(__dirname, '..');
const spcookieNested = path.join(__dirname, 'node_modules', '@spcookie');
const isWindows = process.platform === 'win32';

const results = [];

// ---- utility ----

function log(level, msg) {
  const prefix = level === 'error' ? '[ERROR]' : level === 'warn' ? '[WARN]' : '[INFO]';
  console.log(`  ${prefix} ${msg}`);
}

// npm may hoist deps (local install) or nest them under erii/node_modules (global).
function findPkgDir(name) {
  const flat = path.join(spcookieFlat, name);
  if (fs.existsSync(flat)) return flat;
  const nested = path.join(spcookieNested, name);
  if (fs.existsSync(nested)) return nested;
  return null;
}

// ---- symlink / hardlink / copy ----

function readExistingLink(linkPath) {
  try   { return fs.readlinkSync(linkPath); }
  catch { return null; }
}

function createDirLink(target, linkPath) {
  const existing = readExistingLink(linkPath);
  if (existing !== null) {
    const resolved = path.resolve(path.dirname(linkPath), existing);
    if (resolved === path.resolve(target)) return 'skipped';
    log('warn', `${linkPath} exists but points elsewhere, skipping.`);
    return 'skipped';
  }
  if (fs.existsSync(linkPath)) {
    log('warn', `${linkPath} already exists as a regular file/dir, skipping.`);
    return 'skipped';
  }

  if (isWindows) {
    fs.symlinkSync(target, linkPath, 'junction');
  } else {
    fs.symlinkSync(target, linkPath, 'dir');
  }
  return 'created';
}

function createFileLink(target, linkPath) {
  const existing = readExistingLink(linkPath);
  if (existing !== null) {
    const resolved = path.resolve(path.dirname(linkPath), existing);
    if (resolved === path.resolve(target)) return 'skipped';
    log('warn', `${linkPath} exists but points elsewhere, skipping.`);
    return 'skipped';
  }
  if (fs.existsSync(linkPath)) return 'skipped';

  if (!isWindows) {
    fs.symlinkSync(target, linkPath, 'file');
    return 'created';
  }

  // Windows: try hardlink first, fallback to copy
  try {
    fs.linkSync(target, linkPath);
    return 'created';
  } catch {
    try {
      fs.copyFileSync(target, linkPath);
      return 'created';
    } catch (e) {
      log('error', `Failed to link/copy ${linkPath}: ${e.message}`);
      return 'failed';
    }
  }
}

// ---- lib/ merge ----

function mergeLib(linkRoot) {
  const targetLib = path.join(linkRoot, 'lib');
  fs.mkdirSync(targetLib, { recursive: true });

  const srcNames = ['erii-core', 'erii-browser', 'erii-deps'];

  let total = 0;
  for (const name of srcNames) {
    const pkgDir = findPkgDir(name);
    if (!pkgDir) {
      log('warn', `lib source missing: ${name}`);
      continue;
    }
    const src = path.join(pkgDir, 'lib');
    if (!fs.existsSync(src)) continue;
    const jars = fs.readdirSync(src).filter(f => f.endsWith('.jar'));
    for (const jar of jars) {
      const srcFile = path.join(src, jar);
      const dstFile = path.join(targetLib, jar);
      if (fs.existsSync(dstFile)) continue;
      const r = createFileLink(srcFile, dstFile);
      if (r === 'created') total++;
    }
  }
  log('info', `lib/: ${total} JARs linked`);
  return total > 0;
}

// ---- platform detection ----

const platformToOs = { 'darwin': 'darwin', 'linux': 'linux', 'win32': 'windows' };
const archToCliArch = { 'x64': 'amd64', 'arm64': 'arm64', 'ia32': '386' };
const archToRuntimeArch = { 'x64': 'x64', 'arm64': 'aarch64', 'ia32': 'x86' };

function detectPlatformPackages() {
  const os = platformToOs[process.platform];
  const cliArch = archToCliArch[process.arch] || process.arch;
  const runtimeArch = archToRuntimeArch[process.arch] || process.arch;

  if (!os) return null;

  return {
    cliPkg: `erii-cli-${os}-${cliArch}`,
    runtimePkg: `erii-runtime-${os}-${runtimeArch}`,
  };
}

function findJdkDir(runtimePkg) {
  const pkgDir = findPkgDir(runtimePkg);
  if (!pkgDir) return null;
  const entries = fs.readdirSync(pkgDir, { withFileTypes: true });
  const jdk = entries.find(e => e.isDirectory() && e.name.startsWith('jdk-'));
  return jdk ? path.join(pkgDir, jdk.name) : null;
}

// ---- main ----

function main() {
  console.log('Linking runtime directory...');

  // Detect install layout: flat (local) or nested (global)
  const nestedExists = fs.existsSync(spcookieNested);
  // Global install: put links inside the package dir (no pollution)
  // Local install: put links at project root
  const linkRoot = nestedExists ? __dirname : path.resolve(spcookieFlat, '..', '..');

  if (!fs.existsSync(spcookieFlat) && !nestedExists) {
    console.log('  Not installed as a dependency, nothing to set up.');
    return;
  }

  // Run dependency postinstall scripts first — npm may not order them correctly
  const depNames = ['erii-browser', 'erii-deps'];
  for (const name of depNames) {
    const pkgDir = findPkgDir(name);
    if (pkgDir) {
      const script = path.join(pkgDir, 'postinstall.js');
      if (fs.existsSync(script)) {
        try { execSync(`node "${script}"`, { stdio: 'inherit' }); } catch { /* best effort */ }
      }
    }
  }
  // Also run runtime postinstall scripts (they extract the JDK)
  for (const searchDir of [spcookieFlat, spcookieNested]) {
    if (!fs.existsSync(searchDir)) continue;
    const dirs = fs.readdirSync(searchDir).filter(d => /^erii-runtime-/.test(d));
    for (const dir of dirs) {
      const script = path.join(searchDir, dir, 'postinstall.js');
      if (fs.existsSync(script)) {
        try { execSync(`node "${script}"`, { stdio: 'inherit' }); } catch { /* best effort */ }
      }
    }
  }

  // Detect current platform packages
  const pkgs = detectPlatformPackages();
  if (!pkgs) {
    log('error', `Unsupported platform: ${process.platform}`);
    return;
  }

  const { cliPkg, runtimePkg } = pkgs;
  console.log(`  Platform: ${process.platform}-${process.arch} => ${cliPkg} / ${runtimePkg}`);

  const cliPkgDir = findPkgDir(cliPkg);
  if (!cliPkgDir) {
    log('error', `${cliPkg} not installed. Check platform compatibility.`);
    return;
  }
  const runtimePkgDir = findPkgDir(runtimePkg);
  if (!runtimePkgDir) {
    log('error', `${runtimePkg} not installed. Check platform compatibility.`);
    return;
  }

  // Validate required core deps exist
  const required = ['erii-config', 'erii-core', 'erii-browser', 'erii-deps'];
  for (const name of required) {
    if (!findPkgDir(name)) {
      log('error', `Required dependency @spcookie/${name} not installed.`);
      return;
    }
  }

  // Find JDK dir in runtime package
  const jdkPath = findJdkDir(runtimePkg);
  if (!jdkPath) {
    log('error', `No jdk-* directory found in ${runtimePkg}. The runtime postinstall may not have completed.`);
    return;
  }

  // ---- create links ----
  // Note: the "erii" command is handled by npm's bin wrapper (erii.cmd / erii),
  // which calls cli.js. cli.js proxies to the real CLI binary and provides
  // the "cleanup" command. We deliberately do NOT link the binary directly,
  // as a raw .exe would bypass cli.js on Windows.
  const configDir = findPkgDir('erii-config');
  const depsDir = findPkgDir('erii-deps');
  const links = [
    { name: '.conf',   type: 'dir',  target: path.join(configDir, '.conf'),  link: path.join(linkRoot, '.conf') },
    { name: 'conf',    type: 'dir',  target: path.join(configDir, 'conf'),   link: path.join(linkRoot, 'conf') },
    { name: 'bin',     type: 'dir',  target: path.join(depsDir, 'bin'),      link: path.join(linkRoot, 'bin') },
    { name: 'runtime', type: 'dir',  target: jdkPath,                        link: path.join(linkRoot, 'runtime') },
  ];

  for (const { name, type, target, link } of links) {
    if (!fs.existsSync(target)) {
      results.push({ name, status: 'failed', reason: `target not found: ${target}` });
      continue;
    }
    const r = type === 'dir' ? createDirLink(target, link) : createFileLink(target, link);
    results.push({ name, status: r });
  }

  // lib/ merge
  const libOk = mergeLib(linkRoot);
  results.push({ name: 'lib', status: libOk ? 'created' : 'skipped' });

  // plugins/ empty dir
  fs.mkdirSync(path.join(linkRoot, 'plugins'), { recursive: true });
  results.push({ name: 'plugins', status: 'created' });

  // Summary
  console.log('');
  for (const r of results) {
    const icon = r.status === 'failed' ? '✗' : r.status === 'skipped' ? '○' : '✓';
    const detail = r.reason ? ` (${r.reason})` : '';
    console.log(`  ${icon} ${r.name}${detail}`);
  }
  const runCmd = nestedExists ? 'erii' : 'npx erii';
  console.log('');
  console.log(`Erii is ready! Run \`${runCmd} setup\` to initialize, or \`${runCmd} config\` to configure.`);
}

main();
