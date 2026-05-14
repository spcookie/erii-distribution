# @spcookie/create-erii-plugin

Scaffold a new Erii plugin distribution package.

```bash
npm create @spcookie/erii-plugin
```

This will generate:

- `package.json` — with `postinstall` script and `files` configured
- `postinstall.js` — extracts the plugin zip and symlinks it to `plugins/`
- `README.md` — placeholder documentation

Place your plugin `.zip` into the generated directory, then publish with `npm publish`.
