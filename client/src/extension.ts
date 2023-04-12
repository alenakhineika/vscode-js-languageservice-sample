import * as path from 'path';
import { ExtensionContext } from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // The server path.
  const serverModule = context.asAbsolutePath(
    path.join('server', 'out', 'server.js')
  );
  // If the extension is launched in debug mode then the debug server options are used.
  // Otherwise the run options are used.
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
  };

  // Options to control the language client.
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'untitled', language: 'mongodb' },
      { scheme: 'file', language: 'mongodb' },
    ],
  };

  // Create the language client.
  client = new LanguageClient(
    'vscodeJavascriptLanguageservice',
    'VSCode Javascript Languageservice',
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server.
  client.start();

  // Send the extension path to the server.
  void client.sendRequest('SET_EXTENSION_PATH', context.extensionPath);
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
