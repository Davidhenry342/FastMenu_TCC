/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
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

router.post('/', async (req, res) => {
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

router.post('/:id/add-order', async (req, res) => {
  const { orderItemId } = req.body as { orderItemId: string };

  await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { comandaId: req.params.id },
  });

  const comanda = await prisma.comanda.findUnique({
    where: { id: req.params.id },
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

router.post('/:id/remove-order', async (req, res) => {
  const { orderItemId } = req.body as { orderItemId: string };

  await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { comandaId: null },
  });

  const comanda = await prisma.comanda.findUnique({
    where: { id: req.params.id },
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

router.post('/:id/close', async (req, res) => {
  const comanda = await prisma.comanda.update({
    where: { id: req.params.id },
    data: { status: 'Fechada', closedAt: new Date() },
    include: { orderItems: { select: { id: true } } },
  });

  res.json({
    ...comanda,
    orderItemIds: (comanda as any).orderItems.map((o: any) => o.id),
    orderItems: undefined,
  });
});

router.put('/:id', async (req, res) => {
  const comanda = await prisma.comanda.update({
    where: { id: req.params.id },
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