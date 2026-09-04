"use client";

import ProductCardRegular, { Product } from "@/components/ui/product-card-regular";

interface ProductCardProps {
  product: Product;
  variant?:
    | "default"
    | "featured"
    | "best-selling"
    | "new-arrival"
    | "limited-edition"
    | "standard";
  showQuickActions?: boolean;
  showQuickView?: boolean;
  className?: string;
}

export default function ProductCard({
  product,
  className = "",
}: ProductCardProps) {
  return <ProductCardRegular product={product} className={className} />;
}
