/**
 * The notification chime.
 *
 * A synthesised two-tone chime rather than an audio file: no asset to ship, no
 * request to make, and nothing to fail at load time.
 *
 * The previous implementation constructed a fresh `AudioContext` for every
 * chime, which broke in two ways that both presented as "the sound sometimes
 * doesn't play":
 *
 *   1. Browsers cap concurrent `AudioContext`s per tab (Chrome allows about
 *      six). None of the old contexts were ever closed, so after a handful of
 *      notifications the constructor started throwing — and the throw escaped
 *      into OneSignal's event handler.
 *   2. A context created outside a user gesture starts `suspended` under
 *      Chrome's and Safari's autoplay policy. `oscillator.start()` on a
 *      suspended context schedules silently and never sounds. An inbound push
 *      is by definition not a user gesture, so this was the common case.
 *
 * So: one shared context for the page, unlocked on the first real user
 * interaction, resumed before each chime, and every call wrapped so audio being
 * unavailable is silent rather than fatal.
 */

/** Ignore chimes closer together than this — a burst gets one sound. */
const BURST_WINDOW_MS = 1500;

let sharedContext: AudioContext | null = null;
let unlockListenersBound = false;
let lastPlayedAt = 0;

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext ||
    null
  );
}

/**
 * The page's single `AudioContext`, created on first use.
 *
 * Reused for the life of the page, so the per-tab context limit is never
 * approached however many notifications arrive.
 */
function getSharedContext(): AudioContext | null {
  if (sharedContext) return sharedContext;

  const Ctor = getAudioContextConstructor();
  if (!Ctor) return null;

  try {
    sharedContext = new Ctor();
    return sharedContext;
  } catch {
    // Context limit reached, or audio disabled by policy. Not an error worth
    // surfacing — the notification itself still arrived.
    return null;
  }
}

/**
 * Bind one-shot listeners that resume the context on the first user gesture.
 *
 * This is the part that makes push chimes audible at all: the gesture that
 * unlocks audio is whatever the visitor did first on the page, long before the
 * notification arrives. Call it once, early — `OneSignalProvider` does.
 */
export function primeNotificationSound(): void {
  if (typeof window === 'undefined' || unlockListenersBound) return;
  unlockListenersBound = true;

  const unlock = () => {
    const context = getSharedContext();
    if (!context) return;
    if (context.state === 'suspended') void context.resume().catch(() => undefined);
  };

  // `pointerdown` and `keydown` both count as activation gestures, and
  // `touchstart` covers older iOS Safari.
  for (const event of ['pointerdown', 'keydown', 'touchstart'] as const) {
    window.addEventListener(event, unlock, { once: true, passive: true });
  }
}

/**
 * Play the chime, unless one just played.
 *
 * Silent — never throwing — when audio is blocked, unavailable, or still
 * suspended because the visitor has not interacted with the page yet.
 */
export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  if (now - lastPlayedAt < BURST_WINDOW_MS) return;

  const context = getSharedContext();
  if (!context) return;

  const emit = () => {
    // Autoplay policy still not satisfied: staying silent is correct, and
    // trying anyway would just schedule an inaudible tone.
    if (context.state !== 'running') return;

    try {
      const gain = context.createGain();
      const low = context.createOscillator();
      const high = context.createOscillator();

      low.type = 'sine';
      low.frequency.value = 880;
      high.type = 'triangle';
      high.frequency.value = 1174;

      const start = context.currentTime;
      // `setValueAtTime` first: an exponential ramp needs a defined, non-zero
      // starting point, and reading `gain.value` gives the ramp no anchor.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);

      low.connect(gain);
      high.connect(gain);
      gain.connect(context.destination);

      low.start(start);
      high.start(start + 0.03);
      low.stop(start + 0.35);
      high.stop(start + 0.35);

      // Nodes are single-use; disconnecting on end keeps the graph from growing.
      high.onended = () => {
        try {
          gain.disconnect();
        } catch {
          // Already torn down.
        }
      };

      lastPlayedAt = now;
    } catch {
      // Audio unavailable. The notification still arrived.
    }
  };

  if (context.state === 'suspended') {
    void context
      .resume()
      .then(emit)
      .catch(() => undefined);
    return;
  }

  emit();
}

/** Test seam: forget the shared context and the burst window. */
export function resetNotificationSoundForTests(): void {
  sharedContext = null;
  unlockListenersBound = false;
  lastPlayedAt = 0;
}
