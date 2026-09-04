"use client";

import ProductCardRegular, { Product } from "@/components/ui/product-card-regular";

interface ProductCardDiscountedProps {
  product: Product;
  className?: string;
}

export default function ProductCardDiscounted({
  product,
  className = "",
}: ProductCardDiscountedProps) {
  return <ProductCardRegular product={product} className={className} />;
}
