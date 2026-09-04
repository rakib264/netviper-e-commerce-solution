/**
 * Resolver hook for `node --test --experimental-strip-types`.
 *
 * Node resolves ESM literally: it knows nothing about the `@/*` path alias from
 * tsconfig, and it will not guess a `.ts`/`.tsx` extension. Application code
 * uses both, so without this hook only leaf modules with zero internal imports
 * could be unit tested. Registering it keeps the source idiomatic — the aliases
 * stay — while the tests still run straight off the TypeScript.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = pathToFileURL(new URL('..', import.meta.url).pathname).href;

register(
  new URL('./ts-resolve-hooks.mjs', import.meta.url),
  import.meta.url,
  { data: { repoRoot: new URL('..', import.meta.url).href } },
);

export { REPO_ROOT };
