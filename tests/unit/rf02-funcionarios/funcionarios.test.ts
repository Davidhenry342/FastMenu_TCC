import { describe, expect, it, vi } from 'vitest';
import {
  normalizeRole,
  requireRole,
  toPrismaRole,
} from '../../../server/src/middleware/auth';
import { employeeRoles } from '../../../src/models/employee';
import { canAccess, firstAllowedRoute } from '../../../src/utils/permissions';
import { FormatCpf } from '../../../src/utils/format';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe('RF02 Manter Funcionários — cargos e RBAC', () => {
  it('employeeRoles contém os 4 cargos', () => {
    expect(employeeRoles).toEqual(
      expect.arrayContaining(['Garçom', 'Cozinheiro(a)', 'Caixa', 'Gerente']),
    );
    expect(employeeRoles).toHaveLength(4);
  });

  it('normalizeRole/toPrismaRole fazem round-trip Cozinheiro(a)', () => {
    expect(normalizeRole('Cozinheiro_a')).toBe('Cozinheiro(a)');
    expect(toPrismaRole('Cozinheiro(a)')).toBe('Cozinheiro_a');
    expect(normalizeRole('Gerente')).toBe('Gerente');
  });

  it('requireRole libera Gerente em Funcionários e barra Garçom (403)', () => {
    const allow = requireRole('Gerente');
    const resOk = mockRes();
    const nextOk = vi.fn();
    allow({ employee: { id: '1', role: 'Gerente' } } as never, resOk as never, nextOk);
    expect(nextOk).toHaveBeenCalled();

    const resDeny = mockRes();
    const nextDeny = vi.fn();
    allow({ employee: { id: '2', role: 'Garçom' } } as never, resDeny as never, nextDeny);
    expect(nextDeny).not.toHaveBeenCalled();
    expect(resDeny.status).toHaveBeenCalledWith(403);
  });

  it('requireRole aceita Cozinheiro(a) via chave Prisma Cozinheiro_a', () => {
    const guard = requireRole('Cozinheiro(a)');
    const res = mockRes();
    const next = vi.fn();
    guard({ employee: { id: '3', role: 'Cozinheiro_a' } } as never, res as never, next);
    expect(next).toHaveBeenCalled();
  });

  it('requireRole retorna 401 sem employee', () => {
    const guard = requireRole('Gerente');
    const res = mockRes();
    const next = vi.fn();
    guard({} as never, res as never, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('canAccess espelha a matriz: Funcionários só Gerente', () => {
    expect(canAccess('Gerente', '/admin/funcionarios')).toBe(true);
    expect(canAccess('Garçom', '/admin/funcionarios')).toBe(false);
    expect(canAccess('Caixa', '/admin/funcionarios')).toBe(false);
    expect(canAccess('Cozinheiro(a)', '/admin/funcionarios')).toBe(false);
    expect(canAccess(null, '/admin/funcionarios')).toBe(false);
  });

  it('firstAllowedRoute do AdminLogin por cargo', () => {
    expect(firstAllowedRoute('Gerente')).toBe('/admin/mesas');
    expect(firstAllowedRoute('Cozinheiro(a)')).toBe('/admin/cozinha');
    expect(firstAllowedRoute('Caixa')).toBe('/admin/mesas');
    expect(firstAllowedRoute(null)).toBe('/admin/login');
  });

  it('FormatCpf máscara e regra de 11 dígitos (AdminLogin)', () => {
    expect(FormatCpf('12345678900')).toBe('123.456.789-00');
    expect(FormatCpf('12345678900').replace(/\D/g, '')).toHaveLength(11);
  });
});
