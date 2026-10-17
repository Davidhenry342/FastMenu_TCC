/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from './prisma';

export const toPrismaStatus: Record<string, string> = {
  'Em produção': 'Em_produção',
  'Aguardando confirmação': 'Aguardando_confirmacao',
  Cancelado: 'Cancelado',
  Entregue: 'Entregue',
};

export const fromPrismaStatus: Record<string, string> = {
  Em_produção: 'Em produção',
  Aguardando_confirmacao: 'Aguardando confirmação',
  Cancelado: 'Cancelado',
  Entregue: 'Entregue',
};

export function mapStatusFromPrisma<T extends { status: string }>(item: T): T {
  return { ...item, status: fromPrismaStatus[item.status] ?? item.status };
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function displayStatusOf(item: { status: string }): string {
  return fromPrismaStatus[item.status] ?? item.status;
}

export function isPayable(item: { status: string }): boolean {
  const status = displayStatusOf(item);

  return status !== 'Cancelado' && status !== 'Aguardando confirmação';
}

export async function computeComandaRemaining(comandaId: string): Promise<number> {
  const siblings = await prisma.orderItem.findMany({
    where: { comandaId },
    include: { product: true },
  });

  const remaining = siblings.reduce((sum, item) => {
    if (!isPayable(item)) {
      return sum;
    }

    const total = Number(item.product.price) * item.quantity;
    const paid = item.paidAmount !== null && item.paidAmount !== undefined ? Number(item.paidAmount) : 0;

    return sum + Math.max(0, total - paid);
  }, 0);

  return round2(remaining);
}

export async function closeComandaIfSettled(
  comandaId: string,
): Promise<{ comandaClosed: boolean; remainingTable: number }> {
  const remainingTable = await computeComandaRemaining(comandaId);

  if (remainingTable <= 0.01) {
    await prisma.comanda.update({
      where: { id: comandaId },
      data: { status: 'Fechada', closedAt: new Date() },
    });

    return { comandaClosed: true, remainingTable };
  }

  return { comandaClosed: false, remainingTable };
}

export type SettleResult = {
  order: any;
  comandaClosed: boolean;
  remainingTable: number;
};

export async function settleOrderItemPayment(params: {
  orderItemId: string;
  deltaAmount: number;
  deltaQty?: number;
}): Promise<SettleResult> {
  const { orderItemId, deltaAmount } = params;
  const deltaQty = params.deltaQty ?? 0;

  const existing = (await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { product: true, comanda: true },
  })) as any;

  if (!existing) {
    throw new Error('Pedido não encontrado.');
  }

  const paidSoFar = existing.paidAmount !== null && existing.paidAmount !== undefined ? Number(existing.paidAmount) : 0;

  const updated = await prisma.orderItem.update({
    where: { id: orderItemId },
    data: {
      paidAmount: paidSoFar > 0 ? { increment: deltaAmount } : deltaAmount,
      ...(deltaQty > 0 ? { paidQuantity: { increment: deltaQty } } : {}),
    },
    include: { product: true, customer: true },
  });

  let comandaClosed = false;
  let remainingTable = 0;

  if (existing.comandaId) {
    const settled = await closeComandaIfSettled(existing.comandaId);

    comandaClosed = settled.comandaClosed;
    remainingTable = settled.remainingTable;
  }

  return { order: mapStatusFromPrisma(updated as any), comandaClosed, remainingTable };
}
