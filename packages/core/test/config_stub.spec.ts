import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as tempura from 'tempura';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * Regression coverage for the bug fixed alongside this test: the published
 * `config/context.ts` stub shipped as a 0-byte file (see 20ee5d0, which
 * emptied it while working around backticks that broke the tempura stub
 * renderer). `node ace configure @adonis-agora/context` would happily publish
 * that empty file, and `ContextProvider` reads it with
 * `app.config.get('context', {})` — so a consumer got a silent fallback to
 * defaults, with no error and no warning. See DESIGN notes / CHANGELOG for
 * 0.3.2 for the full story.
 *
 * This suite exercises the exact rendering path `@adonisjs/application`'s
 * `Stub` class uses (`tempura.compile(stubContents, { props })(data).trim()`,
 * plus its `<!--EXPORT_START-->`/`<!--EXPORT_END-->` marker convention) so a
 * future edit that reintroduces a stray backtick or `${` in the stub body — or
 * empties the file again — fails loudly here instead of silently in a
 * consumer's app.
 */

const stubPath = resolve(dirname(fileURLToPath(import.meta.url)), '../stubs/config/context.stub');

/** Mirrors `@adonisjs/application`'s `parseStubExports` just enough to test the marker contract. */
function parseStubExports(contents: string) {
  const chunks = contents.split(/\r\n|\n/);
  const body: string[] = [];
  const exportedBlocks: string[] = [];
  for (const line of chunks) {
    if (line.includes('<!--EXPORT_START-->')) {
      const [initial, rest] = line.split('<!--EXPORT_START-->');
      const [exportsBlock, remaining] = rest.split('<!--EXPORT_END-->');
      exportedBlocks.push(exportsBlock);
      const trimmedInitial = initial.trim();
      const trimmedRemaining = remaining.trim();
      const remainingContents =
        trimmedInitial && trimmedRemaining
          ? `${trimmedInitial}\n${trimmedRemaining}`
          : trimmedInitial || trimmedRemaining || '';
      if (remainingContents) body.push(remainingContents);
    } else {
      body.push(line);
    }
  }
  return {
    attributes: exportedBlocks.reduce<Record<string, unknown>>((result, block) => {
      Object.assign(result, JSON.parse(block));
      return result;
    }, {}),
    body: body.join('\n'),
  };
}

/** Renders the stub exactly the way `@adonisjs/application`'s `Stub#renderStub` does. */
function renderStub(rawStub: string, data: Record<string, unknown>): string {
  return tempura
    .compile(rawStub, { props: Object.keys(data) })(data)
    .trim();
}

describe('config/context.stub', () => {
  const raw = readFileSync(stubPath, 'utf-8');

  it('is not an empty file', () => {
    // The exact regression: this stub shipped at 0 bytes in 0.3.2, so
    // `node ace configure` published an empty config/context.ts.
    expect(raw.length).toBeGreaterThan(0);
  });

  it('renders through tempura without throwing (no stray backtick / ${ breaks the template)', () => {
    const fakeApp = {
      configPath: (...segments: string[]) => join('/fake/app', 'config', ...segments),
    };
    const exportsFn = (value: unknown) =>
      `<!--EXPORT_START-->${JSON.stringify(value)}<!--EXPORT_END-->`;

    expect(() => renderStub(raw, { app: fakeApp, exports: exportsFn })).not.toThrow();
  });

  it('publishes to config/context.ts and produces a non-empty, useful body', () => {
    const fakeApp = {
      configPath: (...segments: string[]) => join('/fake/app', 'config', ...segments),
    };
    const exportsFn = (value: unknown) =>
      `<!--EXPORT_START-->${JSON.stringify(value)}<!--EXPORT_END-->`;

    const rendered = renderStub(raw, { app: fakeApp, exports: exportsFn });
    const { attributes, body } = parseStubExports(rendered);

    expect(attributes.to).toBe(join('/fake/app', 'config', 'context.ts'));
    expect(body.length).toBeGreaterThan(0);
    expect(body).toContain("import { defineConfig } from '@adonis-agora/context'");
    expect(body).toContain('export default defineConfig({');

    // The bug that actually bit a consumer: a custom ContextStore field must be
    // listed in `carrier` explicitly, or it silently never crosses a process
    // boundary. The published config must make that discoverable.
    expect(body).toMatch(/carrier:\s*\[['"]traceId['"],\s*['"]tenantId['"],\s*['"]userRef['"]\]/);
    expect(body.toLowerCase()).toContain('process boundary');
  });

  it('produces syntactically valid TypeScript', () => {
    const fakeApp = {
      configPath: (...segments: string[]) => join('/fake/app', 'config', ...segments),
    };
    const exportsFn = (value: unknown) =>
      `<!--EXPORT_START-->${JSON.stringify(value)}<!--EXPORT_END-->`;

    const rendered = renderStub(raw, { app: fakeApp, exports: exportsFn });
    const { body } = parseStubExports(rendered);

    const result = ts.transpileModule(body, {
      reportDiagnostics: true,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    });

    const syntaxErrors = (result.diagnostics ?? []).filter(
      (d) => d.category === ts.DiagnosticCategory.Error,
    );
    expect(syntaxErrors).toEqual([]);
  });
});
