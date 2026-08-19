import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useOrder } from '../../contexts/OrderContext';
import type { OrderItem, OrderStatus } from '../../models/order';
import { FormatCurrency, FormatTime } from '../../utils/format';
import { DefaultProductImage } from '../../utils/imageDefault';
import styles from './styles.module.css';

type ComandaProps = {
  onClose: () => void;
};

const statusClass: Record<OrderStatus, string> = {
  'Em produção': styles.statusEmProducao,
  'Aguardando confirmação': styles.statusAguardando,
  Cancelado: styles.statusCancelado,
  Entregue: styles.statusEntregue,
};

export function Comanda({ onClose }: ComandaProps) {
  const { orderItems } = useOrder();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const total = orderItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  const formatObservation = (item: OrderItem) => item.observation?.trim();

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="comanda-title"
        onClick={event => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="comanda-title">Comanda</h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Fechar comanda"
          >
            <X />
          </button>
        </div>

        {orderItems.length === 0 ? (
          <p className={styles.emptyState}>Nenhum item adicionado ainda.</p>
        ) : (
          <ul className={styles.itemList}>
            {orderItems.map(item => {
              const observation = formatObservation(item);

              return (
                <li key={item.id} className={styles.item}>
                  <img
                    src={item.product.imageUrl ?? DefaultProductImage}
                    alt={item.product.name}
                    className={styles.thumbnail}
                  />

                  <div className={styles.itemInfo}>
                    <div className={styles.itemHeader}>
                      <span className={styles.itemName}>
                        {item.product.name}
                      </span>

                      <span className={styles.itemQuantity}>
                        × {item.quantity}
                      </span>
                    </div>

                    <div className={styles.itemMeta}>
                      <span>{FormatTime(item.orderedAt)}</span>

                      <span
                        className={`${styles.statusBadge} ${
                          statusClass[item.status]
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {observation && (
                      <p className={styles.observation}>
                        Observação: {observation}
                      </p>
                    )}

                    <span className={styles.itemSubtotal}>
                      {FormatCurrency(item.product.price * item.quantity)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className={styles.footer}>
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Total</span>

            <span className={styles.totalValue}>{FormatCurrency(total)}</span>
          </div>

          <button type="button" className={styles.backButton} onClick={onClose}>
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}