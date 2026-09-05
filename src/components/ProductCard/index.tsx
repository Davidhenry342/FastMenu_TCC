import type { Product } from '../../models/product';
import { FormatCurrency } from '../../utils/format';
import { DefaultProductImage } from '../../utils/imageDefault';
import styles from './styles.module.css';

type ProductCardProps = {
  product: Product;
  categoryName?: string;
  estimatedWaitTime?: number;
  onAdd?: (product: Product) => void;
};

export function ProductCard({
  product,
  categoryName,
  estimatedWaitTime,
  onAdd,
}: ProductCardProps) {
  const imageUrl = product.imageUrl ?? DefaultProductImage;

  return (
    <article className={styles.card}>
      <div className={styles.imageContainer}>
        {categoryName && (
          <span className={styles.categoryBadge}>{categoryName}</span>
        )}

        <img src={imageUrl} alt={product.name} className={styles.image} />
      </div>

      <div className={styles.content}>
        <div className={styles.info}>
          <h3>{product.name}</h3>

          <p>{product.description}</p>
        </div>

        <div className={styles.details}>
          <span className={styles.price}>{FormatCurrency(product.price)}</span>

          <span
            className={styles.preparationTime}
            title="Tempo médio da fila"
          >
            {(estimatedWaitTime ?? product.preparationTime)} min
          </span>
        </div>

        <button
          type="button"
          className={styles.addButton}
          onClick={() => onAdd?.(product)}
        >
          Adicionar
        </button>
      </div>
    </article>
  );
}
