'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { HeroSlide } from '@/lib/hero-carousel/types';
import { getSlideProducts } from '@/lib/hero-carousel/types';
import { formatEuroCurrency } from '@/lib/utils';
import {
  Pencil,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { Loader } from '@/components/ui/loader';

interface AdminSlideTableProps {
  slides: HeroSlide[];
  loading?: boolean;
  togglingId?: string | null;
  onToggle: (slide: HeroSlide, next: boolean) => void;
  onEdit: (slide: HeroSlide) => void;
  onDelete: (slide: HeroSlide) => void;
}

export default function AdminSlideTable({
  slides,
  loading,
  togglingId,
  onToggle,
  onEdit,
  onDelete,
}: AdminSlideTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader size="md" label={null} className="mr-2" />
        Loading slides…
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="border border-border bg-muted px-6 py-14 text-center">
        <p className="text-sm font-medium text-foreground">No carousel slides yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first slide to populate the homepage hero.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border bg-muted text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Thumbnail</th>
            <th className="px-4 py-3 font-medium">Headline</th>
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium">Price</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {slides.map((slide) => {
            const products = getSlideProducts(slide);
            const primary = products[0];
            const thumb = primary?.productImage || slide.image;
            const price = primary?.price || 0;
            const compare =
              primary?.comparePrice && primary.comparePrice > price
                ? primary.comparePrice
                : 0;
            return (
              <tr
                key={slide._id}
                className="border-b border-border last:border-b-0 hover:bg-background"
              >
                <td className="px-4 py-3">
                  <div className="relative h-14 w-20 overflow-hidden border border-border bg-muted">
                    {thumb ? (
                      <Image
                        src={thumb}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="max-w-[220px] font-medium text-foreground line-clamp-2">
                    {slide.title}
                  </p>
                  <p className="mt-0.5 text-xs text-subtle-foreground">Order {slide.order}</p>
                </td>
                <td className="px-4 py-3 text-foreground">
                  <div className="max-w-[200px]">
                    {products.length === 0 ? (
                      <span className="text-subtle-foreground">—</span>
                    ) : (
                      <>
                        <p className="truncate font-medium">
                          {primary?.productName}
                        </p>
                        {products.length > 1 ? (
                          <p className="text-xs text-subtle-foreground">
                            +{products.length - 1} more
                          </p>
                        ) : primary?.productSlug ? (
                          <p className="truncate text-xs text-subtle-foreground">
                            /products/{primary.productSlug}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {price > 0 ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-price font-medium text-foreground">
                        {formatEuroCurrency(price)}
                      </span>
                      {compare > 0 ? (
                        <span className="text-xs font-caption text-subtle-foreground line-through">
                          {formatEuroCurrency(compare)}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-subtle-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={slide.isActive}
                      disabled={togglingId === slide._id}
                      onCheckedChange={(checked) => onToggle(slide, checked)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <Badge
                      variant="outline"
                      className={
                        slide.isActive
                          ? 'border-foreground bg-primary text-white'
                          : 'border-border text-muted-foreground'
                      }
                    >
                      {slide.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(slide)}
                      aria-label="Edit slide"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onDelete(slide)}
                      aria-label="Delete slide"
                    >
                      <Trash2 className="h-4 w-4 text-destructive-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
