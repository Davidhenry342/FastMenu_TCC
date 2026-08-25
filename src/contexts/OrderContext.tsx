import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { OrderItem } from '../models/order';

const ORDERS_STORAGE_KEY = 'fastmenu:orders';

function loadOrders(): OrderItem[] {
  try {
    const stored = localStorage.getItem(ORDERS_STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as OrderItem[];

    return parsed.map(item => ({
      ...item,
      orderedAt: new Date(item.orderedAt),
    }));
  } catch {
    return [];
  }
}

type OrderContextValue = {
  orderItems: OrderItem[];
  addOrderItem: (item: OrderItem) => void;
  updateOrderItem: (id: string, changes: Partial<OrderItem>) => void;
};

const OrderContext = createContext<OrderContextValue | null>(null);

type OrderProviderProps = {
  children: ReactNode;
};

export function OrderProvider({ children }: OrderProviderProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>(loadOrders);

  useEffect(() => {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orderItems));
  }, [orderItems]);

  const addOrderItem = (item: OrderItem) => {
    setOrderItems(current => [...current, item]);
  };

  const updateOrderItem = (id: string, changes: Partial<OrderItem>) => {
    setOrderItems(current =>
      current.map(item => (item.id === id ? { ...item, ...changes } : item)),
    );
  };

  return (
    <OrderContext.Provider value={{ orderItems, addOrderItem, updateOrderItem }}>
      {children}
    </OrderContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrder() {
  const context = useContext(OrderContext);

  if (!context) {
    throw new Error('useOrder deve ser usado dentro de <OrderProvider>');
  }

  return context;
}