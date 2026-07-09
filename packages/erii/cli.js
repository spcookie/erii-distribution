#!/usr/bin/env node
'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ---- path resolution ----

const spcookieFlat = path.resolve(__dirname, '..');
const spcookieNested = path.join(__dirname, 'node_modules', '@spcookie');

function findEriiDir() {
  for (const dir of [spcookieFlat, spcookieNested]) {
    const pkg = path.join(dir, 'erii', 'package.json');
    if (fs.existsSync(pkg)) return path.dirname(pkg);
  }
  return null;
}

const eriiDir = findEriiDir();

function isLocalInstall() {
  if (!eriiDir) return false;
  let dir = process.cwd();
  while (true) {
    const expected = path.join(dir, 'node_modules', '@spcookie', 'erii');
    if (eriiDir === expected || eriiDir.startsWith(expected + path.sep)) return true;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return false;
}

const localInstall = isLocalInstall();

// ---- binary resolution ----

const PLATFORM_MAP = {win32: 'windows', linux: 'linux', darwin: 'darwin'};
const ARCH_MAP = {x64: 'amd64', arm64: 'arm64', ia32: '386'};

const platform = PLATFORM_MAP[process.platform] || 'linux';
const arch = ARCH_MAP[process.arch] || 'amd64';
const packageName = `erii-cli-${platform}-${arch}`;
const binaryName = process.platform === 'win32' ? 'erii-cli.exe' : 'erii-cli';

function findBinary() {
  for (const dir of [spcookieFlat, spcookieNested]) {
    // direct path inside platform package (e.g. erii-cli-linux-amd64/erii-cli)
    const pkgPath = path.join(dir, packageName, binaryName);
    if (fs.existsSync(pkgPath)) return pkgPath;

    // symlinked flat path from postinstall (backward compat)
    const flatPath = path.join(dir, binaryName);
    if (fs.existsSync(flatPath)) return flatPath;
  }
  return null;
}

// ---- signal forwarding ----

const isWindows = process.platform === 'win32';

function forwardSignals(child) {
  const signals = isWindows
      ? ['SIGINT', 'SIGBREAK']
      : ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGUSR1', 'SIGUSR2'];
  for (const sig of signals) {
    process.on(sig, () => {
      try {
        child.kill(isWindows ? 'SIGTERM' : sig);
      } catch { /* ignore */
      }
    });
  }
}

// ---- main ----

const binary = findBinary();
if (!binary) {
  console.error(`No CLI binary found for ${process.platform}/${process.arch}. Run "npm install" first.`);
  process.exit(1);
}

const spawnOpts = {stdio: 'inherit'};

// global install: switch cwd to @spcookie/erii so resolveDir finds everything
if (eriiDir && !localInstall) {
  spawnOpts.cwd = eriiDir;
}

const child = spawn(binary, process.argv.slice(2), spawnOpts);
forwardSignals(child);
child.on('exit', (code) => process.exit(code || 0));
