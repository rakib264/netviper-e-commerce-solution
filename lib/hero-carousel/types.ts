/** Shared hero carousel slide model — keep frontend & admin in sync */

export interface HeroSlideCTA {
  label: string;
  url: string;
}

export interface HeroSlideProduct {
  productId?: string;
  productSlug?: string;
  productImage?: string;
  productName?: string;
  rating?: number;
  price?: number;
  comparePrice?: number;
}

export interface HeroSlide {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  /** Full-bleed background image (also poster when video is set) */
  image: string;
  /** Optional full-bleed background video */
  backgroundVideo?: string;
  ctaButtons?: HeroSlideCTA[];
  ctaButtonLabel?: string;
  ctaButtonUrl?: string;
  /** Preferred: multiple floating product cards */
  products?: HeroSlideProduct[];
  /** Legacy single-product fields (still read for older slides) */
  productId?: string;
  productSlug?: string;
  productImage?: string;
  productName?: string;
  rating?: number;
  price?: number;
  comparePrice?: number;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export type HeroSlideInput = Omit<HeroSlide, '_id' | 'createdAt' | 'updatedAt'> & {
  _id?: string;
};

export const emptyHeroProduct = (): HeroSlideProduct => ({
  productId: '',
  productSlug: '',
  productImage: '',
  productName: '',
  rating: 5,
  price: 0,
  comparePrice: 0,
});

export const emptyHeroSlideInput = (): HeroSlideInput => ({
  title: '',
  subtitle: '',
  description: '',
  image: '',
  backgroundVideo: '',
  ctaButtons: [{ label: 'Shop Now', url: '/products' }],
  products: [],
  productId: '',
  productSlug: '',
  productImage: '',
  productName: '',
  rating: 5,
  price: 0,
  comparePrice: 0,
  isActive: true,
  order: 0,
});

export function getSlideCta(
  slide: Pick<
    HeroSlide,
    'ctaButtons' | 'ctaButtonLabel' | 'ctaButtonUrl' | 'productSlug' | 'products'
  >
): HeroSlideCTA {
  if (slide.ctaButtons?.[0]?.label && slide.ctaButtons[0].url) {
    return slide.ctaButtons[0];
  }
  const first = getSlideProducts(slide)[0];
  if (first?.productSlug) {
    return {
      label: slide.ctaButtonLabel || 'Shop Now',
      url: `/products/${first.productSlug}`,
    };
  }
  if (slide.productSlug) {
    return {
      label: slide.ctaButtonLabel || 'Shop Now',
      url: `/products/${slide.productSlug}`,
    };
  }
  return {
    label: slide.ctaButtonLabel || 'Shop Now',
    url: slide.ctaButtonUrl || '/products',
  };
}

/** Normalize products array, including legacy single-product fields */
export function getSlideProducts(
  slide: Pick<
    HeroSlide,
    | 'products'
    | 'productId'
    | 'productSlug'
    | 'productImage'
    | 'productName'
    | 'rating'
    | 'price'
    | 'comparePrice'
  >
): HeroSlideProduct[] {
  if (Array.isArray(slide.products) && slide.products.length > 0) {
    return slide.products.filter(
      (p) =>
        Boolean(p.productName?.trim()) ||
        Boolean(p.productImage?.trim()) ||
        (typeof p.price === 'number' && p.price > 0)
    );
  }

  if (
    slide.productName?.trim() ||
    slide.productImage?.trim() ||
    (typeof slide.price === 'number' && slide.price > 0)
  ) {
    return [
      {
        productId: slide.productId,
        productSlug: slide.productSlug,
        productImage: slide.productImage,
        productName: slide.productName,
        rating: slide.rating,
        price: slide.price,
        comparePrice: slide.comparePrice,
      },
    ];
  }

  return [];
}

export function hasProductCard(slide: HeroSlide): boolean {
  return getSlideProducts(slide).length > 0;
}

/** Odd index (1st, 3rd…) → cards on the left; even → cards on the right */
export function productCardOnLeft(slideIndex: number): boolean {
  return slideIndex % 2 === 0;
}

export function isVideoAssetUrl(url: string): boolean {
  if (!url) return false;
  return (
    /\.(mp4|webm|mov|m4v|m3u8)(\?|#|$)/i.test(url) ||
    /\/videos\//i.test(url) ||
    url.includes('video/')
  );
}

export function isMongoId(id?: string): boolean {
  return Boolean(id && /^[0-9a-fA-F]{24}$/.test(id));
}

export const MAX_HERO_PRODUCTS = 3;
