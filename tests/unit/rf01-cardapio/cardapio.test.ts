import { describe, expect, it } from 'vitest';
import {
  FormatCurrency,
  FormatCurrencyInput,
  FormatTime,
  ParseCurrency,
} from '../../../src/utils/format';
import { averageWaitByCategory } from '../../../src/utils/waitTime';
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

describe('RF01 Manter Cardápio — formatação e espera', () => {
  it('FormatCurrency formata em BRL pt-BR', () => {
    expect(FormatCurrency(32.9)).toContain('R$');
    expect(FormatCurrency(32.9).replace(/\s/g, '')).toContain('32,90');
  });

  it('ParseCurrency/FormatCurrencyInput fazem round-trip', () => {
    expect(ParseCurrency('R$ 32,90')).toBeCloseTo(32.9, 2);
    expect(ParseCurrency('')).toBe(0);
    expect(ParseCurrency(FormatCurrencyInput('3290'))).toBeCloseTo(32.9, 2);
  });

  it('FormatTime retorna HH:MM', () => {
    expect(FormatTime(new Date('2026-01-01T12:34:00'))).toMatch(/^\d{2}:\d{2}$/);
  });

  it('averageWaitByCategory calcula média ponderada por quantidade', () => {
    const items = [
      makeItem({ id: 'a', quantity: 1, product: { ...makeItem().product, preparationTime: 10 } }),
      makeItem({ id: 'b', quantity: 3, product: { ...makeItem().product, preparationTime: 20 } }),
    ];
    // (10*1 + 20*3) / 4 = 17.5 -> 18
    expect(averageWaitByCategory(items).get('2')).toBe(18);
  });

  it('averageWaitByCategory ignora itens fora de Em produção', () => {
    const items = [
      makeItem({ id: 'a', status: 'Aguardando confirmação' }),
      makeItem({ id: 'b', status: 'Cancelado' }),
      makeItem({ id: 'c', status: 'Entregue' }),
    ];
    expect(averageWaitByCategory(items).size).toBe(0);
  });

  it('averageWaitByCategory ignora Bebidas (tempo fixo do produto)', () => {
    const items = [
      makeItem({
        id: 'beb',
        product: { ...makeItem().product, categoryId: '3', preparationTime: 5 },
      }),
    ];
    expect(averageWaitByCategory(items).has('3')).toBe(false);
  });

  it('averageWaitByCategory ignora Bebidas por nome mesmo com outro id', () => {
    const items = [
      makeItem({
        id: 'beb2',
        product: {
          ...makeItem().product,
          categoryId: 'x',
          category: { name: 'Bebidas' },
        } as unknown as OrderItem['product'],
      }),
    ];
    expect(averageWaitByCategory(items).size).toBe(0);
  });

  it('waitFor do cardápio: bebida usa só o preparationTime (fallback)', () => {
    const averages = averageWaitByCategory([
      makeItem({ product: { ...makeItem().product, categoryId: '3', preparationTime: 5 } }),
    ]);
    const waitFor = (categoryId: string, fallback: number) =>
      fallback + (averages.get(categoryId) ?? 0);
    expect(waitFor('3', 5)).toBe(5);
  });
});
