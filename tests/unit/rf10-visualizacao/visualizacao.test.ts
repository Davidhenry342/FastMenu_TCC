import { describe, expect, it } from 'vitest';

// Espelham src/components/Comanda (visão compartilhada estrita),
// ComandaContext/OrderContext (merge, evicção, reconciliação) e
// getCustomerName (contratos documentados nos nomes).
type LiteComanda = {
  id: string;
  tableNumber: number;
  status: 'Aberta' | 'Fechada';
  orderItemIds: string[];
};

type LiteItem = {
  id: string;
  tableNumber?: number;
  comandaId?: string;
};

function filterDisplayedItems(
  orderItems: LiteItem[],
  comandas: LiteComanda[],
  filterTableNumber?: number,
): LiteItem[] {
  if (filterTableNumber !== undefined) {
    const opens = comandas.filter(
      c => c.tableNumber === filterTableNumber && c.status === 'Aberta',
    );

    if (opens.length === 0) {
      return [];
    }

    const openIds = new Set(opens.flatMap(c => c.orderItemIds));

    return orderItems.filter(item => openIds.has(item.id));
  }

  const openIds = new Set(
    comandas.filter(c => c.status === 'Aberta').flatMap(c => c.orderItemIds),
  );

  return orderItems.filter(item => openIds.has(item.id));
}

function mergeById<T extends { id: string }>(current: T[], fresh: T[]): T[] {
  const byId = new Map(current.map(o => [o.id, o]));

  for (const item of fresh) {
    byId.set(item.id, item);
  }

  return [...byId.values()];
}

function evictClosedOrders(
  current: LiteItem[],
  tableNumber: number,
  freshIds: Set<string>,
): LiteItem[] {
  return current.filter(
    o => o.tableNumber !== tableNumber || freshIds.has(o.id) || !o.comandaId,
  );
}

function reconcileClosedComandas(
  current: LiteComanda[],
  tableNumber: number,
  freshIds: Set<string>,
): LiteComanda[] {
  return current.map(c =>
    c.tableNumber === tableNumber && c.status === 'Aberta' && !freshIds.has(c.id)
      ? { ...c, status: 'Fechada' as const }
      : c,
  );
}

function getCustomerName(
  customers: { id: string; name: string }[],
  customerId?: string,
): string {
  if (!customerId) {
    return 'Cliente não identificado';
  }

  return (
    customers.find(customer => customer.id === customerId)?.name ??
    'Cliente não identificado'
  );
}

describe('RF10 Visualizar Comanda — visão compartilhada', () => {
  it('une itens de todas as Abertas da mesa', () => {
    const comandas: LiteComanda[] = [
      { id: 'c1', tableNumber: 1, status: 'Aberta', orderItemIds: ['a'] },
      { id: 'c2', tableNumber: 1, status: 'Aberta', orderItemIds: ['b'] },
    ];
    const items: LiteItem[] = [{ id: 'a' }, { id: 'b' }, { id: 'z' }];
    expect(filterDisplayedItems(items, comandas, 1).map(i => i.id).sort()).toEqual(['a', 'b']);
  });

  it('sem Aberta na mesa retorna vazio (histórico some)', () => {
    expect(filterDisplayedItems([{ id: 'a' }], [], 1)).toEqual([]);
    const closed: LiteComanda[] = [{ id: 'c1', tableNumber: 1, status: 'Fechada', orderItemIds: ['a'] }];
    expect(filterDisplayedItems([{ id: 'a' }], closed, 1)).toEqual([]);
  });

  it('sem filtro usa todas as Abertas (visão admin)', () => {
    const comandas: LiteComanda[] = [
      { id: 'c1', tableNumber: 1, status: 'Aberta', orderItemIds: ['a'] },
      { id: 'c2', tableNumber: 2, status: 'Aberta', orderItemIds: ['b'] },
      { id: 'c3', tableNumber: 2, status: 'Fechada', orderItemIds: ['c'] },
    ];
    const shown = filterDisplayedItems([{ id: 'a' }, { id: 'b' }, { id: 'c' }], comandas);
    expect(shown.map(i => i.id).sort()).toEqual(['a', 'b']);
  });

  it('merge por id atualiza e adiciona sem duplicar', () => {
    const base = [{ id: 'a', tableNumber: 1, status: 'Aberta' as const, orderItemIds: ['a'] }];
    expect(mergeById(base, [{ ...base[0], orderItemIds: ['a', 'b'] }])).toHaveLength(1);
    expect(mergeById(base, [{ id: 'c2', tableNumber: 1, status: 'Aberta' as const, orderItemIds: [] }])).toHaveLength(2);
  });

  it('evicção remove fechados e preserva pedido em voo', () => {
    const current: LiteItem[] = [
      { id: 'a', tableNumber: 1, comandaId: 'c1' },
      { id: 'b', tableNumber: 1 },
    ];
    expect(evictClosedOrders(current, 1, new Set(['b'])).map(i => i.id)).toEqual(['b']);
  });

  it('reconciliação marca Ausentes como Fechada', () => {
    const result = reconcileClosedComandas(
      [{ id: 'c1', tableNumber: 1, status: 'Aberta', orderItemIds: [] }],
      1,
      new Set<string>(),
    );
    expect(result[0].status).toBe('Fechada');
  });

  it('reconciliação preserva Abertas retornadas e outras mesas', () => {
    const current: LiteComanda[] = [
      { id: 'c1', tableNumber: 1, status: 'Aberta', orderItemIds: [] },
      { id: 'c2', tableNumber: 2, status: 'Aberta', orderItemIds: [] },
    ];
    const result = reconcileClosedComandas(current, 1, new Set(['c1']));
    expect(result.find(c => c.id === 'c1')?.status).toBe('Aberta');
    expect(result.find(c => c.id === 'c2')?.status).toBe('Aberta');
  });

  it('getCustomerName resolve nome e fallbacks', () => {
    const customers = [{ id: 'u1', name: 'David' }];
    expect(getCustomerName(customers, 'u1')).toBe('David');
    expect(getCustomerName(customers, 'x')).toBe('Cliente não identificado');
    expect(getCustomerName(customers)).toBe('Cliente não identificado');
  });
});
