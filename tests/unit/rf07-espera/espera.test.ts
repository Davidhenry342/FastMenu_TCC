import { describe, expect, it } from 'vitest';
import { averageWaitByCategory } from '../../../server/src/lib/waitTime';
import type { WaitRow } from '../../../server/src/lib/waitTime';
import type { OrderItem } from '../../../src/models/order';

function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 'o1',
    product: {
      id: 'p1',
      name: 'Prato',
      description: 'desc',
      price: 10,
      preparationTime: 20,
      categoryId: '2',
    },
    quantity: 1,
    orderedAt: new Date('2026-01-01T12:00:00'),
    status: 'Em produção',
    ...overrides,
  } as OrderItem;
}

const categoryNames: Record<string, string> = {
  '1': 'Entradas',
  '2': 'Pratos Principais',
  '3': 'Bebidas',
  '4': 'Sobremesas',
};

function toRow(item: OrderItem): WaitRow {
  return {
    status: item.status,
    categoryId: item.product.categoryId,
    categoryName: categoryNames[item.product.categoryId],
    preparationTime: item.product.preparationTime,
    quantity: item.quantity,
  };
}

// Espelham src/pages/Home (waitFor), src/pages/admin/Cozinha
// (deliveryEstimate, ordenação) e ProductCard (fallback).
function waitForEstimate(categoryId: string, fallback: number, averages: Map<string, number>): number {
  return fallback + (averages.get(categoryId) ?? 0);
}

function deliveryEstimate(orderedAt: Date, preparationTimeMin: number): Date {
  return new Date(orderedAt.getTime() + preparationTimeMin * 60000);
}

function kitchenStatusRank(status: string): number {
  return status === 'Aguardando confirmação' ? 0 : 1;
}

describe('RF07 Estimar Tempo de Entrega — fila e previsão', () => {
  it('lista vazia gera mapa vazio', () => {
    expect(Object.keys(averageWaitByCategory([])).length).toBe(0);
  });

  it('múltiplas categorias geram uma média por categoria', () => {
    const items = [
      makeItem({ id: 'a', product: { ...makeItem().product, categoryId: '1', preparationTime: 10 } }),
      makeItem({ id: 'b', quantity: 2, product: { ...makeItem().product, categoryId: '2', preparationTime: 30 } }),
    ];
    const avg = averageWaitByCategory(items.map(toRow));
    expect(avg['1']).toBe(10);
    expect(avg['2']).toBe(30);
  });

  it('itens fora de produção não entram na média (fila global)', () => {
    const items = [
      makeItem({ id: 'a', status: 'Em produção', product: { ...makeItem().product, categoryId: '1', preparationTime: 10 } }),
      makeItem({ id: 'b', status: 'Aguardando confirmação', product: { ...makeItem().product, categoryId: '1', preparationTime: 40 } }),
    ];
    const avg = averageWaitByCategory(items.map(toRow));
    expect(avg['1']).toBe(10);
  });

  it('waitFor soma fallback + média (não-bebida)', () => {
    expect(waitForEstimate('2', 15, new Map([['2', 10]]))).toBe(25);
    expect(waitForEstimate('2', 15, new Map())).toBe(15);
  });

  it('waitFor de bebida usa só o fallback (sem fila)', () => {
    const rows = [
      toRow(makeItem({ product: { ...makeItem().product, categoryId: '3', preparationTime: 5 } })),
    ];
    const avg = new Map(Object.entries(averageWaitByCategory(rows)));
    expect(avg.size).toBe(0);
    expect(waitForEstimate('3', 5, avg)).toBe(5);
  });

  it('deliveryEstimate soma preparationTime em minutos', () => {
    const at = new Date('2026-01-01T12:00:00');
    expect(deliveryEstimate(at, 25).getTime()).toBe(at.getTime() + 25 * 60000);
  });

  it('cozinha prioriza Aguardando confirmação', () => {
    expect(kitchenStatusRank('Aguardando confirmação')).toBe(0);
    expect(kitchenStatusRank('Em produção')).toBe(1);
  });

  it('cozinha ordena por status e depois por horário', () => {
    const items = [
      { status: 'Em produção', orderedAt: new Date('2026-01-01T12:00:00') },
      { status: 'Aguardando confirmação', orderedAt: new Date('2026-01-01T12:05:00') },
      { status: 'Aguardando confirmação', orderedAt: new Date('2026-01-01T12:01:00') },
    ];
    const sorted = [...items].sort((a, b) => {
      if (kitchenStatusRank(a.status) !== kitchenStatusRank(b.status)) {
        return kitchenStatusRank(a.status) - kitchenStatusRank(b.status);
      }
      return a.orderedAt.getTime() - b.orderedAt.getTime();
    });
    expect(sorted.map(i => i.orderedAt.getMinutes())).toEqual([1, 5, 0]);
  });

  it('ProductCard usa estimatedWaitTime com fallback no preparationTime', () => {
    const shown = (estimated: number | undefined, fallback: number) => estimated ?? fallback;
    expect(shown(35, 20)).toBe(35);
    expect(shown(undefined, 20)).toBe(20);
  });
});
