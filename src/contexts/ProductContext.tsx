import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '../models/product';

type ProductContextValue = {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, changes: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
};

const ProductContext = createContext<ProductContextValue | null>(null);

type ProductProviderProps = {
  children: ReactNode;
};

function reviveProduct(raw: unknown): Product {
  const data = raw as Product & { price: string | number; preparationTime: string | number };

  return {
    ...data,
    price: Number(data.price),
    preparationTime: Number(data.preparationTime),
  };
}

export function ProductProvider({ children }: ProductProviderProps) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch('/api/products', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : []))
      .then((data: unknown[]) => setProducts(data.map(reviveProduct)))
      .catch(() => {});
  }, []);

  const addProduct = async (product: Omit<Product, 'id'>) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(product),
    });

    if (!res.ok) {
      throw new Error('Falha ao criar produto');
    }

    const created = reviveProduct(await res.json());

    setProducts(current => [...current, created]);
  };

  const updateProduct = async (id: string, changes: Partial<Product>) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(changes),
    });

    if (!res.ok) {
      throw new Error('Falha ao atualizar produto');
    }

    const updated = reviveProduct(await res.json());

    setProducts(current =>
      current.map(product => (product.id === id ? updated : product)),
    );
  };

  const deleteProduct = async (id: string) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Falha ao excluir produto');
    }

    setProducts(current => current.filter(product => product.id !== id));
  };

  return (
    <ProductContext.Provider
      value={{ products, addProduct, updateProduct, deleteProduct }}
    >
      {children}
    </ProductContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProducts() {
  const context = useContext(ProductContext);

  if (!context) {
    throw new Error('useProducts deve ser usado dentro de <ProductProvider>');
  }

  return context;
}