import { Pencil, Trash2 } from 'lucide-react';
import type { Product } from '../../models/product';
import { FormatCurrency } from '../../utils/format';
import { DefaultProductImage } from '../../utils/imageDefault';
import styles from './styles.module.css';

type AdminProductCardProps = {
  product: Product;
  categoryName?: string;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export function AdminProductCard({
  product,
  categoryName,
  onEdit,
  onDelete,
}: AdminProductCardProps) {
  const imageUrl = product.imageUrl ?? DefaultProductImage;

  return (
    <article className={styles.card}>
      <div className={styles.imageContainer}>
        {categoryName && (
          <span className={styles.categoryBadge}>{categoryName}</span>
        )}

        <img src={imageUrl} alt={product.name} className={styles.image} />

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.actionButton}
            aria-label={`Editar ${product.name}`}
            onClick={() => onEdit(product)}
          >
            <Pencil />
          </button>

          <button
            type="button"
            className={`${styles.actionButton} ${styles.deleteActionButton}`}
            aria-label={`Excluir ${product.name}`}
            onClick={() => onDelete(product)}
          >
            <Trash2 />
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <h3 className={styles.name}>{product.name}</h3>

        <p className={styles.description}>{product.description}</p>

        <div className={styles.details}>
          <span className={styles.price}>
            {FormatCurrency(product.price)}
          </span>

          <span className={styles.preparationTime}>
            {product.preparationTime} min
          </span>
        </div>
      </div>
    </article>
  );
}