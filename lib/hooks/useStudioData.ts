import { useEffect, useState } from 'react';

interface Product {
  id: string;
  name: string;
  category: string;
  cloudinary_url: string;
}

export function useStudioData(userId: string | undefined) {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const productsRes = await fetch(`/api/products/by-seller?sellerId=${userId}`);

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData.products || []);
        }
      } catch (error) {
        console.error('Failed to load studio data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userId]);

  return {
    isLoading,
    products,
  };
}
