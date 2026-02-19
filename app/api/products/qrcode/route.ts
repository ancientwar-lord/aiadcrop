/**
 * API Route: POST /api/products/qrcode
 * Generate QR code for a product
 */

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  try {
    const { productId, baseUrl } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Generate the try-on URL that will be encoded in QR code
    const tryOnUrl = `${baseUrl || process.env.NEXT_PUBLIC_BASE_URL}/tryon/${productId}`;

    // Generate QR code as data URL or buffer
    const qrCodeDataUrl = await QRCode.toDataURL(tryOnUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return NextResponse.json(
      {
        success: true,
        qrCode: qrCodeDataUrl,
        tryOnUrl: tryOnUrl,
        productId: productId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}

/**
 * GET /api/products/qrcode?productId=...
 * Get QR code for a product
 */
export async function GET(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get('productId');
    const baseUrl = request.nextUrl.searchParams.get('baseUrl');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const tryOnUrl = `${baseUrl || process.env.NEXT_PUBLIC_BASE_URL}/tryon/${productId}`;

    const qrCodeDataUrl = await QRCode.toDataURL(tryOnUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 1,
      width: 300,
    });

    return NextResponse.json(
      {
        success: true,
        qrCode: qrCodeDataUrl,
        tryOnUrl: tryOnUrl,
        productId: productId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}
