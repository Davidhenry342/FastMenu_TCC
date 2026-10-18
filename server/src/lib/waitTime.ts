export type WaitRow = {
  status: string;
  categoryId: string;
  categoryName?: string;
  preparationTime: number;
  quantity: number;
};

function isBebidas(categoryName?: string): boolean {
  return categoryName?.trim().toLowerCase() === 'bebidas';
}

export function averageWaitByCategory(rows: WaitRow[]): Record<string, number> {
  const sums = new Map<string, number>();
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (row.status !== 'Em produção' && row.status !== 'Em_produção') {
      continue;
    }

    // Bebidas têm tempo fixo (preparationTime do produto): não entram na média da fila.
    if (isBebidas(row.categoryName)) {
      continue;
    }

    const weightedTime = row.preparationTime * row.quantity;

    sums.set(row.categoryId, (sums.get(row.categoryId) ?? 0) + weightedTime);
    counts.set(row.categoryId, (counts.get(row.categoryId) ?? 0) + row.quantity);
  }

  const averages: Record<string, number> = {};

  for (const [categoryId, sum] of sums) {
    averages[categoryId] = Math.round(sum / (counts.get(categoryId) ?? 1));
  }

  return averages;
}
