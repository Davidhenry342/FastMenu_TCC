import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { tables as initialTables } from '../data/tables';
import type { Table } from '../models/table';

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
  const [tables, setTables] = useState<Table[]>(initialTables);

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