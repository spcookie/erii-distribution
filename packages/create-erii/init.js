#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const pkgPath = path.join(cwd, 'package.json');

// Parse registry
let registryArg = '';
const regIdx = process.argv.indexOf('--registry');
if (regIdx !== -1 && process.argv[regIdx + 1]) {
  registryArg = ' --registry ' + process.argv[regIdx + 1];
}

if (!fs.existsSync(pkgPath)) {
  fs.writeFileSync(pkgPath, JSON.stringify({ private: true }, null, 2) + '\n');
  console.log('Created package.json');
}

// npm create foo@1.2.3 → downloads create-foo@1.2.3 → we install foo@^1.2.3
const ownVersion = require('./package.json').version;
const pkg = '@spcookie/erii@^' + ownVersion;
console.log('Installing ' + pkg + '...');
execSync('npm install ' + pkg + registryArg, { cwd, stdio: 'inherit' });