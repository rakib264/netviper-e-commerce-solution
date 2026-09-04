import type { ComboType, ResolvedComboBundle } from '@/lib/combo-bundles/types';

/**
 * Shared presentation vocabulary for combo/bundle surfaces.
 *
 * The card, the rail, the listing and the detail page all need the same three
 * decisions — what the offer is called, what its saving reads as, and whether it
 * can be bought — so they are made once here rather than four times in JSX.
 */

/** i18n key for the type badge ("Combo" / "Bundle"). */
export function comboTypeKey(comboType: ComboType): string {
  return comboType === 'bundle' ? 'combos.badge.bundle' : 'combos.badge.combo';
}

/** i18n key for the "items in this …" heading. */
export function comboItemsHeadingKey(comboType: ComboType): string {
  return comboType === 'bundle'
    ? 'combos.itemsInBundle'
    : 'combos.itemsInCombo';
}

/** i18n key for the primary add-to-cart label. */
export function comboAddToCartKey(comboType: ComboType): string {
  return comboType === 'bundle' ? 'combos.addBundle' : 'combos.addCombo';
}

/**
 * A saving is only worth a badge when it is real and legible: a percentage
 * under 5 tells a customer nothing, and reads as noise on a premium card.
 */
export const MEANINGFUL_SAVINGS_PERCENT = 5;

export function showsSavings(combo: ResolvedComboBundle): boolean {
  return (
    combo.savings > 0 && combo.savingsPercent >= MEANINGFUL_SAVINGS_PERCENT
  );
}

export const COMBO_LISTING_HREF = '/combo-bundles';

export function comboHref(slug: string): string {
  return `${COMBO_LISTING_HREF}/${slug}`;
}

/**
 * The cart line for one combo unit.
 *
 * Built in one place because three surfaces dispatch it — the card, the detail
 * page and the rail — and a line that disagrees about its own `itemType` or its
 * id would not be recognised by the cart, the validator or the order route.
 */
export function toComboCartLine(
  combo: ResolvedComboBundle,
  quantity: number,
): {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  maxQuantity: number;
  itemType: 'combo_bundle';
  comboBundleId: string;
  comboBundleSlug: string;
  comboType: ComboType;
  components: Array<{
    productId: string;
    variantId?: string;
    name: string;
    qty: number;
  }>;
} {
  return {
    // The offer's own id: the cart, the validator and the order route all key
    // the line on it, and it is an ObjectId like a product's.
    id: combo._id,
    name: combo.name,
    price: combo.price,
    quantity: Math.max(1, Math.min(quantity, combo.maxUnits || 1)),
    image: combo.images[0],
    maxQuantity: Math.max(1, combo.maxUnits),
    itemType: 'combo_bundle',
    comboBundleId: combo._id,
    comboBundleSlug: combo.slug,
    comboType: combo.comboType,
    components: combo.components.map((component) => ({
      productId: component.productId,
      variantId: component.variantId,
      name: component.variantLabel
        ? `${component.name} (${component.variantLabel})`
        : component.name,
      qty: component.qty,
    })),
  };
}
