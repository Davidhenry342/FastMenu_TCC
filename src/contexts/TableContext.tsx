/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Table } from '../models/table';

type TableContextValue = {
  tables: Table[];
  isLoading: boolean;
  addTable: (table: Omit<Table, 'id' | 'status'> & { number: number }) => Promise<void>;
  updateTable: (id: string, changes: Partial<Table>) => Promise<void>;
  deleteTable: (id: string) => Promise<void>;
  refreshTables: () => Promise<void>;
};

const TableContext = createContext<TableContextValue | null>(null);

type TableProviderProps = {
  children: ReactNode;
};

export function TableProvider({ children }: TableProviderProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTables = async () => {
    const res = await fetch('/api/tables', { credentials: 'include' });

    if (!res.ok) {
      throw new Error('Falha ao carregar mesas');
    }

    const data: Table[] = await res.json();

    setTables(data);
  };

  useEffect(() => {
    fetchTables()
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const addTable = async (table: Omit<Table, 'id' | 'status'> & { number: number }) => {
    const res = await fetch('/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ number: table.number }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };

      throw new Error(err.error ?? 'Falha ao criar mesa');
    }

    const created: Table = await res.json();

    setTables(current => [...current, created].sort((a, b) => a.number - b.number));
  };

  const updateTable = async (id: string, changes: Partial<Table>) => {
    const res = await fetch(`/api/tables/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(changes),
    });

    if (!res.ok) {
      throw new Error('Falha ao atualizar mesa');
    }

    const updated: Table = await res.json();

    setTables(current =>
      current.map(table => (table.id === id ? updated : table)),
    );
  };

  const deleteTable = async (id: string) => {
    const res = await fetch(`/api/tables/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Falha ao excluir mesa');
    }

    setTables(current => current.filter(table => table.id !== id));
  };

  const refreshTables = async () => {
    await fetchTables();
  };

  return (
    <TableContext.Provider
      value={{ tables, isLoading, addTable, updateTable, deleteTable, refreshTables }}
    >
      {children}
    </TableContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTables() {
  const context = useContext(TableContext);

  if (!context) {
    throw new Error('useTables deve ser usado dentro de <TableProvider>');
  }

  return context;
}