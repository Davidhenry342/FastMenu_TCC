import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from './lib/prisma';
import categoriesRouter from './routes/categories';
import comandasRouter from './routes/comandas';
import customersRouter from './routes/customers';
import employeesRouter from './routes/employees';
import ordersRouter from './routes/orders';
import paymentsRouter from './routes/payments';
import productsRouter from './routes/products';
import tablesRouter from './routes/tables';

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/tables', tablesRouter);
app.use('/api/customers', customersRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/comandas', comandasRouter);
app.use('/api/payments', paymentsRouter);

const distDir = path.join(__dirname, '../../dist');
const indexHtml = path.join(distDir, 'index.html');

if (fs.existsSync(indexHtml)) {
  app.use(express.static(distDir));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      next();
      return;
    }

    res.sendFile(indexHtml);
  });
} else {
  console.warn(`[static] SPA não encontrado em ${indexHtml}; servindo apenas a API.`);
}

app.listen(PORT, () => {
  console.log(`FastMenu server running on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});