/**
 * The reasons a customer may give.
 *
 * A fixed list rather than free text, because the reason drives operational
 * decisions — a damaged arrival is a carrier claim, a change of mind is not —
 * and free text cannot be counted or filtered. `other` keeps the escape hatch,
 * paired with the notes field.
 */
export const RETURN_REASONS = [
  'damaged',
  'defective',
  'wrong_item',
  'not_as_described',
  'size',
  'changed_mind',
  'other',
] as const;

export type ReturnReason = (typeof RETURN_REASONS)[number];

export function returnReasonKey(reason: string): string {
  return `returns.flow.reasons.${
    (RETURN_REASONS as readonly string[]).includes(reason) ? reason : 'other'
  }`;
}
