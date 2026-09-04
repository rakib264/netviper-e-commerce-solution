/**
 * Strip a Mongoose `lean()` result down to something a Client Component can
 * receive.
 *
 * `lean()` still yields `ObjectId` and `Date` instances, and React refuses to
 * serialize either across the server/client boundary. A JSON round trip is the
 * cheapest correct answer: it is the same transformation `unstable_cache`
 * already performs on a cache hit, so doing it here just makes the shape
 * identical on a hit and a miss instead of only on a hit.
 */
export function toPlainJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T;
}
