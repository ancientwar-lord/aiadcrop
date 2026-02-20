import { notFound } from 'next/navigation';
import TryOnClient from '@/components/TryOnClient';
import { getProductById } from '@/lib/products-db';

interface ProductData {
  id: string;
  name: string;
  cloudinaryUrl: string;
  category: string;
}

async function getProduct(id: string): Promise<ProductData | null> {
  try {
    const product = await getProductById(id);

    if (!product) return null;

    return {
      id: product.id,
      name: product.name,
      cloudinaryUrl: product.cloudinary_url,
      category: product.category,
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
  const resolvedParams = await params;
  const productId = resolvedParams.id;
  const product = await getProduct(productId);
  if (!product) {
    notFound();
  }

  // 3. Client Component ko Data pass karo
  return <TryOnClient product={product} />;
}
