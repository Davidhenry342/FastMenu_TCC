export type ComandaStatus = 'Aberta' | 'Fechada';

export type Comanda = {
  id: string;
  tableId: string;
  tableNumber: number;
  status: ComandaStatus;
  openedAt: Date;
  closedAt?: Date;
  orderItemIds: string[];
};