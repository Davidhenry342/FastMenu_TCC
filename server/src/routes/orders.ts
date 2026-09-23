/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const orders = await prisma.orderItem.findMany({
    include: { product: true, customer: true },
    orderBy: { orderedAt: 'asc' },
  });

  res.json(orders);
});

router.post('/', async (req, res) => {
  const body: any = { ...req.body };

  if (body.product && body.product.id) {
    body.productId = body.product.id;
    delete body.product;
  }

  if (body.orderedAt) {
    body.orderedAt = new Date(body.orderedAt);
  }

  const order = await prisma.orderItem.create({
    data: body,
    include: { product: true, customer: true },
  });

  res.status(201).json(order);
});

router.put('/:id', async (req, res) => {
  const body: any = { ...req.body };

  if (body.product && body.product.id) {
    body.productId = body.product.id;
    delete body.product;
  }

  if (body.orderedAt) {
    body.orderedAt = new Date(body.orderedAt);
  }

  const order = await prisma.orderItem.update({
    where: { id: req.params.id },
    data: body,
    include: { product: true },
  });

  res.json(order);
});

router.delete('/:id', async (req, res) => {
  await prisma.orderItem.delete({ where: { id: req.params.id } });

  res.status(204).end();
});

export default router;