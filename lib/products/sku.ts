/** Suggest a SKU from product name + optional variant value */
export function suggestSku(
  productName: string,
  variantValue?: string,
  existingSkus: string[] = [],
): string {
  const base = (productName || "PROD")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16);

  const variant = (variantValue || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8);

  let candidate = variant ? `${base}-${variant}` : base || "PROD";
  candidate = candidate.replace(/-+/g, "-");

  if (!existingSkus.includes(candidate)) return candidate;

  let n = 2;
  while (existingSkus.includes(`${candidate}-${n}`)) n += 1;
  return `${candidate}-${n}`;
}

export function isValidSkuFormat(sku: string): boolean {
  if (!sku || !sku.trim()) return false;
  return /^[A-Za-z0-9][A-Za-z0-9\-_.]{1,63}$/.test(sku.trim());
}
