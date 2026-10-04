/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { prisma } from '../lib/prisma';
import { requireEmployee, requireRole } from '../middleware/auth';

const router = Router();

const uploadsDir = path.join(__dirname, '../../uploads/products');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo inválido. Use jpg, jpeg, png ou webp.'));
    }
  },
});

router.get('/', async (_req, res) => {
  const products = await prisma.product.findMany({ include: { category: true } });

  res.json(products);
});

router.post('/', requireEmployee, requireRole('Gerente'), upload.single('image'), async (req, res) => {
  const body = req.body as Record<string, string>;
  const file = (req as any).file as Express.Multer.File | undefined;

  const imageUrl = file ? `/uploads/products/${file.filename}` : undefined;

  const data: any = {
    name: body.name,
    description: body.description,
    price: body.price,
    preparationTime: body.preparationTime ? Number(body.preparationTime) : undefined,
    categoryId: body.categoryId,
    imageUrl,
  };

  if (data.price !== undefined) {
    data.price = String(data.price);
  }

  const product = await prisma.product.create({ data });

  res.status(201).json(product);
});

router.put('/:id', requireEmployee, requireRole('Gerente'), upload.single('image'), async (req, res) => {
  const body = req.body as Record<string, string>;
  const file = (req as any).file as Express.Multer.File | undefined;

  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });

  if (!existing) {
    res.status(404).json({ error: 'Produto não encontrado' });
    return;
  }

  let imageUrl: string | null | undefined = undefined;

  if (file) {
    imageUrl = `/uploads/products/${file.filename}`;

    if (existing.imageUrl && existing.imageUrl.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '../../', existing.imageUrl);

      fs.unlink(oldPath, () => {});
    }
  } else if (body.imageUrl === '' || body.removeImage === 'true') {
    imageUrl = null;

    if (existing.imageUrl && existing.imageUrl.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '../../', existing.imageUrl);

      fs.unlink(oldPath, () => {});
    }
  }

  const data: any = {
    name: body.name,
    description: body.description,
    price: body.price,
    preparationTime: body.preparationTime ? Number(body.preparationTime) : undefined,
    categoryId: body.categoryId,
  };

  if (imageUrl !== undefined) {
    data.imageUrl = imageUrl;
  }

  if (data.price !== undefined) {
    data.price = String(data.price);
  }

  // Remove undefined fields
  Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data,
  });

  res.json(product);
});

router.delete('/:id', requireEmployee, requireRole('Gerente'), async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });

  if (existing?.imageUrl && existing.imageUrl.startsWith('/uploads/')) {
    const oldPath = path.join(__dirname, '../../', existing.imageUrl);

    fs.unlink(oldPath, () => {});
  }

  await prisma.product.delete({ where: { id: req.params.id } });

  res.status(204).end();
});

export default router;