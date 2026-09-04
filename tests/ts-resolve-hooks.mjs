import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

let repoRoot = new URL('../', import.meta.url).href;

/** Extensions tried, in order, for a specifier written without one. */
const CANDIDATE_SUFFIXES = ['.ts', '.tsx', '.json', '/index.ts', '/index.tsx'];

export function initialize(data) {
  if (data?.repoRoot) repoRoot = data.repoRoot;
}

/** Node refuses a JSON module without an explicit attribute; bundlers do not. */
function attributesFor(url) {
  return url.pathname.endsWith('.json') ? { type: 'json' } : undefined;
}

/** A directory is never a module: `lib/utils` must lose to `lib/utils.ts`. */
function isFile(url) {
  const path = fileURLToPath(url);
  return existsSync(path) && statSync(path).isFile();
}

function firstExisting(baseUrl) {
  if (isFile(baseUrl)) return baseUrl;
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = new URL(baseUrl.href + suffix);
    if (isFile(candidate)) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  // `@/foo/bar` → <repo>/foo/bar, matching the tsconfig `paths` alias.
  if (specifier.startsWith('@/')) {
    const resolved = firstExisting(new URL(specifier.slice(2), repoRoot));
    if (resolved) {
      return {
        url: resolved.href,
        importAttributes: attributesFor(resolved),
        shortCircuit: true,
      };
    }
  }

  // Extensionless relative specifiers, which bundlers allow and Node does not.
  if (specifier.startsWith('.') && !/\.[cm]?[jt]sx?$|\.json$/.test(specifier)) {
    const parent = context.parentURL;
    if (parent) {
      const resolved = firstExisting(new URL(specifier, parent));
      if (resolved) {
        return {
          url: resolved.href,
          importAttributes: attributesFor(resolved),
          shortCircuit: true,
        };
      }
    }
  }

  return nextResolve(specifier, context);
}
