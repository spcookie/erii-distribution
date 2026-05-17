const fs = require('fs');
const path = require('path');

const binaryName = process.platform === 'win32' ? 'erii-cli.exe' : 'erii-cli';
const src = path.join(__dirname, binaryName);
const dst = path.join(__dirname, '..', binaryName);

if (!fs.existsSync(src)) {
    console.warn(`[erii-cli] Binary not found: ${src}`);
    process.exit(0);
}

if (fs.existsSync(dst)) {
    fs.unlinkSync(dst);
}

if (process.platform === 'win32') {
    fs.copyFileSync(src, dst);
} else {
    fs.symlinkSync(src, dst);
}
