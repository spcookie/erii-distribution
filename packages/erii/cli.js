#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const spcookieFlat = path.resolve(__dirname, '..');
const spcookieNested = path.join(__dirname, 'node_modules', '@spcookie');
const isWindows = process.platform === 'win32';

// Detect install layout (mirrors postinstall.js logic)
const nestedExists = fs.existsSync(spcookieNested);
const projectRoot = nestedExists ? __dirname : path.resolve(spcookieFlat, '..', '..');

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

  const args = [...javaOpts, ...eriiCoreOpts, '-cp', cp, 'io.ktor.server.netty.EngineMain', ...process.argv.slice(3)];

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

function findCliDir() {
  for (const searchDir of [spcookieFlat, spcookieNested]) {
    if (!fs.existsSync(searchDir)) continue;
    const dirs = fs.readdirSync(searchDir);
    const cliDir = dirs.find(d => /^erii-cli-/.test(d));
    if (cliDir) return path.join(searchDir, cliDir);
  }
  return null;
}

const cliDir = findCliDir();

if (!cliDir) {
  console.error('No CLI package found. Run "npm install" first.');
  process.exit(1);
}

const binary = path.join(cliDir, isWindows ? 'erii-cli.exe' : 'erii-cli');

const child = spawn(binary, process.argv.slice(2), { stdio: 'inherit' });
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
