import type Configure from '@adonisjs/core/commands/configure';
import { stubsRoot } from './stubs/main.js';

/**
 * `node ace configure @agora/context` — auto-wires the package:
 *
 * 1. registers the service provider in `adonisrc.ts`;
 * 2. registers {@link ContextMiddleware} on the `server` middleware stack;
 * 3. publishes `config/context.ts` from a stub.
 */
export async function configure(command: Configure) {
  const codemods = await command.createCodemods();

  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@agora/context/context_provider');
  });

  await codemods.registerMiddleware('server', [{ path: '@agora/context/context_middleware' }]);

  await codemods.makeUsingStub(stubsRoot, 'config/context.stub', {});
}
