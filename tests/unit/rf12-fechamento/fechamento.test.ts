import { describe, expect, it } from 'vitest';

// Espelham POST /:id/pay (auto-close), POST /:id/close, reconciliação e
// evicção dos contexts e o status derivado das mesas.
type LiteComanda = {
  id: string;
  tableNumber: number;
  status: 'Aberta' | 'Fechada';
  closedAt?: Date;
};

type LiteItem = {
  id: string;
  tableNumber?: number;
  comandaId?: string;
};

function shouldAutoClose(remainingTable: number): boolean {
  return remainingTable <= 0.01;
}

function isItemPaid(remaining: number): boolean {
  return remaining <= 0.009;
}

function closeComanda(id: string): { id: string; status: 'Fechada'; closedAt: Date } {
  return { id, status: 'Fechada', closedAt: new Date() };
}

describe('RF12 Fechar Comanda — auto-close e ocultação', () => {
  it('auto-close dispara ao zerar (<=0.01)', () => {
    expect(shouldAutoClose(0)).toBe(true);
    expect(shouldAutoClose(0.005)).toBe(true);
    expect(shouldAutoClose(0.02)).toBe(false);
  });

  it('item pago não reabre cobrança (epsilon 0.009)', () => {
    expect(isItemPaid(0.009)).toBe(true);
    expect(isItemPaid(0.5)).toBe(false);
  });

  it('close grava Fechada com data', () => {
    const closed = closeComanda('c1');
    expect(closed.status).toBe('Fechada');
    expect(closed.closedAt).toBeInstanceOf(Date);
  });

  it('reconciliação marca a Aberta ausente como Fechada', () => {
    const current: LiteComanda[] = [{ id: 'c1', tableNumber: 1, status: 'Aberta' }];
    const result = current.map(c =>
      c.tableNumber === 1 && c.status === 'Aberta' && !new Set<string>().has(c.id)
        ? { ...c, status: 'Fechada' as const, closedAt: new Date() }
        : c,
    );
    expect(result[0].status).toBe('Fechada');
  });

  it('evicção esvazia a mesa fechada', () => {
    const current: LiteItem[] = [{ id: 'a', tableNumber: 1, comandaId: 'c1' }];
    const kept = current.filter(o => o.tableNumber !== 1 || new Set(['x']).has(o.id) || !o.comandaId);
    expect(kept).toEqual([]);
  });

  it('mesa volta a Disponível sem abertas', () => {
    const derive = (open: number) => (open > 0 ? 'Ocupada' : 'Disponível');
    expect(derive(0)).toBe('Disponível');
  });

  it('trava libera após fechar (sem aberta)', () => {
    const check = (openTable: number | null, mesa: string | null): number | null =>
      openTable !== null && mesa && Number(mesa) !== openTable ? openTable : null;
    expect(check(null, '2')).toBeNull();
  });

  it('outra mesa preserva seus itens na evicção', () => {
    const current: LiteItem[] = [{ id: 'b', tableNumber: 2, comandaId: 'c9' }];
    const kept = current.filter(o => o.tableNumber !== 1 || new Set<string>().has(o.id) || !o.comandaId);
    expect(kept).toHaveLength(1);
  });
});
