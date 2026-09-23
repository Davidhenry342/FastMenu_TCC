import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Product } from '../models/product';

type ProductFormPayload = Omit<Product, 'id'> & {
  imageFile?: File | null;
  removeImage?: boolean;
};

type ProductContextValue = {
  products: Product[];
  addProduct: (product: ProductFormPayload) => Promise<void>;
  updateProduct: (id: string, changes: ProductFormPayload) => Promise<void>;
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

function toFormData(data: ProductFormPayload): FormData {
  const form = new FormData();

  form.append('name', data.name);
  form.append('description', data.description);
  form.append('price', String(data.price));
  form.append('preparationTime', String(data.preparationTime));
  form.append('categoryId', data.categoryId);

  if (data.imageFile) {
    form.append('image', data.imageFile);
  }

  if (data.removeImage) {
    form.append('removeImage', 'true');
  }

  return form;
}

export function ProductProvider({ children }: ProductProviderProps) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch('/api/products', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : []))
      .then((data: unknown[]) => setProducts(data.map(reviveProduct)))
      .catch(() => {});
  }, []);

  const addProduct = async (product: ProductFormPayload) => {
    const res = await fetch('/api/products', {
      method: 'POST',
      credentials: 'include',
      body: toFormData(product),
    });

    if (!res.ok) {
      throw new Error('Falha ao criar produto');
    }

    const created = reviveProduct(await res.json());

    setProducts(current => [...current, created]);
  };

  const updateProduct = async (id: string, changes: ProductFormPayload) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      credentials: 'include',
      body: toFormData(changes),
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