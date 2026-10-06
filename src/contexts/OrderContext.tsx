/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { OrderItem } from '../models/order';

function reviveOrder(raw: any): OrderItem {
  return {
    ...raw,
    orderedAt: new Date(raw.orderedAt),
    product: raw.product
      ? {
          ...raw.product,
          price: Number(raw.product.price),
        }
      : raw.product,
    paidAmount:
      raw.paidAmount !== null && raw.paidAmount !== undefined
        ? Number(raw.paidAmount)
        : undefined,
  };
}

type OrderContextValue = {
  orderItems: OrderItem[];
  isLoading: boolean;
  addOrderItem: (item: OrderItem) => Promise<void>;
  updateOrderItem: (id: string, changes: Partial<OrderItem>) => Promise<void>;
  deleteOrderItem: (id: string) => Promise<void>;
  refreshOrders: () => Promise<void>;
};

const OrderContext = createContext<OrderContextValue | null>(null);

type OrderProviderProps = {
  children: ReactNode;
};

export function OrderProvider({ children }: OrderProviderProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    const res = await fetch('/api/orders', { credentials: 'include' });

    if (!res.ok) {
      throw new Error('Falha ao carregar pedidos');
    }

    const data: any[] = await res.json();

    setOrderItems(data.map(reviveOrder));
  };

  useEffect(() => {
    fetchOrders()
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const addOrderItem = async (item: OrderItem) => {
    const payload: any = {
      id: item.id,
      productId: item.product.id,
      quantity: item.quantity,
      orderedAt: item.orderedAt.toISOString(),
      status: item.status,
      observation: item.observation,
      paidQuantity: item.paidQuantity,
      paidAmount: item.paidAmount,
      tableNumber: item.tableNumber,
      customerId: item.customerId,
      comandaId: (item as any).comandaId,
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string; tableNumber?: number };
      const error = new Error(err.error ?? 'Falha ao criar pedido') as Error & { tableNumber?: number };

      if (err.tableNumber !== undefined) {
        error.tableNumber = err.tableNumber;
      }

      throw error;
    }

    const created = reviveOrder(await res.json());

    setOrderItems(current => [...current, created]);
  };

  const updateOrderItem = async (id: string, changes: Partial<OrderItem>) => {
    const payload: any = { ...changes };

    if (changes.product) {
      payload.productId = changes.product.id;
      delete payload.product;
    }

    if (changes.orderedAt instanceof Date) {
      payload.orderedAt = changes.orderedAt.toISOString();
    }

    const res = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error('Falha ao atualizar pedido');
    }

    const updated = reviveOrder(await res.json());

    setOrderItems(current =>
      current.map(item => (item.id === id ? updated : item)),
    );
  };

  const deleteOrderItem = async (id: string) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Falha ao excluir pedido');
    }

    setOrderItems(current => current.filter(item => item.id !== id));
  };

  const refreshOrders = async () => {
    await fetchOrders();
  };

  return (
    <OrderContext.Provider
      value={{ orderItems, isLoading, addOrderItem, updateOrderItem, deleteOrderItem, refreshOrders }}
    >
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