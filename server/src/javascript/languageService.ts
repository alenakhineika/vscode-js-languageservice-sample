import {
  CompletionItemKind,
  Connection,
  CompletionItem,
} from 'vscode-languageserver/node';
import * as ts from 'typescript';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { readFileSync } from 'fs';
import { join, basename, dirname } from 'path';

type JavascriptServiceHost = {
  getLanguageService(jsDocument: TextDocument): ts.LanguageService;
  getCompilationSettings(): ts.CompilerOptions;
  dispose(): void;
};

const enum Kind {
  alias = 'alias',
  callSignature = 'call',
  class = 'class',
  const = 'const',
  constructorImplementation = 'constructor',
  constructSignature = 'construct',
  directory = 'directory',
  enum = 'enum',
  enumMember = 'enum member',
  externalModuleName = 'external module name',
  function = 'function',
  indexSignature = 'index',
  interface = 'interface',
  keyword = 'keyword',
  let = 'let',
  localFunction = 'local function',
  localVariable = 'local var',
  method = 'method',
  memberGetAccessor = 'getter',
  memberSetAccessor = 'setter',
  memberVariable = 'property',
  module = 'module',
  primitiveType = 'primitive type',
  script = 'script',
  type = 'type',
  variable = 'var',
  warning = 'warning',
  string = 'string',
  parameter = 'parameter',
  typeParameter = 'type parameter'
}

// eslint-disable-next-line complexity
const convertKind = (kind: string): CompletionItemKind => {
  switch (kind) {
    case Kind.primitiveType:
    case Kind.keyword:
      return CompletionItemKind.Keyword;

    case Kind.const:
    case Kind.let:
    case Kind.variable:
    case Kind.localVariable:
    case Kind.alias:
    case Kind.parameter:
      return CompletionItemKind.Variable;

    case Kind.memberVariable:
    case Kind.memberGetAccessor:
    case Kind.memberSetAccessor:
      return CompletionItemKind.Field;

    case Kind.function:
    case Kind.localFunction:
      return CompletionItemKind.Function;

    case Kind.method:
    case Kind.constructSignature:
    case Kind.callSignature:
    case Kind.indexSignature:
      return CompletionItemKind.Method;

    case Kind.enum:
      return CompletionItemKind.Enum;

    case Kind.enumMember:
      return CompletionItemKind.EnumMember;

    case Kind.module:
    case Kind.externalModuleName:
      return CompletionItemKind.Module;

    case Kind.class:
    case Kind.type:
      return CompletionItemKind.Class;

    case Kind.interface:
      return CompletionItemKind.Interface;

    case Kind.warning:
      return CompletionItemKind.Text;

    case Kind.script:
      return CompletionItemKind.File;

    case Kind.directory:
      return CompletionItemKind.Folder;

    case Kind.string:
      return CompletionItemKind.Constant;

    default:
      return CompletionItemKind.Property;
  }
};

const serverPath = basename(__dirname) === 'dist' ? dirname(__dirname) : dirname(dirname(__dirname));
const librarPath = join(serverPath, '../node_modules/typescript/lib');
const contents: { [name: string]: string } = {};

export default class JavascriptService {
  _connection: Connection;
  _host: JavascriptServiceHost;

  constructor(connection: Connection) {
    this._host = this._getJavascriptServiceHost();
    this._connection = connection;
  }

  _loadLibrary(name: string) {
    let content = contents[name];
    if (typeof content !== 'string' && librarPath) {
      const libPath = join(librarPath, name); // From source.
      try {
        content = readFileSync(libPath).toString();
      } catch (e) {
        this._connection.console.error(
          `Unable to load library ${name} at ${libPath}`
        );
        content = '';
      }
      contents[name] = content;
    }
    return content;
  }

  _getJavascriptServiceHost() {
    const compilerOptions = {
      allowNonTsExtensions: true,
      allowJs: true,
      lib: ['lib.es2020.full.d.ts'],
      target: ts.ScriptTarget.Latest,
      moduleResolution: ts.ModuleResolutionKind.Classic,
      experimentalDecorators: false
    };
    let currentTextDocument = TextDocument.create('init', 'javascript', 1, '');

    const host: ts.LanguageServiceHost = {
      getCompilationSettings: () => compilerOptions,
      getScriptFileNames: () => [currentTextDocument.uri],
      getScriptKind: () => {
        return ts.ScriptKind.JS;
      },
      getScriptVersion: (fileName: string) => {
        if (fileName === currentTextDocument.uri) {
          return String(currentTextDocument.version);
        }
        return '1';
      },
      getScriptSnapshot: (fileName: string) => {
        let text = '';
        if (fileName === currentTextDocument.uri) {
          text = currentTextDocument.getText();
        } else {
          text = this._loadLibrary(fileName);
        }
        return {
          getText: (start, end) => text.substring(start, end),
          getLength: () => text.length,
          getChangeRange: () => undefined
        };
      },
      getCurrentDirectory: () => '',
      getDefaultLibFileName: () => 'es2020.full',
      readFile: (path: string): string | undefined => {
        if (path === currentTextDocument.uri) {
          return currentTextDocument.getText();
        }
        return this._loadLibrary(path);
      },
      fileExists: (path: string): boolean => {
        if (path === currentTextDocument.uri) {
          return true;
        }
        return !!this._loadLibrary(path);
      },
      directoryExists: (path: string): boolean => {
        // Typescript tries to first find libraries in node_modules/@types and node_modules/@typescript.
        if (path.startsWith('node_modules')) {
          return false;
        }
        return true;
      }
    };

    const jsLanguageService = ts.createLanguageService(host);

    return {
      getLanguageService(jsDocument: TextDocument): ts.LanguageService {
        currentTextDocument = jsDocument;
        return jsLanguageService;
      },
      getCompilationSettings() {
        return compilerOptions;
      },
      dispose() {
        jsLanguageService.dispose();
      }
    };
  }

  async doComplete(
    document: TextDocument,
    position: { line: number; character: number },
  ): Promise<CompletionItem[]> {
    const jsDocument = TextDocument.create(document.uri, 'javascript', document.version, document.getText());
    const jsLanguageService = await this._host.getLanguageService(jsDocument);
    const offset = jsDocument.offsetAt(position);
    const jsCompletion = jsLanguageService.getCompletionsAtPosition(
      jsDocument.uri,
      offset,
      { includeExternalModuleExports: false, includeInsertTextCompletions: false }
    );

    return jsCompletion?.entries.map((entry) => {
      // Data used for resolving item details (see 'doResolve').
      const data = {
        languageId: 'mongodb',
        uri: document.uri,
        offset: offset
      };
      return {
        uri: document.uri,
        position: position,
        label: entry.name,
        sortText: entry.sortText,
        kind: convertKind(entry.kind),
        data
      };
    }) || [];
  }
}
