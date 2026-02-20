import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { uploadToCloudinary } from '@/lib/cloudinary-client';
import { createProduct } from '@/lib/products-db';
import { analyzeProductWithPollinations } from '@/lib/product-vision';

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
}

async function ensureUserExists(userId: string) {
  try {
    // Check if user exists
    const checkUser = await pool.query('SELECT id FROM "user" WHERE id = $1', [userId]);

    // If user doesn't exist, insert them
    if (checkUser.rows.length === 0) {
      console.log(`Creating user: ${userId}`);
      await pool.query('INSERT INTO "user" (id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
    }
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTable();

    const formData = await request.formData();
    const file = formData.get('image') as File;
    const productName = formData.get('productName') as string;
    const productCategory = formData.get('category') as string;
    const sellerId = formData.get('sellerId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID is required' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = (await uploadToCloudinary(buffer, {
      folder: 'aiadcrop/products',
      public_id: `${productCategory}-${Date.now()}`,
      tags: ['product', productCategory],
    })) as { secure_url: string; public_id: string };

    // Generate product ID
    const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Ensure user exists in users table before creating product
    await ensureUserExists(sellerId);

    const visionMetadata = await analyzeProductWithPollinations({
      imageUrl: uploadResult.secure_url,
      productName,
      category: productCategory,
    });

    // Save to database
    const savedProduct = await createProduct(
      productId,
      sellerId,
      productName,
      productCategory,
      uploadResult.secure_url,
      uploadResult.public_id,
      visionMetadata
    );

    return NextResponse.json(
      {
        success: true,
        product: {
          id: savedProduct.id,
          name: savedProduct.name,
          category: savedProduct.category,
          cloudinaryUrl: savedProduct.cloudinary_url,
          cloudinaryPublicId: savedProduct.cloudinary_public_id,
          color: savedProduct.color,
          style: savedProduct.style,
          bestSkinTones: savedProduct.best_skin_tones || [],
          uploadedAt: savedProduct.uploaded_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading product:', error);
    return NextResponse.json({ error: 'Failed to upload product image' }, { status: 500 });
  }
}
