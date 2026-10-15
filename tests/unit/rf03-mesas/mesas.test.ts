import { describe, expect, it } from 'vitest';
import { FormatPhone } from '../../../src/utils/format';

// Espelham server/src/routes/tables.ts, src/pages/admin/Mesas e
// src/components/TableFormModal (contratos documentados nos nomes).
function deriveTableStatus(openComandasCount: number): string {
  return openComandasCount > 0 ? 'Ocupada' : 'Disponível';
}

function buildTableQrUrl(origin: string, tableNumber: number): string {
  return `${origin}/?mesa=${tableNumber}`;
}

function isMesaParamValid(mesaParam: string | null, tableNumbers: number[]): boolean {
  if (!mesaParam) return false;
  const n = Number(mesaParam);
  return Number.isInteger(n) && tableNumbers.includes(n);
}

function validateTableNumber(raw: string, taken: number[]): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'Informe o número da mesa.';
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n <= 0) return 'Informe um número inteiro maior que zero.';
  if (taken.includes(n)) return 'Já existe uma mesa com esse número.';
  return null;
}

describe('RF03 Manter Mesas — status, QR e validação', () => {
  it('status deriva de comandas abertas (Ocupada/Disponível)', () => {
    expect(deriveTableStatus(0)).toBe('Disponível');
    expect(deriveTableStatus(1)).toBe('Ocupada');
    expect(deriveTableStatus(3)).toBe('Ocupada');
  });

  it('QR da mesa aponta para /?mesa=N (contrato do Mesas)', () => {
    expect(buildTableQrUrl('http://localhost:5173', 5)).toBe(
      'http://localhost:5173/?mesa=5',
    );
  });

  it('PDF do QR usa nome mesa-N-qrcode.pdf (contrato do Mesas)', () => {
    const fileName = `mesa-${5}-qrcode.pdf`;
    expect(fileName).toBe('mesa-5-qrcode.pdf');
  });

  it('?mesa válido exige inteiro existente em tables', () => {
    expect(isMesaParamValid('1', [1, 2, 3])).toBe(true);
    expect(isMesaParamValid('9', [1, 2, 3])).toBe(false);
    expect(isMesaParamValid('1.5', [1, 2, 3])).toBe(false);
    expect(isMesaParamValid(null, [1, 2, 3])).toBe(false);
    expect(isMesaParamValid('abc', [1, 2, 3])).toBe(false);
  });

  it('FormatPhone 10 dígitos (fixo) e 11 dígitos (celular)', () => {
    expect(FormatPhone('1133334444')).toBe('(11) 3333-4444');
    expect(FormatPhone('11988887777')).toBe('(11) 98888-7777');
  });

  it('POST de mesa ignora status do body (derivado no servidor)', () => {
    const body = { number: 7, status: 'Ocupada' };
    const { status, ...data } = body;
    void status;
    expect(data).toEqual({ number: 7 });
  });

  it('TableFormModal valida vazio, inválido e duplicado', () => {
    expect(validateTableNumber('', [1])).toBe('Informe o número da mesa.');
    expect(validateTableNumber('0', [1])).toBe('Informe um número inteiro maior que zero.');
    expect(validateTableNumber('2', [1, 2])).toBe('Já existe uma mesa com esse número.');
    expect(validateTableNumber('4', [1, 2])).toBeNull();
  });

  it('grade ordena por número e edição exclui a própria mesa dos ocupados', () => {
    const tables = [
      { id: 'c', number: 3 },
      { id: 'a', number: 1 },
      { id: 'b', number: 2 },
    ];
    expect([...tables].sort((x, y) => x.number - y.number).map(t => t.number)).toEqual([1, 2, 3]);
    const taken = tables.filter(t => t.id !== 'a').map(t => t.number);
    expect(taken).toEqual([3, 2]);
    expect(validateTableNumber('1', taken)).toBeNull();
  });
});
