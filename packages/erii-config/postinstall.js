const fs = require('fs');
const path = require('path');

// Detect install layout (mirrors erii/postinstall.js logic)
const spcookieFlat = path.resolve(__dirname, '..');
const spcookieNested = path.join(__dirname, 'node_modules', '@spcookie');
const nestedExists = fs.existsSync(spcookieNested);
const linkRoot = nestedExists ? __dirname : path.resolve(spcookieFlat, '..', '..');

// ---- config file merge (existing keys kept, new keys added) ----

function deepMerge(existing, incoming) {
    if (typeof existing !== 'object' || existing === null || Array.isArray(existing)) {
        return existing;
    }
    if (typeof incoming !== 'object' || incoming === null || Array.isArray(incoming)) {
        return existing;
    }
    const result = {...existing};
    for (const key of Object.keys(incoming)) {
        if (!(key in result)) {
            result[key] = incoming[key];
        } else if (
            typeof result[key] === 'object' && !Array.isArray(result[key]) && result[key] !== null &&
            typeof incoming[key] === 'object' && !Array.isArray(incoming[key]) && incoming[key] !== null
        ) {
            result[key] = deepMerge(result[key], incoming[key]);
        }
    }
    return result;
}

function mergeJson(srcPath, dstPath) {
    const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
    const dst = JSON.parse(fs.readFileSync(dstPath, 'utf8'));
    const merged = deepMerge(dst, src);
    fs.writeFileSync(dstPath, JSON.stringify(merged, null, 2) + '\n');
}

function mergeEnv(srcPath, dstPath) {
    const srcContent = fs.readFileSync(srcPath, 'utf8');
    const dstContent = fs.readFileSync(dstPath, 'utf8');

    const dstKeys = new Set();
    for (const line of dstContent.split('\n')) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
        if (m) dstKeys.add(m[1]);
    }

    const srcLines = srcContent.split('\n');
    const toAdd = [];
    for (const line of srcLines) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
        if (m && !dstKeys.has(m[1])) {
            toAdd.push(line);
        }
    }

    if (toAdd.length > 0) {
        fs.appendFileSync(dstPath, '\n' + toAdd.join('\n') + '\n');
    }
}

function getTopLevelKeys(content) {
    const keys = new Set();
    let depth = 0;
    let buf = '';
    let inComment = false;

    for (let i = 0; i < content.length; i++) {
        const ch = content[i];

        if (inComment) {
            if (ch === '\n') inComment = false;
            continue;
        }
        if (ch === '#') {
            inComment = true;
            continue;
        }
        if (ch === '{') {
            if (depth === 0 && buf.trim()) {
                keys.add(buf.trim());
            }
            depth++;
            buf = '';
        } else if (ch === '}') {
            depth--;
            buf = '';
        } else if (ch === '=' && depth === 0) {
            if (buf.trim()) keys.add(buf.trim());
            buf = '';
        } else if (ch === '\n') {
            buf = '';
        } else if (depth === 0) {
            buf += ch;
        }
    }
    return keys;
}

function mergeConf(srcPath, dstPath) {
    const srcContent = fs.readFileSync(srcPath, 'utf8');
    const dstContent = fs.readFileSync(dstPath, 'utf8');

    const dstKeys = getTopLevelKeys(dstContent);
    const srcKeys = getTopLevelKeys(srcContent);

    const newKeys = [...srcKeys].filter(k => !dstKeys.has(k));
    if (newKeys.length === 0) return;

    let toAppend = '\n';
    const srcBlocks = extractTopLevelBlocks(srcContent);
    for (const {key, block} of srcBlocks) {
        if (newKeys.includes(key)) {
            toAppend += block + '\n\n';
        }
    }
    fs.appendFileSync(dstPath, toAppend);
}

function extractTopLevelBlocks(content) {
    const blocks = [];
    let depth = 0;
    let buf = '';
    let currentKey = '';
    let inBlock = false;
    let inComment = false;

    for (let i = 0; i < content.length; i++) {
        const ch = content[i];

        if (inComment) {
            buf += ch;
            if (ch === '\n') inComment = false;
            continue;
        }
        if (ch === '#') {
            buf += ch;
            inComment = true;
            continue;
        }

        buf += ch;

        if (ch === '{') {
            if (depth === 0) {
                inBlock = true;
                const before = buf.slice(0, -1);
                const lastNewline = before.lastIndexOf('\n');
                currentKey = before.slice(lastNewline + 1).trim();
            }
            depth++;
        } else if (ch === '}') {
            depth--;
            if (depth === 0 && inBlock) {
                blocks.push({key: currentKey, block: buf.trimEnd()});
                buf = '';
                currentKey = '';
                inBlock = false;
            }
        } else if (ch === '\n' && depth === 0 && !inBlock) {
            const trimmed = buf.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx !== -1) {
                    blocks.push({key: trimmed.slice(0, eqIdx).trim(), block: trimmed});
                }
            }
            buf = '';
        }
    }
    const trimmed = buf.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const eqIdx = trimmed.indexOf('=');
        blocks.push({key: trimmed.slice(0, eqIdx).trim(), block: trimmed});
    }
    return blocks;
}

function mergeFile(srcPath, dstPath) {
    const ext = path.extname(dstPath);
    const basename = path.basename(dstPath);
    if (ext === '.json') {
        mergeJson(srcPath, dstPath);
    } else if (ext === '.conf') {
        mergeConf(srcPath, dstPath);
    } else if (basename.startsWith('.env')) {
        mergeEnv(srcPath, dstPath);
    }
}

function mergeDir(srcDir, dstDir) {
    fs.mkdirSync(dstDir, {recursive: true});
    const entries = fs.readdirSync(srcDir, {withFileTypes: true});
    let added = 0;

    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const dstPath = path.join(dstDir, entry.name);

        if (entry.isDirectory()) {
            added += mergeDir(srcPath, dstPath);
        } else if (fs.existsSync(dstPath)) {
            mergeFile(srcPath, dstPath);
        } else {
            fs.copyFileSync(srcPath, dstPath);
            added++;
        }
    }
    return added;
}

// ---- main ----

function main() {
    console.log('Setting up Erii config...');

    const results = [];

    const confSrc = path.join(__dirname, '.conf');
    if (fs.existsSync(confSrc)) {
        const confDst = path.join(linkRoot, '.conf');
        const n = mergeDir(confSrc, confDst);
        results.push({name: '.conf', status: n > 0 ? 'created' : 'merged'});
    } else {
        results.push({name: '.conf', status: 'failed', reason: 'target not found: ' + confSrc});
    }

    const appConfSrc = path.join(__dirname, 'conf');
    if (fs.existsSync(appConfSrc)) {
        const appConfDst = path.join(linkRoot, 'conf');
        const n = mergeDir(appConfSrc, appConfDst);
        results.push({name: 'conf', status: n > 0 ? 'created' : 'merged'});
    } else {
        results.push({name: 'conf', status: 'failed', reason: 'target not found: ' + appConfSrc});
    }

    for (const r of results) {
        const icon = r.status === 'failed' ? '✗' : r.status === 'merged' ? '●' : '✓';
        const detail = r.reason ? ` (${r.reason})` : '';
        console.log(`  ${icon} ${r.name}${detail}`);
    }
}

main();
