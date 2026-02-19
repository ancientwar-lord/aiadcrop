import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

async function ensureTable() {
  // Table creation logic remains same
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

// 1. Type definition badla gaya hai (Promise add kiya)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureTable();

    // 2. Params ko AWAIT karna zaroori hai
    const { id } = await params;

    console.log('Fetching product with ID:', id);

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

// import { NextRequest, NextResponse } from 'next/server';
// import { pool } from '@/lib/db';

// async function ensureTable() {
//   await pool.query(`
//     CREATE TABLE IF NOT EXISTS products (
//       id VARCHAR(255) PRIMARY KEY,
//       seller_id VARCHAR(255) NOT NULL,
//       name VARCHAR(255) NOT NULL,
//       category VARCHAR(50) NOT NULL,
//       cloudinary_url TEXT NOT NULL,
//       cloudinary_public_id VARCHAR(255),
//       uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//       created_by VARCHAR(255),
//       CONSTRAINT fk_seller FOREIGN KEY (seller_id) REFERENCES "user"(id) ON DELETE CASCADE
//     );
//   `);
// }

// export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
//   console.log('Fetching product with ID:', params.id);
//   try {
//     await ensureTable();

//     const productId = params.id;

//     if (!productId) {
//       return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
//     }

//     const result = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);

//     if (result.rows.length === 0) {
//       return NextResponse.json({ error: 'Product not found' }, { status: 404 });
//     }

//     const product = result.rows[0];

//     return NextResponse.json(
//       {
//         success: true,
//         product: {
//           id: product.id,
//           name: product.name,
//           category: product.category,
//           cloudinaryUrl: product.cloudinary_url,
//           cloudinaryPublicId: product.cloudinary_public_id,
//           sellerId: product.seller_id,
//           uploadedAt: product.uploaded_at,
//         },
//       },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error('Error fetching product:', error);
//     return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
//   }
// }
