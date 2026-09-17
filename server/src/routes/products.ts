import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const products = await prisma.product.findMany({ include: { category: true } });

  res.json(products);
});

router.post('/', async (req, res) => {
  const product = await prisma.product.create({ data: req.body });

  res.status(201).json(product);
});

router.put('/:id', async (req, res) => {
  const product = await prisma.product.update({ where: { id: req.params.id }, data: req.body });

  res.json(product);
});

router.delete('/:id', async (req, res) => {
  await prisma.product.delete({ where: { id: req.params.id } });

  res.status(204).end();
});

export default router;