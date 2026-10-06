import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { requireCustomer } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? 'fastmenu-tcc-jwt-secret-change-in-production';

function signCustomerToken(customerId: string) {
  return jwt.sign({ sub: customerId, role: 'customer' }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

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

router.get('/me', async (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const token = (req as any).cookies?.customer_token as string | undefined;

  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const customer = await prisma.customer.findUnique({
      where: { id: payload.sub },
    });

    if (!customer) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    res.json(customer);
  } catch {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

router.get('/me/open-comanda', requireCustomer, async (req, res) => {
  const customerId = (req as unknown as { customer?: { id: string } }).customer!.id;

  const open = await prisma.comanda.findFirst({
    where: {
      status: 'Aberta',
      orderItems: { some: { customerId } },
    },
    include: { orderItems: { select: { id: true } } },
    orderBy: { openedAt: 'asc' },
  });

  if (!open) {
    res.json({ comanda: null });
    return;
  }

  res.json({
    comanda: {
      ...open,
      orderItemIds: (open as unknown as { orderItems: { id: string }[] }).orderItems.map(o => o.id),
      orderItems: undefined,
    },
  });
});

router.post('/', async (req, res) => {
  const customer = await prisma.customer.create({ data: req.body });
  const token = signCustomerToken(customer.id);

  res.cookie('customer_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json(customer);
});

router.post('/login', async (req, res) => {
  const digits = String(req.body.phone ?? '').replace(/\D/g, '');
  const customers = await prisma.customer.findMany();
  const found = customers.find(c => c.phone.replace(/\D/g, '') === digits);

  if (!found) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const token = signCustomerToken(found.id);

  res.cookie('customer_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json(found);
});

router.post('/logout', (_req, res) => {
  res.clearCookie('customer_token');

  res.json({ ok: true });
});

export default router;