export const TYPOGRAPHY_ROLES = [
  'body',
  'heading',
  'title',
  'subtitle',
  'paragraph',
  'button',
  'navigation',
  'label',
  'price',
  'caption',
  'display',
] as const;

export type TypographyRole = (typeof TYPOGRAPHY_ROLES)[number];
export type TypographyMode = 'single' | 'multi';
export type FontCategory = 'serif' | 'sans-serif' | 'display';
export type FontSource = 'google' | 'system' | 'licensed';

export interface TypographyRoleConfig {
  fontId: string;
  weight: number;
}

export interface TypographySettings {
  mode: TypographyMode;
  globalFontId: string;
  presetId: string | null;
  roles: Record<TypographyRole, TypographyRoleConfig>;
}

export interface FontRegistryItem {
  id: string;
  displayName: string;
  fontFamily: string;
  category: FontCategory;
  fontType: FontCategory;
  availableWeights: number[];
  availableStyles: Array<'normal' | 'italic'>;
  recommendedRoles: TypographyRole[];
  fallbackStack: string[];
  source: FontSource;
  googleFamily?: string;
}

export interface TypographyPreset {
  id: string;
  name: string;
  description: string;
  mode: TypographyMode;
  globalFontId?: string;
  roles: Record<TypographyRole, TypographyRoleConfig>;
}

export const TYPOGRAPHY_ROLE_LABELS: Record<TypographyRole, string> = {
  body: 'Body',
  heading: 'Heading',
  title: 'Title',
  subtitle: 'Subtitle',
  paragraph: 'Paragraph',
  button: 'Button',
  navigation: 'Navigation',
  label: 'Label',
  price: 'Price',
  caption: 'Caption',
  display: 'Display',
};

const DISPLAY_ROLES: TypographyRole[] = ['display', 'heading', 'title', 'subtitle'];
const UI_ROLES: TypographyRole[] = [
  'body',
  'paragraph',
  'navigation',
  'button',
  'label',
  'price',
  'caption',
];

const DISPLAY_DEFAULT_FONT_ID = 'cormorant-garamond';
const UI_DEFAULT_FONT_ID = 'avenir-next';

const DEFAULT_ROLE_WEIGHTS: Record<TypographyRole, number> = {
  display: 600,
  heading: 600,
  title: 500,
  subtitle: 500,
  body: 400,
  paragraph: 400,
  navigation: 500,
  button: 600,
  price: 600,
  label: 500,
  caption: 400,
};

function withDisplayRoles(sourceRoles: TypographyRole[]): TypographyRole[] {
  return Array.from(new Set([...sourceRoles, ...DISPLAY_ROLES]));
}

function withUiRoles(sourceRoles: TypographyRole[]): TypographyRole[] {
  return Array.from(new Set([...sourceRoles, ...UI_ROLES]));
}

export const FONT_REGISTRY: Record<string, FontRegistryItem> = {
  'canela': {
    id: 'canela',
    displayName: 'Canela',
    fontFamily: 'Canela',
    category: 'display',
    fontType: 'display',
    availableWeights: [300, 400, 500, 600, 700],
    availableStyles: ['normal', 'italic'],
    recommendedRoles: withDisplayRoles(['display', 'heading', 'title']),
    fallbackStack: ['ui-serif', 'Georgia', 'serif'],
    source: 'licensed',
  },
  'cormorant-garamond': {
    id: 'cormorant-garamond',
    displayName: 'Cormorant Garamond',
    fontFamily: 'Cormorant Garamond',
    category: 'serif',
    fontType: 'serif',
    availableWeights: [300, 400, 500, 600, 700],
    availableStyles: ['normal', 'italic'],
    recommendedRoles: withDisplayRoles(['display', 'heading', 'title', 'subtitle']),
    fallbackStack: ['ui-serif', 'Georgia', 'serif'],
    source: 'google',
    googleFamily: 'Cormorant Garamond',
  },
  'gt-super': {
    id: 'gt-super',
    displayName: 'GT Super',
    fontFamily: 'GT Super',
    category: 'serif',
    fontType: 'serif',
    availableWeights: [300, 400, 500, 700],
    availableStyles: ['normal', 'italic'],
    recommendedRoles: withDisplayRoles(['display', 'heading', 'title']),
    fallbackStack: ['ui-serif', 'Georgia', 'serif'],
    source: 'licensed',
  },
  'neue-haas-grotesk': {
    id: 'neue-haas-grotesk',
    displayName: 'Neue Haas Grotesk',
    fontFamily: 'Neue Haas Grotesk',
    category: 'sans-serif',
    fontType: 'sans-serif',
    availableWeights: [300, 400, 500, 600, 700],
    availableStyles: ['normal', 'italic'],
    recommendedRoles: withUiRoles(['body', 'paragraph', 'navigation']),
    fallbackStack: ['system-ui', 'sans-serif'],
    source: 'licensed',
  },
  'avenir-next': {
    id: 'avenir-next',
    displayName: 'Avenir Next',
    fontFamily: 'Avenir Next',
    category: 'sans-serif',
    fontType: 'sans-serif',
    availableWeights: [400, 500, 600, 700],
    availableStyles: ['normal', 'italic'],
    recommendedRoles: withUiRoles(['body', 'paragraph', 'button', 'label', 'price']),
    fallbackStack: ['Avenir', 'system-ui', 'sans-serif'],
    source: 'system',
  },
  'bodoni-moda': {
    id: 'bodoni-moda',
    displayName: 'Bodoni Moda',
    fontFamily: 'Bodoni Moda',
    category: 'serif',
    fontType: 'serif',
    availableWeights: [400, 500, 600, 700],
    availableStyles: ['normal', 'italic'],
    recommendedRoles: withDisplayRoles(['display', 'heading', 'title']),
    fallbackStack: ['Didot', 'Bodoni MT', 'ui-serif', 'serif'],
    source: 'google',
    googleFamily: 'Bodoni Moda',
  },
  'recoleta': {
    id: 'recoleta',
    displayName: 'Recoleta',
    fontFamily: 'Recoleta',
    category: 'display',
    fontType: 'display',
    availableWeights: [300, 400, 500, 600, 700],
    availableStyles: ['normal', 'italic'],
    recommendedRoles: withDisplayRoles(['display', 'heading', 'title']),
    fallbackStack: ['ui-serif', 'Georgia', 'serif'],
    source: 'licensed',
  },
  'sohne': {
    id: 'sohne',
    displayName: 'Sohne',
    fontFamily: 'Sohne',
    category: 'sans-serif',
    fontType: 'sans-serif',
    availableWeights: [300, 400, 500, 600, 700],
    availableStyles: ['normal', 'italic'],
    recommendedRoles: withUiRoles(['body', 'paragraph', 'button', 'navigation']),
    fallbackStack: ['system-ui', 'sans-serif'],
    source: 'licensed',
  },
  'didot': {
    id: 'didot',
    displayName: 'Didot',
    fontFamily: 'Didot',
    category: 'serif',
    fontType: 'serif',
    availableWeights: [400, 500, 600, 700],
    availableStyles: ['normal', 'italic'],
    recommendedRoles: withDisplayRoles(['display', 'heading', 'title']),
    fallbackStack: ['Bodoni MT', 'ui-serif', 'serif'],
    source: 'system',
  },
  'gt-america': {
    id: 'gt-america',
    displayName: 'GT America',
    fontFamily: 'GT America',
    category: 'sans-serif',
    fontType: 'sans-serif',
    availableWeights: [300, 400, 500, 600, 700],
    availableStyles: ['normal', 'italic'],
    recommendedRoles: withUiRoles(['body', 'paragraph', 'button', 'navigation']),
    fallbackStack: ['system-ui', 'sans-serif'],
    source: 'licensed',
  },
  'optima': {
    id: 'optima',
    displayName: 'Optima',
    fontFamily: 'Optima',
    category: 'sans-serif',
    fontType: 'sans-serif',
    availableWeights: [400, 500, 600, 700],
    availableStyles: ['normal'],
    recommendedRoles: withUiRoles(['body', 'paragraph', 'navigation']),
    fallbackStack: ['Gill Sans', 'Trebuchet MS', 'sans-serif'],
    source: 'system',
  },
  'editorial-new': {
    id: 'editorial-new',
    displayName: 'Editorial New',
    fontFamily: 'Editorial New',
    category: 'display',
    fontType: 'display',
    availableWeights: [300, 400, 500, 700],
    availableStyles: ['normal', 'italic'],
    recommendedRoles: withDisplayRoles(['display', 'heading', 'title']),
    fallbackStack: ['ui-serif', 'Georgia', 'serif'],
    source: 'licensed',
  },
  'playfair-display': {
    id: 'playfair-display',
    displayName: 'Playfair Display',
    fontFamily: 'Playfair Display',
    category: 'serif',
    fontType: 'serif',
    availableWeights: [400, 500, 600, 700],
    availableStyles: ['normal', 'italic'],
    recommendedRoles: withDisplayRoles(['display', 'heading', 'title', 'subtitle']),
    fallbackStack: ['ui-serif', 'Georgia', 'serif'],
    source: 'google',
    googleFamily: 'Playfair Display',
  },
  'dm-sans': {
    id: 'dm-sans',
    displayName: 'DM Sans',
    fontFamily: 'DM Sans',
    category: 'sans-serif',
    fontType: 'sans-serif',
    availableWeights: [400, 500, 600, 700],
    availableStyles: ['normal', 'italic'],
    recommendedRoles: withUiRoles(['body', 'paragraph', 'button', 'label', 'navigation']),
    fallbackStack: ['system-ui', 'sans-serif'],
    source: 'google',
    googleFamily: 'DM Sans',
  },
  'inter': {
    id: 'inter',
    displayName: 'Inter',
    fontFamily: 'Inter',
    category: 'sans-serif',
    fontType: 'sans-serif',
    availableWeights: [300, 400, 500, 600, 700],
    availableStyles: ['normal', 'italic'],
    recommendedRoles: withUiRoles(['body', 'paragraph', 'button', 'navigation', 'caption']),
    fallbackStack: ['Inter Fallback', 'system-ui', 'sans-serif'],
    source: 'google',
    googleFamily: 'Inter',
  },
  'manrope': {
    id: 'manrope',
    displayName: 'Manrope',
    fontFamily: 'Manrope',
    category: 'sans-serif',
    fontType: 'sans-serif',
    availableWeights: [300, 400, 500, 600, 700, 800],
    availableStyles: ['normal'],
    recommendedRoles: withUiRoles(['body', 'paragraph', 'button', 'label', 'price']),
    fallbackStack: ['system-ui', 'sans-serif'],
    source: 'google',
    googleFamily: 'Manrope',
  },
  'helvetica-now': {
    id: 'helvetica-now',
    displayName: 'Helvetica Now',
    fontFamily: 'Helvetica Now',
    category: 'sans-serif',
    fontType: 'sans-serif',
    availableWeights: [300, 400, 500, 700],
    availableStyles: ['normal', 'italic'],
    recommendedRoles: withUiRoles(['body', 'paragraph', 'button', 'navigation']),
    fallbackStack: ['system-ui', 'sans-serif'],
    source: 'licensed',
  },
  'cormorant': {
    id: 'cormorant',
    displayName: 'Cormorant',
    fontFamily: 'Cormorant',
    category: 'serif',
    fontType: 'serif',
    availableWeights: [300, 400, 500, 600, 700],
    availableStyles: ['normal', 'italic'],
    recommendedRoles: withDisplayRoles(['display', 'heading', 'title']),
    fallbackStack: ['ui-serif', 'Georgia', 'serif'],
    source: 'google',
    googleFamily: 'Cormorant',
  },
  'libre-baskerville': {
    id: 'libre-baskerville',
    displayName: 'Libre Baskerville',
    fontFamily: 'Libre Baskerville',
    category: 'serif',
    fontType: 'serif',
    availableWeights: [400, 700],
    availableStyles: ['normal', 'italic'],
    recommendedRoles: withDisplayRoles(['heading', 'title', 'subtitle']),
    fallbackStack: ['ui-serif', 'Georgia', 'serif'],
    source: 'google',
    googleFamily: 'Libre Baskerville',
  },
  'cooper': {
    id: 'cooper',
    displayName: 'Cooper',
    fontFamily: 'Cooper',
    category: 'display',
    fontType: 'display',
    availableWeights: [400, 500, 700],
    availableStyles: ['normal'],
    recommendedRoles: withDisplayRoles(['display', 'heading', 'title']),
    fallbackStack: ['Cooper Black', 'Georgia', 'serif'],
    source: 'system',
  },
};

export const FONT_REGISTRY_LIST = Object.values(FONT_REGISTRY);

const dynamicFontAliases: Array<[string, string]> = [
  ...FONT_REGISTRY_LIST.map(
    (font) => [font.id.toLowerCase(), font.id] as [string, string],
  ),
  ...FONT_REGISTRY_LIST.map(
    (font) => [font.displayName.toLowerCase(), font.id] as [string, string],
  ),
];

const staticFontAliases: Array<[string, string]> = [
  ['soehne', 'sohne'],
  ['söhne', 'sohne'],
  ['cormorant garamond', 'cormorant-garamond'],
  ['dm sans', 'dm-sans'],
  ['gt america', 'gt-america'],
  ['gt super', 'gt-super'],
  ['neue haas grotesk', 'neue-haas-grotesk'],
  ['playfair display', 'playfair-display'],
  ['libre baskerville', 'libre-baskerville'],
  ['avenir next', 'avenir-next'],
  ['helvetica now', 'helvetica-now'],
];

const FONT_ALIASES = new Map<string, string>([
  ...dynamicFontAliases,
  ...staticFontAliases,
]);

function quoteFamily(name: string): string {
  return `"${name.replace(/"/g, '\\"')}"`;
}

export function buildFontStack(fontId: string): string {
  const font = FONT_REGISTRY[fontId];
  if (!font) {
    return `"Avenir Next", "Avenir", system-ui, sans-serif`;
  }

  return [quoteFamily(font.fontFamily), ...font.fallbackStack].join(', ');
}

/**
 * jsPDF ships only the 14 standard PostScript fonts, so a themed family cannot be
 * rendered without embedding a binary. Map the selected role onto the closest
 * built-in instead, so invoices at least follow the serif/sans character of the
 * chosen typography rather than being pinned to Helvetica.
 */
export type PdfBaseFont = 'helvetica' | 'times' | 'courier';

export function getPdfBaseFontForRole(
  typographySettings: unknown,
  role: TypographyRole,
): PdfBaseFont {
  const { settings } = normalizeTypographySettings(typographySettings);
  const font = FONT_REGISTRY[settings.roles[role].fontId];
  if (!font) return 'helvetica';
  return font.category === 'sans-serif' ? 'helvetica' : 'times';
}

export const MONOSPACE_FONT_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

export function getDefaultBodyFontStack(): string {
  return buildFontStack(UI_DEFAULT_FONT_ID);
}

export function resolveFontId(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;
  return FONT_ALIASES.get(normalized) || null;
}

export function getFontById(fontId: string): FontRegistryItem | null {
  return FONT_REGISTRY[fontId] || null;
}

function pickClosestWeight(availableWeights: number[], desiredWeight: number): number {
  const sorted = [...availableWeights].sort((a, b) => a - b);
  return sorted.reduce((closest, candidate) => {
    const currentDistance = Math.abs(candidate - desiredWeight);
    const closestDistance = Math.abs(closest - desiredWeight);
    return currentDistance < closestDistance ? candidate : closest;
  }, sorted[0] || 400);
}

function normalizeWeightForFont(
  fontId: string,
  candidateWeight: unknown,
  role: TypographyRole,
): number {
  const font = FONT_REGISTRY[fontId];
  if (!font) return DEFAULT_ROLE_WEIGHTS[role];

  const desired =
    typeof candidateWeight === 'number' && Number.isFinite(candidateWeight)
      ? candidateWeight
      : DEFAULT_ROLE_WEIGHTS[role];

  if (font.availableWeights.includes(desired)) {
    return desired;
  }

  return pickClosestWeight(font.availableWeights, desired);
}

function resolveGlobalFontId(candidate: unknown): string {
  const fontId = typeof candidate === 'string' ? candidate : null;
  return fontId && FONT_REGISTRY[fontId] ? fontId : UI_DEFAULT_FONT_ID;
}

/**
 * In `single` mode every role collapses onto the global font (per-role weights are
 * kept, snapped to what that font actually ships). In `multi` mode the per-role
 * assignments are authoritative and pass through untouched.
 */
function applyModeToRoles(
  mode: TypographyMode,
  globalFontId: string,
  roles: Record<TypographyRole, TypographyRoleConfig>,
): Record<TypographyRole, TypographyRoleConfig> {
  if (mode !== 'single') return roles;

  return TYPOGRAPHY_ROLES.reduce((accumulator, role) => {
    accumulator[role] = {
      fontId: globalFontId,
      weight: normalizeWeightForFont(globalFontId, roles[role]?.weight, role),
    };
    return accumulator;
  }, {} as Record<TypographyRole, TypographyRoleConfig>);
}

function normalizeMode(candidate: unknown): TypographyMode | null {
  if (typeof candidate !== 'string') return null;
  const normalized = candidate.trim().toLowerCase();
  return normalized === 'single' || normalized === 'multi' ? normalized : null;
}

function createElegantWarmRoles(): Record<TypographyRole, TypographyRoleConfig> {
  return {
    display: {
      fontId: DISPLAY_DEFAULT_FONT_ID,
      weight: normalizeWeightForFont(DISPLAY_DEFAULT_FONT_ID, 600, 'display'),
    },
    heading: {
      fontId: DISPLAY_DEFAULT_FONT_ID,
      weight: normalizeWeightForFont(DISPLAY_DEFAULT_FONT_ID, 600, 'heading'),
    },
    title: {
      fontId: DISPLAY_DEFAULT_FONT_ID,
      weight: normalizeWeightForFont(DISPLAY_DEFAULT_FONT_ID, 500, 'title'),
    },
    subtitle: {
      fontId: DISPLAY_DEFAULT_FONT_ID,
      weight: normalizeWeightForFont(DISPLAY_DEFAULT_FONT_ID, 500, 'subtitle'),
    },
    body: {
      fontId: UI_DEFAULT_FONT_ID,
      weight: normalizeWeightForFont(UI_DEFAULT_FONT_ID, 400, 'body'),
    },
    paragraph: {
      fontId: UI_DEFAULT_FONT_ID,
      weight: normalizeWeightForFont(UI_DEFAULT_FONT_ID, 400, 'paragraph'),
    },
    navigation: {
      fontId: UI_DEFAULT_FONT_ID,
      weight: normalizeWeightForFont(UI_DEFAULT_FONT_ID, 500, 'navigation'),
    },
    button: {
      fontId: UI_DEFAULT_FONT_ID,
      weight: normalizeWeightForFont(UI_DEFAULT_FONT_ID, 600, 'button'),
    },
    price: {
      fontId: UI_DEFAULT_FONT_ID,
      weight: normalizeWeightForFont(UI_DEFAULT_FONT_ID, 600, 'price'),
    },
    label: {
      fontId: UI_DEFAULT_FONT_ID,
      weight: normalizeWeightForFont(UI_DEFAULT_FONT_ID, 500, 'label'),
    },
    caption: {
      fontId: UI_DEFAULT_FONT_ID,
      weight: normalizeWeightForFont(UI_DEFAULT_FONT_ID, 400, 'caption'),
    },
  };
}

export const DEFAULT_TYPOGRAPHY_PRESET_ID = 'elegant-warm';

export const TYPOGRAPHY_PRESETS: Record<string, TypographyPreset> = {
  [DEFAULT_TYPOGRAPHY_PRESET_ID]: {
    id: DEFAULT_TYPOGRAPHY_PRESET_ID,
    name: 'Elegant Warm',
    description: 'Cormorant Garamond + Avenir Next',
    mode: 'multi',
    roles: createElegantWarmRoles(),
  },
};

export function createDefaultTypographySettings(): TypographySettings {
  return {
    mode: TYPOGRAPHY_PRESETS[DEFAULT_TYPOGRAPHY_PRESET_ID].mode,
    globalFontId: UI_DEFAULT_FONT_ID,
    presetId: DEFAULT_TYPOGRAPHY_PRESET_ID,
    roles: createElegantWarmRoles(),
  };
}

function extractLegacySingleFont(input: Record<string, unknown>): string | null {
  const fromGlobal = resolveFontId(input.globalFontId);
  const fromFont = resolveFontId(input.font);
  const fromFamily = resolveFontId(input.fontFamily);
  const fromPrimary = resolveFontId(input.primaryFont);
  return fromGlobal || fromFont || fromFamily || fromPrimary;
}

export function normalizeTypographySettings(input: unknown): {
  settings: TypographySettings;
  errors: string[];
} {
  const defaults = createDefaultTypographySettings();
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { settings: defaults, errors };
  }

  const raw = input as Record<string, unknown>;
  const presetIdRaw =
    typeof raw.presetId === 'string' && raw.presetId.trim().length > 0
      ? raw.presetId.trim()
      : null;
  const presetId =
    presetIdRaw && TYPOGRAPHY_PRESETS[presetIdRaw] ? presetIdRaw : defaults.presetId;

  if (presetIdRaw && !TYPOGRAPHY_PRESETS[presetIdRaw]) {
    errors.push(`Unknown typography preset "${presetIdRaw}".`);
  }

  const explicitSingleFont = extractLegacySingleFont(raw);
  const globalFontCandidate = resolveFontId(raw.globalFontId) || explicitSingleFont;

  if ((raw.globalFontId || explicitSingleFont) && !globalFontCandidate) {
    errors.push('Invalid global font selection.');
  }

  const baseRoles =
    presetId && TYPOGRAPHY_PRESETS[presetId]
      ? structuredClone(TYPOGRAPHY_PRESETS[presetId].roles)
      : structuredClone(defaults.roles);

  const rawRoles =
    raw.roles && typeof raw.roles === 'object'
      ? (raw.roles as Record<string, unknown>)
      : null;

  if (raw.roles && !rawRoles) {
    errors.push('Invalid typography roles payload.');
  }

  const mergedRoles = structuredClone(baseRoles);

  if (rawRoles) {
    for (const roleKey of Object.keys(rawRoles)) {
      if (!TYPOGRAPHY_ROLES.includes(roleKey as TypographyRole)) {
        errors.push(`Unknown typography role "${roleKey}".`);
      }
    }

    for (const role of TYPOGRAPHY_ROLES) {
      const value = rawRoles[role];
      if (typeof value === 'undefined' || value === null) {
        continue;
      }

      if (typeof value === 'string') {
        const legacyFontId = resolveFontId(value);
        if (!legacyFontId) {
          errors.push(`Invalid font "${value}" for role "${role}".`);
          continue;
        }

        mergedRoles[role] = {
          fontId: legacyFontId,
          weight: normalizeWeightForFont(
            legacyFontId,
            mergedRoles[role].weight,
            role,
          ),
        };
        continue;
      }

      if (typeof value !== 'object') {
        errors.push(`Invalid config for role "${role}".`);
        continue;
      }

      const roleConfig = value as Record<string, unknown>;
      const nextFontId =
        resolveFontId(roleConfig.fontId) ||
        resolveFontId(roleConfig.font) ||
        resolveFontId(roleConfig.fontFamily);

      if (!nextFontId) {
        errors.push(`Invalid font for role "${role}".`);
        continue;
      }

      const nextWeight = normalizeWeightForFont(nextFontId, roleConfig.weight, role);
      const numericWeight =
        typeof roleConfig.weight === 'number' ? roleConfig.weight : undefined;
      if (typeof numericWeight === 'number') {
        const font = FONT_REGISTRY[nextFontId];
        if (font && !font.availableWeights.includes(numericWeight)) {
          errors.push(
            `Weight ${numericWeight} is not supported by "${font.displayName}" for role "${role}".`,
          );
        }
      }

      mergedRoles[role] = {
        fontId: nextFontId,
        weight: nextWeight,
      };
    }
  }

  const normalizedRoles = TYPOGRAPHY_ROLES.reduce((accumulator, role) => {
    const roleConfig = mergedRoles[role];
    const fontId =
      resolveFontId(roleConfig?.fontId) ||
      defaults.roles[role].fontId ||
      UI_DEFAULT_FONT_ID;

    accumulator[role] = {
      fontId,
      weight: normalizeWeightForFont(fontId, roleConfig?.weight, role),
    };
    return accumulator;
  }, {} as Record<TypographyRole, TypographyRoleConfig>);

  const presetMode =
    presetId && TYPOGRAPHY_PRESETS[presetId] ? TYPOGRAPHY_PRESETS[presetId].mode : null;
  const requestedMode = normalizeMode(raw.mode);

  if (typeof raw.mode !== 'undefined' && !requestedMode) {
    errors.push(`Invalid typography mode "${String(raw.mode)}".`);
  }

  const mode = requestedMode || presetMode || defaults.mode;
  const globalFontId = resolveGlobalFontId(
    globalFontCandidate ||
      (presetId ? TYPOGRAPHY_PRESETS[presetId]?.globalFontId : null) ||
      defaults.globalFontId,
  );

  return {
    settings: {
      mode,
      globalFontId,
      presetId,
      roles: applyModeToRoles(mode, globalFontId, normalizedRoles),
    },
    errors,
  };
}

export interface ResolvedTypographyOutput {
  settings: TypographySettings;
  cssVariables: Record<string, string>;
  fontStylesheetHref: string | null;
  fontsInUse: Array<{
    id: string;
    displayName: string;
    source: FontSource;
    weights: number[];
    googleFamily?: string;
  }>;
}

export function buildGoogleFontStylesheetHref(
  fontsInUse: Array<{ id: string; weights: number[] }>,
): string | null {
  const families = fontsInUse
    .map((fontUsage) => {
      const font = FONT_REGISTRY[fontUsage.id];
      if (!font || font.source !== 'google' || !font.googleFamily) {
        return null;
      }

      const weights = Array.from(
        new Set(
          fontUsage.weights.filter((weight) =>
            font.availableWeights.includes(weight),
          ),
        ),
      ).sort((a, b) => a - b);

      const family = font.googleFamily.trim().replace(/\s+/g, '+');
      const weightQuery = weights.length ? `:wght@${weights.join(';')}` : '';
      return `family=${family}${weightQuery}`;
    })
    .filter((value): value is string => Boolean(value));

  if (!families.length) return null;
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}

export function resolveTypography(
  input: unknown,
  overrides?: Partial<TypographySettings>,
): ResolvedTypographyOutput {
  const { settings } = normalizeTypographySettings(input);

  const mergedSettings: TypographySettings = {
    ...settings,
    ...overrides,
    roles: {
      ...settings.roles,
      ...(overrides?.roles || {}),
    },
  };

  const resolvedMode = normalizeMode(mergedSettings.mode) || 'multi';
  const resolvedGlobalFontId = resolveGlobalFontId(mergedSettings.globalFontId);

  const resolvedSettings: TypographySettings = {
    ...mergedSettings,
    mode: resolvedMode,
    globalFontId: resolvedGlobalFontId,
    roles: applyModeToRoles(resolvedMode, resolvedGlobalFontId, mergedSettings.roles),
  };

  const usage = new Map<string, Set<number>>();
  const cssVariables: Record<string, string> = {};

  for (const role of TYPOGRAPHY_ROLES) {
    const roleConfig = resolvedSettings.roles[role];
    const font = FONT_REGISTRY[roleConfig.fontId] || FONT_REGISTRY[UI_DEFAULT_FONT_ID];
    const weight = normalizeWeightForFont(font.id, roleConfig.weight, role);

    cssVariables[`--font-${role}`] = buildFontStack(font.id);
    cssVariables[`--font-weight-${role}`] = String(weight);

    if (!usage.has(font.id)) usage.set(font.id, new Set<number>());
    usage.get(font.id)?.add(weight);
  }

  cssVariables['--font-display'] = cssVariables['--font-display'] || cssVariables['--font-heading'];

  const fontsInUse = Array.from(usage.entries()).map(([id, weights]) => {
    const font = FONT_REGISTRY[id];
    return {
      id,
      displayName: font?.displayName || id,
      source: font?.source || 'system',
      weights: Array.from(weights).sort((a, b) => a - b),
      googleFamily: font?.googleFamily,
    };
  });

  return {
    settings: resolvedSettings,
    cssVariables,
    fontStylesheetHref: buildGoogleFontStylesheetHref(fontsInUse),
    fontsInUse,
  };
}

export function typographySignature(input: unknown): string {
  return JSON.stringify(resolveTypography(input).settings);
}

export function hasTypographyChanged(previous: unknown, next: unknown): boolean {
  return typographySignature(previous) !== typographySignature(next);
}

export function typographyVariablesToInlineCss(
  cssVariables: Record<string, string>,
): string {
  const entries = Object.entries(cssVariables);
  if (!entries.length) return '';
  const tokens = entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');
  return `:root { ${tokens} }`;
}
