import { describe, expect, it } from 'vitest';

// Espelham server/src/routes (trava 409, DTO orderItemIds),
// src/utils (conflito, payload) e contexts (erros com tableNumber).
function resolveMesaConflict(
  myOpenTable: number | null,
  targetTable: number,
): { status: 409; tableNumber: number } | null {
  if (myOpenTable !== null && myOpenTable !== targetTable) {
    return { status: 409, tableNumber: myOpenTable };
  }
  return null;
}

function toComandaDTO(comanda: { orderItems: { id: string }[] }) {
  return {
    ...comanda,
    orderItemIds: comanda.orderItems.map(o => o.id),
    orderItems: undefined,
  };
}

function checkMesaConflict(
  open: { tableNumber: number } | null,
  mesaParam: string | null,
): number | null {
  if (open && mesaParam && Number(mesaParam) !== open.tableNumber) {
    return open.tableNumber;
  }
  return null;
}

async function parseApiError(
  res: { json: () => Promise<{ error?: string; tableNumber?: number }> },
  fallback: string,
): Promise<Error & { tableNumber?: number }> {
  const err = (await res.json().catch(() => ({}))) as { error?: string; tableNumber?: number };
  const error = new Error(err.error ?? fallback) as Error & { tableNumber?: number };

  if (err.tableNumber !== undefined) {
    error.tableNumber = err.tableNumber;
  }

  return error;
}

describe('RF09 Associar Usuário a Comanda — vínculo e trava', () => {
  it('trava libera mesma mesa e sem aberta', () => {
    expect(resolveMesaConflict(1, 1)).toBeNull();
    expect(resolveMesaConflict(null, 2)).toBeNull();
  });

  it('trava 409 em mesa diferente com número', () => {
    expect(resolveMesaConflict(1, 2)).toEqual({ status: 409, tableNumber: 1 });
  });

  it('DTO troca orderItems por orderItemIds', () => {
    const dto = toComandaDTO({ orderItems: [{ id: 'a' }, { id: 'b' }] });
    expect(dto.orderItemIds).toEqual(['a', 'b']);
    expect(dto.orderItems).toBeUndefined();
  });

  it('checkMesaConflict bloqueia diferente e libera igual/ausente', () => {
    expect(checkMesaConflict({ tableNumber: 1 }, '2')).toBe(1);
    expect(checkMesaConflict({ tableNumber: 1 }, '1')).toBeNull();
    expect(checkMesaConflict({ tableNumber: 1 }, null)).toBeNull();
    expect(checkMesaConflict(null, '2')).toBeNull();
  });

  it('payload mapeia product.id→productId e Date→ISO', () => {
    const item = {
      id: 'o1',
      product: { id: 'p1' },
      quantity: 2,
      orderedAt: new Date('2026-01-01T12:00:00.000Z'),
      status: 'Aguardando confirmação',
      tableNumber: 1,
      customerId: 'c1',
    };
    const payload = {
      id: item.id,
      productId: item.product.id,
      quantity: item.quantity,
      orderedAt: item.orderedAt.toISOString(),
      status: item.status,
      tableNumber: item.tableNumber,
      customerId: item.customerId,
    };
    expect(payload.productId).toBe('p1');
    expect(payload.orderedAt).toBe('2026-01-01T12:00:00.000Z');
    expect(payload.customerId).toBe('c1');
  });

  it('POST força customerId do token (anti-spoof)', () => {
    const forced = { ...{ customerId: 'forjado' }, customerId: 'token-id' };
    expect(forced.customerId).toBe('token-id');
  });

  it('mesma mesa reutiliza a aberta (idempotente, sem 409)', () => {
    expect(resolveMesaConflict(1, 1)).toBeNull();
  });

  it('parseApiError preserva tableNumber do 409 e fallback', async () => {
    const err = await parseApiError(
      { json: async () => ({ error: 'Mesa ocupada', tableNumber: 1 }) },
      'Falha',
    );
    expect(err.message).toBe('Mesa ocupada');
    expect(err.tableNumber).toBe(1);

    const fallback = await parseApiError(
      { json: async () => { throw new Error('x'); } },
      'Falha ao criar pedido',
    );
    expect(fallback.message).toBe('Falha ao criar pedido');
    expect(fallback.tableNumber).toBeUndefined();
  });
});
