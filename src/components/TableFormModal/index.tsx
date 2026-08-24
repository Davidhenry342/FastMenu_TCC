import { useEffect, useState } from 'react';
import styles from './styles.module.css';

type TableFormModalProps = {
  title: string;
  initialNumber?: number;
  takenNumbers: number[];
  onSubmit: (number: number) => void;
  onClose: () => void;
};

export function TableFormModal({
  title,
  initialNumber,
  takenNumbers,
  onSubmit,
  onClose,
}: TableFormModalProps) {
  const [numberInput, setNumberInput] = useState(initialNumber?.toString() ?? '');
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
    const parsed = Number(numberInput);

    if (!numberInput.trim()) {
      setError('Informe o número da mesa.');

      return;
    }

    if (!Number.isInteger(parsed) || parsed <= 0) {
      setError('Informe um número inteiro maior que zero.');

      return;
    }

    if (takenNumbers.includes(parsed)) {
      setError('Já existe uma mesa com esse número.');

      return;
    }

    onSubmit(parsed);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="table-form-title"
        onClick={event => event.stopPropagation()}
      >
        <h2 id="table-form-title">{title}</h2>

        <label htmlFor="table-number" className={styles.label}>
          Número da mesa
        </label>

        <input
          id="table-number"
          type="number"
          min={1}
          className={styles.input}
          value={numberInput}
          onChange={event => {
            setNumberInput(event.target.value);
            setError(null);
          }}
          placeholder="Ex.: 9"
        />

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