function normalizeProducts(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: Record<string, unknown>) => ({
      productId: String(item?.productId || '').trim(),
      productSlug: String(item?.productSlug || '').trim(),
      productImage: String(item?.productImage || '').trim(),
      productName: String(item?.productName || '').trim(),
      rating: Math.max(0, Math.min(5, Number(item?.rating ?? 5))),
      price: Math.max(0, Number(item?.price ?? 0)),
      comparePrice: Math.max(0, Number(item?.comparePrice ?? 0)),
    }))
    .filter(
      (p) =>
        Boolean(p.productName) ||
        Boolean(p.productImage) ||
        p.price > 0 ||
        Boolean(p.productId)
    )
    .slice(0, 3);
}

export function normalizeSlideBody(body: Record<string, unknown>) {
  const title = String(body.title || '').trim();
  const image = String(body.image || '').trim();
  const ctaButtons = Array.isArray(body.ctaButtons) ? body.ctaButtons : [];
  const products = normalizeProducts(body.products);

  // Mirror first product into legacy fields for older readers
  const first = products[0];

  return {
    title,
    subtitle: String(body.subtitle || '').trim(),
    description: String(body.description || '').trim(),
    discount: String(body.discount || '').trim(),
    image,
    backgroundVideo: String(body.backgroundVideo || '').trim(),
    ctaButtons: ctaButtons
      .map((btn: { label?: string; url?: string }) => ({
        label: String(btn?.label || '').trim(),
        url: String(btn?.url || '').trim(),
      }))
      .filter((btn: { label: string; url: string }) => btn.label && btn.url),
    ctaButtonLabel: String(body.ctaButtonLabel || '').trim(),
    ctaButtonUrl: String(body.ctaButtonUrl || '').trim(),
    products,
    productId: first?.productId || String(body.productId || '').trim(),
    productSlug: first?.productSlug || String(body.productSlug || '').trim(),
    productImage: first?.productImage || String(body.productImage || '').trim(),
    productName: first?.productName || String(body.productName || '').trim(),
    rating: first?.rating ?? Math.max(0, Math.min(5, Number(body.rating ?? 5))),
    price: first?.price ?? Math.max(0, Number(body.price ?? 0)),
    comparePrice:
      first?.comparePrice ?? Math.max(0, Number(body.comparePrice ?? 0)),
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    order: body.order !== undefined ? Number(body.order) : undefined,
  };
}
