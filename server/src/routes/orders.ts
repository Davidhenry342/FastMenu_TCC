import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const orders = await prisma.orderItem.findMany({ include: { product: true, customer: true } });

  res.json(orders);
});

router.post('/', async (req, res) => {
  const order = await prisma.orderItem.create({ data: req.body, include: { product: true } });

  res.status(201).json(order);
});

router.put('/:id', async (req, res) => {
  const order = await prisma.orderItem.update({ where: { id: req.params.id }, data: req.body });

  res.json(order);
});

router.delete('/:id', async (req, res) => {
  await prisma.orderItem.delete({ where: { id: req.params.id } });

  res.status(204).end();
});

export default router;