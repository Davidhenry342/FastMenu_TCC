import type { Product } from '../models/product';

export const products: Product[] = [
  {
    id: '1',
    name: 'Hambúrgher Artesanal',
    description:
      'Pão Brioche, Hambúrguer artesanal bovino, queijo, alface e molho especial.',
    price: 32.9,
    preparationTime: 20,
    categoryId: '1',
    imageUrl: 'https://placehold.co/50X50',
  },
  {
    id: '2',
    name: 'Filé com Fritas',
    description: 'Filé gralhado acompanhado de batatas fritas crocantes.',
    price: 42.9,
    categoryId: '1',
    preparationTime: 25,
  },

  {
    id: '3',
    name: 'Risoto de Camarão',
    description: 'Risoto cremoso preparado com camarões e temperos especiais.',
    price: 49.9,
    categoryId: '1',
    preparationTime: 30,
  },

  {
    id: '4',
    name: 'Risoto de Camarão',
    description: 'Risoto cremoso preparado com camarões e temperos especiais.',
    price: 49.9,
    categoryId: '1',
    preparationTime: 30,
  },

  {
    id: '5',
    name: 'Risoto de Camarão',
    description: 'Risoto cremoso preparado com camarões e temperos especiais.',
    price: 49.9,
    categoryId: '1',
    preparationTime: 30,
  },
];
