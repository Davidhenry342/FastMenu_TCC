/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'crypto';
import { Router } from 'express';
import {
  computePaymentDelta,
  createPixPayment,
  getPaymentById,
  isMercadoPagoConfigured,
  mapMpStatus,
  validateWebhookSignature,
} from '../lib/mercadopago';
import { round2, settleOrderItemPayment } from '../lib/payments';
import { prisma } from '../lib/prisma';
import { requireCustomerOrEmployee } from '../middleware/auth';

const router = Router();

const PIX_EXPIRATION_MS = 30 * 60 * 1000;

type AuthRequest = {
  customer?: { id: string };
  employee?: { id: string; role: string };
};

type PaymentItemBreakdown = {
  orderItemId: string;
  deltaAmount: number;
  deltaQty: number;
};

function backendPublicUrl(): string {
  return process.env.BACKEND_PUBLIC_URL?.trim() || `http://localhost:${process.env.PORT ?? 3000}`;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseBreakdown(value: unknown): PaymentItemBreakdown[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(entry => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const orderItemId = (entry as any).orderItemId;
      const deltaAmount = Number((entry as any).deltaAmount);
      const deltaQty = Number((entry as any).deltaQty ?? 0);

      if (typeof orderItemId !== 'string' || !Number.isFinite(deltaAmount)) {
        return null;
      }

      return {
        orderItemId,
        deltaAmount,
        deltaQty: Number.isFinite(deltaQty) && deltaQty > 0 ? Math.floor(deltaQty) : 0,
      };
    })
    .filter((entry): entry is PaymentItemBreakdown => entry !== null);
}

async function applyItemPayment(entry: PaymentItemBreakdown): Promise<void> {
  const item = (await prisma.orderItem.findUnique({
    where: { id: entry.orderItemId },
    include: { product: true },
  })) as any;

  if (!item) {
    return;
  }

  const total = Number(item.product.price) * item.quantity;
  const paid = item.paidAmount !== null && item.paidAmount !== undefined ? Number(item.paidAmount) : 0;
  const remaining = round2(Math.max(0, total - paid));
  const deltaAmount = computePaymentDelta(remaining, entry.deltaAmount);

  if (deltaAmount > 0) {
    await settleOrderItemPayment({
      orderItemId: item.id,
      deltaAmount,
      deltaQty: entry.deltaQty,
    });
  }
}

async function settlePaymentRecord(record: any, mpPayment: any): Promise<void> {
  const status = mapMpStatus(mpPayment.status as string);
  const alreadyApproved = record.status === 'approved';

  await prisma.payment.update({
    where: { id: record.id },
    data: {
      mpPaymentId: mpPayment.id !== undefined ? String(mpPayment.id) : record.mpPaymentId,
      status,
      method: (mpPayment.payment_method_id as string) ?? record.method,
      rawPayload: mpPayment,
      paidAt: status === 'approved' ? (record.paidAt ?? new Date()) : record.paidAt,
    },
  });

  if (status !== 'approved' || alreadyApproved) {
    return;
  }

  const breakdown = parseBreakdown(record.items);

  if (breakdown.length > 0) {
    for (const entry of breakdown) {
      await applyItemPayment(entry);
    }

    return;
  }

  if (record.orderItemId) {
    await applyItemPayment({
      orderItemId: record.orderItemId,
      deltaAmount: Number(mpPayment.transaction_amount ?? record.amount),
      deltaQty: 0,
    });
  }
}

function serializePayment(payment: any) {
  return {
    status: payment.status,
    amount: Number(payment.amount),
    method: payment.method,
    mpPaymentId: payment.mpPaymentId,
    paidAt: payment.paidAt,
  };
}

router.post('/pix', requireCustomerOrEmployee, async (req, res) => {
  if (!isMercadoPagoConfigured()) {
    res.status(503).json({ error: 'Pagamento online não configurado (MERCADOPAGO_ACCESS_TOKEN).' });
    return;
  }

  const authReq = req as unknown as AuthRequest;

  if (!authReq.employee && !authReq.customer) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];

  if (rawItems.length === 0) {
    res.status(400).json({ error: 'Selecione ao menos um item para pagar via Pix.' });
    return;
  }

  const seen = new Set<string>();
  const entries: Array<{ orderItemId: string; amount: number; quantity: number }> = [];

  for (const raw of rawItems) {
    const orderItemId = typeof raw?.orderItemId === 'string' ? raw.orderItemId : '';

    if (!orderItemId || seen.has(orderItemId)) {
      continue;
    }

    seen.add(orderItemId);
    entries.push({
      orderItemId,
      amount: Number(raw?.amount),
      quantity: Number(raw?.quantity),
    });
  }

  if (entries.length === 0) {
    res.status(400).json({ error: 'Nenhum item válido informado.' });
    return;
  }

  const breakdown: PaymentItemBreakdown[] = [];
  const tableNumbers = new Set<number>();
  let total = 0;
  let comandaId: string | null = null;

  for (const entry of entries) {
    const item = (await prisma.orderItem.findUnique({
      where: { id: entry.orderItemId },
      include: { product: true, comanda: true },
    })) as any;

    if (!item || !item.product) {
      res.status(404).json({ error: 'Pedido não encontrado.' });
      return;
    }

    const displayStatus = item.status === 'Em_produção' ? 'Em produção' : item.status;

    if (displayStatus === 'Cancelado' || displayStatus === 'Aguardando confirmação') {
      res.status(409).json({ error: 'Este item ainda não pode ser pago.' });
      return;
    }

    if (!item.comanda || item.comanda.status !== 'Aberta') {
      res.status(409).json({ error: 'Comanda não está aberta.' });
      return;
    }

    const price = Number(item.product.price);
    const itemTotal = price * item.quantity;
    const paid = item.paidAmount !== null && item.paidAmount !== undefined ? Number(item.paidAmount) : 0;
    const remaining = round2(Math.max(0, itemTotal - paid));

    if (remaining <= 0.009) {
      res.status(409).json({ error: `O item "${item.product.name}" já está pago.` });
      return;
    }

    const requestedQty =
      Number.isFinite(entry.quantity) && entry.quantity > 0 ? Math.floor(entry.quantity) : null;
    const requestedAmount =
      Number.isFinite(entry.amount) && entry.amount > 0 ? round2(entry.amount) : null;

    let deltaAmount: number;

    if (requestedQty) {
      deltaAmount = Math.min(round2(price * requestedQty), remaining);
    } else if (requestedAmount) {
      deltaAmount = Math.min(requestedAmount, remaining);
    } else {
      deltaAmount = remaining;
    }

    if (deltaAmount <= 0.009) {
      res.status(409).json({ error: 'Valor de pagamento inválido para um dos itens.' });
      return;
    }

    breakdown.push({
      orderItemId: item.id,
      deltaAmount: round2(deltaAmount),
      deltaQty: requestedQty ?? 0,
    });

    total += deltaAmount;
    comandaId = comandaId ?? item.comandaId ?? null;

    if (item.tableNumber !== null && item.tableNumber !== undefined) {
      tableNumbers.add(item.tableNumber);
    }
  }

  total = round2(total);

  if (total <= 0.009) {
    res.status(409).json({ error: 'Valor total inválido para pagamento.' });
    return;
  }

  if (!authReq.employee && authReq.customer) {
    const customerId = authReq.customer.id;
    const myOpen = await prisma.comanda.findFirst({
      where: { status: 'Aberta', orderItems: { some: { customerId } } },
      select: { tableNumber: true },
    });

    if (myOpen && myOpen.tableNumber !== null) {
      for (const tableNumber of tableNumbers) {
        if (tableNumber !== myOpen.tableNumber) {
          res.status(409).json({
            error: `Você já possui comanda aberta na mesa ${myOpen.tableNumber}. Finalize antes de pagar em outra mesa.`,
            tableNumber: myOpen.tableNumber,
          });
          return;
        }
      }
    }
  }

  let payerEmail: string | undefined;

  if (authReq.customer) {
    const customer = await prisma.customer.findUnique({
      where: { id: authReq.customer.id },
      select: { email: true },
    });

    payerEmail = customer?.email ?? undefined;
  }

  payerEmail = payerEmail ?? (process.env.MERCADOPAGO_PAYER_EMAIL?.trim() || undefined);

  if (!payerEmail) {
    res.status(400).json({ error: 'E-mail do pagador não configurado (MERCADOPAGO_PAYER_EMAIL).' });
    return;
  }

  const externalReference = randomUUID();

  const payment = await prisma.payment.create({
    data: {
      provider: 'mercadopago',
      externalReference,
      comandaId,
      orderItemId: breakdown.length === 1 ? breakdown[0].orderItemId : null,
      amount: total,
      method: 'pix',
      status: 'pending',
      items: breakdown as unknown as any,
    },
  });

  let charge: Awaited<ReturnType<typeof createPixPayment>>;

  try {
    charge = await createPixPayment({
      amount: total,
      description: `FastMenu${tableNumbers.size > 0 ? ` - Mesa ${[...tableNumbers].join(', ')}` : ''}`,
      externalReference,
      payerEmail,
      notificationUrl: `${backendPublicUrl()}/api/payments/webhook`,
      expiresAt: new Date(Date.now() + PIX_EXPIRATION_MS),
    });
  } catch (error) {
    await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});
    console.error('[MP pix] falha ao gerar cobrança Pix', error);
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Falha ao gerar o código Pix.',
    });
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      mpPaymentId: charge.paymentId,
      status: charge.status,
      qrCode: charge.qrCode,
      expiresAt: charge.expiresAt ? new Date(charge.expiresAt) : null,
    },
  });

  res.status(201).json({
    paymentId: payment.id,
    amount: total,
    qrCode: charge.qrCode,
    qrCodeBase64: charge.qrCodeBase64,
    expiresAt: charge.expiresAt,
  });
});

router.get('/:id/status', requireCustomerOrEmployee, async (req, res) => {
  const payment = await prisma.payment.findUnique({
    where: { id: String(req.params.id) },
  });

  if (!payment) {
    res.status(404).json({ error: 'Pagamento não encontrado.' });
    return;
  }

  if (payment.mpPaymentId && payment.status !== 'approved' && isMercadoPagoConfigured()) {
    try {
      const mpPayment = await getPaymentById(payment.mpPaymentId);
      await settlePaymentRecord(payment, mpPayment);

      const refreshed = await prisma.payment.findUnique({ where: { id: payment.id } });

      res.json(serializePayment(refreshed));
      return;
    } catch (error) {
      console.error('[MP pix] falha ao consultar status', payment.id, error);
    }
  }

  res.json(serializePayment(payment));
});

router.post('/webhook', async (req, res) => {
  const type = req.body?.type ?? req.query.type;
  const dataId = req.body?.data?.id ?? req.query['data.id'] ?? req.query.id;

  if (type !== 'payment' || dataId === undefined || dataId === null || dataId === '') {
    res.sendStatus(200);
    return;
  }

  const signature = validateWebhookSignature({
    xSignature: headerValue(req.headers['x-signature']),
    xRequestId: headerValue(req.headers['x-request-id']),
    dataId: String(dataId).toLowerCase(),
  });

  if (process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() && !signature.validated) {
    res.status(401).json({ error: `Assinatura inválida: ${signature.reason ?? 'desconhecida'}` });
    return;
  }

  let mpPayment: any;

  try {
    mpPayment = await getPaymentById(String(dataId));
  } catch (error) {
    console.error('[MP webhook] falha ao consultar pagamento', dataId, error);
    res.sendStatus(200);
    return;
  }

  const externalReference = mpPayment.external_reference as string | undefined;

  const record = await prisma.payment.findFirst({
    where: {
      OR: [
        { mpPaymentId: mpPayment.id !== undefined ? String(mpPayment.id) : '__unknown__' },
        ...(externalReference ? [{ externalReference }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    res.sendStatus(200);
    return;
  }

  await settlePaymentRecord(record, mpPayment);

  res.sendStatus(200);
});

export default router;
