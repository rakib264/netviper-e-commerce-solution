import { PUBLIC_CONTENT_CACHE_HEADER } from '@/lib/cache/http';
import { DEFAULT_RETURN_POLICY } from '@/lib/returns/policy-content';
import { getCachedReturnPolicy } from '@/lib/returns/policy-settings-server';
import { NextResponse } from 'next/server';

/**
 * The customer-facing returns policy.
 *
 * Falls back to the shipped defaults on any failure — a policy page is the one
 * place a store cannot afford to render blank, since it is what a customer
 * consults before deciding whether they can return something.
 */
export async function GET() {
  try {
    const policy = await getCachedReturnPolicy();
    return NextResponse.json(
      { success: true, policy },
      { headers: { 'Cache-Control': PUBLIC_CONTENT_CACHE_HEADER } },
    );
  } catch (error) {
    console.error('Return policy read failed, serving defaults:', error);
    return NextResponse.json({ success: false, policy: DEFAULT_RETURN_POLICY });
  }
}
