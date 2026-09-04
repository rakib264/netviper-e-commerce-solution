import mongoose, { Schema } from 'mongoose';

/**
 * One persisted notification in a user's inbox.
 *
 * Copy is stored as translation *keys* plus interpolation params, never as
 * rendered text. A notification outlives the session it was created in, and the
 * reader may not be using the language it was created in — storing
 * "Bestellung #123 versandt" would freeze it to whatever language happened to be
 * active on the server when the order shipped. The bell resolves `titleKey` and
 * `bodyKey` through the reader's own dictionary at render time.
 *
 * Rows are per recipient, not per event: an admin-audience event writes one
 * document per admin so that read state belongs to each of them individually.
 */
export interface IInAppNotification {
  /** Recipient. Admin-audience events write one document per admin. */
  userId: mongoose.Types.ObjectId;
  /** Which inbox this belongs to — the customer bell or the admin bell. */
  audience: 'customer' | 'admin';
  /** Catalog event key, e.g. `order_status_shipped`. */
  type: string;
  titleKey: string;
  bodyKey: string;
  /** Interpolation values for the two keys (`{{orderNumber}}`, …). */
  params: Record<string, string | number>;
  /** In-app deep link for the row. */
  href?: string;
  /** Structured payload — ids the UI or a later migration may need. */
  data: Record<string, unknown>;
  readAt?: Date | null;
  /**
   * Idempotency key. Unique and sparse, so a retried webhook, a reloaded
   * payment callback or a duplicated queue job cannot produce a second copy of
   * the same notification.
   */
  dedupeKey?: string;
  /**
   * Rate-limit scope, shared across the recipients of one event. Low-stock
   * alerts use it to enforce one notification per product per day regardless of
   * how many orders cross the threshold.
   */
  cooldownScope?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InAppNotificationSchema = new Schema<IInAppNotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    audience: {
      type: String,
      enum: ['customer', 'admin'],
      required: true,
      default: 'customer',
    },
    type: { type: String, required: true },
    titleKey: { type: String, required: true },
    bodyKey: { type: String, required: true },
    params: { type: Schema.Types.Mixed, default: {} },
    href: { type: String },
    data: { type: Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null },
    dedupeKey: { type: String },
    cooldownScope: { type: String },
  },
  { timestamps: true },
);

/** The inbox query: one user's notifications, newest first. */
InAppNotificationSchema.index({ userId: 1, createdAt: -1 });

/**
 * The unread badge count.
 *
 * Partial rather than plain: only unread rows are indexed, so the index stays
 * small no matter how much history a long-lived account accumulates, and the
 * count is answered from the index alone.
 */
InAppNotificationSchema.index(
  { userId: 1, readAt: 1 },
  { partialFilterExpression: { readAt: null } },
);

/**
 * Idempotency.
 *
 * Partial rather than sparse — and never both, which MongoDB rejects outright
 * ("cannot mix partialFilterExpression and sparse options"). The partial filter
 * is also the stricter of the two: a sparse unique index still indexes an
 * explicit `null`, so the notifications that deliberately carry no dedupe key
 * would collide with each other on the first one. Restricting the index to
 * documents whose `dedupeKey` is actually a string keeps uniqueness where it is
 * wanted and leaves repeatable notifications out of the index entirely.
 */
InAppNotificationSchema.index(
  { dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupeKey: { $type: 'string' } },
  },
);

/** The cooldown lookup: most recent notification in a scope. */
InAppNotificationSchema.index({ cooldownScope: 1, createdAt: -1 }, { sparse: true });

export default mongoose.models.InAppNotification ||
  mongoose.model<IInAppNotification>('InAppNotification', InAppNotificationSchema);
