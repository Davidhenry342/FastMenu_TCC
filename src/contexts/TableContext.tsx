import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { tables as initialTables } from '../data/tables';
import type { Table } from '../models/table';

const TABLES_STORAGE_KEY = 'fastmenu:tables';
const COMANDAS_STORAGE_KEY = 'fastmenu:comandas';

function loadTables(): Table[] {
  try {
    const stored = localStorage.getItem(TABLES_STORAGE_KEY);

    if (!stored) {
      return initialTables;
    }

    return JSON.parse(stored) as Table[];
  } catch {
    return initialTables;
  }
}

function ensureOpenComandasAreOccupied(tables: Table[]): Table[] {
  try {
    const stored = localStorage.getItem(COMANDAS_STORAGE_KEY);

    if (!stored) {
      return tables;
    }

    const comandas = JSON.parse(stored) as { tableNumber: number; status: string }[];
    const openTableNumbers = new Set(
      comandas.filter(c => c.status === 'Aberta').map(c => c.tableNumber),
    );

    if (openTableNumbers.size === 0) {
      return tables;
    }

    return tables.map(table =>
      openTableNumbers.has(table.number) && table.status !== 'Ocupada'
        ? { ...table, status: 'Ocupada' as const }
        : table,
    );
  } catch {
    return tables;
  }
}

type TableContextValue = {
  tables: Table[];
  addTable: (table: Table) => void;
  updateTable: (id: string, changes: Partial<Table>) => void;
  deleteTable: (id: string) => void;
};

const TableContext = createContext<TableContextValue | null>(null);

type TableProviderProps = {
  children: ReactNode;
};

export function TableProvider({ children }: TableProviderProps) {
  const [tables, setTables] = useState<Table[]>(() =>
    ensureOpenComandasAreOccupied(loadTables()),
  );

  useEffect(() => {
    localStorage.setItem(TABLES_STORAGE_KEY, JSON.stringify(tables));
  }, [tables]);

  const addTable = (table: Table) => {
    setTables(current => [...current, table]);
  };

  const updateTable = (id: string, changes: Partial<Table>) => {
    setTables(current =>
      current.map(table => (table.id === id ? { ...table, ...changes } : table)),
    );
  };

  const deleteTable = (id: string) => {
    setTables(current => current.filter(table => table.id !== id));
  };

  return (
    <TableContext.Provider
      value={{ tables, addTable, updateTable, deleteTable }}
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