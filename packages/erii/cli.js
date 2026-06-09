#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const spcookieFlat = path.resolve(__dirname, '..');
const spcookieNested = path.join(__dirname, 'node_modules', '@spcookie');
const isWindows = process.platform === 'win32';
const nestedExists = fs.existsSync(spcookieNested);

function findEriiDir() {
  for (const searchDir of [spcookieFlat, spcookieNested]) {
    const candidate = path.join(searchDir, 'erii');
    if (fs.existsSync(path.join(candidate, 'package.json'))) {
      return candidate;
    }
  }
  return null;
}

const eriiDir = findEriiDir();

function isLocalInstall() {
  if (!eriiDir) return false;
  let dir = process.cwd();
  while (true) {
    const expected = path.join(dir, 'node_modules', '@spcookie', 'erii');
    if (eriiDir === expected || eriiDir.startsWith(expected + path.sep)) {
      return true;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return false;
}

const localInstall = isLocalInstall();

// Global: converge into @spcookie/erii/; Local: use project root (parent of node_modules)
const projectRoot = localInstall
    ? (nestedExists ? __dirname : path.resolve(spcookieFlat, '..', '..'))
    : (eriiDir || (nestedExists ? __dirname : path.resolve(spcookieFlat, '..', '..')));

function findPkgDir(name) {
  const flat = path.join(spcookieFlat, name);
  if (fs.existsSync(flat)) return flat;
  const nested = path.join(spcookieNested, name);
  if (fs.existsSync(nested)) return nested;
  return null;
}

// ---- server command ----
if (process.argv[2] === 'server') {
  const pidFile = path.join(projectRoot, '.conf', 'erii.pid');
  const logDir = path.join(projectRoot, 'logs');

  function isProcessRunning(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  function readPidFile() {
    try {
      const pid = fs.readFileSync(pidFile, 'utf8').trim();
      return pid ? parseInt(pid, 10) : null;
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }

  function removePidFile() {
    try {
      fs.unlinkSync(pidFile);
    } catch {
    }
  }

  function killProcess(pid) {
    if (isWindows) {
      spawn('taskkill', ['/T', '/F', '/PID', String(pid)], {stdio: 'ignore'}).unref();
    } else {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
      }
    }
  }

  function stopServer(pid, callback) {
    killProcess(pid);
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      if (!isProcessRunning(pid) || attempts > 50) {
        clearInterval(timer);
        removePidFile();
        if (attempts > 50) {
          callback(new Error('timeout'));
        } else {
          callback(null);
        }
      }
    }, 100);
  }

    function daemonStart(javaBin, javaArgs, envVars) {
    fs.mkdirSync(path.dirname(pidFile), {recursive: true});
    fs.mkdirSync(logDir, {recursive: true});
    const logFile = path.join(logDir, 'server.log');
    const out = fs.openSync(logFile, 'a');
    const err = fs.openSync(logFile, 'a');

    const child = spawn(javaBin, javaArgs, {
      cwd: projectRoot,
      stdio: ['ignore', out, err],
      env: envVars,
      detached: true,
      windowsHide: true,
    });

    fs.writeFileSync(pidFile, String(child.pid));
    child.unref();
    console.log(`Server started in background. PID: ${child.pid}`);
    console.log(`Log: ${logFile}`);
    process.exit(0);
  }

    function daemonStartOrRestart(javaBin, javaArgs, envVars) {
        const existingPid = readPidFile();
        if (existingPid && isProcessRunning(existingPid)) {
            console.log(`Server is already running (PID: ${existingPid}). Restarting...`);
            stopServer(existingPid, function (err) {
                if (err) {
                    console.log('Failed to stop old server. You may need to kill it manually.');
                    process.exit(1);
                }
                console.log('Server stopped. Starting server...');
                daemonStart(javaBin, javaArgs, envVars);
            });
            return;
        }
        if (existingPid) {
            removePidFile();
        }
        daemonStart(javaBin, javaArgs, envVars);
    }

  // ---- stop subcommand ----
  if (process.argv[3] === 'stop') {
    const pid = readPidFile();
    if (!pid) {
      console.log('No PID file found. Server is not running in daemon mode.');
      process.exit(0);
    }
    if (!isProcessRunning(pid)) {
      console.log(`Process ${pid} is not running. Cleaning up PID file.`);
      removePidFile();
      process.exit(0);
    }

    console.log(`Stopping server (PID: ${pid})...`);
    stopServer(pid, function (err) {
      if (err) {
        console.log('Server did not stop gracefully. You may need to kill it manually.');
        process.exit(1);
      }
      console.log('Server stopped.');
      process.exit(0);
    });
    return;
  }

  // ---- status subcommand ----
  if (process.argv[3] === 'status') {
    const pid = readPidFile();
    if (!pid) {
      console.log('Server is not running (no PID file).');
      process.exit(0);
    }
    if (isProcessRunning(pid)) {
      console.log(`Server is running. PID: ${pid}`);
      process.exit(0);
    } else {
      console.log(`Server is not running (stale PID file: ${pid}).`);
      process.exit(1);
    }
    return;
  }

  // ---- logs subcommand ----
  if (process.argv[3] === 'logs') {
    const logFile = path.join(logDir, 'server.log');
    try {
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.split('\n');
      const all = process.argv.includes('--all') || process.argv.includes('-a');

      let tailCount = 100;
      const tailIdx = process.argv.indexOf('--tail');
      const tIdx = process.argv.indexOf('-t');
      const optIdx = tailIdx !== -1 ? tailIdx : tIdx;
      if (optIdx !== -1 && optIdx + 1 < process.argv.length) {
        const n = parseInt(process.argv[optIdx + 1], 10);
        if (!isNaN(n) && n > 0) tailCount = n;
      }

      const output = all ? lines : lines.slice(-tailCount);
      process.stdout.write(output.join('\n'));
      if (!all && lines.length > tailCount) {
        console.log(`\n... showing last ${tailCount} lines (${lines.length} total). Use --all to see full log.`);
      }
    } catch (e) {
      if (e.code === 'ENOENT') {
        console.log('No server log file found.');
      } else {
        throw e;
      }
    }
    return;
  }

  // ---- setup (common to foreground, daemon, and restart) ----

  const depsDir = findPkgDir('erii-deps');
  if (!depsDir) {
    console.error('erii-deps not found. Run "npm install" first.');
    process.exit(1);
  }

  function readOpts(filename) {
    const p = path.join(depsDir, 'opts', filename);
    try {
      return fs.readFileSync(p, 'utf8')
          .split('\n')
          .map(l => l.trim())
          .filter(l => l && !l.startsWith('#'));
    } catch (e) {
      if (e.code === 'ENOENT') return [];
      throw e;
    }
  }

  const javaOpts = readOpts('java.opts');
  const eriiCoreOpts = readOpts('erii-core.opts');

  // Load .env.local into environment variables
  const envLocal = path.join(projectRoot, 'conf', '.env.local');
  const env = {...process.env};
  try {
    const lines = fs.readFileSync(envLocal, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2];
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  // Load erii-deps env.opts — system defaults, always take precedence
  const envOpts = path.join(depsDir, 'opts', 'env.opts');
  try {
    const lines = fs.readFileSync(envOpts, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.trim().match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2];
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  const libDir = path.join(projectRoot, 'lib');
  const cp = [
      path.join(libDir, 'browser', 'base', '*'),
      path.join(libDir, 'browser', 'driver', '*'),
    path.join(libDir, 'core', '*'),
    path.join(libDir, 'deps', '*'),
  ].join(path.delimiter);

  // Find Java: runtime JDK > JAVA_HOME > PATH
  let java = 'java';
  const runtimeJava = path.join(projectRoot, 'runtime', 'bin', isWindows ? 'java.exe' : 'java');
  if (fs.existsSync(runtimeJava)) {
    java = runtimeJava;
  } else if (process.env.JAVA_HOME) {
    java = path.join(process.env.JAVA_HOME, 'bin', isWindows ? 'java.exe' : 'java');
  }

  // Separate user -D system properties from program args
  const userArgs = process.argv.slice(3);
  const userSystemProps = [];
  const userProgramArgs = [];
    let foregroundMode = false;
  for (const arg of userArgs) {
      if (arg === '--foreground' || arg === '-f') {
          foregroundMode = true;
    } else if (arg.startsWith('-D')) {
      userSystemProps.push(arg);
    } else {
      userProgramArgs.push(arg);
    }
  }

  // Filter eriiCoreOpts to remove keys overridden by user
  const userPropKeys = new Set(userSystemProps.map(arg => arg.split('=')[0]));
  const filteredCoreOpts = eriiCoreOpts.filter(arg => {
    if (!arg.startsWith('-D')) return true;
    return !userPropKeys.has(arg.split('=')[0]);
  });

  const args = [
    ...javaOpts,
    ...userSystemProps,
    ...filteredCoreOpts,
    '-cp', cp,
    'io.ktor.server.netty.EngineMain',
    ...userProgramArgs,
  ];

  // Windows: switch console to UTF-8 (code page 65001) before starting Java
  if (isWindows) {
    const {execSync} = require('child_process');
    try {
      execSync('chcp 65001', {stdio: 'ignore'});
    } catch {
    }
  }

  // ---- restart subcommand (after setup so java/args/env are available) ----
  if (process.argv[3] === 'restart') {
      daemonStartOrRestart(java, args, env);
    return;
  }

    if (foregroundMode) {
    const child = spawn(java, args, {cwd: projectRoot, stdio: 'inherit', env});
    forwardSignals(child);
    child.on('exit', (code) => process.exit(code || 0));
    } else {
        daemonStartOrRestart(java, args, env);
  }
  return;
}

// ---- proxy to CLI binary (all other commands) ----

const binaryName = isWindows ? 'erii-cli.exe' : 'erii-cli';

function findBinary() {
  for (const searchDir of [spcookieFlat, spcookieNested]) {
    const candidate = path.join(searchDir, binaryName);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const binary = findBinary();

if (!binary) {
  console.error('No CLI binary found. Run "npm install" first.');
  process.exit(1);
}

const cliArgs = process.argv.slice(2);

// Global mode: switch cwd to @spcookie/erii so resolveDir finds everything
// Local mode: keep user's cwd so resolveDir finds project-root .conf/conf/plugins
const spawnOpts = {stdio: 'inherit'};
if (eriiDir && !localInstall) {
  spawnOpts.cwd = eriiDir;
}

const child = spawn(binary, cliArgs, spawnOpts);
forwardSignals(child);
child.on('exit', (code) => process.exit(code || 0));

function forwardSignals(child) {
  const signals = isWindows
      ? ['SIGINT', 'SIGBREAK']
      : ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGUSR1', 'SIGUSR2'];
  for (const sig of signals) {
    process.on(sig, () => {
      try {
        child.kill(isWindows ? 'SIGTERM' : sig);
      } catch {
      }
    });
  }
}