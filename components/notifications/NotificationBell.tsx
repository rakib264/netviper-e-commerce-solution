'use client';

import { withBrandParam } from '@/lib/notifications/localize';
import {
  useCurrency,
  useTranslation,
} from '@/components/providers/LocalizationProvider';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/use-notifications';
import { withFormattedMoneyParams } from '@/lib/notifications/money-params';
import type { NotificationDTO } from '@/lib/notifications/serialize';
import { cn } from '@/lib/utils';
import { Bell } from 'lucide-react';
import Link from 'next/link';

/**
 * Coarse relative age, resolved through the reader's dictionary.
 *
 * Deliberately never finer than a minute and never longer than weeks: a
 * precisely-rendered timestamp would differ between the server and the client
 * and produce a hydration mismatch, and "3d" is all a notification row needs to
 * say.
 */
function useRelativeTime() {
  const { t } = useTranslation();

  return (isoDate: string) => {
    const created = new Date(isoDate).getTime();
    if (Number.isNaN(created)) return '';

    const minutes = Math.floor((Date.now() - created) / 60_000);
    if (minutes < 1) return t('notifications.time.justNow');
    if (minutes < 60) return t('notifications.time.minutes', { count: minutes });

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('notifications.time.hours', { count: hours });

    const days = Math.floor(hours / 24);
    if (days < 7) return t('notifications.time.days', { count: days });

    return t('notifications.time.weeks', { count: Math.floor(days / 7) });
  };
}

function isMissingTranslation(resolved: string, key: string) {
  return resolved.trim().length === 0 || resolved === key;
}

export interface NotificationBellProps {
  /**
   * `admin` matches the admin header's button sizing; `storefront` matches the
   * header's bare 18px icon row. Only presentation differs — both read the same
   * inbox, and which notifications an account has was decided when they were
   * written.
   */
  variant?: 'admin' | 'storefront';
  /** False while the session is still resolving, so no request is wasted. */
  enabled?: boolean;
  className?: string;
}

export function NotificationBell({
  variant = 'storefront',
  enabled = true,
  className,
}: NotificationBellProps) {
  const { t } = useTranslation();
  const relativeTime = useRelativeTime();
  const { notifications, unreadCount, loading, error, markRead, markAllRead } =
    // The bell is the one mount that chimes. Only one bell renders per page
    // (admin header or storefront header, never both), so this cannot double up.
    useNotifications({ enabled, sound: true });

  const isAdmin = variant === 'admin';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'relative text-foreground',
            isAdmin
              ? 'inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted'
              : '',
            className,
          )}
          aria-label={
            unreadCount > 0
              ? t('notifications.unreadBadgeLabel', { count: unreadCount })
              : t('notifications.openLabel')
          }
        >
          <Bell
            className={isAdmin ? 'h-5 w-5' : 'h-[18px] w-[18px] stroke-[1.4]'}
            aria-hidden="true"
          />
          {unreadCount > 0 &&
            (isAdmin ? (
              <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            ) : (
              <span className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
            ))}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[21rem] p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
          <h3 className="font-navigation text-sm font-semibold text-foreground">
            {t('notifications.title')}
          </h3>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="font-caption text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              {t('notifications.markAllRead')}
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <p className="px-3 py-6 text-center font-caption text-xs text-muted-foreground">
              {t('notifications.loading')}
            </p>
          ) : error ? (
            <p className="px-3 py-6 text-center font-caption text-xs text-muted-foreground">
              {t('notifications.loadError')}
            </p>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-6 text-center font-caption text-xs text-muted-foreground">
              {t('notifications.empty')}
            </p>
          ) : (
            notifications.map((notification) => (
              <NotificationRow
                key={notification._id}
                notification={notification}
                age={relativeTime(notification.createdAt)}
                onRead={() => markRead(notification._id)}
              />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRow({
  notification,
  age,
  onRead,
}: {
  notification: NotificationDTO;
  age: string;
  onRead: () => void;
}) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  // The stored keys are resolved here, against this reader's dictionary — which
  // is why the row carries keys and params rather than rendered sentences.
  // Money params are normalised first, so a notification stored before amounts
  // were pre-formatted still renders with a currency symbol.
  const params = withBrandParam(
    withFormattedMoneyParams(notification.params, formatPrice),
  );
  const translatedTitle = t(notification.titleKey, params);
  const translatedBody = t(notification.bodyKey, params);

  const title = isMissingTranslation(translatedTitle, notification.titleKey)
    ? t('notifications.fallback.title')
    : translatedTitle;
  const body = isMissingTranslation(translatedBody, notification.bodyKey)
    ? t('notifications.fallback.body')
    : translatedBody;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="font-title text-sm font-medium text-foreground">{title}</p>
        {!notification.read && (
          <span
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
            aria-label={t('notifications.unreadLabel')}
          />
        )}
      </div>
      <p className="mt-0.5 font-paragraph text-xs leading-relaxed text-muted-foreground">
        {body}
      </p>
      <p className="mt-1 font-caption text-[11px] text-subtle-foreground">{age}</p>
    </>
  );

  const rowClass = cn(
    'block w-full border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-muted',
    !notification.read && 'bg-muted/40',
  );

  // A notification with a deep link navigates and marks itself read in one
  // gesture; one without is just a button that dismisses the unread state.
  return notification.href ? (
    <Link href={notification.href} onClick={onRead} className={rowClass}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onRead} className={rowClass}>
      {content}
    </button>
  );
}

export default NotificationBell;
