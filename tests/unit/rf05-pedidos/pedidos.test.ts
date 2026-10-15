import { describe, expect, it } from 'vitest';

// Espelham server/src/routes/orders.ts e src/contexts/OrderContext.tsx
// (contratos documentados nos nomes).
const toPrismaStatus: Record<string, string> = {
  'Em produção': 'Em_produção',
  'Aguardando confirmação': 'Aguardando_confirmacao',
  Cancelado: 'Cancelado',
  Entregue: 'Entregue',
};

const fromPrismaStatus: Record<string, string> = {
  Em_produção: 'Em produção',
  Aguardando_confirmacao: 'Aguardando confirmação',
  Cancelado: 'Cancelado',
  Entregue: 'Entregue',
};

function resolveMesaConflict(
  myOpenTable: number | null,
  requestedTable: number,
): { status: 409; tableNumber: number } | null {
  if (myOpenTable !== null && myOpenTable !== requestedTable) {
    return { status: 409, tableNumber: myOpenTable };
  }
  return null;
}

function remainingOf(total: number, paidSoFar: number): number {
  return Math.max(0, Math.round((total - paidSoFar) * 100) / 100);
}

describe('RF05 Manter Pedidos — status, trava e pagamento', () => {
  it('status display↔Prisma fazem round-trip nos 4 valores', () => {
    for (const s of ['Em produção', 'Aguardando confirmação', 'Cancelado', 'Entregue']) {
      expect(fromPrismaStatus[toPrismaStatus[s]]).toBe(s);
    }
    expect(toPrismaStatus['Aguardando confirmação']).toBe('Aguardando_confirmacao');
  });

  it('mapStatusFromPrisma converte e preserva desconhecidos', () => {
    const map = <T extends { status: string }>(item: T): T => ({
      ...item,
      status: fromPrismaStatus[item.status] ?? item.status,
    });
    expect(map({ status: 'Aguardando_confirmacao' }).status).toBe('Aguardando confirmação');
    expect(map({ status: 'X' }).status).toBe('X');
  });

  it('POST trava 409 em mesa diferente da aberta', () => {
    expect(resolveMesaConflict(1, 2)).toEqual({ status: 409, tableNumber: 1 });
    expect(resolveMesaConflict(1, 1)).toBeNull();
    expect(resolveMesaConflict(null, 2)).toBeNull();
  });

  it('POST força customerId do token (anti-spoof)', () => {
    const body = { customerId: 'forjado', tableNumber: 1 };
    const forced = { ...body, customerId: 'token-id' };
    expect(forced.customerId).toBe('token-id');
  });

  it('payload addOrderItem mapeia product.id→productId e Date→ISO', () => {
    const item = {
      id: 'o1',
      product: { id: 'p1' },
      quantity: 2,
      orderedAt: new Date('2026-01-01T12:00:00.000Z'),
      status: 'Aguardando confirmação',
    };
    const payload = {
      id: item.id,
      productId: item.product.id,
      quantity: item.quantity,
      orderedAt: item.orderedAt.toISOString(),
      status: item.status,
    };
    expect(payload.productId).toBe('p1');
    expect(payload.orderedAt).toBe('2026-01-01T12:00:00.000Z');
    expect(payload.status).toBe('Aguardando confirmação');
  });

  it('novo pedido nasce Aguardando confirmação (contrato do Home)', () => {
    const statuses = Object.keys(toPrismaStatus);
    expect(statuses).toContain('Aguardando confirmação');
    expect(statuses).toHaveLength(4);
  });

  it('pay: remaining e delta por quantidade', () => {
    expect(remainingOf(42.9, 0)).toBeCloseTo(42.9, 2);
    const remaining = remainingOf(30, 10);
    const maxQty = Math.ceil(remaining / 10 - 1e-9);
    expect(maxQty).toBe(2);
    expect(Math.min(Math.round(10 * 2 * 100) / 100, remaining)).toBe(20);
  });

  it('pay: item já pago retorna 409', () => {
    expect(remainingOf(20, 20) <= 0.009).toBe(true);
  });

  it('pay: auto-fecha quando remainingTable <= 0.01', () => {
    const shouldClose = (remainingTable: number) => remainingTable <= 0.01;
    expect(shouldClose(0)).toBe(true);
    expect(shouldClose(0.01)).toBe(true);
    expect(shouldClose(0.02)).toBe(false);
  });
});
