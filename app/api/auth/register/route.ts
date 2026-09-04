import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import { notifyAdminNewCustomer, notifyCustomerWelcome } from '@/lib/notifications/events';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, phone, email, password } = await request.json();

    if (!firstName || !lastName || !phone || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      phone,
      email,
      password: hashedPassword,
      role: 'customer',
      isActive: true,
      profileImage: '', // Initialize as empty string
    });

    try {
      await Promise.all([
        notifyCustomerWelcome({
          userId: user._id.toString(),
          firstName: user.firstName,
        }),
        notifyAdminNewCustomer({
          customerId: user._id.toString(),
          customerName: `${user.firstName} ${user.lastName}`.trim(),
          customerEmail: user.email,
        }),
      ]);
    } catch (notificationError) {
      console.error('Failed to enqueue register notifications:', notificationError);
    }

    return NextResponse.json({ 
      message: 'User created successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        role: user.role,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}