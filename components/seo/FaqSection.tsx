import { cn } from '@/lib/utils';

/**
 * The visible half of the FAQ system.
 *
 * Renders the same Q&As that `faqSchema()` emits as `FAQPage` JSON-LD. Both are
 * required: Google expects FAQ content to be visible on the page, and schema
 * with no visible counterpart is a spam signal. They read one registry
 * (`lib/seo/faq.ts`) rather than each holding a copy, so they cannot drift.
 *
 * A server component using native `<details>`, not a Radix accordion. Three
 * reasons, all of them the point of this work:
 *
 *   - the answers are in the server HTML, so a crawler that runs no JavaScript
 *     still reads them. An accordion that mounts on hydration is invisible to
 *     exactly the systems this is for;
 *   - `<details>` is accessible and keyboard-operable with no JavaScript and no
 *     ARIA of our own;
 *   - browser find-in-page reaches collapsed `<details>` content and expands it,
 *     which no custom accordion does.
 */
export interface FaqSectionProps {
  faqs: Array<{ id: string; question: string; answer: string }>;
  /** Section heading. Already translated by the caller. */
  heading?: string;
  /** Heading level, so a page keeps a sane outline. */
  headingLevel?: 'h2' | 'h3';
  className?: string;
}

export function FaqSection({
  faqs,
  heading,
  headingLevel: Heading = 'h2',
  className,
}: FaqSectionProps) {
  if (!faqs.length) return null;

  return (
    <section className={cn('luxury-container py-12 md:py-16', className)}>
      {heading ? (
        <Heading className="text-fluid-2xl font-heading">{heading}</Heading>
      ) : null}

      <dl className="mt-6 max-w-3xl divide-y divide-border border-y border-border">
        {faqs.map((faq) => (
          <div key={faq.id} id={`faq-${faq.id}`}>
            <details className="group">
              {/*
                `<dt>` inside `<summary>` rather than the other way round: a
                `<summary>` must be the first child of its `<details>`, and the
                definition-list semantics are what tell an extraction model which
                half is the question.
              */}
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left">
                <dt className="font-heading text-base md:text-lg">{faq.question}</dt>
                <span
                  aria-hidden
                  className="shrink-0 text-xl leading-none text-subtle-foreground transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <dd className="pb-5 pr-8 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </dd>
            </details>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default FaqSection;
