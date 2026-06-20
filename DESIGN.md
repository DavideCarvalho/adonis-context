# `@agora/context` — DESIGN

> Port of `@dudousxd/nestjs-context` (the **aviary** ecosystem) to AdonisJS.
> First lib of the **Agora** ecosystem. Foundation of `@agora/authz`, consumed by
> diagnostics / telescope / filter / durable.

## 1. O que é (papel × distribuição)

ALS (AsyncLocalStorage) **compartilhado** que carrega `user`/`tenant`/`traceId` e
flui por todas as libs do ecossistema.

- **Papel:** plumbing/infra — o dev quase não chama direto; quem consome são as
  outras libs (authz lê `userRef()`, filter lê `tenantId()`, telescope/durable
  correlacionam por `traceId()`).
- **Distribuição:** pública e publicada (`@agora/context`). Tem API própria que o
  app usa direto. Análogo: `Context` do Laravel / `HttpContext` do AdonisJS.
- **Por que não basta o `HttpContext`?** O `HttpContext` do Adonis v7 já tem ALS
  nativo (`useAsyncLocalStorage: true` → `HttpContext.getOrFail()`), **mas só
  vale dentro do request HTTP** — `getOrFail()` lança fora dele. O `@agora/context`
  é a camada fina e serializável que **atravessa as fronteiras que o HttpContext
  não cruza**: workers de fila (`@adonisjs/queue`), durable, ace commands e ORM
  hooks. Roda idêntico dentro e fora de HTTP, e é lido fora do container.

## 2. Núcleo (framework-agnostic, portado verbatim)

Singleton de módulo (necessário p/ ser lido FORA do container):

```ts
export interface ContextStore {
  traceId: string;
  requestId?: string;
  userRef?: { type: string; id: string | number };
  tenantId?: string;
}
// libs estendem: declare module '@agora/context' { interface ContextStore { ... } }

export const Context = {
  run, enterWith, get, set, bind,
  traceId(), tenantId(), userRef(),
  serialize(), deserialize(),          // cross-boundary (§5)
  toBaggage(), fromBaggage(),          // W3C baggage
  runEnrichers(), lazy(),              // derived fields
  configure(), resetConfig(),          // process-global cross-boundary config
};
```

Carrega `userRef` (`{type,id}`), **não** o user inteiro — é o que mantém o store
serializável (§5). `context.ts`, `baggage.ts`, `traceparent.ts` e `accessor.ts`
são puros e foram portados sem mudança (só a marca nas strings de aviso).

## 3. Entrada HTTP — middleware de **servidor**

`enterWith` (não `run`) — precisa sobreviver ao return do middleware e alcançar o
handler async e o middleware downstream. Registrado na stack `server` (roda antes
da resolução de rota, em todo request).

```ts
// context_middleware.ts
async handle(ctx: HttpContext, next: NextFn) {
  Context.enterWith({
    traceId: extractTraceparent(ctx.request.headers()) ?? randomTraceId(),
    requestId: ctx.request.id(),
  });
  return next();   // userRef/tenantId entram DEPOIS, via Context.set() pós-auth
}
```

## 4. Wiring — o jeito Adonis (substitui o `forRoot`)

- **`config/context.ts`** com `defineConfig({...})` no lugar das options do
  `forRoot`. As HTTP-options (`traceHeader`/`traceId`/`initialize`/`enrichers`) e
  as cross-boundary (`carrier`/`serialize`/`deserialize`/`baggage`) moram no mesmo
  arquivo.
- **`context_provider.ts`**: no `boot()` lê o config, empurra o subset
  cross-boundary pro singleton (`Context.configure`) e entrega as HTTP-options pro
  middleware via um holder de módulo (`setContextHttpOptions`); registra o
  diagnostics-bridge.
- **`node ace configure @agora/context`**: codemods registram o provider em
  `adonisrc.ts`, plugam o middleware na stack `server` e publicam o
  `config/context.ts` de um stub. Zero fiação manual.

### 4.1 Customização — 5 níveis (do mais comum ao avançado)

| Nível | Como (Adonis) | Default |
|---|---|---|
| 1 campos próprios | `declare module '@agora/context'` (module augmentation) | — |
| 2 popular / traceId | `traceId(ctx)` / `initialize(ctx)` no `defineConfig` | traceparent → random |
| 3 não-HTTP | não plugar o middleware + `Context.run()`/`enterWith()` no command/worker | middleware `server` |
| 4 carrier | `carrier:[]` / `serialize`+`deserialize` no `defineConfig` | traceId+tenantId+userRef |
| 5 accessor | `app.container.swap()` do binding (avançado/testes) | `contextAccessor` |

> **Config cross-boundary é PROCESS-GLOBAL.** Vive no singleton (fora do
> container, p/ ser lida por workers/durable). Cada `Context.configure` **substitui
> a config inteira** (não faz merge). Em testes, `Context.resetConfig()` volta aos
> defaults.

## 5. Cross-boundary (a parte que justifica a lib)

ALS não atravessa processo/fila sozinho. `serialize()` → carrier plano
`{ traceId, tenantId, userRef }` (sem user/conexão). A integração mora no **lado
de quem já produz a fronteira**, com detecção opcional — **não** em pacotes-ponte:

- **`@adonisjs/queue`**: no dispatch, anexa `__ctx: Context.serialize()` ao job;
  no worker, `Context.deserialize(job.__ctx, () => handler())`. Base do `durable`.
- **durable**: liga no gancho de traceparent que já existe; carrier é **snapshot**
  do disparo, não live.

`deserialize`/`fromCarrier` blinda o `traceId`: um carrier sem `traceId` gera um
`randomTraceId()` (com warn one-shot), preservando a invariante
`ContextStore.traceId: string` que telescope/durable usam.

## 6. Como as libs consomem (zero fiação do dev)

Como é singleton de módulo, as libs leem `Context.traceId()` / `Context.userRef()`
direto e **degradam limpo** se ausente (`?.`). Sem `@Optional() @Inject` como no
Nest — no Adonis é só import. O binding no container (`@agora/context`) existe só
pra trocar/mockar em teste (`app.container.swap`).

## 7. Pacotes

- `@agora/context` — núcleo (ALS + middleware + provider + config + serialize +
  baggage + traceparent)
- `@agora/context/testing` — `runWithContext()` / `enterContext()` p/ rodar código
  num store fake (subpath do pacote `@agora/context`)

## 8. Não-objetivos

- Não faz auth (não cria/loga user). Só carrega o que outra camada resolveu.
- Não persiste nada (sem tabela).
- Não gerencia conexão de banco.
