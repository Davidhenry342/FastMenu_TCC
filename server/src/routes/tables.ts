import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const tables = await prisma.restaurantTable.findMany({ orderBy: { number: 'asc' } });

  res.json(tables);
});

router.post('/', async (req, res) => {
  const table = await prisma.restaurantTable.create({ data: req.body });

  res.status(201).json(table);
});

router.put('/:id', async (req, res) => {
  const table = await prisma.restaurantTable.update({ where: { id: req.params.id }, data: req.body });

  res.json(table);
});

router.delete('/:id', async (req, res) => {
  await prisma.restaurantTable.delete({ where: { id: req.params.id } });

  res.status(204).end();
});

export default router;