import { notFound } from 'next/navigation';
import TryOnClient from '@/components/TryOnClient';

interface ProductData {
  id: string;
  name: string;
  cloudinaryUrl: string;
  category: string;
}

async function getProduct(id: string): Promise<ProductData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const res = await fetch(`${baseUrl}/api/products/${id}`, {
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const data = await res.json();

    return {
      id: data.product.id,
      name: data.product.name,
      cloudinaryUrl: data.product.cloudinaryUrl,
      category: data.product.category,
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TryOnPage({ params }: PageProps) {
  // 1. Data Fetching on Server (Fast & SEO Friendly)
  const resolvedParams = await params;
  const productId = resolvedParams.id;
  const product = await getProduct(productId);
  if (!product) {
    notFound();
  }

  // 3. Client Component ko Data pass karo
  return <TryOnClient product={product} />;
}
