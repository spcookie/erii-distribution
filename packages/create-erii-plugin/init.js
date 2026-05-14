#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');

function ask(question, defaultValue) {
    const rl = readline.createInterface({input: process.stdin, output: process.stdout});
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim() || defaultValue);
        });
    });
}

const POSTINSTALL_TEMPLATE = fs.readFileSync(path.join(__dirname, 'postinstall.template.js'), 'utf8');

async function main() {
    const pluginName = await ask('Plugin name (without erii-plugin- prefix): ', 'my-plugin');
    const version = await ask('Version (1.0.0): ', '1.0.0');

    const dirName = 'erii-plugin-' + pluginName;
    const pkgName = '@spcookie/' + dirName;
    const outDir = path.join(process.cwd(), dirName);

    if (fs.existsSync(outDir)) {
        console.error('Error: directory "' + dirName + '" already exists.');
        process.exit(1);
    }

    fs.mkdirSync(outDir, {recursive: true});
    console.log('Created directory ' + dirName);

    const pkgJson = {
        name: pkgName,
        version: version,
        description: 'Erii ' + pluginName + ' plugin',
        scripts: {
            postinstall: 'node postinstall.js',
        },
        files: ['*.zip', 'postinstall.js'],
        keywords: [],
        author: '',
        license: 'ISC',
    };

    fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify(pkgJson, null, 2) + '\n');
    console.log('Created package.json');

    fs.writeFileSync(path.join(outDir, 'postinstall.js'), POSTINSTALL_TEMPLATE);
    console.log('Created postinstall.js');

    const readme = '# ' + pkgName + '\n\nErii plugin: ' + pluginName + '.\n\nPlace the plugin `.zip` in this directory before publishing.\n';
    fs.writeFileSync(path.join(outDir, 'README.md'), readme);
    console.log('Created README.md');

    console.log('\nDone! Next steps:\n');
    console.log('  1. Place your plugin .zip into ' + dirName + '/');
    console.log('  2. cd ' + dirName);
    console.log('  3. npm publish');
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
