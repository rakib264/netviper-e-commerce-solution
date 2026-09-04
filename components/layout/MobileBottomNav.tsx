"use client";

import HydrationWrapper from "@/components/providers/HydrationWrapper";
import { useTranslation } from "@/components/providers/LocalizationProvider";
import { toggleCart } from "@/lib/store/slices/uiSlice";
import { RootState } from "@/lib/store/store";
import { Heart, Home, ShoppingBag, Tag, User } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";

const navItems = [
  { id: "home", labelKey: "nav.home", href: "/", icon: Home },
  { id: "products", labelKey: "nav.shop", href: "/products", icon: Tag },
  { id: "wishlist", labelKey: "nav.wishlist", href: "/wishlist", icon: Heart },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const { itemCount } = useSelector((state: RootState) => state.cart);

  return (
    <HydrationWrapper fallback={<div className="h-16 md:hidden" />}>
      <div className="h-16 md:hidden" />

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card md:hidden">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex h-16 flex-col items-center justify-center gap-1"
              >
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? "text-foreground" : "text-subtle-foreground"
                  }`}
                />
                <span
                  className={`font-navigation text-[10px] uppercase tracking-[0.08em] ${
                    isActive ? "text-foreground" : "text-subtle-foreground"
                  }`}
                >
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => dispatch(toggleCart())}
            className="relative flex h-16 flex-col items-center justify-center gap-1"
          >
            <ShoppingBag className="h-4 w-4 text-subtle-foreground" />
            <span className="font-navigation text-[10px] uppercase tracking-[0.08em] text-subtle-foreground">
              {t("nav.bag")}
            </span>
            {itemCount > 0 && (
              <span className="absolute right-5 top-3 h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </button>

          <Link
            href={session ? "/profile" : "/auth/signin"}
            className="flex h-16 flex-col items-center justify-center gap-1"
          >
            <User className="h-4 w-4 text-subtle-foreground" />
            <span className="font-navigation text-[10px] uppercase tracking-[0.08em] text-subtle-foreground">
              {t("nav.account")}
            </span>
          </Link>
        </div>
      </nav>
    </HydrationWrapper>
  );
}
