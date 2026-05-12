#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

function askProjectName() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Project name (erii): ', (answer) => {
      rl.close();
      resolve(answer.trim() || 'erii');
    });
  });
}

async function main() {
  const projectName = await askProjectName();
  const projectDir = path.join(process.cwd(), projectName);

  if (fs.existsSync(projectDir)) {
    console.error('Error: directory "' + projectName + '" already exists.');
    process.exit(1);
  }

  fs.mkdirSync(projectDir);
  console.log('Created directory ' + projectName);

  const pkgPath = path.join(projectDir, 'package.json');
  fs.writeFileSync(pkgPath, JSON.stringify({name: projectName, private: true}, null, 2) + '\n');
  console.log('Created package.json');

  let registryArg = '';
  const regIdx = process.argv.indexOf('--registry');
  if (regIdx !== -1 && process.argv[regIdx + 1]) {
    registryArg = ' --registry ' + process.argv[regIdx + 1];
  }

  const ownVersion = require('./package.json').version;
  const pkg = '@spcookie/erii@^' + ownVersion;
  console.log('Installing ' + pkg + '...');
  execSync('npm install ' + pkg + registryArg, {cwd: projectDir, stdio: 'inherit'});

  console.log('\nDone! Run the following to get started:\n');
  console.log('  cd ' + projectName);
  console.log('  npx erii');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
