import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { employees as initialEmployees } from '../data/employees';
import type { Employee } from '../models/employee';

type EmployeeContextValue = {
  employees: Employee[];
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, changes: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
};

const EmployeeContext = createContext<EmployeeContextValue | null>(null);

type EmployeeProviderProps = {
  children: ReactNode;
};

export function EmployeeProvider({ children }: EmployeeProviderProps) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);

  const addEmployee = (employee: Employee) => {
    setEmployees(current => [...current, employee]);
  };

  const updateEmployee = (id: string, changes: Partial<Employee>) => {
    setEmployees(current =>
      current.map(employee =>
        employee.id === id ? { ...employee, ...changes } : employee,
      ),
    );
  };

  const deleteEmployee = (id: string) => {
    setEmployees(current => current.filter(employee => employee.id !== id));
  };

  return (
    <EmployeeContext.Provider
      value={{ employees, addEmployee, updateEmployee, deleteEmployee }}
    >
      {children}
    </EmployeeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEmployees() {
  const context = useContext(EmployeeContext);

  if (!context) {
    throw new Error('useEmployees deve ser usado dentro de <EmployeeProvider>');
  }

  return context;
}