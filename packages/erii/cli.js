#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const spcookieFlat = path.resolve(__dirname, '..');
const spcookieNested = path.join(__dirname, 'node_modules', '@spcookie');
const isWindows = process.platform === 'win32';

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
child.on('exit', (code) => process.exit(code || 0));
