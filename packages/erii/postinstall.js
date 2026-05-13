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

// ---- config file merge (existing keys kept, new keys added) ----

function deepMerge(existing, incoming) {
  if (typeof existing !== 'object' || existing === null || Array.isArray(existing)) {
    return existing;
  }
  if (typeof incoming !== 'object' || incoming === null || Array.isArray(incoming)) {
    return existing;
  }
  const result = {...existing};
  for (const key of Object.keys(incoming)) {
    if (!(key in result)) {
      result[key] = incoming[key];
    } else if (
        typeof result[key] === 'object' && !Array.isArray(result[key]) && result[key] !== null &&
        typeof incoming[key] === 'object' && !Array.isArray(incoming[key]) && incoming[key] !== null
    ) {
      result[key] = deepMerge(result[key], incoming[key]);
    }
  }
  return result;
}

function mergeJson(srcPath, dstPath) {
  const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
  const dst = JSON.parse(fs.readFileSync(dstPath, 'utf8'));
  const merged = deepMerge(dst, src);
  fs.writeFileSync(dstPath, JSON.stringify(merged, null, 2) + '\n');
}

function mergeEnv(srcPath, dstPath) {
  const srcContent = fs.readFileSync(srcPath, 'utf8');
  const dstContent = fs.readFileSync(dstPath, 'utf8');

  const dstKeys = new Set();
  for (const line of dstContent.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
    if (m) dstKeys.add(m[1]);
  }

  const srcLines = srcContent.split('\n');
  const toAdd = [];
  for (const line of srcLines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
    if (m && !dstKeys.has(m[1])) {
      toAdd.push(line);
    }
  }

  if (toAdd.length > 0) {
    fs.appendFileSync(dstPath, '\n' + toAdd.join('\n') + '\n');
  }
}

function getTopLevelKeys(content) {
  const keys = new Set();
  let depth = 0;
  let buf = '';
  let inComment = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (inComment) {
      if (ch === '\n') inComment = false;
      continue;
    }
    if (ch === '#') {
      inComment = true;
      continue;
    }
    if (ch === '{') {
      if (depth === 0 && buf.trim()) {
        keys.add(buf.trim());
      }
      depth++;
      buf = '';
    } else if (ch === '}') {
      depth--;
      buf = '';
    } else if (ch === '=' && depth === 0) {
      if (buf.trim()) keys.add(buf.trim());
      buf = '';
    } else if (ch === '\n') {
      buf = '';
    } else if (depth === 0) {
      buf += ch;
    }
  }
  return keys;
}

function mergeConf(srcPath, dstPath) {
  const srcContent = fs.readFileSync(srcPath, 'utf8');
  const dstContent = fs.readFileSync(dstPath, 'utf8');

  const dstKeys = getTopLevelKeys(dstContent);
  const srcKeys = getTopLevelKeys(srcContent);

  const newKeys = [...srcKeys].filter(k => !dstKeys.has(k));
  if (newKeys.length === 0) return;

  // Append missing top-level blocks from source
  let toAppend = '\n';
  const srcBlocks = extractTopLevelBlocks(srcContent);
  for (const {key, block} of srcBlocks) {
    if (newKeys.includes(key)) {
      toAppend += block + '\n\n';
    }
  }
  fs.appendFileSync(dstPath, toAppend);
}

function extractTopLevelBlocks(content) {
  const blocks = [];
  let depth = 0;
  let buf = '';
  let currentKey = '';
  let inBlock = false;
  let inComment = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (inComment) {
      buf += ch;
      if (ch === '\n') inComment = false;
      continue;
    }
    if (ch === '#') {
      buf += ch;
      inComment = true;
      continue;
    }

    buf += ch;

    if (ch === '{') {
      if (depth === 0) {
        inBlock = true;
        const before = buf.slice(0, -1);
        const lastNewline = before.lastIndexOf('\n');
        currentKey = before.slice(lastNewline + 1).trim();
      }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && inBlock) {
        blocks.push({key: currentKey, block: buf.trimEnd()});
        buf = '';
        currentKey = '';
        inBlock = false;
      }
    } else if (ch === '\n' && depth === 0 && !inBlock) {
      const trimmed = buf.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          blocks.push({key: trimmed.slice(0, eqIdx).trim(), block: trimmed});
        }
      }
      buf = '';
    }
  }
  // remaining simple assignment
  const trimmed = buf.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const eqIdx = trimmed.indexOf('=');
    blocks.push({key: trimmed.slice(0, eqIdx).trim(), block: trimmed});
  }
  return blocks;
}

function mergeFile(srcPath, dstPath) {
  const ext = path.extname(dstPath);
  const basename = path.basename(dstPath);
  if (ext === '.json') {
    mergeJson(srcPath, dstPath);
  } else if (ext === '.conf') {
    mergeConf(srcPath, dstPath);
  } else if (basename.startsWith('.env')) {
    mergeEnv(srcPath, dstPath);
  }
  // other files: leave existing untouched
}

function mergeDir(srcDir, dstDir) {
  fs.mkdirSync(dstDir, {recursive: true});
  const entries = fs.readdirSync(srcDir, {withFileTypes: true});
  let added = 0;

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);

    if (entry.isDirectory()) {
      added += mergeDir(srcPath, dstPath);
    } else if (fs.existsSync(dstPath)) {
      mergeFile(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
      added++;
    }
  }
  return added;
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

  // Windows: hardlink (same volume) → symlink (cross-volume, needs dev mode) → copy
  try {
    fs.linkSync(target, linkPath);
    return 'created';
  } catch {
  }
  try {
    fs.symlinkSync(target, linkPath, 'file');
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

// ---- lib/ merge (symlink per package directory) ----

const libMap = {
  'erii-browser': 'browser',
  'erii-core': 'core',
  'erii-deps': 'deps',
};

function mergeLib(linkRoot) {
  const libRoot = path.join(linkRoot, 'lib');
  fs.mkdirSync(libRoot, {recursive: true});

  let total = 0;
  for (const [pkg, subdir] of Object.entries(libMap)) {
    const pkgDir = findPkgDir(pkg);
    if (!pkgDir) {
      log('warn', `lib source missing: ${pkg}`);
      continue;
    }
    const srcLib = path.join(pkgDir, 'lib');
    if (!fs.existsSync(srcLib)) continue;

    const dstDir = path.join(libRoot, subdir);
    const r = createDirLink(srcLib, dstDir);
    if (r === 'created') total++;
  }
  log('info', `lib/: ${total} dirs linked`);
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
  console.log('Setting up Erii project...');

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

  // ---- create links & merge configs ----
  // Note: the "erii" command is handled by npm's bin wrapper (erii.cmd / erii),
  // which calls cli.js. cli.js proxies to the real CLI binary and provides
  // the "cleanup" command. We deliberately do NOT link the binary directly,
  // as a raw .exe would bypass cli.js on Windows.
  const configDir = findPkgDir('erii-config');

  // .conf & conf: copy + merge instead of symlink (preserve user edits, add new keys only)
  const confSrc = path.join(configDir, '.conf');
  if (fs.existsSync(confSrc)) {
    const confDst = path.join(linkRoot, '.conf');
    const n = mergeDir(confSrc, confDst);
    results.push({name: '.conf', status: n > 0 ? 'created' : 'merged'});
  } else {
    results.push({name: '.conf', status: 'failed', reason: 'target not found: ' + confSrc});
  }

  const appConfSrc = path.join(configDir, 'conf');
  if (fs.existsSync(appConfSrc)) {
    const appConfDst = path.join(linkRoot, 'conf');
    const n = mergeDir(appConfSrc, appConfDst);
    results.push({name: 'conf', status: n > 0 ? 'created' : 'merged'});
  } else {
    results.push({name: 'conf', status: 'failed', reason: 'target not found: ' + appConfSrc});
  }

  const links = [
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
    const icon = r.status === 'failed' ? '✗' : r.status === 'skipped' ? '○' : r.status === 'merged' ? '●' : '✓';
    const detail = r.reason ? ` (${r.reason})` : '';
    console.log(`  ${icon} ${r.name}${detail}`);
  }
  const runCmd = nestedExists ? 'erii' : 'npx erii';
  console.log('');
  console.log(`Erii is ready! Run \`${runCmd} setup\` to initialize, or \`${runCmd} config\` to configure.`);
}

main();
