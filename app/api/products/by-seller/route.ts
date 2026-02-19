/**
 * API Route: GET /api/products/by-seller
 * Get all products uploaded by the logged-in seller
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getProductsBySeller } from '@/lib/products-db';

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(255) PRIMARY KEY,
      seller_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL,
      cloudinary_url TEXT NOT NULL,
      cloudinary_public_id VARCHAR(255),
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(255),
      CONSTRAINT fk_seller FOREIGN KEY (seller_id) REFERENCES "user"(id) ON DELETE CASCADE
    );
  `);
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

export async function GET(request: NextRequest) {
  try {
    await ensureTable();

    // Get seller ID from query params (in real app, get from session)
    const sellerId = request.nextUrl.searchParams.get('sellerId');

    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID is required' }, { status: 400 });
    }

    // Ensure user exists in users table
    await ensureUserExists(sellerId);

    const products = await getProductsBySeller(sellerId);

    return NextResponse.json(
      {
        success: true,
        products: products,
        total: products.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching seller products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
