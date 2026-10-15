import { describe, expect, it } from 'vitest';

// Espelham src/components/Comanda (totais) e POST /:id/pay
// (contratos documentados nos nomes).
type LiteItem = {
  id: string;
  price: number;
  quantity: number;
  paidAmount?: number;
  paidQuantity?: number;
  status: string;
};

function getPaidAmount(item: LiteItem): number {
  return item.paidAmount ?? (item.paidQuantity ?? 0) * item.price;
}

function getTotalPrice(item: LiteItem): number {
  return item.price * item.quantity;
}

function getRemainingAmount(item: LiteItem): number {
  return Math.max(0, getTotalPrice(item) - getPaidAmount(item));
}

function getRemainingQuantity(item: LiteItem): number {
  const remaining = getRemainingAmount(item);

  if (remaining <= 0.009) {
    return 0;
  }

  return Math.ceil(remaining / item.price - 1e-9);
}

function isPayable(item: LiteItem): boolean {
  return item.status !== 'Cancelado' && item.status !== 'Aguardando confirmação';
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

describe('RF11 Calcular Valor Comanda — totais e pagamento', () => {
  it('getPaidAmount usa paidAmount ou paidQuantity×price', () => {
    const base = { id: 'a', price: 10, quantity: 2, status: 'Em produção' };
    expect(getPaidAmount({ ...base, paidAmount: 15 })).toBe(15);
    expect(getPaidAmount({ ...base, paidQuantity: 1 })).toBe(10);
    expect(getPaidAmount(base)).toBe(0);
  });

  it('getTotalPrice e getRemainingAmount', () => {
    const base = { id: 'a', price: 10, quantity: 2, status: 'Em produção' };
    expect(getTotalPrice(base)).toBe(20);
    expect(getRemainingAmount({ ...base, paidAmount: 5 })).toBe(15);
    expect(getRemainingAmount({ ...base, paidAmount: 99 })).toBe(0);
  });

  it('getRemainingQuantity com epsilon', () => {
    const base = { id: 'a', price: 10, quantity: 2, status: 'Em produção' };
    expect(getRemainingQuantity({ ...base, paidAmount: 20 })).toBe(0);
    expect(getRemainingQuantity({ ...base, paidAmount: 5 })).toBe(2);
  });

  it('total ignora Cancelado/Aguardando', () => {
    const items: LiteItem[] = [
      { id: 'a', price: 10, quantity: 2, status: 'Em produção' },
      { id: 'b', price: 10, quantity: 2, status: 'Cancelado' },
      { id: 'c', price: 10, quantity: 2, status: 'Aguardando confirmação' },
    ];
    const total = items.reduce(
      (sum, item) => (isPayable(item) ? sum + getRemainingAmount(item) : sum),
      0,
    );
    expect(total).toBe(20);
  });

  it('seleção Qtd respeita teto do restante', () => {
    const item = { id: 'a', price: 10, quantity: 2, status: 'Em produção', paidAmount: 15 };
    expect(Math.min(item.price * 1, getRemainingAmount(item))).toBe(5);
    expect(Math.min(item.price * 99, getRemainingAmount(item))).toBe(5);
  });

  it('seleção R$ respeita teto do restante', () => {
    const item = { id: 'a', price: 10, quantity: 2, status: 'Em produção' };
    expect(Math.min(5, getRemainingAmount(item))).toBe(5);
    expect(Math.min(99, getRemainingAmount(item))).toBe(20);
  });

  it('round2 em centavos e remaining do pay', () => {
    expect(round2(10.005)).toBe(10.01);
    const remaining = Math.max(0, round2(42.9 - 0));
    expect(remaining).toBeCloseTo(42.9, 2);
  });

  it('delta por quantidade limita no restante', () => {
    const remaining = 15;
    const price = 10;
    const maxQty = Math.ceil(remaining / price - 1e-9);
    expect(maxQty).toBe(2);
    expect(Math.min(round2(price * 99), remaining)).toBe(15);
  });

  it('limiares: pago (0.009) e auto-close (0.01)', () => {
    const isItemPaid = (remaining: number) => remaining <= 0.009;
    expect(isItemPaid(Math.max(0, round2(20 - 20)))).toBe(true);
    expect(isItemPaid(0.5)).toBe(false);
    const shouldAutoClose = (remainingTable: number) => remainingTable <= 0.01;
    expect(shouldAutoClose(0)).toBe(true);
    expect(shouldAutoClose(0.01)).toBe(true);
    expect(shouldAutoClose(0.02)).toBe(false);
  });
});
