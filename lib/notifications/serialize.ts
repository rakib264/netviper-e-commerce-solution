import type { NotificationAudience } from '@/lib/notifications/catalog';

/** One inbox row, as the bell receives it. */
export interface NotificationDTO {
  _id: string;
  audience: NotificationAudience;
  type: string;
  titleKey: string;
  bodyKey: string;
  params: Record<string, string | number>;
  href?: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

/**
 * Project a stored notification for the client.
 *
 * `readAt` collapses to a boolean because the UI only ever asks "is this
 * unread"; the timestamp stays in the database for auditing. Copy is still keys
 * plus params at this point — the bell resolves them against the reader's
 * dictionary, which is what lets one stored notification render in whichever
 * language the reader has selected.
 */
export function toNotificationDTO(raw: Record<string, any>): NotificationDTO {
  return {
    _id: String(raw._id),
    audience: raw.audience === 'admin' ? 'admin' : 'customer',
    type: String(raw.type || ''),
    titleKey: String(raw.titleKey || ''),
    bodyKey: String(raw.bodyKey || ''),
    params: (raw.params || {}) as Record<string, string | number>,
    href: raw.href ? String(raw.href) : undefined,
    data: (raw.data || {}) as Record<string, unknown>,
    read: Boolean(raw.readAt),
    createdAt: new Date(raw.createdAt).toISOString(),
  };
}
