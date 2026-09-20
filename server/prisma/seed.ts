import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Categories
  const categories = await Promise.all(
    [
      { id: '1', name: 'Entradas' },
      { id: '2', name: 'Pratos Principais' },
      { id: '3', name: 'Bebidas' },
      { id: '4', name: 'Sobremesas' },
    ].map(c => prisma.category.upsert({
      where: { id: c.id },
      update: { name: c.name },
      create: c,
    })),
  );

  const categoryMap = new Map(categories.map(c => [c.name, c.id]));

  // Tables
  for (const t of [
    { id: '1', number: 1, status: 'Disponível' as const },
    { id: '2', number: 2, status: 'Ocupada' as const },
    { id: '3', number: 3, status: 'Disponível' as const },
    { id: '4', number: 4, status: 'Disponível' as const },
    { id: '5', number: 5, status: 'Ocupada' as const },
    { id: '6', number: 6, status: 'Disponível' as const },
    { id: '7', number: 7, status: 'Disponível' as const },
    { id: '8', number: 8, status: 'Ocupada' as const },
  ]) {
    await prisma.restaurantTable.upsert({
      where: { id: t.id },
      update: { number: t.number, status: t.status },
      create: t,
    });
  }

  // Customers
  for (const c of [
    { id: 'c1', phone: '(11) 98888-1111', name: 'Ana Souza', email: 'ana.souza@email.com' },
    { id: 'c2', phone: '(21) 97777-2222', name: 'Bruno Lima', email: 'bruno.lima@email.com' },
    { id: 'c3', phone: '(31) 96666-3333', name: 'Carla Mendes', email: 'carla.mendes@email.com' },
  ]) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }

  // Employees (senha 123456 hasheada)
  const hashed = await bcrypt.hash('123456', 10);

  for (const e of [
    { id: '1', cpf: '123.456.789-00', name: 'Ana Souza', phone: '(11) 98888-1111', address: 'Rua das Flores, 123 - São Paulo/SP', role: 'Garçom' as const, email: 'ana.souza@fastmenu.com', password: hashed },
    { id: '2', cpf: '234.567.890-11', name: 'Bruno Lima', phone: '(11) 97777-2222', address: 'Av. Paulista, 1000 - São Paulo/SP', role: 'Cozinheiro_a' as const, email: 'bruno.lima@fastmenu.com', password: hashed },
    { id: '3', cpf: '345.678.901-22', name: 'Carla Mendes', phone: '(21) 96666-3333', address: 'Rua do Comércio, 45 - Rio de Janeiro/RJ', role: 'Caixa' as const, email: 'carla.mendes@fastmenu.com', password: hashed },
    { id: '4', cpf: '456.789.012-33', name: 'Diego Ferreira', phone: '(31) 95555-4444', address: 'Rua da Alegria, 789 - Belo Horizonte/MG', role: 'Gerente' as const, email: 'diego.ferreira@fastmenu.com', password: hashed },
    { id: '5', cpf: '567.890.123-44', name: 'Elisa Costa', phone: '(41) 94444-5555', address: 'Travessa Verde, 12 - Curitiba/PR', role: 'Garçom' as const, email: 'elisa.costa@fastmenu.com', password: hashed },
  ]) {
    // Prisma enum Cozinheiro_a mapeia para "Cozinheiro(a)" via @map
    await prisma.employee.upsert({
      where: { id: e.id },
      update: { cpf: e.cpf, name: e.name, phone: e.phone, address: e.address, role: e.role as unknown as never, email: e.email, password: e.password },
      create: { cpf: e.cpf, name: e.name, phone: e.phone, address: e.address, role: e.role as unknown as never, email: e.email, password: e.password, id: e.id },
    });
  }

  // Products
  for (const p of [
    { id: '1', name: 'Hambúrgher Artesanal', description: 'Pão Brioche, Hambúrguer artesanal bovino, queijo, alface e molho especial.', price: 32.9, preparationTime: 20, categoryId: categoryMap.get('Entradas')!, imageUrl: 'https://placehold.co/100X100' },
    { id: '2', name: 'Filé com Fritas', description: 'Filé gralhado acompanhado de batatas fritas crocantes.', price: 42.9, preparationTime: 25, categoryId: categoryMap.get('Entradas')!, imageUrl: null },
    { id: '3', name: 'Risoto de Camarão', description: 'Risoto cremoso preparado com camarões e temperos especiais.', price: 49.9, preparationTime: 30, categoryId: categoryMap.get('Pratos Principais')!, imageUrl: null },
    { id: '4', name: 'Risoto de Camarão', description: 'Risoto cremoso preparado com camarões e temperos especiais.', price: 49.9, preparationTime: 30, categoryId: categoryMap.get('Entradas')!, imageUrl: null },
    { id: '5', name: 'Risoto de Camarão', description: 'Risoto cremoso preparado com camarões e temperos especiais.', price: 49.9, preparationTime: 30, categoryId: categoryMap.get('Entradas')!, imageUrl: null },
  ]) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
  }

  console.log('Seed completed');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });