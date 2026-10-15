import { categories } from '../data/categories';
import type { OrderItem } from '../models/order';

const bebidaCategoryIds = new Set(
  categories.filter(c => c.name.trim().toLowerCase() === 'bebidas').map(c => c.id),
);

function isBebidas(categoryId: string, categoryName?: string): boolean {
  if (categoryName?.trim().toLowerCase() === 'bebidas') {
    return true;
  }

  if (bebidaCategoryIds.has(categoryId)) {
    return true;
  }

  return categories.find(c => c.id === categoryId)?.name.trim().toLowerCase() === 'bebidas';
}

export function averageWaitByCategory(
  orderItems: OrderItem[],
): Map<string, number> {
  const sums = new Map<string, number>();
  const counts = new Map<string, number>();

  for (const item of orderItems) {
    if (item.status !== 'Em produção') {
      continue;
    }

    const categoryId = item.product.categoryId;
    const categoryName = (item.product as { category?: { name?: string } }).category?.name;

    // Bebidas têm tempo fixo (preparationTime do produto): não entram na média da fila.
    if (isBebidas(categoryId, categoryName)) {
      continue;
    }
    const weightedTime = item.product.preparationTime * item.quantity;

    sums.set(categoryId, (sums.get(categoryId) ?? 0) + weightedTime);
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + item.quantity);
  }

  const averages = new Map<string, number>();

  for (const [categoryId, sum] of sums) {
    const count = counts.get(categoryId) ?? 1;

    averages.set(categoryId, Math.round(sum / count));
  }

  return averages;
}