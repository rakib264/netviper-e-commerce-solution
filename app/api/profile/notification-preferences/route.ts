import { auth } from '@/lib/auth';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import {
  resolveNotificationPreferences,
  sanitizePreferencesPatch,
} from '@/lib/notifications/preferences';
import { NextRequest, NextResponse } from 'next/server';

/**
 * The caller's own notification preferences.
 *
 * Always returns a complete object: an account created before the field existed
 * has nothing stored, and the resolver fills in the defaults, so the UI never
 * has to render a toggle whose value is unknown.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id)
      .select('notificationPreferences')
      .lean<Record<string, any> | null>();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      preferences: resolveNotificationPreferences(user.notificationPreferences),
    });
  } catch (error) {
    console.error('Notification preferences GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load notification preferences' },
      { status: 500 },
    );
  }
}

/**
 * Update the caller's own preferences.
 *
 * The body is a *patch*, coerced field by field to booleans by
 * `sanitizePreferencesPatch` — anything unrecognised is dropped rather than
 * stored, so a client cannot invent a channel or write a non-boolean into one.
 * The merge happens against the resolved defaults, so a partial patch from an
 * account with nothing stored still writes a complete document.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const patch = sanitizePreferencesPatch(await request.json().catch(() => null));
    if (!patch) {
      return NextResponse.json(
        { error: 'No valid preference fields supplied' },
        { status: 400 },
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id).select(
      'notificationPreferences',
    );
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const current = resolveNotificationPreferences(user.notificationPreferences);
    const next = {
      push: { ...current.push, ...(patch.push || {}) },
      inApp: { ...current.inApp, ...(patch.inApp || {}) },
      email: { ...current.email, ...(patch.email || {}) },
      sms: { ...current.sms, ...(patch.sms || {}) },
    };

    user.notificationPreferences = next;
    await user.save();

    return NextResponse.json({ success: true, preferences: next });
  } catch (error) {
    console.error('Notification preferences PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 },
    );
  }
}
