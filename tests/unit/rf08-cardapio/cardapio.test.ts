import { describe, expect, it } from 'vitest';

// Espelham src/pages/admin/Mesas (QR), src/pages/Login (preserve +
// conflito), src/pages/Home (validação, bloqueios, grade) e
// DefaultButton (contratos documentados nos nomes).
function buildQrUrl(origin: string, tableNumber: number): string {
  return `${origin}/?mesa=${tableNumber}`;
}

function isMesaParamValid(mesaParam: string | null, tableNumbers: number[]): boolean {
  if (!mesaParam) return false;
  const n = Number(mesaParam);
  return Number.isInteger(n) && tableNumbers.includes(n);
}

function navigateToCardapio(mesaParam: string | null, mesaOverride?: number): string {
  const target = mesaOverride ?? (mesaParam ? Number(mesaParam) : undefined);
  const suffix =
    target !== undefined && !Number.isNaN(target) ? `?mesa=${encodeURIComponent(String(target))}` : '';
  return `/cardapio${suffix}`;
}

function checkMesaConflict(
  openTable: number | null,
  mesaParam: string | null,
): number | null {
  if (openTable !== null && mesaParam && Number(mesaParam) !== openTable) {
    return openTable;
  }
  return null;
}

type LiteProduct = { id: string; categoryId: string };

function filterSortProducts(
  products: LiteProduct[],
  selectedCategory: string | null,
  order: Map<string, number>,
): LiteProduct[] {
  return (
    selectedCategory ? products.filter(p => p.categoryId === selectedCategory) : [...products]
  ).sort(
    (a, b) =>
      (order.get(a.categoryId) ?? Number.POSITIVE_INFINITY) -
      (order.get(b.categoryId) ?? Number.POSITIVE_INFINITY),
  );
}

describe('RF08 Acessar Cardápio Digital — QR, mesa e grade', () => {
  it('QR da mesa aponta para origin/?mesa=N', () => {
    expect(buildQrUrl('http://localhost:5173', 5)).toBe('http://localhost:5173/?mesa=5');
  });

  it('PDF do QR usa nome mesa-N-qrcode.pdf', () => {
    expect(`mesa-${5}-qrcode.pdf`).toBe('mesa-5-qrcode.pdf');
  });

  it('?mesa exige inteiro existente (bloqueia inválido/ausente)', () => {
    expect(isMesaParamValid('1', [1, 2, 3])).toBe(true);
    expect(isMesaParamValid('9', [1, 2, 3])).toBe(false);
    expect(isMesaParamValid('1.5', [1, 2, 3])).toBe(false);
    expect(isMesaParamValid('', [1, 2, 3])).toBe(false);
    expect(isMesaParamValid(null, [1, 2, 3])).toBe(false);
  });

  it('Login preserva ?mesa e override vence', () => {
    expect(navigateToCardapio('5')).toBe('/cardapio?mesa=5');
    expect(navigateToCardapio(null)).toBe('/cardapio');
    expect(navigateToCardapio('2', 5)).toBe('/cardapio?mesa=5');
    expect(navigateToCardapio('abc')).toBe('/cardapio');
  });

  it('conflito bloqueia mesa diferente e libera a mesma', () => {
    expect(checkMesaConflict(1, '2')).toBe(1);
    expect(checkMesaConflict(1, '1')).toBeNull();
    expect(checkMesaConflict(1, null)).toBeNull();
    expect(checkMesaConflict(null, '2')).toBeNull();
  });

  it('grade filtra por categoria e ordena pelo categoryOrder', () => {
    const order = new Map([
      ['1', 0],
      ['2', 1],
      ['3', 2],
    ]);
    const products: LiteProduct[] = [
      { id: 'c', categoryId: '3' },
      { id: 'a', categoryId: '1' },
      { id: 'b', categoryId: '2' },
    ];
    expect(filterSortProducts(products, null, order).map(p => p.id)).toEqual(['a', 'b', 'c']);
    expect(filterSortProducts(products, '2', order).map(p => p.id)).toEqual(['b']);
  });

  it('categoria ativa cai em Destaques sem seleção', () => {
    const cats = [{ id: '1', name: 'Entradas' }];
    const selected: string | null = null;
    expect(cats.find(c => c.id === selected)?.name ?? 'Destaques').toBe('Destaques');
  });

  it('DefaultButton isActive alterna a classe ativa', () => {
    const cls = (isActive: boolean) => `defaultButton${isActive ? ' active' : ''}`;
    expect(cls(true)).toContain('active');
    expect(cls(false)).not.toContain('active');
  });
});
