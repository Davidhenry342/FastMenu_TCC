import type { OrderItem } from '../models/order';

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