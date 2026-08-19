import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { Product } from '../../models/product';
import { FormatCurrency } from '../../utils/format';
import { DefaultProductImage } from '../../utils/imageDefault';
import styles from './styles.module.css';

type ProductModalProps = {
  product: Product;
  onClose: () => void;
  onConfirm: (product: Product, quantity: number, observation: string) => void;
};

export function ProductModal({ product, onClose, onConfirm }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState('');

  const imageUrl = product.imageUrl ?? DefaultProductImage;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const decreaseQuantity = () => {
    setQuantity(current => Math.max(1, current - 1));
  };

  const increaseQuantity = () => {
    setQuantity(current => current + 1);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        onClick={event => event.stopPropagation()}
      >
        <h2 id="product-modal-title">{product.name}</h2>

        <div className={styles.imageContainer}>
          <img src={imageUrl} alt={product.name} className={styles.image} />
        </div>

        <p className={styles.description}>{product.description}</p>

        <div className={styles.details}>
          <span className={styles.price}>{FormatCurrency(product.price)}</span>

          <span className={styles.preparationTime}>
            {product.preparationTime} min
          </span>
        </div>

        <div className={styles.quantitySelector}>
          <button
            type="button"
            className={styles.quantityButton}
            onClick={decreaseQuantity}
            aria-label="Diminuir quantidade"
          >
            <Minus />
          </button>

          <span className={styles.quantity}>{quantity}</span>

          <button
            type="button"
            className={styles.quantityButton}
            onClick={increaseQuantity}
            aria-label="Aumentar quantidade"
          >
            <Plus />
          </button>
        </div>

        <div className={styles.observationField}>
          <label htmlFor="product-modal-observation" className={styles.observationLabel}>
            Observação
          </label>

          <textarea
            id="product-modal-observation"
            className={styles.observationInput}
            value={observation}
            onChange={event => setObservation(event.target.value)}
            rows={3}
            placeholder="Alguma observação sobre o pedido?"
          />
        </div>

        <button
          type="button"
          className={styles.confirmButton}
          onClick={() => onConfirm(product, quantity, observation)}
        >
          Confirmar
        </button>

        <button type="button" className={styles.backButton} onClick={onClose}>
          Voltar
        </button>
      </div>
    </div>
  );
}