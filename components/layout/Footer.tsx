"use client";

import { BRAND } from "@/lib/seo/brand";
import {
  useCurrency,
  useTranslation,
} from "@/components/providers/LocalizationProvider";
import { useSettings } from "@/hooks/use-settings";
import Link from "next/link";
import { useMemo, useState } from "react";

/**
 * Built-in columns, used when landing management has not supplied its own.
 * Titles and labels are translation keys — admin-authored `footerLinks` stay
 * verbatim, since those are content rather than chrome.
 */
const FOOTER_GROUPS: Array<{
  titleKey: string;
  links: Array<{ labelKey: string; href: string }>;
}> = [
  {
    titleKey: "footer.groups.customerCare",
    links: [
      { labelKey: "footer.links.contactUs", href: "/contact" },
      { labelKey: "footer.links.faq", href: "/faqs" },
      { labelKey: "footer.links.shippingReturns", href: "/shipping-delivery" },
      { labelKey: "footer.links.productCare", href: "/faqs" },
      { labelKey: "footer.links.trackOrder", href: "/dashboard/orders" },
    ],
  },
  {
    titleKey: "footer.groups.explore",
    links: [
      { labelKey: "footer.links.newArrivals", href: "/products/new-arrivals" },
      { labelKey: "footer.links.handbags", href: "/products" },
      { labelKey: "footer.links.giftServices", href: "/privilege-members" },
      { labelKey: "footer.links.trackYourReturn", href: "/returns" },
    ],
  },
  {
    titleKey: "footer.groups.theHouse",
    links: [
      { labelKey: "footer.links.ourStory", href: "/about" },
      { labelKey: "footer.links.craftsmanship", href: "/about" },
      { labelKey: "footer.links.sustainability", href: "/about" },
      { labelKey: "footer.links.journal", href: "/blogs" },
    ],
  },
  {
    titleKey: "footer.groups.myAccount",
    links: [
      { labelKey: "footer.links.signIn", href: "/auth/signin" },
      { labelKey: "footer.links.orders", href: "/dashboard/orders" },
      { labelKey: "footer.links.wishlist", href: "/wishlist" },
    ],
  },
];

const LEGAL_LINKS: Array<{ labelKey: string; href: string }> = [
  { labelKey: "footer.links.termsOfUse", href: "/terms-conditions" },
  { labelKey: "footer.links.privacyPolicy", href: "/privacy-policy" },
  { labelKey: "footer.links.accessibility", href: "/faqs" },
  { labelKey: "footer.groups.customerCare", href: "/contact" },
  { labelKey: "footer.links.siteMap", href: "/sitemap.xml" },
];

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.19 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.9h-2.33V22c4.78-.75 8.44-4.92 8.44-9.94z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-10.4a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M17.53 3h3.05l-6.67 7.62L21.75 21h-6.13l-4.8-6.28L5.32 21H2.26l7.13-8.15L2.25 3h6.29l4.34 5.74L17.53 3zm-1.07 16.16h1.69L7.62 4.74H5.8l10.66 14.42z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.2v12.9a2.6 2.6 0 0 1-2.6 2.5 2.6 2.6 0 0 1 0-5.2c.27 0 .53.04.78.12v-3.3a5.9 5.9 0 0 0-.78-.06 5.85 5.85 0 1 0 5.85 5.85V9.4a7.5 7.5 0 0 0 4.4 1.42V7.6a4.28 4.28 0 0 1-3.39-1.78z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M23.5 6.2a3 3 0 0 0-2.12-2.12C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.53A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.12 2.12c1.88.53 9.38.53 9.38.53s7.5 0 9.38-.53a3 3 0 0 0 2.12-2.12A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
    </svg>
  );
}

function NewsletterSignup() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    setEmail("");
  };

  return (
    <div>
      {submitted ? (
        <p className="flex h-12 items-center border border-foreground px-4 font-paragraph text-sm text-foreground">
          {t("footer.newsletterThanks")}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex">
          <label htmlFor="footer-email" className="sr-only">
            {t("footer.emailAddress")}
          </label>
          <input
            id="footer-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("footer.newsletterPlaceholder")}
            className="h-12 min-w-0 flex-1 border border-foreground border-r-0 bg-card px-4 font-paragraph text-sm text-foreground outline-none placeholder:text-subtle-foreground"
          />
          <button
            type="submit"
            className="h-12 shrink-0 bg-primary px-6 font-button text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-primary/90"
          >
            {t("footer.newsletterSignUp")}
          </button>
        </form>
      )}

      <p className="mt-4 font-caption text-xs leading-relaxed text-subtle-foreground">
        {t("footer.newsletterConsent")}{" "}
        <Link href="/privacy-policy" className="font-caption underline hover:text-foreground">
          {t("footer.privacyPolicy")}
        </Link>
        {t("footer.newsletterConsentSuffix")}
      </p>
    </div>
  );
}

export default function Footer() {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const currentYear = new Date().getFullYear();
  const siteName = settings?.siteName || BRAND.name;

  /*
   * Footer navigation, from the translation dictionary.
   *
   * This used to prefer an admin-authored list of "landing content blocks",
   * falling back to these keys only when none existed. That path stored the
   * column heading and every link label as raw strings in one language — it
   * could not be translated, and its default heading was a hardcoded "Explore".
   * The link set here is structural site navigation rather than editorial
   * content, so keys are the correct source and the admin surface for it was
   * removed.
   */
  const groups = useMemo(
    () =>
      FOOTER_GROUPS.map((group) => ({
        title: t(group.titleKey),
        links: group.links.map((link) => ({
          label: t(link.labelKey),
          href: link.href,
        })),
      })),
    [t],
  );

  const socials = [
    { key: "instagram", href: settings?.socialLinks?.instagram, label: t('layout.footer.instagram'), Icon: InstagramIcon },
    { key: "facebook", href: settings?.socialLinks?.facebook, label: t('layout.footer.facebook'), Icon: FacebookIcon },
    { key: "x", href: (settings?.socialLinks as { x?: string })?.x, label: "X", Icon: XIcon },
    { key: "tiktok", href: settings?.socialLinks?.tiktok, label: t('layout.footer.tiktok'), Icon: TikTokIcon },
    { key: "youtube", href: settings?.socialLinks?.youtube, label: t('layout.footer.youtube'), Icon: YouTubeIcon },
  ].map((s) => ({ ...s, href: s.href || undefined }));

  return (
    <footer className="border-t border-border bg-muted text-foreground">
      <div className="luxury-container py-12 md:py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {groups.map((group) => (
              <nav key={group.title} className="space-y-4">
                <p className="font-navigation text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
                  {group.title}
                </p>
                <ul className="space-y-2.5">
                  {group.links.map((link) => (
                    <li key={`${group.title}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="block font-paragraph text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          {/* Newsletter + social */}
          <div className="max-w-md space-y-6">
            <NewsletterSignup />
            <div className="flex flex-wrap items-center gap-3">
              {socials.map(({ key, href, label, Icon }) => (
                <Link
                  key={key}
                  href={href || "#"}
                  target={href ? "_blank" : undefined}
                  rel={href ? "noopener noreferrer" : undefined}
                  aria-label={label}
                  className="inline-flex h-11 w-11 items-center justify-center border border-border text-foreground transition-colors hover:border-foreground hover:bg-primary hover:text-white"
                >
                  <Icon />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Legal bottom bar */}
        <div className="mt-12 border-t border-border pt-8">
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 font-navigation text-[11px] uppercase tracking-[0.08em] text-subtle-foreground">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={`${link.labelKey}-${link.href}`}
                href={link.href}
                className="font-navigation transition-colors hover:text-foreground"
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>
          <p className="mt-6 text-center font-caption text-[11px] uppercase tracking-[0.08em] text-subtle-foreground">
            © {currentYear} {siteName}. {t("common.allRightsReserved")}. ·{" "}
            {t('common.shipToCountryCurrency', { country: 'Germany', currency })}
          </p>
        </div>
      </div>
    </footer>
  );
}
