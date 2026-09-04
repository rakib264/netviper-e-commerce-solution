import type { INotificationPreferences } from '@/lib/models/User';

/**
 * The defaults every account is read through.
 *
 * Transactional channels are on, marketing is off. That asymmetry is the point:
 * a customer who places an order has asked to hear about that order, and has not
 * asked to hear about a sale.
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: INotificationPreferences = {
  push: { enabled: true, orderUpdates: true, marketing: false },
  inApp: { enabled: true },
  email: { enabled: true, orderUpdates: true, marketing: false },
  sms: { enabled: false, orderUpdates: false, marketing: false },
};

type PartialPreferences = {
  push?: Partial<INotificationPreferences['push']>;
  inApp?: Partial<INotificationPreferences['inApp']>;
  email?: Partial<INotificationPreferences['email']>;
  sms?: Partial<INotificationPreferences['sms']>;
} | null | undefined;

/**
 * Read a user's preferences with every missing field filled in.
 *
 * Accounts predating the field have no `notificationPreferences` at all, and a
 * `lean()` read returns them exactly that way — Mongoose only applies schema
 * defaults when it builds a document, not when it hydrates a plain object. So
 * every consumer goes through here rather than reading the field, and a legacy
 * account behaves identically to a new one without needing a backfill
 * migration.
 */
export function resolveNotificationPreferences(
  stored: PartialPreferences,
): INotificationPreferences {
  return {
    push: { ...DEFAULT_NOTIFICATION_PREFERENCES.push, ...(stored?.push || {}) },
    inApp: { ...DEFAULT_NOTIFICATION_PREFERENCES.inApp, ...(stored?.inApp || {}) },
    email: { ...DEFAULT_NOTIFICATION_PREFERENCES.email, ...(stored?.email || {}) },
    sms: { ...DEFAULT_NOTIFICATION_PREFERENCES.sms, ...(stored?.sms || {}) },
  };
}

/** Coerce an untrusted request body into a preferences patch. */
export function sanitizePreferencesPatch(input: unknown): PartialPreferences {
  if (!input || typeof input !== 'object') return null;
  const body = input as Record<string, unknown>;

  const readGroup = <K extends keyof INotificationPreferences>(
    key: K,
    fields: readonly string[],
  ) => {
    const group = body[key as string];
    if (!group || typeof group !== 'object') return undefined;
    const source = group as Record<string, unknown>;
    const out: Record<string, boolean> = {};
    for (const field of fields) {
      if (typeof source[field] === 'boolean') out[field] = source[field] as boolean;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  };

  const patch: Record<string, unknown> = {};
  const pushGroup = readGroup('push', ['enabled', 'orderUpdates', 'marketing']);
  const inAppGroup = readGroup('inApp', ['enabled']);
  const emailGroup = readGroup('email', ['enabled', 'orderUpdates', 'marketing']);
  const smsGroup = readGroup('sms', ['enabled', 'orderUpdates', 'marketing']);

  if (pushGroup) patch.push = pushGroup;
  if (inAppGroup) patch.inApp = inAppGroup;
  if (emailGroup) patch.email = emailGroup;
  if (smsGroup) patch.sms = smsGroup;

  return Object.keys(patch).length > 0 ? (patch as PartialPreferences) : null;
}
