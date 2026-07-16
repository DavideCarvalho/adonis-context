# @adonis-agora/context

## 0.4.0

### Minor Changes

- [`d9babbd`](https://github.com/DavideCarvalho/adonis-context/commit/d9babbd217e93c9fb8971251fcc8d98029363d2d) - `contextAccessor.get(key)` agora aceita uma chave e devolve aquele campo do store; `get()` sem
  argumento segue devolvendo o store inteiro.

  O slot `@agora/context:accessor` tinha dois consumidores que discordavam do contrato de `get`:
  `@adonis-agora/telescope` e `@adonis-agora/resilience` chamam `get()` e esperam o store;
  `@adonis-agora/authz` chama `get('globalRoles')` e esperava o valor da chave. Como o accessor só
  implementava `get()`, o authz recebia o store inteiro, seu `Array.isArray` falhava, e
  `globalRolesFromContext()` devolvia `[]` — toda checagem de permissão baseada em role global negava,
  em silêncio. A forma sem argumento fica byte-idêntica, então telescope e resilience não mudam.

## 0.3.3

### Patch Changes

- [#4](https://github.com/DavideCarvalho/adonis-context/pull/4) [`0bcca12`](https://github.com/DavideCarvalho/adonis-context/commit/0bcca12d8934fb169fcc38894c845377caaa4f8d) Thanks [@DavideCarvalho](https://github.com/DavideCarvalho)! - Repopulate the `config/context.ts` stub, which shipped as a 0-byte file since 0.3.2. `node ace configure @adonis-agora/context` was publishing an empty config into consuming apps; `ContextProvider` reads it with `app.config.get('context', {})`, so this silently fell back to defaults with no error and no warning — most notably meaning a custom (module-augmented) `ContextStore` field would never be listed in `carrier` and would silently be dropped at every process boundary (queue/durable). The stub is rewritten without the backticks that broke the tempura stub renderer (the cause of the earlier emptying in 20ee5d0), documents every `ContextConfig` option, and is now covered by a test that renders it through the exact `@adonisjs/application` stub pipeline (tempura) to catch a regression before it ships.

## 0.3.2

### Patch Changes

- Export the `configure` hook from the package root so `node ace configure @adonis-agora/context` resolves it (ace imports the package root and looks for a `configure` export). Previously it lived only on the `./configure` subpath and ace could not find it.
- Remove markdown backticks from the published config stub comments; the AdonisJS (tempura) stub renderer treats the stub body as a template literal, so a stray backtick broke `node ace configure`.

## 0.3.1

### Patch Changes

- [`b3cdb20`](https://github.com/DavideCarvalho/adonis-context/commit/b3cdb20f570ccdffd527662407e7d557d5ccdc91) - fix: sync VERSION literal via sync-version guard; contextScope upholds the traceId invariant

## 0.3.0

### Minor Changes

- [`efdb64e`](https://github.com/DavideCarvalho/adonis-context/commit/efdb64ed958d0748d01860a7cc4ce3e14659f2e7) - feat: publish scoped @agora/context:scope slot; deserialize tolerates absent carrier; fix cross-process docs examples

### Patch Changes

- [`c4091a4`](https://github.com/DavideCarvalho/adonis-context/commit/c4091a4acb222bc4a73bc0e348059f35dd1cdb6b) - Better cross-process docs: concrete @adonisjs/queue example + note durable auto-propagates context

## 0.2.0

### Minor Changes

- [`1dc1eac`](https://github.com/DavideCarvalho/adonis-context/commit/1dc1eac813ad462878e2a0e5f44f2a18be89e1b9) - Publish a @agora/context:set write slot for structural context population by sibling libs

- [`93fe34b`](https://github.com/DavideCarvalho/adonis-context/commit/93fe34b0cc0f80383ec7f7f654d2992efeab98eb) - Require AdonisJS v7 (bump @adonisjs/core peer to the v7 line)
