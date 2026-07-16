---
'@adonis-agora/context': minor
---

`contextAccessor.get(key)` agora aceita uma chave e devolve aquele campo do store; `get()` sem
argumento segue devolvendo o store inteiro.

O slot `@agora/context:accessor` tinha dois consumidores que discordavam do contrato de `get`:
`@adonis-agora/telescope` e `@adonis-agora/resilience` chamam `get()` e esperam o store;
`@adonis-agora/authz` chama `get('globalRoles')` e esperava o valor da chave. Como o accessor só
implementava `get()`, o authz recebia o store inteiro, seu `Array.isArray` falhava, e
`globalRolesFromContext()` devolvia `[]` — toda checagem de permissão baseada em role global negava,
em silêncio. A forma sem argumento fica byte-idêntica, então telescope e resilience não mudam.
