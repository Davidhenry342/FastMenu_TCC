/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express';
import {
  computePaymentDelta,
  createPreference,
  getPaymentById,
  isMercadoPagoConfigured,
  mapMpStatus,
  validateWebhookSignature,
} from '../lib/mercadopago';
import { round2, settleOrderItemPayment } from '../lib/payments';
import { prisma } from '../lib/prisma';
import { requireCustomerOrEmployee } from '../middleware/auth';

const router = Router();

function backendPublicUrl(): string {
  return process.env.BACKEND_PUBLIC_URL?.trim() || `http://localhost:${process.env.PORT ?? 3000}`;
}

function frontendUrl(): string {
  return process.env.FRONTEND_URL?.trim() || 'http://localhost:5173';
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

router.post('/preference', requireCustomerOrEmployee, async (req, res) => {
  if (!isMercadoPagoConfigured()) {
    res.status(503).json({ error: 'Pagamento online não configurado (MERCADOPAGO_ACCESS_TOKEN).' });
    return;
  }

  const authReq = req as unknown as { customer?: { id: string }; employee?: { id: string; role: string } };
  const orderItemId = typeof req.body?.orderItemId === 'string' ? req.body.orderItemId : '';

  if (!orderItemId) {
    res.status(400).json({ error: 'Informe orderItemId.' });
    return;
  }

  const item = (await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { product: true, comanda: true, customer: true },
  })) as any;

  if (!item) {
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

  if (!authReq.employee && authReq.customer) {
    const customerId = authReq.customer.id;
    const myOpen = await prisma.comanda.findFirst({
      where: { status: 'Aberta', orderItems: { some: { customerId } } },
      select: { tableNumber: true },
    });

    if (myOpen && item.tableNumber !== null && myOpen.tableNumber !== item.tableNumber) {
      res.status(409).json({
        error: `Você já possui comanda aberta na mesa ${myOpen.tableNumber}. Finalize antes de pagar em outra mesa.`,
        tableNumber: myOpen.tableNumber,
      });
      return;
    }
  } else if (!authReq.employee && !authReq.customer) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const price = Number(item.product.price);
  const total = price * item.quantity;
  const paid = item.paidAmount !== null && item.paidAmount !== undefined ? Number(item.paidAmount) : 0;
  const remaining = round2(Math.max(0, total - paid));

  if (remaining <= 0.009) {
    res.status(409).json({ error: 'Item já pago.' });
    return;
  }

  const preference = await createPreference({
    orderItemId: item.id,
    title: item.product.name,
    quantity: 1,
    unitPrice: remaining,
    payerEmail: item.customer?.email,
    notificationUrl: `${backendPublicUrl()}/api/payments/webhook`,
    backUrls: {
      success: `${frontendUrl()}/pagamento/sucesso`,
      failure: `${frontendUrl()}/pagamento/falha`,
      pending: `${frontendUrl()}/pagamento/pendente`,
    },
  });

  await prisma.payment.create({
    data: {
      provider: 'mercadopago',
      mpPreferenceId: preference.preferenceId,
      externalReference: item.id,
      orderItemId: item.id,
      comandaId: item.comandaId,
      amount: remaining,
      status: 'pending',
    },
  });

  res.status(201).json({ preferenceId: preference.preferenceId, initPoint: preference.initPoint, amount: remaining });
});

router.get('/:preferenceId/status', requireCustomerOrEmployee, async (req, res) => {
  const payment = await prisma.payment.findUnique({
    where: { mpPreferenceId: String(req.params.preferenceId) },
  });

  if (!payment) {
    res.status(404).json({ error: 'Pagamento não encontrado.' });
    return;
  }

  res.json({
    status: payment.status,
    amount: Number(payment.amount),
    method: payment.method,
    mpPaymentId: payment.mpPaymentId,
    paidAt: payment.paidAt,
  });
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
  const status = mapMpStatus(mpPayment.status as string);

  const record = await prisma.payment.findFirst({
    where: {
      OR: [
        { mpPreferenceId: mpPayment.preference_id as string },
        ...(externalReference ? [{ externalReference }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    res.sendStatus(200);
    return;
  }

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

  if (status === 'approved' && !alreadyApproved && record.orderItemId) {
    const item = (await prisma.orderItem.findUnique({
      where: { id: record.orderItemId },
      include: { product: true },
    })) as any;

    if (item) {
      const price = Number(item.product.price);
      const total = price * item.quantity;
      const paid = item.paidAmount !== null && item.paidAmount !== undefined ? Number(item.paidAmount) : 0;
      const remaining = round2(Math.max(0, total - paid));
      const transactionAmount = Number(mpPayment.transaction_amount ?? record.amount);
      const deltaAmount = computePaymentDelta(remaining, transactionAmount);

      if (deltaAmount > 0) {
        await settleOrderItemPayment({ orderItemId: item.id, deltaAmount });
      }
    }
  }

  res.sendStatus(200);
});

export default router;
