export type TableStatus = 'Disponível' | 'Ocupada';

export type Table = {
  id: string;
  number: number;
  status: TableStatus;
};