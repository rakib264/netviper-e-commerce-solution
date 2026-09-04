import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Category from '@/lib/models/Category';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
 
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { id } = await context.params;
    const category = await Category.findById(id).populate('parent', 'name slug');
    
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const data = await request.json();
    const { id } = await context.params;
    const oldCategory = await Category.findById(id);
    
    if (!oldCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    ).populate('parent', 'name slug');

    // Log audit with changes
    const changes = [];
    for (const key in data) {
      if (oldCategory[key] !== data[key]) {
        changes.push({
          field: key,
          oldValue: oldCategory[key],
          newValue: data[key]
        });
      }
    }

    await AuditLog.create({
      user: session.user.id,
      action: 'UPDATE',
      resource: 'Category',
      resourceId: id,
      changes,
      metadata: { categoryName: updatedCategory.name, slug: updatedCategory.slug }
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !['admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { id } = await context.params;
    const category = await Category.findById(id);
    
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if category has products
    const productCount = await Product.countDocuments({ category: id });
    if (productCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete category with ${productCount} products. Move products to another category first.` 
      }, { status: 400 });
    }

    // Check if category has subcategories
    const subcategoryCount = await Category.countDocuments({ parent: id });
    if (subcategoryCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete category with ${subcategoryCount} subcategories.` 
      }, { status: 400 });
    }

    await Category.findByIdAndDelete(id);

    // Log audit
    await AuditLog.create({
      user: session.user.id,
      action: 'DELETE',
      resource: 'Category',
      resourceId: id,
      metadata: { categoryName: category.name, slug: category.slug }
    });

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}