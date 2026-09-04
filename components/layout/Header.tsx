"use client";

import SearchComponent from "@/components/ui/search";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { LocaleFlag } from "@/components/layout/LocaleFlag";
import { CartCountBadge } from "@/components/ui/cart-count-badge";
import {
  useCurrency,
  useLocaleSwitcher,
  useTranslation,
} from "@/components/providers/LocalizationProvider";
import { useHydration } from "@/hooks/use-hydration";
import { useSettings } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import {
  reloadCartFromStorage,
  toggleCart,
} from "@/lib/store/slices/cartSlice";
import { toggleSearch } from "@/lib/store/slices/uiSlice";
import { loadWishlistFromStorage } from "@/lib/store/slices/wishlistSlice";
import { RootState } from "@/lib/store/store";
import {
  Globe,
  Heart,
  LogOut,
  Search,
  Settings,
  ShoppingBag,
  User,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import NotificationBell from "@/components/notifications/NotificationBell";

interface Category {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  sortOrder?: number;
  parent?: {
    _id: string;
  } | string | null;
}

type CategoryTree = Category & {
  children: Category[];
};

type NavItem = {
  id: string;
  label: string;
  href: string;
  children?: { label: string; href: string }[];
  image?: string;
  imageAlt?: string;
};

/** Fallback only when a root category has no image set in admin */
const FALLBACK_MEGA_IMAGE =
  "https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=1200";

function getParentId(parent: Category["parent"]): string | null {
  if (!parent) return null;
  if (typeof parent === "string") return parent;
  return parent._id ? String(parent._id) : null;
}

/**
 * Static menu sections. Labels are translation keys rather than literals so the
 * drawer follows the language chosen in admin settings.
 */
const FOOTER_NAV = [
  {
    id: "customer-care",
    labelKey: "footer.groups.customerCare",
    children: [
      { labelKey: "footer.links.contactUs", href: "/contact" },
      { labelKey: "footer.links.faqs", href: "/faqs" },
      { labelKey: "footer.links.shippingDelivery", href: "/shipping-delivery" },
      { labelKey: "footer.links.returns", href: "/returns" },
    ],
  },
  {
    id: "services",
    labelKey: "footer.groups.services",
    children: [
      { labelKey: "footer.links.privilegeMembers", href: "/privilege-members" },
      { labelKey: "footer.links.giftGuide", href: "/products?category=gifts" },
      { labelKey: "footer.links.wishlist", href: "/wishlist" },
    ],
  },
  {
    id: "sustainability",
    labelKey: "footer.groups.sustainability",
    children: [
      { labelKey: "footer.links.ourMaterials", href: "/about" },
      { labelKey: "footer.links.craftsmanship", href: "/about" },
    ],
  },
  {
    id: "about-us",
    labelKey: "footer.groups.aboutUs",
    children: [
      { labelKey: "footer.links.theAtelier", href: "/about" },
      { labelKey: "footer.links.impressum", href: "/impressum" },
      { labelKey: "footer.links.datenschutz", href: "/datenschutz" },
    ],
  },
] as const;

function MenuSearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M2 5h14M2 12h10M2 19h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="30" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M34.5 15.5L40 21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Header() {
  const dispatch = useDispatch();
  const router = useRouter();
  const isHydrated = useHydration();
  const { data: session } = useSession();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const { locale, allowedLocaleMeta, setLocale } = useLocaleSwitcher();

  const { itemCount } = useSelector((state: RootState) => state.cart);
  const { itemCount: wishlistCount } = useSelector(
    (state: RootState) => state.wishlist,
  );
  const { searchOpen } = useSelector((state: RootState) => state.ui);

  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const [desktopQuery, setDesktopQuery] = useState("");
  const [mobileQuery, setMobileQuery] = useState("");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const brandName = settings?.siteName || "Mascari Mart";
  const wordmark = brandName.toUpperCase();
  const shortBrand = wordmark.split(" ")[0] || "MASCARI";

  useEffect(() => {
    dispatch(reloadCartFromStorage());
    dispatch(loadWishlistFromStorage());
  }, [dispatch]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setCategories(data.categories || []);
      } catch {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const groupedCategories = useMemo((): CategoryTree[] => {
    const bySort = (a: Category, b: Category) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name);

    const roots = categories
      .filter((category) => !getParentId(category.parent))
      .sort(bySort);

    return roots.map((root) => {
      const rootId = String(root._id);
      return {
        ...root,
        children: categories
          .filter((category) => getParentId(category.parent) === rootId)
          .sort(bySort),
      };
    });
  }, [categories]);

  // Mega nav: one top-level item per root category (image + children) — same layout as before
  const navItems: NavItem[] = useMemo(
    () =>
      groupedCategories.map((root) => {
        const href = `/categories/${root.slug}`;
        const childLinks = root.children.map((child) => ({
          label: child.name,
          href: `/categories/${child.slug}`,
        }));

        return {
          id: String(root._id),
          label: root.name,
          href,
          children: [{ label: t("common.viewAll"), href }, ...childLinks],
          image: root.image || FALLBACK_MEGA_IMAGE,
          imageAlt: root.name,
        };
      }),
    [groupedCategories, t],
  );

  const activeNav = navItems.find((item) => item.id === activeMega) || null;

  const openMega = (id: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveMega(id);
  };

  const scheduleCloseMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setActiveMega(null), 160);
  };

  const submitSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      dispatch(toggleSearch());
      return;
    }
    setMenuOpen(false);
    router.push(`/products?search=${encodeURIComponent(trimmed)}`);
  };

  const onDesktopSearch = (event: FormEvent) => {
    event.preventDefault();
    submitSearch(desktopQuery);
  };

  const onMobileSearch = (event: FormEvent) => {
    event.preventDefault();
    submitSearch(mobileQuery);
  };

  // Zero until hydration so the server and client agree on the first paint.
  const cartCount = isHydrated ? itemCount : 0;

  return (
    <>
      <header className="sticky top-0 z-50">
        {/* Desktop */}
        <div className="hidden lg:block">
          {/* Brand switcher tabs */}
          <div className="flex h-10 items-end justify-center bg-primary/95">
            <div className="flex items-end">
              <Link
                href="/"
                className="relative flex h-9 items-center rounded-t-[6px] bg-card px-5 font-navigation text-[13px] tracking-[0.14em] text-foreground"
              >
                {shortBrand}
              </Link>
              <Link
                href="/deals"
                className="flex h-9 items-center px-5 font-navigation text-[13px] tracking-[0.08em] text-white transition-opacity hover:opacity-80"
              >
                <span className="tracking-[0.14em]">{shortBrand}</span>
                <span className="ml-1.5 font-navigation text-[11px] font-medium tracking-[0.16em]">
                  SALE
                </span>
              </Link>
            </div>
          </div>

          {/* Logo + utilities */}
          <div className="border-b border-border bg-card">
            <div className="luxury-container relative flex h-[72px] items-center justify-between">
              <div className="flex items-center gap-4">
                <LanguageSwitcher />
              </div>

              <Link
                href="/"
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-navigation text-[28px] tracking-[0.22em] text-foreground"
              >
                {shortBrand}
              </Link>

              <div className="flex items-center gap-5">
                <form
                  onSubmit={onDesktopSearch}
                  className="flex min-w-[160px] items-center gap-2 border-b border-foreground pb-1"
                >
                  <input
                    value={desktopQuery}
                    onChange={(event) => setDesktopQuery(event.target.value)}
                    placeholder={t("common.searchPlaceholder")}
                    className="w-full bg-transparent font-paragraph text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none"
                    aria-label={t("common.search")}
                  />
                  <button
                    type="submit"
                    className="text-foreground"
                    aria-label={t("common.submitSearch")}
                  >
                    <Search className="h-4 w-4 stroke-[1.5]" />
                  </button>
                </form>

                <Link
                  href="/wishlist"
                  className="relative text-foreground"
                  aria-label={t("nav.wishlist")}
                >
                  <Heart className="h-[18px] w-[18px] stroke-[1.4]" />
                  {isHydrated && wishlistCount > 0 && (
                    <span className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Link>

                {session ? <NotificationBell variant="storefront" /> : null}

                {session ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="text-foreground"
                        aria-label={t("nav.account")}
                      >
                        <User className="h-[18px] w-[18px] stroke-[1.4]" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-2 py-1.5 font-paragraph text-sm text-foreground">
                        {session.user?.name}
                      </div>
                      <div className="px-2 pb-2 font-caption text-xs text-subtle-foreground">
                        {session.user?.email}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/profile">
                          <User className="mr-2 h-4 w-4" />
                          {t("nav.profile")}
                        </Link>
                      </DropdownMenuItem>
                      {(session.user?.role === "admin" ||
                        session.user?.role === "manager") && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin">
                            <Settings className="mr-2 h-4 w-4" />
                            {t("nav.adminPanel")}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => signOut()}>
                        <LogOut className="mr-2 h-4 w-4" />
                        {t("nav.signOut")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link
                    href="/auth/signin"
                    className="text-foreground"
                    aria-label={t("nav.signIn")}
                  >
                    <User className="h-[18px] w-[18px] stroke-[1.4]" />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => dispatch(toggleCart())}
                  className="relative text-foreground"
                  aria-label={t("nav.bag")}
                >
                  <ShoppingBag className="h-[19px] w-[19px] stroke-[1.4]" />
                  <CartCountBadge count={cartCount} />
                </button>
              </div>
            </div>
          </div>

          {/* Primary nav + mega menu */}
          <div
            className="relative border-b border-border bg-card"
            onMouseLeave={scheduleCloseMega}
          >
            <nav className="luxury-container flex h-12 items-center justify-center gap-9">
              {navItems.map((item) => (
                <div
                  key={item.id}
                  onMouseEnter={() => openMega(item.id)}
                  onFocus={() => openMega(item.id)}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "relative pb-1 text-[11px] font-navigation uppercase tracking-[0.16em] text-foreground transition-colors",
                      "after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 after:ease-in-out",
                      activeMega === item.id && "after:scale-x-100",
                      "hover:after:scale-x-100",
                    )}
                  >
                    {item.label}
                  </Link>
                </div>
              ))}
            </nav>

            <div
              className={cn(
                "absolute inset-x-0 top-full z-40 origin-top border-b border-border bg-card transition-all duration-300 ease-in-out",
                activeNav
                  ? "pointer-events-auto visible translate-y-0 opacity-100"
                  : "pointer-events-none invisible -translate-y-1 opacity-0",
              )}
              onMouseEnter={() => activeMega && openMega(activeMega)}
              onMouseLeave={scheduleCloseMega}
            >
              {activeNav && (
                <div className="luxury-container grid grid-cols-[minmax(220px,32%)_1fr] gap-10 py-10">
                  <div className="flex flex-col gap-4 pt-2">
                    {(activeNav.children || []).map((child) => (
                      <Link
                        key={`${activeNav.id}-${child.href}-${child.label}`}
                        href={child.href}
                        onClick={() => setActiveMega(null)}
                        className="font-navigation text-[22px] font-medium leading-tight text-foreground transition-opacity hover:opacity-60"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>

                  <div className="relative min-h-[320px] overflow-hidden bg-muted">
                    <Image
                      src={activeNav.image || FALLBACK_MEGA_IMAGE}
                      alt={activeNav.imageAlt || activeNav.label}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1200px) 60vw, 900px"
                      priority={false}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="lg:hidden">
          <div className="flex h-12 items-stretch bg-primary/95">
            <div className="flex min-w-0 flex-1 items-end">
              <Link
                href="/"
                className="relative flex h-[42px] items-center rounded-t-[6px] bg-card px-3.5 font-navigation text-[13px] tracking-[0.12em] text-foreground"
              >
                {shortBrand}
                <span
                  className="pointer-events-none absolute -right-2 bottom-0 h-2 w-2 bg-card"
                  style={{
                    maskImage:
                      "radial-gradient(circle at top right, transparent 70%, black 72%)",
                    WebkitMaskImage:
                      "radial-gradient(circle at top right, transparent 70%, black 72%)",
                  }}
                />
              </Link>
              <Link
                href="/deals"
                className="mb-2.5 ml-3 truncate text-white"
              >
                <span className="font-navigation text-[12px] tracking-[0.1em]">
                  {shortBrand}
                </span>
                <span className="ml-1 font-navigation text-[10px] font-medium tracking-[0.14em]">
                  SALE
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-1 pr-2">
              <button
                type="button"
                onClick={() => dispatch(toggleCart())}
                className="relative flex h-11 w-11 items-center justify-center text-white"
                aria-label={t("nav.bag")}
              >
                <ShoppingBag className="h-5 w-5 stroke-[1.4]" />
                <CartCountBadge count={cartCount} tone="dark" className="-right-0.5 top-1.5" />
              </button>

              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex h-11 w-12 items-center justify-center text-white"
                aria-label={t("nav.openMenu")}
              >
                <MenuSearchIcon className="h-6 w-11" />
              </button>
            </div>
          </div>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetContent
              side="right"
              className="flex w-full flex-col gap-0 border-none bg-card p-0 sm:max-w-md [&>button]:right-4 [&>button]:top-4 [&>button]:text-foreground"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>{t("nav.menuTitle")}</SheetTitle>
              </SheetHeader>

              <div className="flex h-full flex-col overflow-y-auto">
                <form
                  onSubmit={onMobileSearch}
                  className="flex items-center gap-3 border-b border-foreground px-5 pb-3 pt-14"
                >
                  <input
                    value={mobileQuery}
                    onChange={(event) => setMobileQuery(event.target.value)}
                    placeholder={t("common.searchPlaceholder")}
                    className="w-full bg-transparent font-paragraph text-base text-foreground placeholder:text-subtle-foreground focus:outline-none"
                    aria-label={t("common.search")}
                  />
                  <button type="submit" aria-label={t("common.submitSearch")}>
                    <Search className="h-4 w-4 stroke-[1.5] text-foreground" />
                  </button>
                </form>

                <div className="bg-card px-5 pb-4 pt-2">
                  <Accordion type="single" collapsible className="w-full">
                    {navItems.map((item) => (
                      <AccordionItem
                        key={item.id}
                        value={item.id}
                        className="border-b-0"
                      >
                        <AccordionTrigger className="py-4 text-left text-[13px] font-navigation uppercase tracking-[0.14em] text-foreground hover:no-underline [&[data-state=open]>svg]:rotate-180">
                          {item.label}
                        </AccordionTrigger>
                        <AccordionContent className="pb-3 pt-0">
                          <div className="flex flex-col gap-3 pl-1">
                            {(item.children || []).map((child) => (
                              <Link
                                key={`${item.id}-m-${child.href}-${child.label}`}
                                href={child.href}
                                onClick={() => setMenuOpen(false)}
                                className="font-navigation text-[17px] font-medium text-foreground"
                              >
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                <div className="mt-auto bg-muted px-5 pb-10 pt-6">
                  <div className="space-y-5">
                    {session ? (
                      <Link
                        href="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 font-paragraph text-[14px] text-foreground"
                      >
                        <User className="h-4 w-4 stroke-[1.4]" />
                        {t("nav.account")}
                      </Link>
                    ) : (
                      <Link
                        href="/auth/signin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 font-paragraph text-[14px] text-foreground"
                      >
                        <User className="h-4 w-4 stroke-[1.4]" />
                        {t("nav.login")}
                      </Link>
                    )}

                    <div className="flex items-center gap-3 font-paragraph text-[14px] text-muted-foreground">
                      <Globe className="h-4 w-4 stroke-[1.4]" />
                      {`${t("common.shipTo")}: Germany (${currency})`}
                    </div>

                    {allowedLocaleMeta.length > 1 && (
                      <div className="space-y-2">
                        <p className="font-caption text-[11px] uppercase tracking-[0.12em] text-subtle-foreground">
                          {t("nav.language")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {allowedLocaleMeta.map((option) => (
                            <button
                              key={option.code}
                              type="button"
                              onClick={() => setLocale(option.code)}
                              aria-current={option.code === locale ? "true" : undefined}
                              className={cn(
                                "inline-flex min-h-[44px] items-center gap-2.5 border px-4 font-paragraph text-[14px] transition-colors",
                                option.code === locale
                                  ? "border-foreground bg-primary text-white"
                                  : "border-border text-foreground hover:border-foreground",
                              )}
                            >
                              <LocaleFlag locale={option.code} />
                              {option.nativeLabel}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <Link
                      href="/wishlist"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 font-paragraph text-[14px] text-foreground"
                    >
                      <Heart className="h-4 w-4 stroke-[1.4]" />
                      {t("nav.wishlist")}
                      {isHydrated && wishlistCount > 0 && (
                        <span className="text-subtle-foreground">({wishlistCount})</span>
                      )}
                    </Link>

                    {session &&
                      (session.user?.role === "admin" ||
                        session.user?.role === "manager") && (
                        <Link
                          href="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 font-paragraph text-[14px] text-foreground"
                        >
                          <Settings className="h-4 w-4 stroke-[1.4]" />
                          {t("nav.adminPanel")}
                        </Link>
                      )}

                    {session && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          signOut();
                        }}
                        className="flex items-center gap-3 font-paragraph text-[14px] text-foreground"
                      >
                        <LogOut className="h-4 w-4 stroke-[1.4]" />
                        {t("nav.signOut")}
                      </button>
                    )}
                  </div>

                  <div className="my-6 h-px bg-muted" />

                  <Accordion type="single" collapsible className="w-full">
                    {FOOTER_NAV.map((section) => (
                      <AccordionItem
                        key={section.id}
                        value={section.id}
                        className="border-b-0"
                      >
                        <AccordionTrigger className="py-4 text-left text-[13px] font-navigation uppercase tracking-[0.14em] text-foreground hover:no-underline">
                          {t(section.labelKey)}
                        </AccordionTrigger>
                        <AccordionContent className="pb-3 pt-0">
                          <div className="flex flex-col gap-3 pl-1">
                            {section.children.map((child) => (
                              <Link
                                key={`${section.id}-${child.labelKey}`}
                                href={child.href}
                                onClick={() => setMenuOpen(false)}
                                className="font-paragraph text-sm text-muted-foreground"
                              >
                                {t(child.labelKey)}
                              </Link>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <SearchComponent
        isOpen={searchOpen}
        onClose={() => dispatch(toggleSearch())}
      />
    </>
  );
}
