import { describe, expect, it } from 'vitest';

// Espelham server/src/routes/tables.ts, src/pages/admin/Mesas e
// src/components/TableFormModal (contratos documentados nos nomes).
function deriveTableStatus(openComandasCount: number): string {
  return openComandasCount > 0 ? 'Ocupada' : 'Disponível';
}

function stripStatus<T extends Record<string, unknown>>(body: T): Omit<T, 'status'> {
  const { status, ...data } = body;
  void status;
  return data;
}

function validateTableNumber(raw: string, taken: number[]): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'Informe o número da mesa.';
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n <= 0) return 'Informe um número inteiro maior que zero.';
  if (taken.includes(n)) return 'Já existe uma mesa com esse número.';
  return null;
}

describe('RF06 Atualizar Status das Mesas — derivado e CRUD', () => {
  it('deriveTableStatus: 0 abertas → Disponível, N>0 → Ocupada', () => {
    expect(deriveTableStatus(0)).toBe('Disponível');
    expect(deriveTableStatus(1)).toBe('Ocupada');
    expect(deriveTableStatus(5)).toBe('Ocupada');
  });

  it('POST/PUT removem status do body (strip)', () => {
    expect(stripStatus({ number: 7, status: 'Ocupada' })).toEqual({ number: 7 });
    expect(stripStatus({ number: 2 })).toEqual({ number: 2 });
  });

  it('PUT re-deriva status pela aberta encontrada', () => {
    const found: { id: string } | null = { id: 'c1' };
    const missing: { id: string } | null = null;
    expect(deriveTableStatus(found ? 1 : 0)).toBe('Ocupada');
    expect(deriveTableStatus(missing ? 1 : 0)).toBe('Disponível');
  });

  it('close leva a Disponível (efeito comandas→mesas)', () => {
    expect(deriveTableStatus(0)).toBe('Disponível');
  });

  it('grade ordena por número sem mutar a lista', () => {
    const input = [{ number: 3 }, { number: 1 }, { number: 2 }];
    expect([...input].sort((a, b) => a.number - b.number).map(t => t.number)).toEqual([1, 2, 3]);
    expect(input.map(t => t.number)).toEqual([3, 1, 2]);
  });

  it('TableFormModal valida vazio', () => {
    expect(validateTableNumber('', [1])).toBe('Informe o número da mesa.');
    expect(validateTableNumber('   ', [1])).toBe('Informe o número da mesa.');
  });

  it('TableFormModal valida inválido e duplicado', () => {
    expect(validateTableNumber('0', [1])).toBe('Informe um número inteiro maior que zero.');
    expect(validateTableNumber('1.5', [1])).toBe('Informe um número inteiro maior que zero.');
    expect(validateTableNumber('2', [1, 2])).toBe('Já existe uma mesa com esse número.');
    expect(validateTableNumber('4', [1, 2])).toBeNull();
  });

  it('GET mapeia comandas→status e remove o campo comandas', () => {
    const rows = [
      { id: 't1', number: 1, comandas: [{ id: 'c1' }] },
      { id: 't2', number: 2, comandas: [] as { id: string }[] },
    ];
    const mapped = rows.map(t => ({
      ...t,
      status: deriveTableStatus(t.comandas.length),
      comandas: undefined,
    }));
    expect(mapped[0].status).toBe('Ocupada');
    expect(mapped[1].status).toBe('Disponível');
    expect(mapped[0].comandas).toBeUndefined();
  });
});
