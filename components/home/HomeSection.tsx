import { cn } from '@/lib/utils';
import {
  HOME_SECTION_CONTAINER,
  HOME_SECTION_SPACING,
  HOME_SECTION_SPACING_AFTER_HERO,
  HOME_SECTION_SPACING_FILLED,
} from '@/lib/home/section-spacing';

export type HomeSectionRhythm = 'default' | 'after-hero' | 'filled';

const RHYTHM: Record<HomeSectionRhythm, string> = {
  default: HOME_SECTION_SPACING,
  'after-hero': HOME_SECTION_SPACING_AFTER_HERO,
  filled: HOME_SECTION_SPACING_FILLED,
};

export interface HomeSectionProps {
  children: React.ReactNode;
  /** Which step of the shared vertical scale this band uses. */
  rhythm?: HomeSectionRhythm;
  /**
   * Drop the page gutter from the content wrapper, for a band whose media runs
   * edge to edge. The band still gets its vertical rhythm.
   */
  bleed?: boolean;
  /** Extra classes for the `<section>` itself, e.g. a background. */
  className?: string;
  /** Extra classes for the inner container. */
  contentClassName?: string;
  'aria-label'?: string;
  'aria-busy'?: boolean;
}

/**
 * The wrapper every homepage band renders through.
 *
 * Its only job is spacing: one `<section>`, one vertical rhythm from
 * `lib/home/section-spacing`, one page gutter. Sections used to each carry their
 * own `py-*` and their own container, which is why the page had six competing
 * rhythms; routing them all through here means the rhythm can be changed in one
 * file and stays identical between a section's loading state and its loaded one.
 */
export function HomeSection({
  children,
  rhythm = 'default',
  bleed = false,
  className,
  contentClassName,
  ...aria
}: HomeSectionProps) {
  return (
    <section className={cn(RHYTHM[rhythm], 'font-paragraph', className)} {...aria}>
      <div className={cn(bleed ? 'px-0' : HOME_SECTION_CONTAINER, contentClassName)}>
        {children}
      </div>
    </section>
  );
}

export default HomeSection;
