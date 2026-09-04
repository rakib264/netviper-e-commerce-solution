'use client';

import NextAuthProvider from '@/components/providers/NextAuthProvider';
import FloatingCartCard from '@/components/ui/floating-cart-card';
import dynamic from 'next/dynamic';

const FaviconProvider = dynamic(() => import('@/components/providers/FaviconProvider').then(m => m.FaviconProvider), { ssr: false });
// Server-rendered on purpose. It wraps every page, so `ssr: false` here used to
// make React bail the *whole* document out to client-side rendering
// (BAILOUT_TO_CLIENT_SIDE_RENDERING in the HTML): no section markup shipped, and
// nothing on screen until the JS bundle had downloaded and hydrated. Its render
// body is SSR-safe — every `document`/`window` access lives in an effect — and
// the palette it applies is already emitted as inline CSS variables by the root
// layout, so the first paint is themed either way.
const ThemeProvider = dynamic(() => import('@/components/providers/ThemeProvider').then(m => m.ThemeProvider));
// Server-rendered on purpose: the locale and currency come from the layout, and
// SSR-ing them is what keeps the first paint free of an English/EUR flash.
const LocalizationProvider = dynamic(() => import('@/components/providers/LocalizationProvider').then(m => m.LocalizationProvider));
const AutoStartup = dynamic(() => import('@/components/startup/AutoStartup'), { ssr: false });
const OneSignalProvider = dynamic(() => import('@/components/providers/OneSignalProvider'), { ssr: false });
const ShoppingBasket = dynamic(() => import('@/components/ui/shopping-cart'), { ssr: false });
// Mounted once: it owns the cart's server-side deal recalculation loop.
const CartDealsSync = dynamic(() => import('@/components/cart/CartDealsSync'), { ssr: false });
const Toaster = dynamic(() => import('@/components/ui/toaster').then(m => m.Toaster), { ssr: false });

export { AutoStartup, CartDealsSync, FaviconProvider, FloatingCartCard, LocalizationProvider, NextAuthProvider, OneSignalProvider, ShoppingBasket, ThemeProvider, Toaster };
