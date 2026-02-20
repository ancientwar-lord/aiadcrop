import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(255) PRIMARY KEY,
      seller_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL,
      cloudinary_url TEXT NOT NULL,
      cloudinary_public_id VARCHAR(255),
      color VARCHAR(100) DEFAULT 'Unknown',
      style VARCHAR(100) DEFAULT 'General',
      best_skin_tones TEXT[] DEFAULT ARRAY[]::TEXT[],
      analysis JSONB DEFAULT '{}'::JSONB,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(255),
      CONSTRAINT fk_seller FOREIGN KEY (seller_id) REFERENCES "user"(id) ON DELETE CASCADE
    );
  `);

  await pool.query(
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS color VARCHAR(100) DEFAULT 'Unknown';`
  );
  await pool.query(
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS style VARCHAR(100) DEFAULT 'General';`
  );
  await pool.query(
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS best_skin_tones TEXT[] DEFAULT ARRAY[]::TEXT[];`
  );
  await pool.query(
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS analysis JSONB DEFAULT '{}'::JSONB;`
  );
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureTable();

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = result.rows[0];

    return NextResponse.json(
      {
        success: true,
        product: {
          id: product.id,
          name: product.name,
          category: product.category,
          cloudinaryUrl: product.cloudinary_url,
          cloudinaryPublicId: product.cloudinary_public_id,
          sellerId: product.seller_id,
          color: product.color,
          style: product.style,
          bestSkinTones: product.best_skin_tones || [],
          analysis: product.analysis || {},
          uploadedAt: product.uploaded_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureTable();

    const { id } = await params;
    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const category = typeof body?.category === 'string' ? body.category.trim() : '';
    const sellerId = typeof body?.sellerId === 'string' ? body.sellerId.trim() : '';

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    if (!name || !category || !sellerId) {
      return NextResponse.json(
        { error: 'name, category, and sellerId are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE products
       SET name = $1, category = $2
       WHERE id = $3 AND seller_id = $4
       RETURNING *`,
      [name, category, id, sellerId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = result.rows[0];
    return NextResponse.json(
      {
        success: true,
        product: {
          id: product.id,
          name: product.name,
          category: product.category,
          cloudinaryUrl: product.cloudinary_url,
          cloudinaryPublicId: product.cloudinary_public_id,
          sellerId: product.seller_id,
          color: product.color,
          style: product.style,
          bestSkinTones: product.best_skin_tones || [],
          analysis: product.analysis || {},
          uploadedAt: product.uploaded_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTable();

    const { id } = await params;
    const sellerId = request.nextUrl.searchParams.get('sellerId')?.trim();

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID is required' }, { status: 400 });
    }

    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 AND seller_id = $2 RETURNING *',
      [id, sellerId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedProductId: id }, { status: 200 });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
