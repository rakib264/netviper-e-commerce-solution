import 'server-only';

import type { TranslationValues } from '@/lib/i18n/dictionary';
import InAppNotification from '@/lib/models/InAppNotification';
import connectDB from '@/lib/mongodb';
import {
  NOTIFICATION_CATALOG,
  type NotificationEvent,
} from '@/lib/notifications/catalog';
import { localizeForPush } from '@/lib/notifications/localize';
import {
  isWithinCooldown,
  pushAllowedForEvent,
  resolveAdminRecipients,
  resolveCustomerRecipient,
  type NotificationRecipient,
} from '@/lib/notifications/policy';

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXTAUTH_URL ||
  'http://localhost:3000';

/** Mongo's duplicate-key error, which is how dedupe reports a hit. */
const DUPLICATE_KEY = 11000;

export interface DispatchOptions {
  event: NotificationEvent;
  /** Required for customer-audience events; ignored for admin ones. */
  userId?: string | null;
  /** Interpolation values shared by the title, the body and the push copy. */
  params?: TranslationValues;
  /** Relative deep link, e.g. `/orders/123`. */
  href?: string;
  /** Structured ids stored on the row and sent in the push payload. */
  data?: Record<string, unknown>;
  /**
   * Idempotency scope. Combined with the recipient, so an admin fan-out
   * de-duplicates per admin rather than letting the first one absorb the event.
   * Omit for notifications that may legitimately repeat.
   */
  dedupeKey?: string;
  /** Rate-limit scope, shared across recipients. Only used by events with a cooldown. */
  cooldownScope?: string;
}

export interface DispatchResult {
  event: NotificationEvent;
  inAppCreated: number;
  pushQueued: boolean;
  skipped?: 'no_recipients' | 'cooldown' | 'duplicate' | 'disabled';
}

/**
 * Deliver one event across every channel its policy allows.
 *
 * This is the only way a notification is created. Call sites describe what
 * happened and hand over ids; every decision about audience, channel, wording,
 * de-duplication and rate limiting is made here and in `catalog.ts`, which is
 * what keeps the policy reviewable and keeps push volume predictable.
 *
 * Never throws. A notification failing must not roll back the order, payment or
 * status change that produced it — callers already treat notification failure as
 * non-fatal, and this makes that guarantee the dispatcher's rather than each
 * caller's.
 */
export async function dispatchNotification(
  options: DispatchOptions,
): Promise<DispatchResult> {
  const definition = NOTIFICATION_CATALOG[options.event];
  const result: DispatchResult = {
    event: options.event,
    inAppCreated: 0,
    pushQueued: false,
  };

  try {
    await connectDB();

    // The cheapest gate first: a rate-limited event that already fired in this
    // window costs one indexed read and stops here, before any fan-out.
    if (await isWithinCooldown(options.event, options.cooldownScope)) {
      return { ...result, skipped: 'cooldown' };
    }

    const recipients =
      definition.audience === 'admin'
        ? await resolveAdminRecipients(definition)
        : options.userId
          ? [await resolveCustomerRecipient(options.userId, definition)].filter(
              (recipient): recipient is NotificationRecipient => Boolean(recipient),
            )
          : [];

    if (recipients.length === 0) {
      return { ...result, skipped: 'no_recipients' };
    }

    const params = (options.params || {}) as Record<string, string | number>;
    const data = { ...(options.data || {}), type: options.event };

    /* ── In-app ───────────────────────────────────────────────────────────── */

    const inAppRecipients = definition.channels.inApp
      ? recipients.filter((recipient) => recipient.allowsInApp)
      : [];

    /**
     * Which recipients actually received the in-app row.
     *
     * Push follows the in-app result rather than running beside it: if the
     * insert was rejected as a duplicate, the notification has already been
     * delivered once and must not be pushed a second time. That is what makes a
     * replayed payment callback or a retried queue job free.
     */
    const delivered = new Set<string>();

    for (const recipient of inAppRecipients) {
      const dedupeKey = options.dedupeKey
        ? `${options.dedupeKey}:${recipient.userId}`
        : undefined;

      try {
        await InAppNotification.create({
          userId: recipient.userId,
          audience: definition.audience,
          type: options.event,
          titleKey: definition.titleKey,
          bodyKey: definition.bodyKey,
          params,
          href: options.href,
          data,
          readAt: null,
          dedupeKey,
          cooldownScope: definition.cooldownMs ? options.cooldownScope : undefined,
        });
        delivered.add(recipient.userId);
        result.inAppCreated += 1;
      } catch (error) {
        if ((error as { code?: number })?.code === DUPLICATE_KEY) continue;
        console.error(
          `[notifications] in-app write failed for ${options.event}:`,
          error,
        );
      }
    }

    if (result.inAppCreated === 0 && inAppRecipients.length > 0) {
      // Every insert was a duplicate: this event has already been delivered.
      return { ...result, skipped: 'duplicate' };
    }

    /* ── Push ─────────────────────────────────────────────────────────────── */

    if (!pushAllowedForEvent(options.event)) return result;

    const pushTargets = recipients
      .filter((recipient) => recipient.allowsPush)
      // A recipient whose in-app row was a duplicate has been told already.
      // When the event writes no in-app row at all, there is nothing to dedupe
      // against and push stands on its own.
      .filter((recipient) => !definition.channels.inApp || delivered.has(recipient.userId))
      .map((recipient) => recipient.userId);

    if (pushTargets.length === 0) return result;

    const url = options.href ? `${APP_BASE_URL}${options.href}` : undefined;

    const { default: queueService, JobType } = await import('@/lib/queue');
    await queueService.enqueue({
      type: JobType.SEND_PUSH,
      externalUserIds: pushTargets,
      headings: localizeForPush(definition.titleKey, params),
      contents: localizeForPush(definition.bodyKey, params),
      // No `playSound` flag: web-push sound is decided by the OS and the
      // browser, not by notification data, and nothing ever read it. The
      // in-page chime is `lib/notifications/sound.ts`, triggered by
      // OneSignal's `foregroundWillDisplay` and by the inbox picking up a new
      // unread row.
      data,
      url,
      webUrl: url,
    } as never);

    result.pushQueued = true;
    return result;
  } catch (error) {
    console.error(`[notifications] dispatch failed for ${options.event}:`, error);
    return result;
  }
}
