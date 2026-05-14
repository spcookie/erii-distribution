const fs = require('fs');
const path = require('path');

// Detect install layout
const spcookieFlat = path.resolve(__dirname, '..');
const spcookieNested = path.join(__dirname, 'node_modules', '@spcookie');
const nestedExists = fs.existsSync(spcookieNested);

function main() {
  console.log('Setting up Erii project...');

  if (!fs.existsSync(spcookieFlat) && !nestedExists) {
    console.log('  Not installed as a dependency, nothing to set up.');
    return;
  }

  const runCmd = nestedExists ? 'erii' : 'npx erii';
  console.log('');
  console.log(`Erii is ready! Run \`${runCmd} setup\` to initialize, or \`${runCmd} config\` to configure.`);
}

main();
