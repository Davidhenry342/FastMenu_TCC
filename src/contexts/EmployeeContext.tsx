import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { employees as initialEmployees } from '../data/employees';
import type { Employee } from '../models/employee';

const EMPLOYEES_STORAGE_KEY = 'fastmenu:employees';
const CURRENT_EMPLOYEE_STORAGE_KEY = 'fastmenu:currentEmployee';

function loadEmployees(): Employee[] {
  try {
    const stored = localStorage.getItem(EMPLOYEES_STORAGE_KEY);

    if (!stored) {
      return initialEmployees;
    }

    return JSON.parse(stored) as Employee[];
  } catch {
    return initialEmployees;
  }
}

function loadCurrentEmployee(): Employee | null {
  try {
    const stored = localStorage.getItem(CURRENT_EMPLOYEE_STORAGE_KEY);

    if (!stored) {
      return null;
    }

    return JSON.parse(stored) as Employee;
  } catch {
    return null;
  }
}

type EmployeeContextValue = {
  employees: Employee[];
  currentEmployee: Employee | null;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, changes: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  login: (employee: Employee) => void;
  logout: () => void;
  findByCpf: (digits: string) => Employee | undefined;
};

const EmployeeContext = createContext<EmployeeContextValue | null>(null);

type EmployeeProviderProps = {
  children: ReactNode;
};

export function EmployeeProvider({ children }: EmployeeProviderProps) {
  const [employees, setEmployees] = useState<Employee[]>(loadEmployees);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(
    loadCurrentEmployee,
  );

  useEffect(() => {
    localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    if (currentEmployee) {
      localStorage.setItem(
        CURRENT_EMPLOYEE_STORAGE_KEY,
        JSON.stringify(currentEmployee),
      );
    } else {
      localStorage.removeItem(CURRENT_EMPLOYEE_STORAGE_KEY);
    }
  }, [currentEmployee]);

  const addEmployee = (employee: Employee) => {
    setEmployees(current => [...current, employee]);
  };

  const updateEmployee = (id: string, changes: Partial<Employee>) => {
    setEmployees(current =>
      current.map(employee =>
        employee.id === id ? { ...employee, ...changes } : employee,
      ),
    );

    setCurrentEmployee(current =>
      current && current.id === id ? { ...current, ...changes } : current,
    );
  };

  const deleteEmployee = (id: string) => {
    setEmployees(current => current.filter(employee => employee.id !== id));

    setCurrentEmployee(current =>
      current && current.id === id ? null : current,
    );
  };

  const login = (employee: Employee) => {
    setCurrentEmployee(employee);
  };

  const logout = () => {
    setCurrentEmployee(null);
  };

  const findByCpf = (digits: string) =>
    employees.find(employee => employee.cpf.replace(/\D/g, '') === digits);

  return (
    <EmployeeContext.Provider
      value={{
        employees,
        currentEmployee,
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