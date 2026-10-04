/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireEmployee, requireRole } from '../middleware/auth';

const router = Router();

const toPrismaStatus: Record<string, string> = {
  'Em produção': 'Em_produção',
  'Aguardando confirmação': 'Aguardando_confirmacao',
  Cancelado: 'Cancelado',
  Entregue: 'Entregue',
};

const fromPrismaStatus: Record<string, string> = {
  Em_produção: 'Em produção',
  Aguardando_confirmacao: 'Aguardando confirmação',
  Cancelado: 'Cancelado',
  Entregue: 'Entregue',
};

function mapStatusFromPrisma<T extends { status: string }>(item: T): T {
  return { ...item, status: fromPrismaStatus[item.status] ?? item.status };
}

router.get('/', requireEmployee, requireRole('Gerente', 'Garçom', 'Cozinheiro(a)', 'Caixa'), async (_req, res) => {
  const orders = await prisma.orderItem.findMany({
    include: { product: true, customer: true },
    orderBy: { orderedAt: 'asc' },
  });

  res.json(orders.map(mapStatusFromPrisma));
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

  if (body.status && toPrismaStatus[body.status]) {
    body.status = toPrismaStatus[body.status];
  }

  const order = await prisma.orderItem.create({
    data: body,
    include: { product: true, customer: true },
  });

  res.status(201).json(mapStatusFromPrisma(order as any));
});

router.put('/:id', requireEmployee, requireRole('Gerente', 'Garçom', 'Cozinheiro(a)', 'Caixa'), async (req, res) => {
  const body: any = { ...req.body };

  if (body.product && body.product.id) {
    body.productId = body.product.id;
    delete body.product;
  }

  if (body.orderedAt) {
    body.orderedAt = new Date(body.orderedAt);
  }

  if (body.status && toPrismaStatus[body.status]) {
    body.status = toPrismaStatus[body.status];
  }

  const order = await prisma.orderItem.update({
    where: { id: req.params.id },
    data: body,
    include: { product: true },
  });

  res.json(mapStatusFromPrisma(order as any));
});

router.delete('/:id', requireEmployee, requireRole('Gerente'), async (req, res) => {
  await prisma.orderItem.delete({ where: { id: req.params.id } });

  res.status(204).end();
});

export default router;