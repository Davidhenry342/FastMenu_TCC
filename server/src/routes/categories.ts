import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireEmployee, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  res.json(categories);
});

router.post('/', requireEmployee, requireRole('Gerente'), async (req, res) => {
  const category = await prisma.category.create({ data: req.body });

  res.status(201).json(category);
});

export default router;