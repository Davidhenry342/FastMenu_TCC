import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Employee } from '../models/employee';

type EmployeeContextValue = {
  employees: Employee[];
  currentEmployee: Employee | null;
  isLoading: boolean;
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (id: string, changes: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  login: (cpfDigits: string, password: string) => Promise<Employee>;
  logout: () => Promise<void>;
  findByCpf: (digits: string) => Employee | undefined;
};

const EmployeeContext = createContext<EmployeeContextValue | null>(null);

type EmployeeProviderProps = {
  children: ReactNode;
};

export function EmployeeProvider({ children }: EmployeeProviderProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/employees', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : []))
      .then((data: Employee[]) => setEmployees(data))
      .catch(() => {});

    fetch('/api/employees/me', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data) {
          setCurrentEmployee(data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(employee),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };

      throw new Error(err.error ?? 'Falha ao criar funcionário');
    }

    const created: Employee = await res.json();

    setEmployees(current => [...current, created]);
  };

  const updateEmployee = async (id: string, changes: Partial<Employee>) => {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(changes),
    });

    if (!res.ok) {
      throw new Error('Falha ao atualizar funcionário');
    }

    const updated: Employee = await res.json();

    setEmployees(current =>
      current.map(employee => (employee.id === id ? updated : employee)),
    );

    setCurrentEmployee(current =>
      current && current.id === id ? updated : current,
    );
  };

  const deleteEmployee = async (id: string) => {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Falha ao excluir funcionário');
    }

    setEmployees(current => current.filter(employee => employee.id !== id));
    setCurrentEmployee(current => (current && current.id === id ? null : current));
  };

  const login = async (cpfDigits: string, password: string) => {
    const res = await fetch('/api/employees/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ cpf: cpfDigits, password }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };

      throw new Error(err.error ?? 'CPF ou senha inválidos.');
    }

    const employee: Employee = await res.json();

    setCurrentEmployee(employee);

    return employee;
  };

  const logout = async () => {
    await fetch('/api/employees/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});

    setCurrentEmployee(null);
  };

  const findByCpf = (digits: string) =>
    employees.find(employee => employee.cpf.replace(/\D/g, '') === digits);

  return (
    <EmployeeContext.Provider
      value={{
        employees,
        currentEmployee,
        isLoading,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        login,
        logout,
        findByCpf,
      }}
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