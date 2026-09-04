import { resolveComboLine } from '@/lib/combo-bundles/resolve';
import { NextRequest, NextResponse } from 'next/server';

interface ValidateRequestLine {
  comboBundleId?: string;
  quantity?: number;
}

export interface ComboLineVerdict {
  comboBundleId: string;
  ok: boolean;
  reason?: string;
  /** Server price for one unit. The client renders this, never its own copy. */
  price?: number;
  compareAtPrice?: number;
  name?: string;
  slug?: string;
  comboType?: string;
  /** What can actually be sold — 0 means the line has to go. */
  sellableQty: number;
  maxUnits: number;
}

/**
 * Revalidate combo lines in a cart.
 *
 * The cart holds a snapshot taken when the customer clicked add, and anything
 * in it can go stale: the offer can be switched off, its schedule can close, a
 * component can sell out or be repriced. The storefront calls this on mount and
 * after every combo mutation, and takes the answer as the truth — the same
 * discipline the deals engine uses for gift lines.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const lines: ValidateRequestLine[] = Array.isArray(body?.lines) ? body.lines : [];

    const verdicts: ComboLineVerdict[] = [];

    for (const line of lines.slice(0, 40)) {
      const comboBundleId = String(line?.comboBundleId || '');
      if (!comboBundleId) continue;

      const resolution = await resolveComboLine(
        comboBundleId,
        Math.max(1, Number(line?.quantity) || 1),
      );

      verdicts.push({
        comboBundleId,
        ok: resolution.ok,
        reason: resolution.reason,
        price: resolution.combo?.price,
        compareAtPrice: resolution.combo?.compareAtPrice,
        name: resolution.combo?.name,
        slug: resolution.combo?.slug,
        comboType: resolution.combo?.comboType,
        sellableQty: resolution.sellableQty,
        maxUnits: resolution.combo?.maxUnits ?? 0,
      });
    }

    return NextResponse.json({ lines: verdicts });
  } catch (error) {
    console.error('combo-bundles validate', error);
    return NextResponse.json({ error: 'Failed to validate combos' }, { status: 500 });
  }
}
