'use client';

import { Check, Link2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/components/providers/LocalizationProvider';

interface ShareProductProps {
  productName: string;
  productSlug: string;
  productImage?: string;
  price?: string;
  label?: string;
  className?: string;
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.19 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.9h-2.33V22c4.78-.75 8.44-4.92 8.44-9.94z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.28-1.38a9.9 9.9 0 0 0 4.76 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.19 8.19 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.41a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.41-.56-.42h-.47c-.17 0-.44.06-.67.31-.23.25-.87.86-.87 2.09s.9 2.43 1.02 2.6c.12.16 1.76 2.68 4.26 3.76.6.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-10.4a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z" />
    </svg>
  );
}

function ThreadsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.324.145 1.524.717 2.638 1.802 3.223 3.14.816 1.865.892 4.905-1.581 7.325-1.89 1.85-4.182 2.68-7.344 2.667Zm1.031-13.302c-.24 0-.49.01-.75.026-1.66.093-2.694.775-2.633 1.876.06.71.803 1.288 1.665 1.288.113 0 .228-.008.343-.023 1.288-.181 2.02-.926 2.234-2.86a9.66 9.66 0 0 0-.86-.307Z" />
    </svg>
  );
}

const ICON_BUTTON =
  'flex h-11 w-11 items-center justify-center border border-border text-foreground transition-colors hover:border-foreground hover:bg-primary hover:text-white md:h-12 md:w-12';

export default function ShareProduct({
  productName,
  productSlug,
  productImage,
  price,
  label = 'Share this product',
  className = '',
}: ShareProductProps) {
  const { t } = useTranslation();
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanNativeShare(typeof navigator !== 'undefined' && Boolean(navigator.share));
  }, []);

  const url = origin ? `${origin}/products/${productSlug}` : '';

  const links = useMemo(() => {
    const encodedUrl = encodeURIComponent(url);
    const text = encodeURIComponent(price ? `${productName} — ${price}` : productName);
    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${text}%20${encodedUrl}`,
      threads: `https://www.threads.net/intent/post?text=${text}%20${encodedUrl}`,
    };
  }, [url, productName, price]);

  const flashCopied = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      flashCopied();
    } catch {
      // Clipboard blocked (insecure context) — other channels still work.
    }
  };

  // Instagram has no web share URL; use the native sheet on mobile, otherwise
  // copy the link so the shopper can paste it into a story or DM.
  const shareToInstagram = async () => {
    if (canNativeShare && url) {
      try {
        await navigator.share({ title: productName, text: productName, url });
        return;
      } catch {
        // Fall through to copying.
      }
    }
    await copyLink();
  };

  const openPopup = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer,width=600,height=620');
  };

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-xs uppercase tracking-[0.12em] text-foreground">{label}</p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => openPopup(links.facebook)}
          className={ICON_BUTTON}
          aria-label={t('products.shareProduct.shareOnFacebook')}
          title={t('products.shareProduct.facebook')}
        >
          <FacebookIcon />
        </button>
        <button
          type="button"
          onClick={() => openPopup(links.whatsapp)}
          className={ICON_BUTTON}
          aria-label={t('products.shareProduct.shareOnWhatsapp')}
          title={t('products.shareProduct.whatsapp')}
        >
          <WhatsAppIcon />
        </button>
        <button
          type="button"
          onClick={shareToInstagram}
          className={ICON_BUTTON}
          aria-label={t('products.shareProduct.shareOnInstagram')}
          title={t('products.shareProduct.instagram')}
        >
          <InstagramIcon />
        </button>
        <button
          type="button"
          onClick={() => openPopup(links.threads)}
          className={ICON_BUTTON}
          aria-label={t('products.shareProduct.shareOnThreads')}
          title={t('products.shareProduct.threads')}
        >
          <ThreadsIcon />
        </button>
        <button
          type="button"
          onClick={copyLink}
          className={ICON_BUTTON}
          aria-label={t('products.shareProduct.copyLink')}
          title={copied ? t('products.shareProduct.linkCopied') : t('products.shareProduct.copyLink')}
        >
          {copied ? <Check className="h-5 w-5 text-success-600" /> : <Link2 className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
