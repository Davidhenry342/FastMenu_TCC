import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Customer } from '../models/customer';

export type CustomerOpenComanda = {
  id: string;
  tableNumber: number;
  status: string;
};

type CustomerContextValue = {
  customers: Customer[];
  currentCustomer: Customer | null;
  isLoading: boolean;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
  login: (customer: Customer) => Promise<void>;
  loginByPhone: (digits: string) => Promise<Customer>;
  logout: () => Promise<void>;
  findByPhone: (digits: string) => Customer | undefined;
  getMyOpenComanda: () => Promise<CustomerOpenComanda | null>;
};

const CustomerContext = createContext<CustomerContextValue | null>(null);

type CustomerProviderProps = {
  children: ReactNode;
};

function reviveCustomer(raw: unknown): Customer {
  const data = raw as Customer & { createdAt: string | Date };

  return { ...data, createdAt: new Date(data.createdAt) };
}

export function CustomerProvider({ children }: CustomerProviderProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customers', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : []))
      .then((data: unknown[]) => setCustomers(data.map(reviveCustomer)))
      .catch(() => {});

    fetch('/api/customers/me', { credentials: 'include' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data) {
          setCurrentCustomer(reviveCustomer(data as unknown));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const addCustomer = async (data: Omit<Customer, 'id' | 'createdAt'>) => {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error('Falha ao criar cliente');
    }

    const created = reviveCustomer(await res.json());

    setCustomers(current => [...current, created]);
    setCurrentCustomer(created);
  };

  const login = async (customer: Customer) => {
    const digits = customer.phone.replace(/\D/g, '');

    await loginByPhone(digits);
  };

  const loginByPhone = async (digits: string) => {
    const res = await fetch('/api/customers/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone: digits }),
    });

    if (!res.ok) {
      throw new Error('Customer not found');
    }

    const customer = reviveCustomer(await res.json());

    setCurrentCustomer(customer);

    return customer;
  };

  const logout = async () => {
    await fetch('/api/customers/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});

    setCurrentCustomer(null);
  };

  const findByPhone = (digits: string) =>
    customers.find(customer => customer.phone.replace(/\D/g, '') === digits);

  const getMyOpenComanda = async (): Promise<CustomerOpenComanda | null> => {
    const res = await fetch('/api/customers/me/open-comanda', { credentials: 'include' });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as { comanda: CustomerOpenComanda | null };

    return data.comanda;
  };

  return (
    <CustomerContext.Provider
      value={{ customers, currentCustomer, isLoading, addCustomer, login, loginByPhone, logout, findByPhone, getMyOpenComanda }}
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