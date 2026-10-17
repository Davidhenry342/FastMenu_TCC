/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { displayStatusOf, mapStatusFromPrisma, settleOrderItemPayment, toPrismaStatus } from '../lib/payments';
import { requireCustomerOrEmployee, requireEmployee, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', requireEmployee, requireRole('Gerente', 'Garçom', 'Cozinheiro(a)', 'Caixa'), async (_req, res) => {
  const orders = await prisma.orderItem.findMany({
    include: { product: true, customer: true },
    orderBy: { orderedAt: 'asc' },
  });

  res.json(orders.map(mapStatusFromPrisma));
});

router.get('/by-table/:tableNumber', requireCustomerOrEmployee, async (req, res) => {
  const tableNumber = Number(req.params.tableNumber);

  if (Number.isNaN(tableNumber)) {
    res.status(400).json({ error: 'tableNumber inválido' });
    return;
  }

  const openComandas = await prisma.comanda.findMany({
    where: { tableNumber, status: 'Aberta' },
    select: { id: true },
  });

  const comandaIds = openComandas.map(c => c.id);

  if (comandaIds.length === 0) {
    res.json([]);
    return;
  }

  const orders = await prisma.orderItem.findMany({
    where: { comandaId: { in: comandaIds } },
    include: { product: true, customer: true },
    orderBy: { orderedAt: 'asc' },
  });

  res.json(orders.map(mapStatusFromPrisma));
});

router.post('/', requireCustomerOrEmployee, async (req, res) => {
  const authReq = req as unknown as { customer?: { id: string }; employee?: { id: string; role: string } };
  const isEmployee = Boolean(authReq.employee);
  const body: any = { ...req.body };

  if (body.product && body.product.id) {
    body.productId = body.product.id;
    delete body.product;
  }

  if (body.orderedAt) {
    body.orderedAt = new Date(body.orderedAt);
  }

  if (body.status && toPrismaStatus[body.status]) {
    body.status = toPrismaStatus[body.status];
  }

  if (!isEmployee && authReq.customer) {
    const customerId = authReq.customer.id;
    body.customerId = customerId;

    const requestedTable = body.tableNumber !== undefined ? Number(body.tableNumber) : undefined;

    if (requestedTable !== undefined && !Number.isNaN(requestedTable)) {
      const open = await prisma.comanda.findFirst({
        where: { status: 'Aberta', orderItems: { some: { customerId } } },
        select: { tableNumber: true },
      });

      if (open && open.tableNumber !== requestedTable) {
        res.status(409).json({
          error: `Você já possui comanda aberta na mesa ${open.tableNumber}. Finalize antes de pedir em outra mesa.`,
          tableNumber: open.tableNumber,
        });
        return;
      }
    }
  }

  const order = await prisma.orderItem.create({
    data: body,
    include: { product: true, customer: true },
  });

  res.status(201).json(mapStatusFromPrisma(order as any));
});

router.post('/:id/pay', requireCustomerOrEmployee, async (req, res) => {
  const authReq = req as unknown as { customer?: { id: string }; employee?: { id: string; role: string } };
  const body = req.body as { amount?: unknown; quantity?: unknown };
  const rawAmount = typeof body.amount === 'number' ? body.amount : Number(body.amount ?? NaN);
  const rawQty = typeof body.quantity === 'number' ? body.quantity : Number(body.quantity ?? NaN);
  const amount = Number.isFinite(rawAmount) ? Math.round(rawAmount * 100) / 100 : NaN;
  const quantity = Number.isInteger(rawQty) ? rawQty : Number.isFinite(rawQty) ? Math.floor(rawQty) : NaN;
  const hasAmount = Number.isFinite(amount) && amount > 0;
  const hasQuantity = Number.isInteger(quantity) && quantity > 0;

  if (!hasAmount && !hasQuantity) {
    res.status(400).json({ error: 'Informe amount ou quantity maior que zero.' });
    return;
  }

  const existing = (await prisma.orderItem.findUnique({
    where: { id: String(req.params.id) },
    include: { product: true, comanda: true },
  })) as any;

  if (!existing) {
    res.status(404).json({ error: 'Pedido não encontrado.' });
    return;
  }

  const displayStatus = displayStatusOf(existing as { status: string });

  if (displayStatus === 'Cancelado' || displayStatus === 'Aguardando confirmação') {
    res.status(409).json({ error: 'Este item ainda não pode ser pago.' });
    return;
  }

  if (!existing.comanda || (existing.comanda as { status: string }).status !== 'Aberta') {
    res.status(409).json({ error: 'Comanda não está aberta.' });
    return;
  }

  if (!authReq.employee && authReq.customer) {
    const customerId = authReq.customer.id;
    const myOpen = await prisma.comanda.findFirst({
      where: { status: 'Aberta', orderItems: { some: { customerId } } },
      select: { tableNumber: true },
    });

    if (myOpen && existing.tableNumber !== null && myOpen.tableNumber !== existing.tableNumber) {
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

  const price = Number(existing.product.price);
  const paidSoFar = existing.paidAmount !== null && existing.paidAmount !== undefined ? Number(existing.paidAmount) : 0;
  const total = price * existing.quantity;
  const remaining = Math.max(0, Math.round((total - paidSoFar) * 100) / 100);

  if (remaining <= 0.009) {
    res.status(409).json({ error: 'Item já pago.' });
    return;
  }

  let deltaAmount: number;
  let deltaQty = 0;

  if (hasQuantity) {
    const maxQty = Math.ceil(remaining / price - 1e-9);
    const qty = Math.min(quantity, maxQty);
    deltaAmount = Math.min(Math.round(price * qty * 100) / 100, remaining);
    deltaQty = qty;
  } else {
    deltaAmount = Math.min(amount, remaining);
  }

  if (deltaAmount <= 0) {
    res.status(409).json({ error: 'Item já pago.' });
    return;
  }

  const { order, comandaClosed, remainingTable } = await settleOrderItemPayment({
    orderItemId: existing.id,
    deltaAmount,
    deltaQty,
  });

  res.json({ order, comandaClosed, remainingTable });
});

router.put('/:id', requireEmployee, requireRole('Gerente', 'Garçom', 'Cozinheiro(a)', 'Caixa'), async (req, res) => {
  const body: any = { ...req.body };

  if (body.product && body.product.id) {
    body.productId = body.product.id;
    delete body.product;
  }

  if (body.orderedAt) {
    body.orderedAt = new Date(body.orderedAt);
  }

  if (body.status && toPrismaStatus[body.status]) {
    body.status = toPrismaStatus[body.status];
  }

  const order = await prisma.orderItem.update({
    where: { id: String(req.params.id) },
    data: body,
    include: { product: true },
  });

  res.json(mapStatusFromPrisma(order as any));
});

router.delete('/:id', requireEmployee, requireRole('Gerente'), async (req, res) => {
  await prisma.orderItem.delete({ where: { id: String(req.params.id) } });

  res.status(204).end();
});

export default router;