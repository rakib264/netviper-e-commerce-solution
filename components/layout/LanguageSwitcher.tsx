'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LocaleFlag } from '@/components/layout/LocaleFlag';
import {
  useLocaleSwitcher,
  useTranslation,
} from '@/components/providers/LocalizationProvider';
import type { Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';

interface LanguageSwitcherProps {
  className?: string;
  /**
   * `bar` is the light-on-dark treatment used in the mobile drawer; `inline`
   * is the compact utility-row control in the desktop header.
   */
  variant?: 'inline' | 'bar';
}

export function LanguageSwitcher({
  className,
  variant = 'inline',
}: LanguageSwitcherProps) {
  const { locale, localeMeta, allowedLocaleMeta, setLocale } = useLocaleSwitcher();
  const { t } = useTranslation();

  // A single allowed language is not a choice — render nothing rather than a
  // dropdown that cannot change anything.
  if (allowedLocaleMeta.length < 2) return null;

  const onSelect = (next: Locale) => {
    if (next !== locale) setLocale(next);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t('nav.changeLanguage')} — ${localeMeta.label}`}
          className={cn(
            'group inline-flex items-center gap-2 font-navigation uppercase tracking-[0.14em] text-foreground transition-opacity hover:opacity-70',
            variant === 'bar' ? 'text-[13px] normal-case tracking-normal' : 'text-[11px]',
            className,
          )}
        >
          <LocaleFlag locale={locale} />
          <span aria-hidden className="font-label leading-none">
            {locale.toUpperCase()}
          </span>
          <ChevronDown
            className="h-3 w-3 opacity-60 transition-transform group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <div className="px-2 py-1.5 font-caption text-[11px] uppercase tracking-[0.12em] text-subtle-foreground">
          {t('nav.language')}
        </div>
        {allowedLocaleMeta.map((option) => {
          const active = option.code === locale;
          return (
            <DropdownMenuItem
              key={option.code}
              onSelect={() => onSelect(option.code)}
              className="flex cursor-pointer items-center justify-between gap-3 py-2"
              // Radix reads this out, and it is what a screen reader uses to
              // announce which language is currently applied.
              aria-current={active ? 'true' : undefined}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <LocaleFlag locale={option.code} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-paragraph text-sm leading-tight">
                    {option.nativeLabel}
                  </span>
                  <span className="truncate font-caption text-xs leading-tight text-subtle-foreground">
                    {option.label}
                  </span>
                </span>
              </span>
              {active ? <Check size={14} className="shrink-0" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
