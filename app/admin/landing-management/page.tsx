'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import Link from 'next/link';
import { Images, Layers, LayoutGrid, Sparkles } from 'lucide-react';

const cards = [
  {
    title: 'Hero carousel',
    description:
      'Full-bleed campaign slides with floating product cards for the homepage.',
    href: '/admin/landing-management/hero-carousel',
    icon: Images,
  },
  {
    title: 'Product showcase',
    description:
      'Reusable product carousels and split-media templates with selectable card styles.',
    href: '/admin/landing-management/product-showcase',
    icon: LayoutGrid,
  },
  {
    title: 'Curated product sections',
    description:
      'Reusable product bands — hand-picked, generated from live catalogue data, or both.',
    href: '/admin/landing-management/curated-sections',
    icon: Sparkles,
  },
  {
    title: 'Homepage sections',
    description:
      'Toggle sections live or hidden, edit their heading copy, and drag to reorder the homepage.',
    href: '/admin/landing-management/homepage-sections',
    icon: Layers,
  },
];

export default function LandingManagementPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-navigation text-2xl font-semibold tracking-tight text-foreground">
            Landing management
          </h1>
          <p className="mt-1 font-paragraph text-sm text-muted-foreground">
            Configure the homepage hero and editorial sections from one place.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group border border-border bg-card p-6 transition-colors hover:border-foreground"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-navigation text-base font-semibold text-foreground">
                  {card.title}
                </h2>
                <p className="mt-1 font-paragraph text-sm text-muted-foreground">
                  {card.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
