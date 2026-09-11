# TOML Extension

VS Code extension scaffold for TOML language support. The extension is split into:

- `client/`: VS Code extension and Language Client, written in TypeScript.
- `server/`: Language Server Protocol implementation, written in TypeScript.

The client starts the server over IPC when a `.toml` file is opened. TOML parsing, diagnostics, syntax highlighting, and semantic completion are intentionally left for the next implementation step.

## Development

```sh
npm install
npm run compile
```

Open this directory in VS Code and press `F5` to launch an Extension Development Host. Open a `.toml` file in the development host to activate the extension.

The Language Server can be debugged with the `Attach to TOML Language Server` launch configuration on port `6009`.

## Packaging

```sh
npm run package
```

This creates a `.vsix` package that can be installed in VS Code.

In VS Code, use `Extensions: Install from VSIX...` to install the generated package.
