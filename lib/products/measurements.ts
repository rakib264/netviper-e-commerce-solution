export interface DimensionStrings {
  length: string;
  width: string;
  height: string;
}

/** Extract the first numeric token from a freeform measurement string */
export function parseMeasurementNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const match = String(value).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

export type MeasurementUnit = 'cm' | 'in';

export const CM_PER_INCH = 2.54;

/**
 * Convert a freeform measurement to centimeters for size-visualizer math.
 * An explicit suffix always wins; bare numbers fall back to `defaultUnit`,
 * which merchants pick per product in the visualizer config.
 */
export function measurementToCm(
  value: string | number | null | undefined,
  defaultUnit: MeasurementUnit = 'cm',
): number {
  const n = parseMeasurementNumber(value);
  if (!n) return 0;
  const raw = String(value ?? '').toLowerCase();
  if (raw.includes('"') || /\d\s*in\b/.test(raw) || raw.includes('inch')) {
    return n * CM_PER_INCH;
  }
  if (raw.includes('mm')) return n / 10;
  if (raw.includes('cm')) return n;
  return defaultUnit === 'in' ? n * CM_PER_INCH : n;
}

export function dimensionsToCm(
  dimensions?: {
    length?: string | number;
    width?: string | number;
    height?: string | number;
  } | null,
  defaultUnit: MeasurementUnit = 'cm',
): { length: number; width: number; height: number } {
  return {
    length: measurementToCm(dimensions?.length, defaultUnit),
    width: measurementToCm(dimensions?.width, defaultUnit),
    height: measurementToCm(dimensions?.height, defaultUnit),
  };
}

export function cmToUnit(cm: number, unit: MeasurementUnit): number {
  return unit === 'in' ? cm / CM_PER_INCH : cm;
}

/** Compact display value, e.g. 14.7 cm → `14.7`, 5.08 cm → `2` in inches */
export function formatMeasurement(cm: number, unit: MeasurementUnit): string {
  const value = cmToUnit(cm, unit);
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatHeightImperial(cm: number): string {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return `${Math.floor(totalInches / 12)}'${totalInches % 12}"`;
}

export function hasAnyDimension(dimensions?: {
  length?: string | number;
  width?: string | number;
  height?: string | number;
} | null): boolean {
  if (!dimensions) return false;
  return Boolean(
    String(dimensions.length || '').trim() ||
      String(dimensions.width || '').trim() ||
      String(dimensions.height || '').trim(),
  );
}

export function coerceDimensionString(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
}
