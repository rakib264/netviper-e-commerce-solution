import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ProductShowcaseSection from '@/lib/models/ProductShowcaseSection';
import { revalidateDynamicSlots } from '@/lib/landing/homepage-sections-server';
import {
  normalizeShowcaseBody,
  serializeShowcaseSection,
} from '@/lib/product-showcase/normalize';
import type { ShowcaseTemplate } from '@/lib/product-showcase/types';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

async function requireStaff() {
  const session = await auth();
  if (
    !session?.user?.role ||
    !['admin', 'manager', 'super_admin'].includes(session.user.role)
  ) {
    return null;
  }
  return session;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStaff();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    await connectDB();
    const doc = await ProductShowcaseSection.findById(id).lean();
    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({
      section: serializeShowcaseSection(doc as Record<string, unknown>),
    });
  } catch (error) {
    console.error('product-showcase GET id', error);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStaff();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await connectDB();
    const body = await request.json();

    if (
      body &&
      typeof body === 'object' &&
      Object.keys(body).length === 1 &&
      'isActive' in body
    ) {
      const toggled = await ProductShowcaseSection.findByIdAndUpdate(
        id,
        { isActive: Boolean(body.isActive) },
        { new: true }
      ).lean();
      if (!toggled) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      await revalidateDynamicSlots();
      return NextResponse.json({
        section: serializeShowcaseSection(toggled as Record<string, unknown>),
      });
    }

    // The stored template is the fallback, so a body that omits it updates the
    // section instead of converting it (and wiping the other template's fields).
    const existing = await ProductShowcaseSection.findById(id)
      .select('template')
      .lean<{ template?: ShowcaseTemplate } | null>();
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data = normalizeShowcaseBody(body, {
      currentTemplate: existing.template,
    });

    // Only the active template's fields are written. Blanking the other side
    // would discard panels or tabs the admin never touched — including the ones
    // a template switch leaves behind, which is what makes switching back to
    // the original template return the section to its saved content.
    const $set: Record<string, unknown> = {
      template: data.template,
      title: data.title,
      subtitle: data.subtitle,
      cardStyle: data.cardStyle,
      isActive: data.isActive,
      order: data.order,
    };
    if (data.template === 'split_media') {
      $set.splitLeft = data.splitLeft;
      $set.splitRight = data.splitRight;
    } else {
      $set.tabs = data.tabs || [];
    }

    const updated = await ProductShowcaseSection.findByIdAndUpdate(
      id,
      { $set },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await revalidateDynamicSlots();
    return NextResponse.json({
      section: serializeShowcaseSection(updated as Record<string, unknown>),
    });
  } catch (error) {
    console.error('product-showcase PUT', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStaff();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    await connectDB();
    const deleted = await ProductShowcaseSection.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await revalidateDynamicSlots();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('product-showcase DELETE', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
