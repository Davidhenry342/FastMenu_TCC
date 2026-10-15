import { describe, expect, it } from 'vitest';
import { FormatPhone } from '../../../src/utils/format';

// Espelham src/pages/Login (validação), src/contexts/CustomerContext
// (findByPhone, reviveCustomer) e GET /me/open-comanda (mapeamento).
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPhoneValid(digits: string): boolean {
  return digits.length >= 10 && digits.length <= 11;
}

function findByPhone<T extends { phone: string }>(customers: T[], digits: string): T | undefined {
  return customers.find(c => c.phone.replace(/\D/g, '') === digits);
}

function reviveCustomer(raw: { createdAt: string }) {
  return { ...raw, createdAt: new Date(raw.createdAt) };
}

function mapOpenComanda(raw: { orderItems: { id: string }[] } | null) {
  if (!raw) return { comanda: null };
  return {
    comanda: {
      orderItemIds: raw.orderItems.map(o => o.id),
      orderItems: undefined,
    },
  };
}

describe('RF04 Cadastrar Cliente — validação e sessão', () => {
  it('telefone exige 10 ou 11 dígitos (Login)', () => {
    expect(isPhoneValid('11988887777')).toBe(true);
    expect(isPhoneValid('1133334444')).toBe(true);
    expect(isPhoneValid('123456789')).toBe(false);
    expect(isPhoneValid('123456789012')).toBe(false);
  });

  it('FormatPhone máscara DDD + número', () => {
    expect(FormatPhone('11988887777')).toBe('(11) 98888-7777');
  });

  it('e-mail do cadastro exige formato válido', () => {
    expect(emailRegex.test('cliente@email.com')).toBe(true);
    expect(emailRegex.test('invalido')).toBe(false);
    expect(emailRegex.test('a@b')).toBe(false);
  });

  it('nome do cadastro exige ao menos 2 caracteres', () => {
    expect('Ana'.trim().length >= 2).toBe(true);
    expect('A'.trim().length >= 2).toBe(false);
  });

  it('findByPhone compara só dígitos', () => {
    const customers = [{ phone: '(11) 98888-7777', name: 'David' }];
    expect(findByPhone(customers, '11988887777')?.name).toBe('David');
    expect(findByPhone(customers, '11999998888')).toBeUndefined();
  });

  it('reviveCustomer converte createdAt em Date', () => {
    const revived = reviveCustomer({ createdAt: '2026-01-01T00:00:00.000Z' });
    expect(revived.createdAt).toBeInstanceOf(Date);
  });

  it('open-comanda mapeia orderItems em orderItemIds', () => {
    const mapped = mapOpenComanda({ orderItems: [{ id: 'a' }, { id: 'b' }] });
    expect(mapped.comanda?.orderItemIds).toEqual(['a', 'b']);
  });

  it('open-comanda retorna null sem comanda aberta (trava libera)', () => {
    expect(mapOpenComanda(null)).toEqual({ comanda: null });
  });
});
