import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const serverModule = context.asAbsolutePath(
    path.join('out', 'server', 'server.js')
  );

  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        execArgv: ['--nolazy', '--inspect=6009']
      }
    }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'toml' }],
    synchronize: {
      configurationSection: 'tomlExtension'
    },
    outputChannelName: 'TOML Language Server'
  };

  client = new LanguageClient(
    'tomlLanguageServer',
    'TOML Language Server',
    serverOptions,
    clientOptions
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tomlExtension.restartLanguageServer', async () => {
      await client?.restart();
    }),
    client
  );

  await client.start();
}

export async function deactivate(): Promise<void> {
  await client?.stop();
}
