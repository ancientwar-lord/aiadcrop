/**
 * Database schema setup for AI Try-On products
 * Run this once to create the products table
 */

import { pool } from './db';

export async function initializeDatabase() {
  try {
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

    console.log('✅ Products table created successfully');
  } catch (error) {
    console.error('Error creating products table:', error);
    throw error;
  }
}

/**
 * Create a product in the database
 */
export async function createProduct(
  id: string,
  sellerId: string,
  name: string,
  category: string,
  cloudinaryUrl: string,
  cloudinaryPublicId: string,
  metadata?: {
    color?: string;
    style?: string;
    bestSkinTones?: string[];
  }
) {
  try {
    const result = await pool.query(
      `INSERT INTO products (
         id,
         seller_id,
         name,
         category,
         cloudinary_url,
         cloudinary_public_id,
         color,
         style,
         best_skin_tones
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        sellerId,
        name,
        category,
        cloudinaryUrl,
        cloudinaryPublicId,
        metadata?.color || 'Unknown',
        metadata?.style || 'General',
        metadata?.bestSkinTones || [],
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

/**
 * Get all products for a seller
 */
export async function getProductsBySeller(sellerId: string) {
  try {
    const result = await pool.query(
      `SELECT * FROM products WHERE seller_id = $1 ORDER BY uploaded_at DESC`,
      [sellerId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching seller products:', error);
    throw error;
  }
}

/**
 * Get a single product by ID
 */
export async function getProductById(id: string) {
  try {
    const result = await pool.query(`SELECT * FROM products WHERE id = $1`, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string) {
  try {
    const result = await pool.query(`DELETE FROM products WHERE id = $1 RETURNING *`, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

export default {
  initializeDatabase,
  createProduct,
  getProductsBySeller,
  getProductById,
  deleteProduct,
};
