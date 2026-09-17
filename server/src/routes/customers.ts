import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const customers = await prisma.customer.findMany();

  res.json(customers);
});

router.get('/by-phone/:digits', async (req, res) => {
  const digits = req.params.digits.replace(/\D/g, '');
  const customers = await prisma.customer.findMany();
  const found = customers.find(c => c.phone.replace(/\D/g, '') === digits);

  if (!found) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  res.json(found);
});

router.post('/', async (req, res) => {
  const customer = await prisma.customer.create({ data: req.body });

  res.status(201).json(customer);
});

export default router;