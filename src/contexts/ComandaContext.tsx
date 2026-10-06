/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Comanda } from '../models/comanda';

function reviveComanda(raw: any): Comanda {
  return {
    ...raw,
    openedAt: new Date(raw.openedAt),
    closedAt: raw.closedAt ? new Date(raw.closedAt) : undefined,
    orderItemIds: raw.orderItemIds ?? raw.orderItems?.map((o: any) => o.id) ?? [],
  };
}

type ComandaContextValue = {
  comandas: Comanda[];
  isLoading: boolean;
  openComanda: (tableId: string, tableNumber: number) => Promise<Comanda>;
  addOrderToComanda: (comandaId: string, orderItemId: string) => Promise<void>;
  closeComanda: (comandaId: string) => Promise<void>;
  getOpenComandaByTable: (tableNumber: number) => Comanda | undefined;
  getOpenComandasByTable: (tableNumber: number) => Comanda[];
  markComandaClosed: (comandaId: string) => void;
  removeOrderFromComandas: (orderItemId: string) => Promise<void>;
  refreshComandas: () => Promise<void>;
  fetchComandasByTable: (tableNumber: number) => Promise<Comanda[]>;
};

const ComandaContext = createContext<ComandaContextValue | null>(null);

type ComandaProviderProps = {
  children: ReactNode;
};

export function ComandaProvider({ children }: ComandaProviderProps) {
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchComandas = async () => {
    const res = await fetch('/api/comandas', { credentials: 'include' });

    if (!res.ok) {
      throw new Error('Falha ao carregar comandas');
    }

    const data: any[] = await res.json();

    setComandas(data.map(reviveComanda));
  };

  useEffect(() => {
    fetchComandas()
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const parseComandaError = async (res: Response, fallback: string) => {
    const err = (await res.json().catch(() => ({}))) as { error?: string; tableNumber?: number };
    const error = new Error(err.error ?? fallback) as Error & { tableNumber?: number };

    if (err.tableNumber !== undefined) {
      error.tableNumber = err.tableNumber;
    }

    return error;
  };

  const openComanda = async (tableId: string, tableNumber: number) => {
    const res = await fetch('/api/comandas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tableId, tableNumber, status: 'Aberta' }),
    });

    if (!res.ok) {
      throw await parseComandaError(res, 'Falha ao abrir comanda');
    }

    const created = reviveComanda(await res.json());

    setComandas(current => {
      if (current.some(c => c.id === created.id)) {
        return current.map(c => (c.id === created.id ? created : c));
      }

      return [...current, created];
    });

    return created;
  };

  const addOrderToComanda = async (comandaId: string, orderItemId: string) => {
    const res = await fetch(`/api/comandas/${comandaId}/add-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ orderItemId }),
    });

    if (!res.ok) {
      throw await parseComandaError(res, 'Falha ao adicionar pedido à comanda');
    }

    const updated = reviveComanda(await res.json());

    setComandas(current =>
      current.map(comanda => (comanda.id === comandaId ? updated : comanda)),
    );
  };

  const closeComanda = async (comandaId: string) => {
    const res = await fetch(`/api/comandas/${comandaId}/close`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Falha ao fechar comanda');
    }

    const updated = reviveComanda(await res.json());

    setComandas(current =>
      current.map(comanda => (comanda.id === comandaId ? updated : comanda)),
    );
  };

  const getOpenComandaByTable = (tableNumber: number) =>
    comandas.find(
      comanda =>
        comanda.tableNumber === tableNumber && comanda.status === 'Aberta',
    );

  const removeOrderFromComandas = async (orderItemId: string) => {
    // Remove from any comanda that contains it via API
    const promises = comandas
      .filter(c => c.orderItemIds.includes(orderItemId))
      .map(c =>
        fetch(`/api/comandas/${c.id}/remove-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ orderItemId }),
        }),
      );

    await Promise.all(promises);

    setComandas(current =>
      current.map(comanda => ({
        ...comanda,
        orderItemIds: comanda.orderItemIds.filter(id => id !== orderItemId),
      })),
    );
  };

  const refreshComandas = async () => {
    await fetchComandas();
  };

  const getOpenComandasByTable = (tableNumber: number) =>
    comandas.filter(c => c.tableNumber === tableNumber && c.status === 'Aberta');

  const markComandaClosed = (comandaId: string) => {
    setComandas(current =>
      current.map(c =>
        c.id === comandaId ? { ...c, status: 'Fechada' as const, closedAt: new Date() } : c,
      ),
    );
  };

  const fetchComandasByTable = async (tableNumber: number) => {
    const res = await fetch(`/api/comandas/by-table/${tableNumber}`, { credentials: 'include' });

    if (!res.ok) {
      throw new Error('Falha ao carregar comanda da mesa');
    }

    const data: any[] = await res.json();
    const revived = data.map(reviveComanda);
    const freshIds = new Set(revived.map(c => c.id));

    setComandas(current => {
      const byId = new Map(current.map(c => [c.id, c]));

      for (const item of revived) {
        byId.set(item.id, item);
      }

      // Reconciliação: Abertas locais da mesa que o servidor não retornou foram fechadas.
      return [...byId.values()].map(c =>
        c.tableNumber === tableNumber && c.status === 'Aberta' && !freshIds.has(c.id)
          ? { ...c, status: 'Fechada' as const, closedAt: new Date() }
          : c,
      );
    });

    return revived;
  };

  return (
    <ComandaContext.Provider
      value={{
        comandas,
        isLoading,
        openComanda,
        addOrderToComanda,
        closeComanda,
        getOpenComandaByTable,
        getOpenComandasByTable,
        markComandaClosed,
        removeOrderFromComandas,
        refreshComandas,
        fetchComandasByTable,
      }}
    >
      {children}
    </ComandaContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useComandas() {
  const context = useContext(ComandaContext);

  if (!context) {
    throw new Error('useComandas deve ser usado dentro de <ComandaProvider>');
  }

  return context;
}