import bcrypt from 'bcrypt';
import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const employees = await prisma.employee.findMany();

  res.json(employees);
});

router.post('/', async (req, res) => {
  const data = { ...req.body, password: await bcrypt.hash(req.body.password, 10) };
  const employee = await prisma.employee.create({ data });

  res.status(201).json(employee);
});

router.put('/:id', async (req, res) => {
  const data: Record<string, unknown> = { ...req.body };

  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
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

  res.json(employee);
});

export default router;