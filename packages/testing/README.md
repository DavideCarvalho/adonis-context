# `@agora/context-testing`

Testing helpers for [`@agora/context`](https://www.npmjs.com/package/@agora/context)
— run code inside a fake context store.

```ts
import { runWithContext, enterContext } from '@agora/context-testing'
import { Context } from '@agora/context'

runWithContext({ tenantId: 't1', userRef: { type: 'user', id: 7 } }, () => {
  expect(Context.tenantId()).toBe('t1')
})
```

`traceId` is auto-filled when omitted. `enterContext` uses `enterWith` so the fake
context survives past the call (e.g. across an `await`).

## License

MIT © Davi Carvalho
