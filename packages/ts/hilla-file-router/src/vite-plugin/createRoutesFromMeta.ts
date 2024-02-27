import { sep, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { template, transform as transformer } from '@vaadin/hilla-generator-utils/ast.js';
import createSourceFile from '@vaadin/hilla-generator-utils/createSourceFile.js';
import ts, {
  type CallExpression,
  type ImportDeclaration,
  type StringLiteral,
  type VariableStatement,
} from 'typescript';
import { transformRoute } from '../runtime/utils.js';
import type { RouteMeta } from './collectRoutesFromFS.js';
import type { RuntimeFileUrls } from './generateRuntimeFiles.js';
import { convertFSRouteSegmentToURLPatternFormat } from './utils.js';

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

/**
 * Convert a file URL to a relative path from the generated directory.
 *
 * @param url - The file URL to convert.
 * @param generatedDir - The directory where the generated view file will be stored.
 */
function relativize(url: URL, generatedDir: URL): string {
  const result = relative(fileURLToPath(generatedDir), fileURLToPath(url)).replaceAll(sep, '/');

  if (!result.startsWith('.')) {
    return `./${result}`;
  }

  return result;
}

/**
 * Create an import declaration for a `views` module.
 *
 * @param mod - The name of the route module to import.
 * @param file - The file path of the module.
 */
function createImport(mod: string, file: string): ImportDeclaration {
  const path = `${file.substring(0, file.lastIndexOf('.'))}.js`;
  return template(`import * as ${mod} from '${path}';\n`, ([statement]) => statement as ts.ImportDeclaration);
}

/**
 * Create an abstract route creation function call. The nested function calls create a route tree.
 *
 * @param path - The path of the route.
 * @param mod - The name of the route module imported as a namespace.
 * @param children - The list of child route call expressions.
 */
function createRouteData(path: string, mod: string | undefined, children: readonly CallExpression[]): CallExpression {
  return template(
    `const route = createRoute("${path}"${mod ? `, ${mod}` : ''}${children.length > 0 ? `, CHILDREN` : ''})`,
    ([statement]) => (statement as VariableStatement).declarationList.declarations[0].initializer as CallExpression,
    [
      transformer((node) =>
        ts.isIdentifier(node) && node.text === 'CHILDREN' ? ts.factory.createArrayLiteralExpression(children) : node,
      ),
    ],
  );
}

/**
 * Loads all the files from the received metadata and creates a framework-agnostic route tree.
 *
 * @param views - The abstract route tree.
 * @param generatedDir - The directory where the generated view file will be stored.
 */
export default function createRoutesFromMeta(views: RouteMeta, { code: codeFile }: RuntimeFileUrls): string {
  const codeDir = new URL('./', codeFile);
  const imports: ImportDeclaration[] = [
    template(
      'import { createRoute } from "@vaadin/hilla-file-router/runtime.js";',
      ([statement]) => statement as ts.ImportDeclaration,
    ),
  ];
  let id = 0;

  const routes = transformRoute<RouteMeta, CallExpression>(
    views,
    (view) => view.children.values(),
    ({ file, layout, path }, children) => {
      const currentId = id;
      id += 1;

      let mod: string | undefined;
      if (file) {
        mod = `Page${currentId}`;
        imports.push(createImport(mod, relativize(file, codeDir)));
      } else if (layout) {
        mod = `Layout${currentId}`;
        imports.push(createImport(mod, relativize(layout, codeDir)));
      }

      return createRouteData(convertFSRouteSegmentToURLPatternFormat(path), mod, children);
    },
  );

  const routeDeclaration = template(
    `import a from 'IMPORTS';

const routes = ROUTE;

export default routes;
`,
    [
      transformer((node) =>
        ts.isImportDeclaration(node) && (node.moduleSpecifier as StringLiteral).text === 'IMPORTS' ? imports : node,
      ),
      transformer((node) => (ts.isIdentifier(node) && node.text === 'ROUTE' ? routes : node)),
    ],
  );

  const file = createSourceFile(routeDeclaration, 'views.ts');

  return printer.printFile(file);
}
