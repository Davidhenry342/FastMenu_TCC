import type { Product } from './product';

export type OrderStatus =
  | 'Em produção'
  | 'Aguardando confirmação'
  | 'Cancelado'
  | 'Entregue';

export type OrderItem = {
  id: string;
  product: Product;
  quantity: number;
  orderedAt: Date;
  status: OrderStatus;
  observation?: string;
  paidQuantity?: number;
  tableNumber?: number;
  customerId?: string;
};