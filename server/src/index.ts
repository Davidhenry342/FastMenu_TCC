import cors from 'cors';
import express from 'express';
import { prisma } from './lib/prisma';
import categoriesRouter from './routes/categories';
import comandasRouter from './routes/comandas';
import customersRouter from './routes/customers';
import employeesRouter from './routes/employees';
import ordersRouter from './routes/orders';
import productsRouter from './routes/products';
import tablesRouter from './routes/tables';

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`FastMenu server running on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});