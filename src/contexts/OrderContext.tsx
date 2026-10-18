/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { OrderItem } from '../models/order';
import type { PixCharge, PixChargeItem, PixStatus } from '../models/payment';

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

export type PayOrderResult = {
  order: OrderItem;
  comandaClosed: boolean;
  remainingTable: number;
};

type OrderContextValue = {
  orderItems: OrderItem[];
  isLoading: boolean;
  addOrderItem: (item: OrderItem) => Promise<void>;
  updateOrderItem: (id: string, changes: Partial<OrderItem>) => Promise<void>;
  payOrderItem: (id: string, payment: { amount?: number; quantity?: number }) => Promise<PayOrderResult>;
  createPixCharge: (items: PixChargeItem[]) => Promise<PixCharge>;
  fetchPixStatus: (paymentId: string) => Promise<PixStatus>;
  waitAverages: Map<string, number>;
  fetchWaitEstimate: () => Promise<void>;
  deleteOrderItem: (id: string) => Promise<void>;
  refreshOrders: () => Promise<void>;
  fetchOrdersByTable: (tableNumber: number) => Promise<OrderItem[]>;
};

const OrderContext = createContext<OrderContextValue | null>(null);

type OrderProviderProps = {
  children: ReactNode;
};

export function OrderProvider({ children }: OrderProviderProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [waitAverages, setWaitAverages] = useState<Map<string, number>>(new Map());
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

  const payOrderItem = async (id: string, payment: { amount?: number; quantity?: number }) => {
    const res = await fetch(`/api/orders/${id}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payment),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string; tableNumber?: number };
      const error = new Error(err.error ?? 'Falha ao pagar pedido') as Error & { tableNumber?: number };

      if (err.tableNumber !== undefined) {
        error.tableNumber = err.tableNumber;
      }

      throw error;
    }

    const data = (await res.json()) as { order: any; comandaClosed: boolean; remainingTable: number };
    const revived = reviveOrder(data.order);

    setOrderItems(current =>
      current.some(item => item.id === revived.id)
        ? current.map(item => (item.id === revived.id ? revived : item))
        : [...current, revived],
    );

    return { order: revived, comandaClosed: data.comandaClosed, remainingTable: data.remainingTable };
  };

  const createPixCharge = async (items: PixChargeItem[]) => {
    const res = await fetch('/api/payments/pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ items }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? 'Falha ao gerar o código Pix');
    }

    return (await res.json()) as PixCharge;
  };

  const fetchPixStatus = async (paymentId: string) => {
    const res = await fetch(`/api/payments/${paymentId}/status`, {
      credentials: 'include',
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? 'Falha ao consultar o pagamento');
    }

    return (await res.json()) as PixStatus;
  };

  const fetchWaitEstimate = async () => {
    const res = await fetch('/api/orders/wait-estimate', { credentials: 'include' });

    if (!res.ok) {
      throw new Error('Falha ao carregar a estimativa de espera');
    }

    const data = (await res.json()) as { averages?: Record<string, number> };
    const entries = Object.entries(data.averages ?? {}).map(
      ([categoryId, minutes]) => [categoryId, Number(minutes)] as const,
    );

    setWaitAverages(new Map(entries));
  };

  const refreshOrders = async () => {
    await fetchOrders();
  };

  const fetchOrdersByTable = async (tableNumber: number) => {
    const res = await fetch(`/api/orders/by-table/${tableNumber}`, { credentials: 'include' });

    if (!res.ok) {
      throw new Error('Falha ao carregar pedidos da mesa');
    }

    const data: any[] = await res.json();
    const revived = data.map(reviveOrder);
    const freshIds = new Set(revived.map(o => o.id));

    setOrderItems(current => {
      const byId = new Map(current.map(o => [o.id, o]));

      for (const item of revived) {
        byId.set(item.id, item);
      }

      // Evicção: itens da mesa ausentes na resposta (comanda fechada) somem do estado.
      // Preserva locais ainda sem comandaId (pedido em voo, add-order pendente).
      return [...byId.values()].filter(
        o => o.tableNumber !== tableNumber || freshIds.has(o.id) || !(o as any).comandaId,
      );
    });

    return revived;
  };

  return (
    <OrderContext.Provider
      value={{ orderItems, isLoading, addOrderItem, updateOrderItem, payOrderItem, createPixCharge, fetchPixStatus, waitAverages, fetchWaitEstimate, deleteOrderItem, refreshOrders, fetchOrdersByTable }}
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