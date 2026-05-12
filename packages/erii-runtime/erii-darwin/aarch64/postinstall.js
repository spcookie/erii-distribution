const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const tarFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.tar.gz'));

if (tarFiles.length === 0) {
  process.exit(0);
}

const tarFile = path.join(__dirname, tarFiles[0]);
const jdkDirs = fs.readdirSync(__dirname).filter(f => f.startsWith('jdk-'));

if (jdkDirs.length > 0) {
  console.log('JDK already extracted, skipping.');
  process.exit(0);
}

console.log(`Extracting ${tarFiles[0]}...`);
try {
  execSync(`tar --force-local -xzf "${tarFile}"`, { cwd: __dirname, stdio: 'pipe' });
} catch {
  execSync(`tar -xzf "${tarFile}"`, { cwd: __dirname });
}
fs.unlinkSync(tarFile);
console.log('Done.');
