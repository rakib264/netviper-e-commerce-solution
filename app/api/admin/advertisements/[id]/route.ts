import {
  normalizeAdvertisementPayload,
  toAdvertisementDTO,
} from '@/lib/advertisements/types';
import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Advertisement from '@/lib/models/Advertisement';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ROLES = ['admin', 'manager'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !ALLOWED_ROLES.includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const advertisement = await Advertisement.findById(id).lean();

    if (!advertisement) {
      return NextResponse.json({ error: 'Advertisement not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      advertisement: toAdvertisementDTO(advertisement as any),
    });
  } catch (error) {
    console.error('Get advertisement error:', error);
    return NextResponse.json({ error: 'Failed to fetch advertisement' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !ALLOWED_ROLES.includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const existingAd = await Advertisement.findById(id);
    if (!existingAd) {
      return NextResponse.json({ error: 'Advertisement not found' }, { status: 404 });
    }

    const { value, errors } = normalizeAdvertisementPayload(await request.json(), {
      partial: true,
    });

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    // A family never changes; ignore any attempt to move an ad between them so
    // the position bookkeeping below stays sound.
    delete value.type;

    // Moving to an occupied position swaps with whoever holds it, which is what
    // an admin dragging a number expects.
    let swappedAd = null;
    if (value.position && value.position !== existingAd.position) {
      const conflictingAd = await Advertisement.findOne({
        _id: { $ne: id },
        type: existingAd.type,
        position: value.position,
      });

      if (conflictingAd) {
        swappedAd = await Advertisement.findByIdAndUpdate(
          conflictingAd._id,
          { position: existingAd.position },
          { new: true }
        );
      }
    }

    const { cta, ...rest } = value;
    const updateData: Record<string, unknown> = { ...rest };
    if (typeof cta !== 'undefined') {
      if (cta === null) updateData.$unset = { cta: '' };
      else updateData.cta = cta;
    }

    const { $unset, ...setData } = updateData as any;
    const updatedAd = await Advertisement.findByIdAndUpdate(
      id,
      { $set: setData, ...($unset ? { $unset } : {}) },
      { new: true, runValidators: true }
    );

    await AuditLog.create({
      user: session.user.id,
      action: 'UPDATE',
      resource: 'Advertisement',
      resourceId: id,
      metadata: {
        type: updatedAd?.type,
        position: updatedAd?.position,
        title: updatedAd?.title
      }
    }).catch(() => undefined);

    return NextResponse.json({
      success: true,
      message: swappedAd
        ? 'Advertisement updated successfully. Position swapped with another ad.'
        : 'Advertisement updated successfully',
      advertisement: updatedAd ? toAdvertisementDTO(updatedAd.toObject()) : null,
      swappedAd: swappedAd ? toAdvertisementDTO(swappedAd.toObject()) : undefined,
    });

  } catch (error: any) {
    console.error('Update advertisement error:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({
        error: 'Validation failed',
        details: validationErrors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to update advertisement',
      details: error.message
    }, { status: 500 });
  }
}
