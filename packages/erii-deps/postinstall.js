const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const libDir = path.join(__dirname, 'lib');
const tarFile = path.join(libDir, 'deps.tar.gz');

function main() {
  if (!fs.existsSync(tarFile)) {
    return;
  }

  const files = fs.readdirSync(libDir);
  const jarFiles = files.filter(f => f.endsWith('.jar'));

  if (jarFiles.length > 0) {
    console.log('JAR files already extracted, skipping.');
    return;
  }

  console.log('Extracting deps.tar.gz...');
  try {
    execSync(`tar --force-local -xzf "${tarFile}"`, { cwd: libDir, stdio: 'pipe' });
  } catch {
    execSync(`tar -xzf "${tarFile}"`, { cwd: libDir });
  }
  fs.unlinkSync(tarFile);
  console.log('Done.');
}

main();
