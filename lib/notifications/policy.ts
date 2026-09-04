import 'server-only';

import {
  NOTIFICATION_CATALOG,
  type NotificationDefinition,
  type NotificationEvent,
} from '@/lib/notifications/catalog';
import { resolveNotificationPreferences } from '@/lib/notifications/preferences';
import InAppNotification from '@/lib/models/InAppNotification';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import { isOneSignalConfigured } from '@/lib/onesignal';

/**
 * The cost-control layer.
 *
 * Four independent gates stand between an event and a push credit, and a
 * notification has to clear all of them:
 *
 *   1. **Catalog** — is this event push-worthy at all? (`catalog.ts`)
 *   2. **Configuration** — is OneSignal actually set up? No keys, no work: the
 *      old path enqueued a job regardless and discovered the problem in the
 *      worker.
 *   3. **Preference** — has this recipient opted out, per channel and category?
 *   4. **Dedupe / cooldown** — has this exact notification, or one in the same
 *      rate-limited scope, already gone out?
 *
 * In-app delivery clears only gates 1, 3 and 4 — it costs a document, not money.
 */

export interface NotificationRecipient {
  userId: string;
  /** Resolved from stored preferences, defaults filled in. */
  allowsInApp: boolean;
  allowsPush: boolean;
}

/** Recipients of a customer-audience event: exactly one person. */
export async function resolveCustomerRecipient(
  userId: string,
  definition: NotificationDefinition,
): Promise<NotificationRecipient | null> {
  await connectDB();

  const user = await User.findById(userId)
    .select('notificationPreferences isActive deletedAt')
    .lean<Record<string, any> | null>();

  if (!user || user.isActive === false || user.deletedAt) return null;

  return toRecipient(String(userId), user.notificationPreferences, definition);
}

/**
 * Recipients of an admin-audience event: every active admin and manager.
 *
 * Selected with their preferences in the same query, so a fan-out to N admins
 * is one read rather than one per admin.
 */
export async function resolveAdminRecipients(
  definition: NotificationDefinition,
): Promise<NotificationRecipient[]> {
  await connectDB();

  const admins = await User.find({
    role: { $in: ['admin', 'manager'] },
    isActive: true,
    deletedAt: { $in: [null, undefined] },
  })
    .select('_id notificationPreferences')
    .lean<Array<Record<string, any>>>();

  return admins.map((admin) =>
    toRecipient(String(admin._id), admin.notificationPreferences, definition),
  );
}

function toRecipient(
  userId: string,
  stored: unknown,
  definition: NotificationDefinition,
): NotificationRecipient {
  const preferences = resolveNotificationPreferences(stored as never);

  const categoryAllowed =
    definition.pushCategory === 'marketing'
      ? preferences.push.marketing
      : definition.pushCategory === 'orderUpdates'
        ? preferences.push.orderUpdates
        : // `operational` has no separate switch: staff opt out wholesale.
          true;

  return {
    userId,
    allowsInApp: preferences.inApp.enabled,
    allowsPush: preferences.push.enabled && categoryAllowed,
  };
}

/**
 * Whether this event may use push at all, before per-recipient preferences.
 *
 * Checked once per dispatch rather than once per recipient, and short-circuits
 * the whole push path — including the queue job — when OneSignal is unconfigured.
 */
export function pushAllowedForEvent(event: NotificationEvent): boolean {
  const definition = NOTIFICATION_CATALOG[event];
  if (!definition.channels.push) return false;
  return isOneSignalConfigured();
}

/**
 * Has an event already been notified within its cooldown window?
 *
 * Scope is shared across the recipients of one event (`admin_low_stock:<id>`),
 * so the answer is the same for every admin and the window cannot be reset by
 * one of them. One indexed read, and only for the handful of events that
 * declare a `cooldownMs` at all.
 */
export async function isWithinCooldown(
  event: NotificationEvent,
  cooldownScope: string | undefined,
): Promise<boolean> {
  const { cooldownMs } = NOTIFICATION_CATALOG[event];
  if (!cooldownMs || !cooldownScope) return false;

  await connectDB();

  const recent = await InAppNotification.findOne({
    cooldownScope,
    createdAt: { $gte: new Date(Date.now() - cooldownMs) },
  })
    .select('_id')
    .lean();

  return Boolean(recent);
}
