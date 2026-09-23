/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const tables = await prisma.restaurantTable.findMany({
    orderBy: { number: 'asc' },
    include: { comandas: { where: { status: 'Aberta' }, select: { id: true } } },
  });

  const withStatus = tables.map(table => ({
    ...table,
    status: table.comandas.length > 0 ? 'Ocupada' : 'Disponível',
    comandas: undefined,
  }));

  res.json(withStatus);
});

router.post('/', async (req, res) => {
  const { status: _status, ...data } = req.body as Record<string, unknown>;

  const table = await prisma.restaurantTable.create({ data: data as any });

  res.status(201).json({ ...table, status: 'Disponível' });
});

router.put('/:id', async (req, res) => {
  const { status: _status, ...data } = req.body as Record<string, unknown>;

  const table = await prisma.restaurantTable.update({
    where: { id: req.params.id },
    data: data as any,
  });

  const openComanda = await prisma.comanda.findFirst({
    where: { tableId: table.id, status: 'Aberta' },
    select: { id: true },
  });

  res.json({ ...table, status: openComanda ? 'Ocupada' : 'Disponível' });
});

router.delete('/:id', async (req, res) => {
  await prisma.restaurantTable.delete({ where: { id: req.params.id } });

  res.status(204).end();
});

export default router;