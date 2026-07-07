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

// ---- proxy to CLI binary ----

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
// Local mode: keep user's cwd so resolveDir finds project-root conf/conf/plugins
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
