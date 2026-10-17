/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireCustomerOrEmployee, requireEmployee, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', requireEmployee, requireRole('Gerente', 'Garçom', 'Caixa', 'Cozinheiro(a)'), async (_req, res) => {
  const comandas = await prisma.comanda.findMany({
    include: { orderItems: { select: { id: true } } },
    orderBy: { openedAt: 'asc' },
  });

  const mapped = comandas.map(c => ({
    ...c,
    orderItemIds: (c as any).orderItems.map((o: any) => o.id),
    orderItems: undefined,
  }));

  res.json(mapped);
});

router.get('/by-table/:tableNumber', requireCustomerOrEmployee, async (req, res) => {
  const tableNumber = Number(req.params.tableNumber);

  if (Number.isNaN(tableNumber)) {
    res.status(400).json({ error: 'tableNumber inválido' });
    return;
  }

  const comandas = await prisma.comanda.findMany({
    where: { tableNumber, status: 'Aberta' },
    include: { orderItems: { select: { id: true } } },
    orderBy: { openedAt: 'asc' },
  });

  res.json(
    comandas.map(c => ({
      ...c,
      orderItemIds: (c as any).orderItems.map((o: any) => o.id),
      orderItems: undefined,
    })),
  );
});

router.post('/', requireCustomerOrEmployee, async (req, res) => {
  const authReq = req as unknown as { customer?: { id: string }; employee?: { id: string; role: string } };

  if (!authReq.employee) {
    if (!authReq.customer) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const customerId = authReq.customer.id;
    const requestedTableNumber = Number((req.body as { tableNumber?: unknown }).tableNumber);

    if (Number.isNaN(requestedTableNumber)) {
      res.status(400).json({ error: 'tableNumber inválido' });
      return;
    }

    const myOpen = await prisma.comanda.findFirst({
      where: { status: 'Aberta', orderItems: { some: { customerId } } },
      include: { orderItems: { select: { id: true } } },
      orderBy: { openedAt: 'asc' },
    });

    if (myOpen && myOpen.tableNumber !== requestedTableNumber) {
      res.status(409).json({
        error: `Você já possui comanda aberta na mesa ${myOpen.tableNumber}. Finalize antes de abrir em outra mesa.`,
        tableNumber: myOpen.tableNumber,
      });
      return;
    }

    if (myOpen && myOpen.tableNumber === requestedTableNumber) {
      res.status(200).json({
        ...myOpen,
        orderItemIds: (myOpen as unknown as { orderItems: { id: string }[] }).orderItems.map(o => o.id),
        orderItems: undefined,
      });
      return;
    }

    const sharedOpen = await prisma.comanda.findFirst({
      where: { tableNumber: requestedTableNumber, status: 'Aberta' },
      include: { orderItems: { select: { id: true } } },
      orderBy: { openedAt: 'asc' },
    });

    if (sharedOpen) {
      res.status(200).json({
        ...sharedOpen,
        orderItemIds: (sharedOpen as unknown as { orderItems: { id: string }[] }).orderItems.map(o => o.id),
        orderItems: undefined,
      });
      return;
    }
  } else {
    const allowed = ['Gerente', 'Garçom', 'Caixa', 'Cozinheiro(a)', 'Cozinheiro_a'];

    if (!allowed.includes(authReq.employee.role)) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }
  }

  const comanda = await prisma.comanda.create({ data: req.body });

  const withItems = await prisma.comanda.findUnique({
    where: { id: comanda.id },
    include: { orderItems: { select: { id: true } } },
  });

  res.status(201).json({
    ...withItems,
    orderItemIds: (withItems as any).orderItems.map((o: any) => o.id),
    orderItems: undefined,
  });
});

router.post('/:id/add-order', requireCustomerOrEmployee, async (req, res) => {
  const authReq = req as unknown as { customer?: { id: string }; employee?: { id: string; role: string } };
  const { orderItemId } = req.body as { orderItemId: string };

  if (!authReq.employee && authReq.customer) {
    const customerId = authReq.customer.id;
    const target = await prisma.comanda.findUnique({
      where: { id: String(req.params.id) },
      select: { id: true, tableNumber: true, status: true },
    });

    if (!target) {
      res.status(404).json({ error: 'Comanda not found' });
      return;
    }

    if (target.status !== 'Aberta') {
      res.status(409).json({ error: 'Comanda não está aberta.' });
      return;
    }

    const order = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      select: { id: true, customerId: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Pedido não encontrado.' });
      return;
    }

    const open = await prisma.comanda.findFirst({
      where: { status: 'Aberta', orderItems: { some: { customerId } } },
      select: { id: true, tableNumber: true },
    });

    if (open && open.tableNumber !== target.tableNumber) {
      res.status(409).json({
        error: `Você já possui comanda aberta na mesa ${open.tableNumber}. Finalize antes de pedir em outra mesa.`,
        tableNumber: open.tableNumber,
      });
      return;
    }
  } else if (authReq.employee) {
    const allowed = ['Gerente', 'Garçom', 'Caixa', 'Cozinheiro(a)', 'Cozinheiro_a'];

    if (!allowed.includes(authReq.employee.role)) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }
  } else {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { comandaId: String(req.params.id) },
  });

  const comanda = await prisma.comanda.findUnique({
    where: { id: String(req.params.id) },
    include: { orderItems: { select: { id: true } } },
  });

  if (!comanda) {
    res.status(404).json({ error: 'Comanda not found' });
    return;
  }

  res.json({
    ...comanda,
    orderItemIds: (comanda as any).orderItems.map((o: any) => o.id),
    orderItems: undefined,
  });
});

router.post('/:id/remove-order', requireEmployee, requireRole('Gerente', 'Garçom', 'Caixa'), async (req, res) => {
  const { orderItemId } = req.body as { orderItemId: string };

  await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { comandaId: null },
  });

  const comanda = await prisma.comanda.findUnique({
    where: { id: String(req.params.id) },
    include: { orderItems: { select: { id: true } } },
  });

  if (!comanda) {
    res.status(404).json({ error: 'Comanda not found' });
    return;
  }

  res.json({
    ...comanda,
    orderItemIds: (comanda as any).orderItems.map((o: any) => o.id),
    orderItems: undefined,
  });
});

router.post('/:id/close', requireEmployee, requireRole('Gerente', 'Garçom', 'Caixa'), async (req, res) => {
  const comanda = await prisma.comanda.update({
    where: { id: String(req.params.id) },
    data: { status: 'Fechada', closedAt: new Date() },
    include: { orderItems: { select: { id: true } } },
  });

  res.json({
    ...comanda,
    orderItemIds: (comanda as any).orderItems.map((o: any) => o.id),
    orderItems: undefined,
  });
});

router.put('/:id', requireEmployee, requireRole('Gerente'), async (req, res) => {
  const comanda = await prisma.comanda.update({
    where: { id: String(req.params.id) },
    data: req.body,
    include: { orderItems: { select: { id: true } } },
  });

  res.json({
    ...comanda,
    orderItemIds: (comanda as any).orderItems.map((o: any) => o.id),
    orderItems: undefined,
  });
});

export default router;