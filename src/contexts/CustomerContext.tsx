import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { customers as initialCustomers } from '../data/customers';
import type { Customer } from '../models/customer';

const CUSTOMERS_STORAGE_KEY = 'fastmenu:customers';
const CURRENT_CUSTOMER_STORAGE_KEY = 'fastmenu:currentCustomer';

function loadCustomers(): Customer[] {
  try {
    const stored = localStorage.getItem(CUSTOMERS_STORAGE_KEY);

    if (!stored) {
      return initialCustomers;
    }

    const parsed = JSON.parse(stored) as Customer[];

    return parsed.map(customer => ({
      ...customer,
      createdAt: new Date(customer.createdAt),
    }));
  } catch {
    return initialCustomers;
  }
}

function loadCurrentCustomer(): Customer | null {
  try {
    const stored = localStorage.getItem(CURRENT_CUSTOMER_STORAGE_KEY);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as Customer;

    return { ...parsed, createdAt: new Date(parsed.createdAt) };
  } catch {
    return null;
  }
}

type CustomerContextValue = {
  customers: Customer[];
  currentCustomer: Customer | null;
  addCustomer: (customer: Customer) => void;
  login: (customer: Customer) => void;
  logout: () => void;
  findByPhone: (digits: string) => Customer | undefined;
};

const CustomerContext = createContext<CustomerContextValue | null>(null);

type CustomerProviderProps = {
  children: ReactNode;
};

export function CustomerProvider({ children }: CustomerProviderProps) {
  const [customers, setCustomers] = useState<Customer[]>(loadCustomers);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(
    loadCurrentCustomer,
  );

  useEffect(() => {
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    if (currentCustomer) {
      localStorage.setItem(
        CURRENT_CUSTOMER_STORAGE_KEY,
        JSON.stringify(currentCustomer),
      );
    } else {
      localStorage.removeItem(CURRENT_CUSTOMER_STORAGE_KEY);
    }
  }, [currentCustomer]);

  const addCustomer = (customer: Customer) => {
    setCustomers(current => [...current, customer]);
  };

  const login = (customer: Customer) => {
    setCurrentCustomer(customer);
  };

  const logout = () => {
    setCurrentCustomer(null);
  };

  const findByPhone = (digits: string) =>
    customers.find(
      customer => customer.phone.replace(/\D/g, '') === digits,
    );

  return (
    <CustomerContext.Provider
      value={{ customers, currentCustomer, addCustomer, login, logout, findByPhone }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCustomers() {
  const context = useContext(CustomerContext);

  if (!context) {
    throw new Error('useCustomers deve ser usado dentro de <CustomerProvider>');
  }

  return context;
}