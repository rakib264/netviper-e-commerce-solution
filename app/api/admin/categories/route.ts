import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Category from '@/lib/models/Category';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
 
 
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    const query = active !== null ? { isActive: active === 'true' } : {};
    
    const categories = await Category.find(query)
      .populate('parent', 'name slug')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    // Add product count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({ 
          category: category._id, 
          isActive: true 
        });
        return { ...category, productCount };
      })
    );

    return NextResponse.json(categoriesWithCount);
  } catch (error) {
    console.error('Categories API error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const data = await request.json();
    
    // Generate slug if not provided
    if (!data.slug) {
      data.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    // Append to end of sibling group unless sortOrder was explicitly sent
    if (data.sortOrder === undefined || data.sortOrder === null) {
      const siblingQuery = data.parent
        ? { parent: data.parent }
        : { $or: [{ parent: null }, { parent: { $exists: false } }] };
      const lastSibling: { sortOrder?: number } | null = await Category.findOne(siblingQuery)
        .sort({ sortOrder: -1 })
        .select('sortOrder')
        .lean<{ sortOrder?: number }>();
      data.sortOrder = (lastSibling?.sortOrder ?? -1) + 1;
    }

    const category = await Category.create(data);

    // Log audit
    await AuditLog.create({
      user: session.user.id,
      action: 'CREATE',
      resource: 'Category',
      resourceId: category._id.toString(),
      metadata: { categoryName: category.name, slug: category.slug }
    });
    
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No category ids provided' }, { status: 400 });
    }

    const results: Array<{ id: string; status: 'deleted' | 'skipped'; reason?: string }> = [];

    for (const id of ids) {
      try {
        const category = await Category.findById(id);
        if (!category) {
          results.push({ id, status: 'skipped', reason: 'Category not found' });
          continue;
        }

        const productCount = await Product.countDocuments({ category: id });
        if (productCount > 0) {
          results.push({ id, status: 'skipped', reason: `Has ${productCount} products` });
          continue;
        }

        const subcategoryCount = await Category.countDocuments({ parent: id });
        if (subcategoryCount > 0) {
          results.push({ id, status: 'skipped', reason: `Has ${subcategoryCount} subcategories` });
          continue;
        }

        await Category.findByIdAndDelete(id);

        await AuditLog.create({
          user: session.user.id,
          action: 'DELETE',
          resource: 'Category',
          resourceId: id,
          metadata: { categoryName: category.name, slug: category.slug, bulk: true }
        });

        results.push({ id, status: 'deleted' });
      } catch (err) {
        results.push({ id, status: 'skipped', reason: 'Unexpected error' });
      }
    }

    const deleted = results.filter(r => r.status === 'deleted').length;
    const skipped = results.length - deleted;

    return NextResponse.json({ deleted, skipped, results });
  } catch (error) {
    console.error('Bulk delete categories error:', error);
    return NextResponse.json({ error: 'Failed to bulk delete categories' }, { status: 500 });
  }
}