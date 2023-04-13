import { readFileSync } from 'fs';
import { join, basename, dirname } from 'path';

// Server path.
const serverPath =
  basename(__dirname) === 'dist'
    ? dirname(__dirname)
    : dirname(dirname(__dirname));

// TypeScript library path.
const typescriptLibrarPath = join(serverPath, 'node_modules/typescript/lib');

export const GLOBAL_CONFIG_LIBRARY_NAME = 'global.d.ts';
export const TYPESCRIPT_CONFIG_LIBRARY_NAME = 'lib.es2022.full.d.ts';

const contents: { [name: string]: string } = Object.create(null);

/**
 * Load files related to the language features.
 */
export const loadLibrary = ({
  libraryName,
  extensionPath,
}: {
  libraryName: string;
  extensionPath?: string;
}) => {
  if (!extensionPath) {
    console.error(
      `Unable to load library ${libraryName}: extensionPath is undefined`
    );
    return '';
  }

  let libraryPath;

  if (libraryName === GLOBAL_CONFIG_LIBRARY_NAME) {
    libraryPath = join(extensionPath, libraryName);
  } else {
    libraryPath = join(typescriptLibrarPath, libraryName);
  }

  let content = contents[libraryName];

  if (typeof content !== 'string' && libraryPath) {
    try {
      content = readFileSync(libraryPath, 'utf8');
    } catch (e) {
      console.error(`Unable to load library ${libraryName} at ${libraryPath}`);
      content = '';
    }

    contents[libraryName] = content;
  }

  return content;
};
