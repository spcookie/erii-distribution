# Erii Distribution

npm monorepo for distributing [ERII](https://github.com/spcookie/erii) — a Kotlin/JVM-based AI agent framework.

## Quick Start

```bash
npm create @spcookie/erii
cd erii
npx erii setup
npx erii server
```

## Packages

| Package                        | Description                                                           |
|--------------------------------|-----------------------------------------------------------------------|
| `@spcookie/create-erii`        | Project scaffolding — `npm create @spcookie/erii`                     |
| `@spcookie/create-erii-plugin` | Plugin scaffolding — `npm create @spcookie/erii-plugin`               |
| `@spcookie/erii`               | Main distribution — `erii` CLI entry point and `erii server` launcher |
| `@spcookie/erii-core`          | Core application JARs                                                 |
| `@spcookie/erii-browser`       | Browser automation driver JARs                                        |
| `@spcookie/erii-deps`          | Third-party dependency JARs                                           |
| `@spcookie/erii-config`        | Default configuration files (`.conf`, `conf`)                         |
| `@spcookie/erii-cli-*`         | Platform-specific CLI binaries                                        |
| `@spcookie/erii-runtime-*`     | Platform-specific JDK runtime                                         |
| `@spcookie/erii-plugin-*`      | Plugin packages (installed separately)                                |

### Plugins

Each plugin is a standalone npm package under `@spcookie/erii-plugin-*`. Installed plugins are symlinked into `plugins/`
at postinstall — they are extracted from `.zip` and linked as directories.

To create a new plugin package:

```bash
npm create @spcookie/erii-plugin
```

## How It Works

On `npm install`, each package's `postinstall` script handles its own setup:

- **erii-config** merges `.conf` and `conf` directories into the project root — existing user keys are preserved, only
  new keys are added.
- **erii-core / erii-browser / erii-deps** symlink their `lib/` directory into `lib/core`, `lib/browser`, `lib/deps`.
- **erii-runtime-*** extracts the JDK archive and symlinks the JDK directory to `runtime/`.
- **erii-plugin-*** extracts the plugin `.zip` and symlinks the plugin directory to `plugins/`.

The `erii server` command (in `cli.js`) starts Java with:

- JVM options from `erii-deps/opts/java.opts`
- System properties from `erii-deps/opts/erii-core.opts`
- Environment defaults from `erii-deps/opts/env.opts` (always override `.env.local`)
- Wildcard classpath: `lib/browser/*;lib/core/*;lib/deps/*`
- Priority: bundled JDK → `JAVA_HOME` → `PATH`

## Requirements

- Node.js >= 18
- Java 17+ (bundled JDK provided via `erii-runtime-*`, or set `JAVA_HOME`)

## License

MIT
