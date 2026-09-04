import Coupon from '@/lib/models/Coupon';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { code, subtotal } = await request.json();
    
    if (!code || !subtotal) {
      return NextResponse.json({ error: 'Code and subtotal are required' }, { status: 400 });
    }
    
    // Find coupon
    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      expiryDate: { $gte: new Date() }
    });
    
    if (!coupon) {
      return NextResponse.json({ error: 'Invalid or expired coupon code' }, { status: 400 });
    }
    
    // Check usage limit
    if (coupon.usageLimit && coupon.currentUsage >= coupon.usageLimit) {
      return NextResponse.json({ error: 'Coupon usage limit exceeded' }, { status: 400 });
    }
    
    // Check minimum spend
    if (coupon.minSpend && subtotal < coupon.minSpend) {
      return NextResponse.json({ 
        error: `Please order minimum of ${coupon.minSpend} BDT to apply this coupon` 
      }, { status: 400 });
    }
    
    // Calculate discount
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = Math.round((subtotal * coupon.value) / 100);
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.value;
    }
    
    return NextResponse.json({
      valid: true,
      discount,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value
      }
    });
  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 });
  }
}