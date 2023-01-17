import {
  CompletionItemKind,
  Connection,
  CompletionItem,
} from 'vscode-languageserver/node';

export default class MongoDBService {
  _connection: Connection;

  constructor(connection: Connection) {
    this._connection = connection;
  }

  async doComplete(): Promise<CompletionItem[]> {
    return [{
      label: 'mongodbMethod',
      kind: CompletionItemKind.Method
    }];
  }
}
