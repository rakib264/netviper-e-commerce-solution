import { cn } from '@/lib/utils';

/**
 * The extractable answer: 40–60 words, self-contained, server-rendered.
 *
 * Answer engines lift a passage rather than summarising a page, so this has to
 * still be true and still make sense with nothing around it. "It ships in 2
 * days" is useless once quoted; "Ramen Bhai delivers across Dhaka in 1–2 days
 * and nationwide in 3–5 days, free over ৳2,000" survives extraction.
 *
 * Placed directly under the H1, before any marketing, and rendered at rest —
 * no Framer Motion `initial={{ opacity: 0 }}`, which is honoured during SSR and
 * would ship the element invisible until hydration. A plain `<p>` is the whole
 * point: the text is in the initial HTML, in document order, at the top.
 */
export function AnswerBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      data-answer-block
      className={cn(
        'max-w-3xl text-base leading-relaxed text-foreground md:text-lg',
        className,
      )}
    >
      {children}
    </p>
  );
}

export default AnswerBlock;
