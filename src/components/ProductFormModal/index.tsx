/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { categories } from '../../data/categories';
import type { Product } from '../../models/product';
import styles from './styles.module.css';

type ProductFormData = Omit<Product, 'id'> & { imageFile?: File | null; removeImage?: boolean };

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialProduct?.imageUrl ?? null,
  );
  const [removeImage, setRemoveImage] = useState(false);
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

  useEffect(() => {
    if (!imageFile) {
      return;
    }

    const url = URL.createObjectURL(imageFile);

    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowed.includes(file.type)) {
      setError('Tipo inválido. Use jpg, jpeg, png ou webp.');

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Imagem deve ter no máximo 5MB.');

      return;
    }

    setImageFile(file);
    setRemoveImage(false);
    setError(null);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
    setRemoveImage(true);
  };

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
      imageUrl: initialProduct?.imageUrl,
      imageFile,
      removeImage,
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
            Imagem do produto (opcional)
          </label>

          <input
            id="product-image"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className={styles.fileInput}
            onChange={handleFileChange}
          />

          {previewUrl && (
            <div className={styles.preview}>
              <img src={previewUrl} alt="Prévia" className={styles.previewImage} />

              <button
                type="button"
                className={styles.removeButton}
                onClick={handleRemoveImage}
              >
                Remover
              </button>
            </div>
          )}
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