import mongoose from 'mongoose';

// Import all models to ensure they are registered
import './models/AuditLog';
import './models/Banner';
import './models/Blog';
import './models/Category';
import './models/Coupon';
import './models/Deal';
import './models/GeneralSettings';
import './models/InAppNotification';
import './models/MysteryBox';
import './models/Order';
import './models/OrderAppliedDeal';
import './models/PaymentSettings';
import './models/PointsLedger';
import './models/Product';
import './models/PunchCard';
import './models/ReturnRequest';
import './models/User';

// Ensure database name is included in connection string
function ensureDatabaseName(uri: string, defaultDbName: string = 'myfood'): string {
  // Check if URI already has a database name
  if (uri.includes('mongodb+srv://')) {
    const hasDbName = /mongodb\+srv:\/\/[^/]+\/[^/?]+/.test(uri);
    if (!hasDbName) {
      // Add database name before query string
      const separator = uri.includes('?') ? '?' : '/';
      return uri.replace(separator, `/${defaultDbName}${separator}`);
    }
  } else if (uri.includes('mongodb://')) {
    const hasDbName = /mongodb:\/\/[^/]+\/[^/?]+/.test(uri);
    if (!hasDbName) {
      const separator = uri.includes('?') ? '?' : '/';
      return uri.replace(separator, `/${defaultDbName}${separator}`);
    }
  }
  return uri;
}

const PRIMARY_MONGODB_URI = ensureDatabaseName(
  process.env.DATABASE_URL || 'mongodb+srv://invalid/placeholder',
  process.env.MONGODB_DB_NAME || 'myfood'
);
const FALLBACK_MONGODB_URI = process.env.MONGODB_URI_FALLBACK || 'mongodb://127.0.0.1:27017/myfood';

/**
 * Connection-pool sizing for serverless.
 *
 * The driver defaults to `maxPoolSize: 100`. On Vercel every warm lambda
 * instance holds its own pool against the cached `global.mongoose` connection,
 * and Atlas M0 refuses connections past a hard ceiling of 500 — so the default
 * caps this deployment at roughly **five** concurrent warm instances, and the
 * failure past that is `MongoServerSelectionError`, not slowness.
 *
 * Ten is deliberate, and `1` would be wrong here. The common serverless advice
 * to pin the pool at one assumes a handler that issues one query at a time;
 * this codebase does the opposite — `lib/home/homepage-data.ts` dispatches
 * every storefront reader in a single `Promise.all`, and the admin dashboard
 * fans out further still. A pool of one serialises those fan-outs and makes the
 * homepage slower. Ten keeps them parallel while lifting the instance ceiling
 * from ~5 to ~50.
 *
 * `minPoolSize: 0` lets a cooling instance give its sockets back rather than
 * holding a floor of them against the same 500, and `maxIdleTimeMS` is what
 * actually reclaims them — without it an idle warm instance keeps every socket
 * it ever opened until the platform reaps the whole instance.
 *
 * Configurable by env because the pool has to be sized before the first
 * connection exists, so it cannot come from the DB-backed settings that
 * CLAUDE.md otherwise prefers.
 */
function resolvePoolSize(): number {
  const parsed = Number.parseInt(process.env.MONGODB_MAX_POOL_SIZE ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 10;
  // Above ~50 a single instance can exhaust M0 on its own.
  return Math.min(parsed, 50);
}

const POOL_OPTIONS = {
  maxPoolSize: resolvePoolSize(),
  minPoolSize: 0,
  /** Reclaim a socket a warm-but-idle instance is no longer using. */
  maxIdleTimeMS: 30_000,
  /** A socket that stops answering fails rather than pinning a pool slot forever. */
  socketTimeoutMS: 45_000,
  connectTimeoutMS: 10_000,
} as const;

let cached = (global as any).mongoose as
  | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
  | undefined;

if (!cached) {
  (global as any).mongoose = { conn: null, promise: null };
  cached = (global as any).mongoose;
}

function isDnsSrvFailure(error: unknown): boolean {
  const err = error as any;
  return (
    !!err &&
    (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') &&
    (err.syscall === 'querySrv' || /querySrv/i.test(String(err.message)))
  );
}

async function connectDB() {
  if (cached && cached.conn) {
    return cached.conn;
  }

  const opts = {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
    ...POOL_OPTIONS,
  } as const;

  // First attempt: primary URI (likely Atlas SRV)
  try {
    if (!cached!.promise) {
      cached!.promise = mongoose.connect(PRIMARY_MONGODB_URI, opts);
    }
    cached!.conn = await cached!.promise;

    // Log connection info (without sensitive data)
    const dbName = mongoose.connection.db?.databaseName;
    if (dbName) {
      console.log(`[MongoDB] Connected to database: ${dbName}`);
    }

    return cached!.conn;
  } catch (primaryError) {
    // If the primary URI fails due to DNS SRV lookup issues, try local fallback
    if (isDnsSrvFailure(primaryError)) {
      console.warn(
        '[MongoDB] Primary connection failed due to DNS SRV lookup. Falling back to local MongoDB at 127.0.0.1.'
      );
      try {
        cached!.promise = null;
        cached!.promise = mongoose.connect(FALLBACK_MONGODB_URI, opts);
        cached!.conn = await cached!.promise;
        return cached!.conn;
      } catch (fallbackError) {
        cached!.promise = null;
        throw fallbackError;
      }
    }
    // Non-DNS errors: rethrow
    cached!.promise = null;
    throw primaryError;
  }
}

export default connectDB;
