import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { OrderItem } from '../models/order';

type OrderContextValue = {
  orderItems: OrderItem[];
  addOrderItem: (item: OrderItem) => void;
};

const OrderContext = createContext<OrderContextValue | null>(null);

type OrderProviderProps = {
  children: ReactNode;
};

export function OrderProvider({ children }: OrderProviderProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const addOrderItem = (item: OrderItem) => {
    setOrderItems(current => [...current, item]);
  };

  return (
    <OrderContext.Provider value={{ orderItems, addOrderItem }}>
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