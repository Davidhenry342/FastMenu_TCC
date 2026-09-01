import type { Customer } from '../models/customer';

export const customers: Customer[] = [
  {
    id: 'c1',
    phone: '(11) 98888-1111',
    name: 'Ana Souza',
    email: 'ana.souza@email.com',
    createdAt: new Date('2024-01-10T10:00:00'),
  },
  {
    id: 'c2',
    phone: '(21) 97777-2222',
    name: 'Bruno Lima',
    email: 'bruno.lima@email.com',
    createdAt: new Date('2024-02-15T14:30:00'),
  },
  {
    id: 'c3',
    phone: '(31) 96666-3333',
    name: 'Carla Mendes',
    email: 'carla.mendes@email.com',
    createdAt: new Date('2024-03-20T09:00:00'),
  },
];