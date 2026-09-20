import bcrypt from 'bcrypt';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? 'fastmenu-tcc-jwt-secret-change-in-production';

function signEmployeeToken(employeeId: string) {
  return jwt.sign({ sub: employeeId, role: 'employee' }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

router.get('/', async (_req, res) => {
  const employees = await prisma.employee.findMany();

  res.json(employees);
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

    res.json(employee);
  } catch {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

router.post('/', async (req, res) => {
  const data = { ...req.body, password: await bcrypt.hash(req.body.password, 10) };
  const employee = await prisma.employee.create({ data });

  res.status(201).json(employee);
});

router.put('/:id', async (req, res) => {
  const data: Record<string, unknown> = { ...req.body };

  if (data.password) {
    data.password = await bcrypt.hash(data.password as string, 10);
  } else {
    delete data.password;
  }

  const employee = await prisma.employee.update({ where: { id: req.params.id }, data });

  res.json(employee);
});

router.delete('/:id', async (req, res) => {
  await prisma.employee.delete({ where: { id: req.params.id } });

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

  const token = signEmployeeToken(employee.id);

  res.cookie('employee_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json(employee);
});

router.post('/logout', (_req, res) => {
  res.clearCookie('employee_token');

  res.json({ ok: true });
});

export default router;