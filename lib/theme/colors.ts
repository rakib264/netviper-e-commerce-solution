/**
 * Dynamic colour theme engine.
 *
 * Mirrors the typography system: a registry of presets, a normaliser that
 * validates untrusted input, and a resolver that turns two brand colours into a
 * complete set of semantic CSS variables for both light and dark.
 *
 * Two inputs (primary + secondary) produce every surface, text, border, state
 * and chart colour. Components never name a colour — they consume the semantic
 * tokens, so re-theming is a settings change rather than a refactor.
 */


/* ══════════════════════════════════════════════════════════════════════
   Colour maths
   ══════════════════════════════════════════════════════════════════════ */

export interface Rgb {
  r: number; // 0..255
  g: number;
  b: number;
}

export interface Oklch {
  l: number; // 0..1
  c: number; // 0..~0.4
  h: number; // degrees 0..360
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function parseHex(input: string): Rgb | null {
  if (typeof input !== 'string') return null;
  let hex = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

export function isValidHexColor(input: unknown): input is string {
  return typeof input === 'string' && parseHex(input) !== null;
}

export function normalizeHex(input: string): string {
  const rgb = parseHex(input);
  if (!rgb) return '#000000';
  return rgbToHex(rgb);
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const part = (value: number) =>
    Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/* ── sRGB transfer function ─────────────────────────────────────────────── */

function toLinear(channel: number): number {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function fromLinear(channel: number): number {
  const v =
    channel <= 0.0031308 ? channel * 12.92 : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
  return clamp(v, 0, 1) * 255;
}

/* ── OKLab / OKLCH ──────────────────────────────────────────────────────── */

export function rgbToOklch(rgb: Rgb): Oklch {
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const chroma = Math.sqrt(okA * okA + okB * okB);
  let hue = (Math.atan2(okB, okA) * 180) / Math.PI;
  if (hue < 0) hue += 360;

  return { l: okL, c: chroma, h: chroma < 1e-6 ? 0 : hue };
}

function oklchToRgbRaw({ l, c, h }: Oklch): { rgb: Rgb; inGamut: boolean } {
  const hRad = (h * Math.PI) / 180;
  const okA = Math.cos(hRad) * c;
  const okB = Math.sin(hRad) * c;

  const l_ = l + 0.3963377774 * okA + 0.2158037573 * okB;
  const m_ = l - 0.1055613458 * okA - 0.0638541728 * okB;
  const s_ = l - 0.0894841775 * okA - 1.291485548 * okB;

  const lc = l_ * l_ * l_;
  const mc = m_ * m_ * m_;
  const sc = s_ * s_ * s_;

  const r = 4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  const g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  const b = -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc;

  const eps = 0.0005;
  const inGamut =
    r >= -eps && r <= 1 + eps && g >= -eps && g <= 1 + eps && b >= -eps && b <= 1 + eps;

  return {
    rgb: { r: fromLinear(r), g: fromLinear(g), b: fromLinear(b) },
    inGamut,
  };
}

/**
 * Convert to sRGB, reducing chroma until the colour fits the gamut. Clipping the
 * channels instead would shift the hue, which shows up as brown-looking greens.
 */
export function oklchToRgb(color: Oklch): Rgb {
  const lightness = clamp(color.l, 0, 1);
  const first = oklchToRgbRaw({ ...color, l: lightness });
  if (first.inGamut) return first.rgb;

  let low = 0;
  let high = color.c;
  let best = oklchToRgbRaw({ l: lightness, c: 0, h: color.h }).rgb;

  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2;
    const attempt = oklchToRgbRaw({ l: lightness, c: mid, h: color.h });
    if (attempt.inGamut) {
      best = attempt.rgb;
      low = mid;
    } else {
      high = mid;
    }
  }
  return best;
}

export const oklchToHex = (color: Oklch): string => rgbToHex(oklchToRgb(color));
export const hexToOklch = (hex: string): Oklch =>
  rgbToOklch(parseHex(hex) || { r: 0, g: 0, b: 0 });

/* ── Contrast (WCAG 2.1) ────────────────────────────────────────────────── */

export function relativeLuminance(rgb: Rgb): number {
  return (
    0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b)
  );
}

export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(parseHex(a) || { r: 0, g: 0, b: 0 });
  const second = relativeLuminance(parseHex(b) || { r: 0, g: 0, b: 0 });
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Pick the readable text colour for a surface. Rather than pure black/white it
 * returns a tinted near-black or near-white carrying the surface hue, which is
 * what stops generated themes from looking like a default bootstrap page.
 */
export function readableForeground(
  backgroundHex: string,
  options: { minRatio?: number; tint?: number } = {},
): string {
  const minRatio = options.minRatio ?? 4.5;
  const tint = options.tint ?? 0.02;
  const base = hexToOklch(backgroundHex);

  const dark = oklchToHex({ l: 0.2, c: Math.min(base.c, tint * 1.5), h: base.h });
  const light = oklchToHex({ l: 0.985, c: Math.min(base.c, tint), h: base.h });

  const darkRatio = contrastRatio(dark, backgroundHex);
  const lightRatio = contrastRatio(light, backgroundHex);

  const preferred = darkRatio >= lightRatio ? dark : light;
  if (contrastRatio(preferred, backgroundHex) >= minRatio) return preferred;

  // Neither tinted end is readable enough — push the better one to the extreme.
  return ensureContrast(preferred, backgroundHex, minRatio);
}

/**
 * Walk a colour's lightness away from the background until it clears `minRatio`.
 * Hue and chroma are preserved so the result still belongs to the palette.
 */
export function ensureContrast(
  foregroundHex: string,
  backgroundHex: string,
  minRatio = 4.5,
): string {
  if (contrastRatio(foregroundHex, backgroundHex) >= minRatio) return foregroundHex;

  const fg = hexToOklch(foregroundHex);
  const backgroundIsLight = relativeLuminance(parseHex(backgroundHex) || { r: 0, g: 0, b: 0 }) > 0.18;
  const direction = backgroundIsLight ? -1 : 1;

  let best = foregroundHex;
  let bestRatio = contrastRatio(foregroundHex, backgroundHex);

  for (let step = 1; step <= 40; step += 1) {
    const lightness = clamp(fg.l + direction * step * 0.025, 0, 1);
    const candidate = oklchToHex({ ...fg, l: lightness });
    const ratio = contrastRatio(candidate, backgroundHex);
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
    if (ratio >= minRatio) return candidate;
    if (lightness === 0 || lightness === 1) break;
  }

  // Fall back to the absolute extreme if even that was not enough.
  const extreme = backgroundIsLight ? '#000000' : '#ffffff';
  return contrastRatio(extreme, backgroundHex) > bestRatio ? extreme : best;
}

/* ── CSS emission ───────────────────────────────────────────────────────── */

/**
 * Emit `H S% L%` rather than a hex string. Tailwind wraps these as
 * `hsl(var(--token) / <alpha-value>)`, which is what keeps `bg-primary/10` and
 * the other ~195 alpha modifiers in this codebase working.
 */
export function hexToHslTriplet(hex: string): string {
  const rgb = parseHex(hex) || { r: 0, g: 0, b: 0 };
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  let hue = 0;
  let saturation = 0;

  if (delta > 1e-6) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const round = (value: number, digits = 1) => {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  };

  return `${round(hue)} ${round(saturation * 100)}% ${round(lightness * 100)}%`;
}

export function rotateHue(color: Oklch, degrees: number): Oklch {
  return { ...color, h: (color.h + degrees + 360) % 360 };
}


/* ── Types ──────────────────────────────────────────────────────────────── */

export type ThemeAppearance = 'light' | 'dark';

export interface ColorSettings {
  presetId: string | null;
  primaryColor: string;
  secondaryColor: string;
}

export interface ColorPreset {
  id: string;
  name: string;
  /** The kind of storefront this palette was tuned for. */
  useCase: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface ColorContrastCheck {
  token: string;
  against: string;
  ratio: number;
  required: number;
  passes: boolean;
}

export interface ResolvedColorsOutput {
  settings: ColorSettings;
  /** Token -> CSS value. Semantic tokens are `H S% L%` triplets. */
  light: Record<string, string>;
  dark: Record<string, string>;
  /** Resolved hex values, for previews and non-CSS consumers (email, PDF). */
  lightHex: Record<string, string>;
  darkHex: Record<string, string>;
  contrast: ColorContrastCheck[];
}

/* ── Presets ────────────────────────────────────────────────────────────── */

export const DEFAULT_COLOR_PRESET_ID = 'luxury-leather';

export const COLOR_PRESETS: Record<string, ColorPreset> = {
  'luxury-leather': {
    id: 'luxury-leather',
    name: 'Luxury Leather',
    useCase: 'Bags / luxury',
    description: 'Espresso ink with warm tan — quiet, expensive, high contrast.',
    primaryColor: '#1F1C19',
    secondaryColor: '#C4A88A',
  },
  'grocery-organic': {
    id: 'grocery-organic',
    name: 'Garden Harvest',
    useCase: 'Grocery / organic',
    description: 'Herb green with honey — fresh and appetising without going neon.',
    primaryColor: '#3E6B44',
    secondaryColor: '#D9A43B',
  },
  'fashion-atelier': {
    id: 'fashion-atelier',
    name: 'Atelier Plum',
    useCase: 'Fashion / clothing',
    description: 'Deep plum with dusty blush — editorial and softly feminine.',
    primaryColor: '#5A3A52',
    secondaryColor: '#E0B7AE',
  },
  'beauty-blush': {
    id: 'beauty-blush',
    name: 'Rose Apothecary',
    useCase: 'Beauty',
    description: 'Dusty rose with warm cream — clean, tactile, skin-friendly.',
    primaryColor: '#A65A6B',
    secondaryColor: '#E8CBA8',
  },
  'electronics-indigo': {
    id: 'electronics-indigo',
    name: 'Indigo Circuit',
    useCase: 'Electronics',
    description: 'Deep indigo with teal — technical and trustworthy, still warm.',
    primaryColor: '#2F3E6B',
    secondaryColor: '#3FA6A0',
  },
  'minimal-stone': {
    id: 'minimal-stone',
    name: 'Warm Stone',
    useCase: 'Minimal / neutral',
    description: 'Warm charcoal with stone — near-monochrome, gallery quiet.',
    primaryColor: '#2B2926',
    secondaryColor: '#CFC8BC',
  },
  'bold-ember': {
    id: 'bold-ember',
    name: 'Ember',
    useCase: 'Bold / modern',
    description: 'Ember orange against ink — confident, high-energy retail.',
    primaryColor: '#C24E2A',
    secondaryColor: '#1F2933',
  },
  'natural-earth': {
    id: 'natural-earth',
    name: 'Clay & Olive',
    useCase: 'Natural / earthy',
    description: 'Terracotta with olive — handmade, grounded, artisanal.',
    primaryColor: '#8A5A3B',
    secondaryColor: '#6E7A4F',
  },
};

export const COLOR_PRESET_LIST = Object.values(COLOR_PRESETS);

/* ── Settings normalisation ─────────────────────────────────────────────── */

export function createDefaultColorSettings(): ColorSettings {
  const preset = COLOR_PRESETS[DEFAULT_COLOR_PRESET_ID];
  return {
    presetId: preset.id,
    primaryColor: preset.primaryColor,
    secondaryColor: preset.secondaryColor,
  };
}

export function normalizeColorSettings(input: unknown): {
  settings: ColorSettings;
  errors: string[];
} {
  const defaults = createDefaultColorSettings();
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { settings: defaults, errors };
  }

  const raw = input as Record<string, unknown>;

  const presetIdRaw =
    typeof raw.presetId === 'string' && raw.presetId.trim() ? raw.presetId.trim() : null;
  if (presetIdRaw && !COLOR_PRESETS[presetIdRaw]) {
    errors.push(`Unknown colour preset "${presetIdRaw}".`);
  }
  const presetId = presetIdRaw && COLOR_PRESETS[presetIdRaw] ? presetIdRaw : null;

  const readColor = (value: unknown, label: string, fallback: string): string => {
    if (typeof value === 'undefined' || value === null || value === '') return fallback;
    if (!isValidHexColor(value)) {
      errors.push(`${label} must be a hex colour like #1F1C19.`);
      return fallback;
    }
    return normalizeHex(value);
  };

  // An explicit colour always wins; the preset only supplies what is missing.
  const preset = presetId ? COLOR_PRESETS[presetId] : null;
  const primaryColor = readColor(
    raw.primaryColor,
    'Primary colour',
    preset?.primaryColor ?? defaults.primaryColor,
  );
  const secondaryColor = readColor(
    raw.secondaryColor,
    'Secondary colour',
    preset?.secondaryColor ?? defaults.secondaryColor,
  );

  // Once a colour diverges from its preset the selection is genuinely custom.
  const matchesPreset =
    preset != null &&
    preset.primaryColor.toLowerCase() === primaryColor.toLowerCase() &&
    preset.secondaryColor.toLowerCase() === secondaryColor.toLowerCase();

  return {
    settings: {
      presetId: matchesPreset ? preset!.id : null,
      primaryColor,
      secondaryColor,
    },
    errors,
  };
}

export function applyColorPreset(presetId: string): ColorSettings | null {
  const preset = COLOR_PRESETS[presetId];
  if (!preset) return null;
  return {
    presetId: preset.id,
    primaryColor: preset.primaryColor,
    secondaryColor: preset.secondaryColor,
  };
}

/* ── Derivation ─────────────────────────────────────────────────────────── */

/** Hue-anchored state colours. Hue is fixed so red still reads as danger. */
const STATE_HUES = { destructive: 27, success: 149, warning: 79, info: 247 };

/** Neutral surfaces carry a trace of the brand hue — this is what reads "warm". */
const NEUTRAL_CHROMA_LIGHT = 0.012;
const NEUTRAL_CHROMA_DARK = 0.014;

/**
 * Below this chroma a colour is effectively grey and its hue is numerically
 * meaningless — pure #1A1A1A reports hue 0°, which would tint every surface pink.
 * Achromatic brands fall back to a warm sand hue instead, which is what keeps a
 * monochrome palette reading as premium rather than clinical.
 */
const ACHROMATIC_CHROMA = 0.008;
const WARM_NEUTRAL_HUE = 70;
const WARM_ACCENT_HUE = 62;

const isAchromatic = (color: Oklch) => color.c < ACHROMATIC_CHROMA;

/** Replace a meaningless hue with the warm neutral so downstream maths is sane. */
const withMeaningfulHue = (color: Oklch): Oklch =>
  isAchromatic(color) ? { ...color, h: WARM_NEUTRAL_HUE } : color;

const shade = (base: Oklch, l: number, c: number): string =>
  oklchToHex({ l: clamp(l, 0, 1), c: Math.max(0, c), h: base.h });

/**
 * A secondary colour is only usable as an accent if it has enough chroma and sits
 * far enough from the page background. A near-white secondary (a common choice for
 * "soft surface" branding) would make accents and charts invisible, so in that
 * case the accent family is derived from a hue rotation of the primary instead.
 */
function pickAccentSource(
  primary: Oklch,
  secondary: Oklch,
  primaryIsGrey: boolean,
): Oklch {
  const usable = secondary.c >= 0.035 && secondary.l <= 0.9;
  if (usable) return secondary;
  // Rotating a grey primary would land on an arbitrary hue, so a monochrome
  // brand gets a deliberate warm amber accent rather than a computed one.
  if (primaryIsGrey) return { l: primary.l, c: 0.085, h: WARM_ACCENT_HUE };
  return { ...rotateHue(primary, 42), c: Math.max(primary.c, 0.09) };
}

interface Recipe {
  bg: number;
  card: number;
  popover: number;
  muted: number;
  mutedFg: number;
  subtleFg: number;
  accent: number;
  border: number;
  input: number;
  fg: number;
  sidebar: number;
  sidebarAccent: number;
  sidebarBorder: number;
  neutralChroma: number;
  stateL: number;
  chartL: number[];
  minSurfaceRatio: number;
}

const LIGHT_RECIPE: Recipe = {
  bg: 0.985,
  card: 0.998,
  popover: 0.996,
  muted: 0.958,
  mutedFg: 0.505,
  subtleFg: 0.6,
  accent: 0.936,
  border: 0.902,
  input: 0.928,
  fg: 0.215,
  sidebar: 0.974,
  sidebarAccent: 0.944,
  sidebarBorder: 0.914,
  neutralChroma: NEUTRAL_CHROMA_LIGHT,
  stateL: 0.55,
  chartL: [0.62, 0.7, 0.54, 0.76, 0.46],
  minSurfaceRatio: 3,
};

const DARK_RECIPE: Recipe = {
  bg: 0.155,
  card: 0.196,
  popover: 0.226,
  muted: 0.224,
  mutedFg: 0.688,
  subtleFg: 0.6,
  accent: 0.266,
  border: 0.306,
  input: 0.358,
  fg: 0.945,
  sidebar: 0.182,
  sidebarAccent: 0.252,
  sidebarBorder: 0.29,
  neutralChroma: NEUTRAL_CHROMA_DARK,
  stateL: 0.64,
  chartL: [0.7, 0.77, 0.63, 0.83, 0.56],
  minSurfaceRatio: 3,
};

function derive(
  primaryHex: string,
  secondaryHex: string,
  recipe: Recipe,
): { hex: Record<string, string>; contrast: ColorContrastCheck[] } {
  const rawPrimary = hexToOklch(primaryHex);
  const primaryIsGrey = isAchromatic(rawPrimary);
  const primary = withMeaningfulHue(rawPrimary);
  const secondary = withMeaningfulHue(hexToOklch(secondaryHex));
  const accentSource = pickAccentSource(primary, secondary, primaryIsGrey);
  const neutral: Oklch = { l: 0.5, c: recipe.neutralChroma, h: primary.h };

  const background = shade(neutral, recipe.bg, recipe.neutralChroma * 0.65);
  const card = shade(neutral, recipe.card, recipe.neutralChroma * 0.45);
  const popover = shade(neutral, recipe.popover, recipe.neutralChroma * 0.5);
  const muted = shade(neutral, recipe.muted, recipe.neutralChroma);
  const border = shade(neutral, recipe.border, recipe.neutralChroma * 1.15);
  const input = shade(neutral, recipe.input, recipe.neutralChroma);
  const sidebar = shade(neutral, recipe.sidebar, recipe.neutralChroma * 0.7);
  const sidebarAccent = shade(neutral, recipe.sidebarAccent, recipe.neutralChroma);
  const sidebarBorder = shade(neutral, recipe.sidebarBorder, recipe.neutralChroma * 1.1);

  const foreground = ensureContrast(
    shade(neutral, recipe.fg, recipe.neutralChroma * 1.5),
    background,
    7,
  );
  const mutedForeground = ensureContrast(
    shade(neutral, recipe.mutedFg, recipe.neutralChroma * 1.3),
    background,
    4.5,
  );
  // A third text tier. The design uses two greys for secondary and tertiary copy;
  // this one sits at the AA floor so the hierarchy survives without dropping below
  // 4.5:1 the way a plain opacity modifier would.
  const subtleForeground = ensureContrast(
    shade(neutral, recipe.subtleFg, recipe.neutralChroma * 1.1),
    background,
    4.5,
  );

  // The brand colours themselves must stay visible as UI surfaces. A near-black
  // primary is unreadable on a dark background, so lightness is pulled toward the
  // usable range while hue and chroma — the recognisable part — are preserved.
  const brandSurface = (color: Oklch, fallbackChroma: number): string => {
    const candidate = oklchToHex({
      l: color.l,
      c: Math.max(color.c, fallbackChroma),
      h: color.h,
    });
    return ensureContrast(candidate, background, recipe.minSurfaceRatio);
  };

  const primarySurface = brandSurface(primary, 0);
  const secondaryBase = shade(
    accentSource,
    recipe.accent - (recipe.bg > 0.5 ? 0.02 : -0.08),
    Math.min(accentSource.c, 0.042),
  );
  // Honour an explicit secondary when it can stand as its own surface.
  const secondarySurface =
    secondary.c >= 0.035 && Math.abs(secondary.l - recipe.bg) > 0.06
      ? brandSurface(secondary, 0)
      : secondaryBase;

  const accent = shade(accentSource, recipe.accent, Math.min(accentSource.c, 0.042));
  const ring = ensureContrast(
    oklchToHex({ l: recipe.bg > 0.5 ? 0.58 : 0.68, c: Math.max(primary.c, 0.07), h: primary.h }),
    background,
    3,
  );

  const stateColor = (hue: number): string =>
    oklchToHex({
      l: recipe.stateL,
      c: clamp(Math.max(primary.c, 0.11) * 1.05, 0.11, 0.19),
      h: hue,
    });

  const destructive = ensureContrast(stateColor(STATE_HUES.destructive), background, 3);
  const success = ensureContrast(stateColor(STATE_HUES.success), background, 3);
  const warning = ensureContrast(stateColor(STATE_HUES.warning), background, 3);
  const info = ensureContrast(stateColor(STATE_HUES.info), background, 3);

  // Charts: anchored on the brand pair, then spread around the wheel with
  // stepped lightness so adjacent series stay distinguishable.
  const chartHues = [primary.h, accentSource.h, primary.h + 152, accentSource.h + 64, primary.h + 256];
  const chartChroma = clamp(Math.max(primary.c, accentSource.c, 0.09) * 1.05, 0.09, 0.16);
  const charts = chartHues.map((hue, index) =>
    oklchToHex({ l: recipe.chartL[index], c: chartChroma, h: (hue + 360) % 360 }),
  );

  const sidebarPrimary = brandSurface(accentSource, 0.07);

  const hex: Record<string, string> = {
    '--background': background,
    '--foreground': foreground,
    '--card': card,
    '--card-foreground': ensureContrast(foreground, card, 7),
    '--popover': popover,
    '--popover-foreground': ensureContrast(foreground, popover, 7),
    '--primary': primarySurface,
    '--primary-foreground': readableForeground(primarySurface, { minRatio: 4.5 }),
    '--secondary': secondarySurface,
    '--secondary-foreground': readableForeground(secondarySurface, { minRatio: 4.5 }),
    '--muted': muted,
    '--muted-foreground': mutedForeground,
    '--subtle-foreground': subtleForeground,
    '--accent': accent,
    '--accent-foreground': readableForeground(accent, { minRatio: 4.5 }),
    '--destructive': destructive,
    '--destructive-foreground': readableForeground(destructive, { minRatio: 4.5 }),
    '--success': success,
    '--success-foreground': readableForeground(success, { minRatio: 4.5 }),
    '--warning': warning,
    '--warning-foreground': readableForeground(warning, { minRatio: 4.5 }),
    '--info': info,
    '--info-foreground': readableForeground(info, { minRatio: 4.5 }),
    '--border': border,
    '--input': input,
    '--ring': ring,
    '--chart-1': charts[0],
    '--chart-2': charts[1],
    '--chart-3': charts[2],
    '--chart-4': charts[3],
    '--chart-5': charts[4],
    '--sidebar': sidebar,
    '--sidebar-foreground': ensureContrast(foreground, sidebar, 7),
    '--sidebar-primary': sidebarPrimary,
    '--sidebar-primary-foreground': readableForeground(sidebarPrimary, { minRatio: 4.5 }),
    '--sidebar-accent': sidebarAccent,
    '--sidebar-accent-foreground': ensureContrast(foreground, sidebarAccent, 7),
    '--sidebar-border': sidebarBorder,
    '--sidebar-ring': ring,
  };

  // Numeric ramps. These exist because ~300 call sites still use `primary-600`
  // style classes; generating them keeps those on-theme instead of hardcoded.
  Object.assign(hex, buildScale('primary', primary, recipe));
  Object.assign(hex, buildScale('secondary', accentSource, recipe));
  Object.assign(hex, buildScale('beige', { ...accentSource, c: Math.min(accentSource.c, 0.045) }, recipe));
  Object.assign(hex, buildScale('sandy', rotateHue(accentSource, 18), recipe));
  // State ramps: `success-600`, `info-100` and friends are used ~230 times, so
  // they are generated from the resolved state colours rather than left hardcoded.
  Object.assign(hex, buildScale('destructive', hexToOklch(destructive), recipe));
  Object.assign(hex, buildScale('success', hexToOklch(success), recipe));
  Object.assign(hex, buildScale('warning', hexToOklch(warning), recipe));
  Object.assign(hex, buildScale('info', hexToOklch(info), recipe));

  const contrast: ColorContrastCheck[] = [
    ['--foreground', '--background', 7],
    ['--muted-foreground', '--background', 4.5],
    ['--subtle-foreground', '--background', 4.5],
    ['--card-foreground', '--card', 7],
    ['--popover-foreground', '--popover', 7],
    ['--primary-foreground', '--primary', 4.5],
    ['--secondary-foreground', '--secondary', 4.5],
    ['--accent-foreground', '--accent', 4.5],
    ['--destructive-foreground', '--destructive', 4.5],
    ['--success-foreground', '--success', 4.5],
    ['--warning-foreground', '--warning', 4.5],
    ['--info-foreground', '--info', 4.5],
    ['--sidebar-foreground', '--sidebar', 7],
    ['--sidebar-primary-foreground', '--sidebar-primary', 4.5],
    ['--sidebar-accent-foreground', '--sidebar-accent', 7],
    ['--primary', '--background', 3],
    ['--ring', '--background', 3],
  ].map(([token, against, required]) => {
    const ratio = contrastRatio(hex[token as string], hex[against as string]);
    return {
      token: token as string,
      against: against as string,
      ratio: Math.round(ratio * 100) / 100,
      required: required as number,
      passes: ratio >= (required as number) - 0.05,
    };
  });

  return { hex, contrast };
}

/**
 * Perceptual 50–900 ramp. The step nearest the brand colour's own lightness is
 * pinned to the brand colour exactly, so the scale contains the real brand hue
 * instead of an approximation of it.
 */
const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
const SCALE_TARGETS = [0.975, 0.945, 0.9, 0.84, 0.755, 0.66, 0.565, 0.47, 0.375, 0.275];

function buildScale(
  name: string,
  base: Oklch,
  recipe: Recipe,
): Record<string, string> {
  const anchor = SCALE_TARGETS.reduce(
    (best, target, index) =>
      Math.abs(target - base.l) < Math.abs(SCALE_TARGETS[best] - base.l) ? index : best,
    0,
  );

  const out: Record<string, string> = {};
  SCALE_STEPS.forEach((step, index) => {
    if (index === anchor) {
      out[`--${name}-${step}`] = oklchToHex(base);
      return;
    }
    const target = SCALE_TARGETS[index];
    // Chroma tapers toward the light end so tints stay tasteful rather than pastel.
    const distance = Math.abs(index - anchor) / SCALE_TARGETS.length;
    const chroma = base.c * (index < anchor ? 1 - distance * 1.15 : 1 - distance * 0.35);
    out[`--${name}-${step}`] = oklchToHex({
      l: target,
      c: Math.max(chroma, recipe.neutralChroma * 0.5),
      h: base.h,
    });
  });
  return out;
}

/** Tokens consumed as complete CSS values (`var(--x)`) rather than HSL triplets. */
const RAW_VALUE_TOKENS = new Set([
  '--color-primary',
  '--color-secondary',
  '--color-beige',
  '--color-sandy-brown',
  '--color-bg-primary',
  '--color-text-primary',
  '--color-text-secondary',
  '--color-text-muted',
  '--color-border',
  '--color-border-strong',
  '--color-cta-bg',
  '--color-cta-text',
  '--color-cta-hover-bg',
]);

function toCssVariables(hex: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [token, value] of Object.entries(hex)) {
    out[token] = RAW_VALUE_TOKENS.has(token) ? value : hexToHslTriplet(value);
  }
  return out;
}

function withRawTokens(
  hex: Record<string, string>,
  primaryColor: string,
  secondaryColor: string,
): Record<string, string> {
  return {
    ...hex,
    '--color-primary': primaryColor,
    '--color-secondary': secondaryColor,
    '--color-beige': hex['--beige-200'],
    '--color-sandy-brown': hex['--sandy-500'],
    '--color-bg-primary': hex['--background'],
    '--color-text-primary': hex['--foreground'],
    '--color-text-secondary': hex['--muted-foreground'],
    '--color-text-muted': hex['--muted-foreground'],
    '--color-border': hex['--border'],
    // "Strong" borders are the hairline rules and link underlines in the luxury
    // styles — they read as ink, not as a subtle divider.
    '--color-border-strong': hex['--foreground'],
    '--color-cta-bg': hex['--primary'],
    '--color-cta-text': hex['--primary-foreground'],
    '--color-cta-hover-bg': hex['--primary-700'],
  };
}

/* ── Public resolver ────────────────────────────────────────────────────── */

export function resolveColors(input: unknown): ResolvedColorsOutput {
  const { settings } = normalizeColorSettings(input);

  const light = derive(settings.primaryColor, settings.secondaryColor, LIGHT_RECIPE);
  const dark = derive(settings.primaryColor, settings.secondaryColor, DARK_RECIPE);

  const lightHex = withRawTokens(light.hex, settings.primaryColor, settings.secondaryColor);
  const darkHex = withRawTokens(dark.hex, settings.primaryColor, settings.secondaryColor);

  return {
    settings,
    light: toCssVariables(lightHex),
    dark: toCssVariables(darkHex),
    lightHex,
    darkHex,
    contrast: [
      ...light.contrast.map((c) => ({ ...c, token: `light ${c.token}` })),
      ...dark.contrast.map((c) => ({ ...c, token: `dark ${c.token}` })),
    ],
  };
}

export function colorVariablesToInlineCss(
  light: Record<string, string>,
  dark: Record<string, string>,
): string {
  const block = (vars: Record<string, string>) =>
    Object.entries(vars)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([token, value]) => `${token}: ${value};`)
      .join(' ');

  const lightBlock = block(light);
  const darkBlock = block(dark);
  if (!lightBlock && !darkBlock) return '';

  // `.dark` is emitted alongside `:root` so the first paint is correct in either
  // appearance without waiting for client JS.
  return `:root { ${lightBlock} } .dark { ${darkBlock} }`;
}

export function colorSignature(input: unknown): string {
  return JSON.stringify(normalizeColorSettings(input).settings);
}

export function hasColorsChanged(previous: unknown, next: unknown): boolean {
  return colorSignature(previous) !== colorSignature(next);
}

