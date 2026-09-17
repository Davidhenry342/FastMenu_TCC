import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  res.json(categories);
});

router.post('/', async (req, res) => {
  const category = await prisma.category.create({ data: req.body });

  res.status(201).json(category);
});

export default router;