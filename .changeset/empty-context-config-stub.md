---
'@adonis-agora/context': patch
---

Repopulate the `config/context.ts` stub, which shipped as a 0-byte file since 0.3.2. `node ace configure @adonis-agora/context` was publishing an empty config into consuming apps; `ContextProvider` reads it with `app.config.get('context', {})`, so this silently fell back to defaults with no error and no warning — most notably meaning a custom (module-augmented) `ContextStore` field would never be listed in `carrier` and would silently be dropped at every process boundary (queue/durable). The stub is rewritten without the backticks that broke the tempura stub renderer (the cause of the earlier emptying in 20ee5d0), documents every `ContextConfig` option, and is now covered by a test that renders it through the exact `@adonisjs/application` stub pipeline (tempura) to catch a regression before it ships.
