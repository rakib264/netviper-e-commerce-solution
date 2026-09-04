import type { Schema } from 'mongoose';

/**
 * Drop the storefront read caches whenever a model is written.
 *
 * Invalidation belongs at the source of the change, not at each of the forty-odd
 * admin handlers that can cause one. Attaching it to the schema means a new
 * route, a maintenance script or the queue worker all invalidate correctly
 * without knowing that a cache exists — and it is impossible to add a write path
 * that forgets to.
 *
 * `revalidate` is expected to swallow its own failures: `revalidateTag` throws
 * when there is no request scope (a standalone script) or when it is reached
 * from inside a cache scope, and neither is a reason to fail the write.
 * `lib/cache/revalidate.ts` handles that.
 *
 * Not attached to `HomepageSection` or `CuratedSection`: both are seeded lazily
 * from inside a cached read, so a hook there would try to invalidate the very
 * entry being computed. Those two are invalidated explicitly by
 * `revalidateDynamicSlots`.
 */
export function attachStorefrontInvalidation(
  schema: Schema,
  revalidate: () => void,
): void {
  const run = () => revalidate();

  // Document middleware: `doc.save()`, and `Model.create()` through it.
  schema.post('save', run);
  schema.post('insertMany', run);
  schema.post('deleteOne', { document: true, query: false }, run);

  // Query middleware. Registered by name rather than by regex so a read hook is
  // never attached by accident.
  const queryOps = [
    'findOneAndUpdate',
    'findOneAndReplace',
    'findOneAndDelete',
    'updateOne',
    'updateMany',
    'replaceOne',
    'deleteOne',
    'deleteMany',
  ] as const;

  for (const op of queryOps) {
    schema.post(op, run);
  }

  // `Model.bulkWrite` has no Mongoose middleware, so the handful of routes that
  // use it (the reorder endpoints) invalidate explicitly.
}
