import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { products as initialProducts } from '../data/products';
import type { Product } from '../models/product';

type ProductContextValue = {
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, changes: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
};

const ProductContext = createContext<ProductContextValue | null>(null);

type ProductProviderProps = {
  children: ReactNode;
};

export function ProductProvider({ children }: ProductProviderProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);

  const addProduct = (product: Product) => {
    setProducts(current => [...current, product]);
  };

  const updateProduct = (id: string, changes: Partial<Product>) => {
    setProducts(current =>
      current.map(product =>
        product.id === id ? { ...product, ...changes } : product,
      ),
    );
  };

  const deleteProduct = (id: string) => {
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