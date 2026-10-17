import bcrypt from 'bcrypt';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { normalizeRole, requireEmployee, requireRole, toPrismaRole } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? 'fastmenu-tcc-jwt-secret-change-in-production';

function signEmployeeToken(employee: { id: string; role: string }) {
  return jwt.sign({ sub: employee.id, role: employee.role }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

router.get('/', requireEmployee, async (_req, res) => {
  const employees = await prisma.employee.findMany();

  res.json(employees.map(e => ({ ...e, role: normalizeRole(e.role as string) })));
});

router.get('/me', async (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const token = (req as any).cookies?.employee_token as string | undefined;

  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const employee = await prisma.employee.findUnique({
      where: { id: payload.sub },
    });

    if (!employee) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    res.json({ ...employee, role: normalizeRole(employee.role as string) });
  } catch {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

router.post('/', requireEmployee, requireRole('Gerente'), async (req, res) => {
  const raw = { ...req.body } as Record<string, unknown>;

  if (typeof raw.role === 'string') {
    raw.role = toPrismaRole(raw.role);
  }

  const data = { ...raw, password: await bcrypt.hash(String(raw.password), 10) };
  const employee = await prisma.employee.create({ data: data as never });

  res.status(201).json({ ...employee, role: normalizeRole(employee.role as string) });
});

router.put('/:id', requireEmployee, requireRole('Gerente'), async (req, res) => {
  const data: Record<string, unknown> = { ...req.body };

  if (typeof data.role === 'string') {
    data.role = toPrismaRole(data.role);
  }

  if (data.password) {
    data.password = await bcrypt.hash(data.password as string, 10);
  } else {
    delete data.password;
  }

  const employee = await prisma.employee.update({ where: { id: String(req.params.id) }, data: data as never });

  res.json({ ...employee, role: normalizeRole(employee.role as string) });
});

router.delete('/:id', requireEmployee, requireRole('Gerente'), async (req, res) => {
  await prisma.employee.delete({ where: { id: String(req.params.id) } });

  res.status(204).end();
});

router.post('/login', async (req, res) => {
  const digits = String(req.body.cpf ?? '').replace(/\D/g, '');
  const employees = await prisma.employee.findMany();
  const employee = employees.find(e => e.cpf.replace(/\D/g, '') === digits);

  if (!employee || !(await bcrypt.compare(String(req.body.password ?? ''), employee.password))) {
    res.status(401).json({ error: 'CPF ou senha inválidos.' });
    return;
  }

  const token = signEmployeeToken(employee);

  res.cookie('employee_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ ...employee, role: normalizeRole(employee.role as string) });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('employee_token');

  res.json({ ok: true });
});

export default router;