import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Comanda } from '../models/comanda';

const COMANDAS_STORAGE_KEY = 'fastmenu:comandas';

function loadComandas(): Comanda[] {
  try {
    const stored = localStorage.getItem(COMANDAS_STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as Comanda[];

    return parsed.map(comanda => ({
      ...comanda,
      openedAt: new Date(comanda.openedAt),
      closedAt: comanda.closedAt ? new Date(comanda.closedAt) : undefined,
    }));
  } catch {
    return [];
  }
}

type ComandaContextValue = {
  comandas: Comanda[];
  openComanda: (tableId: string, tableNumber: number) => Comanda;
  addOrderToComanda: (comandaId: string, orderItemId: string) => void;
  closeComanda: (comandaId: string) => void;
  getOpenComandaByTable: (tableNumber: number) => Comanda | undefined;
  removeOrderFromComandas: (orderItemId: string) => void;
};

const ComandaContext = createContext<ComandaContextValue | null>(null);

type ComandaProviderProps = {
  children: ReactNode;
};

export function ComandaProvider({ children }: ComandaProviderProps) {
  const [comandas, setComandas] = useState<Comanda[]>(loadComandas);

  useEffect(() => {
    localStorage.setItem(COMANDAS_STORAGE_KEY, JSON.stringify(comandas));
  }, [comandas]);

  const openComanda = (tableId: string, tableNumber: number) => {
    const newComanda: Comanda = {
      id: crypto.randomUUID(),
      tableId,
      tableNumber,
      status: 'Aberta',
      openedAt: new Date(),
      orderItemIds: [],
    };

    setComandas(current => [...current, newComanda]);

    return newComanda;
  };

  const addOrderToComanda = (comandaId: string, orderItemId: string) => {
    setComandas(current =>
      current.map(comanda =>
        comanda.id === comandaId
          ? { ...comanda, orderItemIds: [...comanda.orderItemIds, orderItemId] }
          : comanda,
      ),
    );
  };

  const closeComanda = (comandaId: string) => {
    setComandas(current =>
      current.map(comanda =>
        comanda.id === comandaId
          ? { ...comanda, status: 'Fechada', closedAt: new Date() }
          : comanda,
      ),
    );
  };

  const getOpenComandaByTable = (tableNumber: number) =>
    comandas.find(
      comanda =>
        comanda.tableNumber === tableNumber && comanda.status === 'Aberta',
    );

  const removeOrderFromComandas = (orderItemId: string) => {
    setComandas(current =>
      current.map(comanda => ({
        ...comanda,
        orderItemIds: comanda.orderItemIds.filter(id => id !== orderItemId),
      })),
    );
  };

  return (
    <ComandaContext.Provider
      value={{
        comandas,
        openComanda,
        addOrderToComanda,
        closeComanda,
        getOpenComandaByTable,
        removeOrderFromComandas,
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