import type { Product } from '../../models/product';
import styles from './styles.module.css';

type PorductCardProps = {
  product: Product;
  onAdd?: (product: Product) => void;
};

export function ProdutcCard({ product, onAdd }: PorductCardProps) {
  return (
    <article className={styles.card}>
      {product.imageUrl && (
        <div className={styles.imageContainer}>
          <img
            src={product.imageUrl}
            alt={product.name}
            className={styles.image}
          />
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.info}>
          <h3>{product.name}</h3>

          <p>{product.description}</p>
        </div>

        <div className={styles.details}>
          <span className={styles.price}>
            R$ {product.price.toFixed(2).replace('.', ',')}
          </span>

          <span className={styles.preparationTime}>
            {product.preparationTime} min
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
