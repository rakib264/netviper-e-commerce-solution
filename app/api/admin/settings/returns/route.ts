import { requireReturnsAdmin } from '@/lib/returns/admin-guard';
import ReturnPolicySettings from '@/lib/models/ReturnPolicySettings';
import connectDB from '@/lib/mongodb';
import { createAuditLog } from '@/lib/audit';
import {
  buildReturnPolicyPayload,
  getFreshReturnPolicy,
} from '@/lib/returns/policy-settings-server';
import { NextRequest, NextResponse } from 'next/server';

/** Read the policy for editing — uncached, so a save is immediately visible. */
export async function GET(request: NextRequest) {
  const guard = await requireReturnsAdmin(request);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    return NextResponse.json({ success: true, policy: await getFreshReturnPolicy() });
  } catch (error) {
    console.error('Admin return policy GET error:', error);
    return NextResponse.json({ error: 'Failed to load return policy' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const guard = await requireReturnsAdmin(request);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    const payload = buildReturnPolicyPayload(await request.json().catch(() => null));
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    await connectDB();

    // Upsert: the singleton does not exist until someone first saves.
    await ReturnPolicySettings.findOneAndUpdate({}, { $set: payload }, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    await createAuditLog({
      userId: guard.actor.userId || 'system',
      action: 'UPDATE',
      resource: 'ReturnPolicySettings',
      metadata: {
        sectionCount: payload.sections?.length ?? null,
        returnWindowDays: payload.returnWindowDays ?? null,
      },
      ipAddress: guard.actor.ipAddress,
    });

    return NextResponse.json({ success: true, policy: await getFreshReturnPolicy() });
  } catch (error) {
    console.error('Admin return policy PUT error:', error);
    return NextResponse.json({ error: 'Failed to save return policy' }, { status: 500 });
  }
}
