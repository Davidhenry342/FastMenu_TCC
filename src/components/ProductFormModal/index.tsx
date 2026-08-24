import { useEffect, useState } from 'react';
import { categories } from '../../data/categories';
import type { Product } from '../../models/product';
import styles from './styles.module.css';

type ProductFormData = Omit<Product, 'id'>;

type ProductFormModalProps = {
  title: string;
  initialProduct?: Product;
  onSubmit: (product: ProductFormData) => void;
  onClose: () => void;
};

export function ProductFormModal({
  title,
  initialProduct,
  onSubmit,
  onClose,
}: ProductFormModalProps) {
  const [name, setName] = useState(initialProduct?.name ?? '');
  const [description, setDescription] = useState(
    initialProduct?.description ?? '',
  );
  const [categoryId, setCategoryId] = useState(
    initialProduct?.categoryId ?? '',
  );
  const [price, setPrice] = useState(initialProduct?.price?.toString() ?? '');
  const [preparationTime, setPreparationTime] = useState(
    initialProduct?.preparationTime?.toString() ?? '',
  );
  const [imageUrl, setImageUrl] = useState(initialProduct?.imageUrl ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = () => {
    const parsedPrice = Number(price.replace(',', '.'));
    const parsedTime = Number(preparationTime);

    if (!name.trim() || !description.trim() || !categoryId) {
      setError('Preencha todos os campos obrigatórios.');

      return;
    }

    if (!price.trim() || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setError('Informe um preço maior que zero.');

      return;
    }

    if (
      !preparationTime.trim() ||
      !Number.isInteger(parsedTime) ||
      parsedTime < 1
    ) {
      setError('Informe um tempo de preparo inteiro de pelo menos 1 minuto.');

      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      categoryId,
      price: parsedPrice,
      preparationTime: parsedTime,
      imageUrl: imageUrl.trim() || undefined,
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        onClick={event => event.stopPropagation()}
      >
        <h2 id="product-form-title">{title}</h2>

        <div className={styles.field}>
          <label htmlFor="product-name" className={styles.label}>
            Nome do produto
          </label>

          <input
            id="product-name"
            type="text"
            className={styles.input}
            value={name}
            onChange={event => {
              setName(event.target.value);
              setError(null);
            }}
            placeholder="Ex.: Hambúrguer Artesanal"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="product-description" className={styles.label}>
            Descrição
          </label>

          <textarea
            id="product-description"
            rows={3}
            className={styles.textarea}
            value={description}
            onChange={event => {
              setDescription(event.target.value);
              setError(null);
            }}
            placeholder="Ingredientes e detalhes do prato"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="product-category" className={styles.label}>
            Categoria
          </label>

          <select
            id="product-category"
            className={styles.select}
            value={categoryId}
            onChange={event => {
              setCategoryId(event.target.value);
              setError(null);
            }}
          >
            <option value="" disabled>
              Selecione a categoria
            </option>

            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="product-price" className={styles.label}>
              Preço (R$)
            </label>

            <input
              id="product-price"
              type="text"
              inputMode="decimal"
              className={styles.input}
              value={price}
              onChange={event => {
                setPrice(event.target.value);
                setError(null);
              }}
              placeholder="32,90"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="product-time" className={styles.label}>
              Tempo de preparo (min)
            </label>

            <input
              id="product-time"
              type="number"
              min={1}
              className={styles.input}
              value={preparationTime}
              onChange={event => {
                setPreparationTime(event.target.value);
                setError(null);
              }}
              placeholder="20"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="product-image" className={styles.label}>
            URL da imagem (opcional)
          </label>

          <input
            id="product-image"
            type="text"
            className={styles.input}
            value={imageUrl}
            onChange={event => setImageUrl(event.target.value)}
            placeholder="https://..."
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          type="button"
          className={styles.confirmButton}
          onClick={handleSubmit}
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