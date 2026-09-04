'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import {
  playNotificationSound,
  primeNotificationSound,
} from '@/lib/notifications/sound';
import { useSession } from 'next-auth/react';
import Script from 'next/script';
import { useEffect, useRef } from 'react';

const PUSH_PROMPT_STORAGE_KEY = 'onesignal_push_prompted_at';
const PUSH_PROMPT_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7;

type OneSignalSubscriptionState = {
  id?: string | null;
  token?: string | null;
  optedIn?: boolean;
};

type OneSignalPushSubscriptionChangeEvent = {
  previous: OneSignalSubscriptionState;
  current: OneSignalSubscriptionState;
};

type OneSignalWeb = {
  init: (config: Record<string, unknown>) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  User: {
    addTag?: (key: string, value: string) => Promise<void> | void;
    PushSubscription: {
      addEventListener: (
        event: 'change',
        handler: (event: OneSignalPushSubscriptionChangeEvent) => void,
      ) => void;
    };
  };
  Notifications: {
    permission: boolean;
    requestPermission: () => Promise<void> | void;
    addEventListener: (
      event: 'foregroundWillDisplay',
      handler: () => void,
    ) => void;
  };
};

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignal: OneSignalWeb) => void | Promise<void>>;
  }
}

function queueOneSignalTask(task: (oneSignal: OneSignalWeb) => void | Promise<void>) {
  if (typeof window === 'undefined') return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(task);
}

function markPushPromptAttempt() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PUSH_PROMPT_STORAGE_KEY, String(Date.now()));
  } catch {
    // Ignore storage failures in private mode.
  }
}

function shouldPromptForPushPermission() {
  if (typeof window === 'undefined') return false;
  try {
    const lastPromptAtRaw = window.localStorage.getItem(PUSH_PROMPT_STORAGE_KEY);
    if (!lastPromptAtRaw) return true;
    const lastPromptAt = Number(lastPromptAtRaw);
    return Number.isFinite(lastPromptAt)
      ? Date.now() - lastPromptAt > PUSH_PROMPT_COOLDOWN_MS
      : true;
  } catch {
    return true;
  }
}

export default function OneSignalProvider({ appId }: { appId: string }) {
  const { data: session } = useSession();
  const { locale } = useTranslation();

  const initializedRef = useRef(false);
  const foregroundListenerBoundRef = useRef(false);
  const subscriptionObserverBoundRef = useRef(false);
  const activeExternalUserIdRef = useRef<string | null>(null);

  const user = (session?.user || null) as {
    id?: string;
    role?: string;
  } | null;

  const userId = user?.id ? String(user.id) : null;
  const userRole = user?.role ? String(user.role) : null;

  // Bound on mount, not on first chime: the gesture that unlocks audio is
  // whatever the visitor does first, which is normally well before a
  // notification arrives.
  useEffect(() => {
    primeNotificationSound();
  }, []);

  useEffect(() => {
    if (!appId || initializedRef.current) return;

    initializedRef.current = true;

    queueOneSignalTask(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: process.env.NODE_ENV !== 'production',
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/' },
          autoResubscribe: true,
        });

        if (!foregroundListenerBoundRef.current) {
          OneSignal.Notifications.addEventListener('foregroundWillDisplay', () => {
            playNotificationSound();
          });
          foregroundListenerBoundRef.current = true;
        }

        if (!subscriptionObserverBoundRef.current) {
          OneSignal.User.PushSubscription.addEventListener('change', (event) => {
            if (event.current?.token && !event.previous?.token) {
              playNotificationSound();
            }
          });
          subscriptionObserverBoundRef.current = true;
        }
      } catch (error) {
        console.error('OneSignal init failed:', error);
      }
    });
  }, [appId]);

  useEffect(() => {
    if (!appId) return;

    queueOneSignalTask(async (OneSignal) => {
      try {
        if (userId) {
          if (activeExternalUserIdRef.current !== userId) {
            await OneSignal.login(userId);
            activeExternalUserIdRef.current = userId;
          }

          if (userRole && OneSignal.User.addTag) {
            await OneSignal.User.addTag('role', userRole);
          }

          if (locale && OneSignal.User.addTag) {
            await OneSignal.User.addTag('locale', locale);
          }

          if (!OneSignal.Notifications.permission && shouldPromptForPushPermission()) {
            await OneSignal.Notifications.requestPermission();
            markPushPromptAttempt();
          }
        } else if (activeExternalUserIdRef.current) {
          await OneSignal.logout();
          activeExternalUserIdRef.current = null;
        }
      } catch (error) {
        console.error('OneSignal user sync failed:', error);
      }
    });
  }, [appId, locale, userId, userRole]);

  if (!appId) return null;

  return (
    <Script
      src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      strategy="afterInteractive"
    />
  );
}
