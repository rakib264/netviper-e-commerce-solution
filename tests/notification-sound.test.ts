import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * The chime is browser-only, so the test supplies a fake `window` with a
 * scriptable `AudioContext`. What is being verified is the lifecycle — one
 * shared context, resumed before use, debounced, and silent on failure — which
 * is precisely where the original implementation went wrong.
 */

interface FakeNode {
  connect: () => void;
  disconnect: () => void;
  start: (when: number) => void;
  stop: (when: number) => void;
  type?: string;
  frequency: { value: number };
  onended?: () => void;
  gain: {
    value: number;
    setValueAtTime: (v: number, t: number) => void;
    exponentialRampToValueAtTime: (v: number, t: number) => void;
  };
}

function makeNode(): FakeNode {
  return {
    connect: () => {},
    disconnect: () => {},
    start: () => {},
    stop: () => {},
    frequency: { value: 0 },
    gain: {
      value: 0,
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    },
  };
}

interface Harness {
  constructed: number;
  resumeCalls: number;
  oscillators: number;
  setState: (state: string) => void;
  listeners: string[];
}

function installFakeAudio(options: {
  state?: string;
  throwOnConstruct?: boolean;
  omitAudioContext?: boolean;
} = {}): Harness {
  const harness: Harness = {
    constructed: 0,
    resumeCalls: 0,
    oscillators: 0,
    setState: () => {},
    listeners: [],
  };

  let state = options.state ?? 'running';
  harness.setState = (next) => {
    state = next;
  };

  class FakeAudioContext {
    currentTime = 0;
    get state() {
      return state;
    }
    constructor() {
      harness.constructed += 1;
      if (options.throwOnConstruct) throw new Error('context limit reached');
    }
    resume() {
      harness.resumeCalls += 1;
      state = 'running';
      return Promise.resolve();
    }
    createGain() {
      return makeNode();
    }
    createOscillator() {
      harness.oscillators += 1;
      return makeNode();
    }
    get destination() {
      return makeNode();
    }
  }

  const fakeWindow: Record<string, unknown> = {
    addEventListener: (event: string) => {
      harness.listeners.push(event);
    },
    removeEventListener: () => {},
  };
  if (!options.omitAudioContext) fakeWindow.AudioContext = FakeAudioContext;

  (globalThis as any).window = fakeWindow;
  (globalThis as any).document = { visibilityState: 'visible' };

  return harness;
}

/** Freshly imported each time, so the module's own state starts clean. */
async function loadSoundModule() {
  const url = new URL('../lib/notifications/sound.ts', import.meta.url).href;
  return import(`${url}?t=${Math.random()}`);
}

test('reuses a single AudioContext across many chimes', async () => {
  const harness = installFakeAudio();
  const sound = await loadSoundModule();

  sound.playNotificationSound();
  // The debounce is what stops a burst, so step past it to prove the *context*
  // is reused rather than reconstructed.
  sound.resetNotificationSoundForTests();
  const before = harness.constructed;
  sound.playNotificationSound();

  assert.equal(
    harness.constructed,
    before + 1,
    'a reset re-creates the context; without one it must be reused',
  );

  const constructedNow = harness.constructed;
  // Ten chimes, no reset: the old code built ten contexts and hit the per-tab
  // cap. This must build none.
  for (let i = 0; i < 10; i += 1) sound.playNotificationSound();
  assert.equal(harness.constructed, constructedNow, 'no extra contexts');
});

test('a burst of notifications produces one chime', async () => {
  const harness = installFakeAudio();
  const sound = await loadSoundModule();

  sound.playNotificationSound();
  sound.playNotificationSound();
  sound.playNotificationSound();

  // Two oscillators per chime.
  assert.equal(harness.oscillators, 2, 'only the first call in the burst sounds');
});

test('resumes a suspended context before playing', async () => {
  const harness = installFakeAudio({ state: 'suspended' });
  const sound = await loadSoundModule();

  sound.playNotificationSound();
  await new Promise((resolve) => setImmediate(resolve));

  assert.ok(harness.resumeCalls >= 1, 'a suspended context must be resumed');
  assert.equal(harness.oscillators, 2, 'and then actually play');
});

test('priming binds one-shot unlock listeners for user gestures', async () => {
  const harness = installFakeAudio({ state: 'suspended' });
  const sound = await loadSoundModule();

  sound.primeNotificationSound();

  assert.deepEqual(harness.listeners, ['pointerdown', 'keydown', 'touchstart']);

  // Idempotent: a second call must not double-bind.
  sound.primeNotificationSound();
  assert.equal(harness.listeners.length, 3);
});

test('fails silently when the AudioContext constructor throws', async () => {
  installFakeAudio({ throwOnConstruct: true });
  const sound = await loadSoundModule();

  assert.doesNotThrow(() => sound.playNotificationSound());
});

test('fails silently when the browser has no AudioContext', async () => {
  installFakeAudio({ omitAudioContext: true });
  const sound = await loadSoundModule();

  assert.doesNotThrow(() => sound.playNotificationSound());
  assert.doesNotThrow(() => sound.primeNotificationSound());
});

test('stays silent while the context cannot leave a non-running state', async () => {
  const harness = installFakeAudio({ state: 'closed' });
  const sound = await loadSoundModule();

  sound.playNotificationSound();
  assert.equal(harness.oscillators, 0, 'a closed context must not be played');
});
