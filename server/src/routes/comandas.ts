import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const comandas = await prisma.comanda.findMany({ include: { orderItems: true } });

  res.json(comandas);
});

router.post('/', async (req, res) => {
  const comanda = await prisma.comanda.create({ data: req.body });

  res.status(201).json(comanda);
});

router.put('/:id', async (req, res) => {
  const comanda = await prisma.comanda.update({ where: { id: req.params.id }, data: req.body });

  res.json(comanda);
});

export default router;