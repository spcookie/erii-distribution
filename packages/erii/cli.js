#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const spcookieFlat = path.resolve(__dirname, '..');
const spcookieNested = path.join(__dirname, 'node_modules', '@spcookie');
const isWindows = process.platform === 'win32';
const nestedExists = fs.existsSync(spcookieNested);

function findEriiDir() {
  for (const searchDir of [spcookieFlat, spcookieNested]) {
    const candidate = path.join(searchDir, 'erii');
    if (fs.existsSync(path.join(candidate, 'package.json'))) {
      return candidate;
    }
  }
  return null;
}

const eriiDir = findEriiDir();

function isLocalInstall() {
  if (!eriiDir) return false;
  let dir = process.cwd();
  while (true) {
    const expected = path.join(dir, 'node_modules', '@spcookie', 'erii');
    if (eriiDir === expected || eriiDir.startsWith(expected + path.sep)) {
      return true;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return false;
}

const localInstall = isLocalInstall();

// Global: converge into @spcookie/erii/; Local: use project root (parent of node_modules)
const projectRoot = localInstall
    ? (nestedExists ? __dirname : path.resolve(spcookieFlat, '..', '..'))
    : (eriiDir || (nestedExists ? __dirname : path.resolve(spcookieFlat, '..', '..')));

function findPkgDir(name) {
  const flat = path.join(spcookieFlat, name);
  if (fs.existsSync(flat)) return flat;
  const nested = path.join(spcookieNested, name);
  if (fs.existsSync(nested)) return nested;
  return null;
}

// ---- server command ----
if (process.argv[2] === 'server') {
  const depsDir = findPkgDir('erii-deps');
  if (!depsDir) {
    console.error('erii-deps not found. Run "npm install" first.');
    process.exit(1);
  }

  function readOpts(filename) {
    const p = path.join(depsDir, 'opts', filename);
    if (!fs.existsSync(p)) return [];
    return fs.readFileSync(p, 'utf8')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));
  }

  const javaOpts = readOpts('java.opts');
  const eriiCoreOpts = readOpts('erii-core.opts');

  // Load .env.local into environment variables
  const envLocal = path.join(projectRoot, 'conf', '.env.local');
  const env = {...process.env};
  if (fs.existsSync(envLocal)) {
    const lines = fs.readFileSync(envLocal, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2];
    }
  }

  // Load erii-deps env.opts — system defaults, always take precedence
  const envOpts = path.join(depsDir, 'opts', 'env.opts');
  if (fs.existsSync(envOpts)) {
    const lines = fs.readFileSync(envOpts, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2];
    }
  }

  const libDir = path.join(projectRoot, 'lib');
  const cp = [
    path.join(libDir, 'browser', '*'),
    path.join(libDir, 'core', '*'),
    path.join(libDir, 'deps', '*'),
  ].join(path.delimiter);

  // Find Java: runtime JDK > JAVA_HOME > PATH
  let java = 'java';
  const runtimeJava = path.join(projectRoot, 'runtime', 'bin', isWindows ? 'java.exe' : 'java');
  if (fs.existsSync(runtimeJava)) {
    java = runtimeJava;
  } else if (process.env.JAVA_HOME) {
    java = path.join(process.env.JAVA_HOME, 'bin', isWindows ? 'java.exe' : 'java');
  }

  // Separate user -D system properties from program args
  const userArgs = process.argv.slice(3);
  const userSystemProps = [];
  const userProgramArgs = [];
  for (const arg of userArgs) {
    if (arg.startsWith('-D')) {
      userSystemProps.push(arg);
    } else {
      userProgramArgs.push(arg);
    }
  }

  // Filter eriiCoreOpts to remove keys overridden by user
  const userPropKeys = new Set(userSystemProps.map(arg => arg.split('=')[0]));
  const filteredCoreOpts = eriiCoreOpts.filter(arg => {
    if (!arg.startsWith('-D')) return true;
    return !userPropKeys.has(arg.split('=')[0]);
  });

  const args = [
    ...javaOpts,
    ...userSystemProps,
    ...filteredCoreOpts,
    '-cp', cp,
    'io.ktor.server.netty.EngineMain',
    ...userProgramArgs,
  ];

  // Windows: switch console to UTF-8 (code page 65001) before starting Java
  if (isWindows) {
    const {execSync} = require('child_process');
    try {
      execSync('chcp 65001', {stdio: 'ignore'});
    } catch {
    }
  }

  const child = spawn(java, args, {cwd: projectRoot, stdio: 'inherit', env});
  forwardSignals(child);
  child.on('exit', (code) => process.exit(code || 0));
  return;
}

// ---- proxy to CLI binary (all other commands) ----

const binaryName = isWindows ? 'erii-cli.exe' : 'erii-cli';

function findBinary() {
  for (const searchDir of [spcookieFlat, spcookieNested]) {
    const candidate = path.join(searchDir, binaryName);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const binary = findBinary();

if (!binary) {
  console.error('No CLI binary found. Run "npm install" first.');
  process.exit(1);
}

const cliArgs = process.argv.slice(2);

// Global mode: switch cwd to @spcookie/erii so resolveDir finds everything
// Local mode: keep user's cwd so resolveDir finds project-root .conf/conf/plugins
const spawnOpts = {stdio: 'inherit'};
if (eriiDir && !localInstall) {
  spawnOpts.cwd = eriiDir;
}

const child = spawn(binary, cliArgs, spawnOpts);
forwardSignals(child);
child.on('exit', (code) => process.exit(code || 0));

function forwardSignals(child) {
  const signals = isWindows
      ? ['SIGINT', 'SIGBREAK']
      : ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGUSR1', 'SIGUSR2'];
  for (const sig of signals) {
    process.on(sig, () => {
      try {
        child.kill(isWindows ? 'SIGTERM' : sig);
      } catch {
      }
    });
  }
}