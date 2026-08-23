import { useEffect, useState } from 'react';
import { CheckCircle, Minus, Plus, X } from 'lucide-react';
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
  const { orderItems, updateOrderItem } = useOrder();

  // itemId -> quantidade que o usuário quer pagar deste item
  const [selections, setSelections] = useState<Record<string, number>>({});

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getRemaining = (item: OrderItem) =>
    item.quantity - (item.paidQuantity ?? 0);

  const total = orderItems.reduce(
    (sum, item) => sum + item.product.price * getRemaining(item),
    0,
  );

  const selectedSubtotal = orderItems.reduce((sum, item) => {
    const qty = selections[item.id];

    return qty ? sum + item.product.price * qty : sum;
  }, 0);

  const hasSelection = Object.keys(selections).length > 0;

  const toggleSelection = (id: string) => {
    setSelections(current => {
      const next = { ...current };

      if (next[id]) {
        delete next[id];
      } else {
        next[id] = 1;
      }

      return next;
    });
  };

  const changeSelectionQuantity = (id: string, delta: number, max: number) => {
    setSelections(current => ({
      ...current,
      [id]: Math.min(max, Math.max(1, (current[id] ?? 1) + delta)),
    }));
  };

  const handlePay = () => {
    Object.entries(selections).forEach(([id, qty]) => {
      const item = orderItems.find(orderItem => orderItem.id === id);

      if (!item) {
        return;
      }

      updateOrderItem(id, {
        paidQuantity: (item.paidQuantity ?? 0) + qty,
      });
    });

    setSelections({});
  };

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
              const paid = item.paidQuantity ?? 0;
              const remaining = getRemaining(item);
              const isPaid = remaining === 0;
              const isSelected = Boolean(selections[item.id]);

              return (
                <li
                  key={item.id}
                  className={`${styles.item} ${isPaid ? styles.itemPaid : ''} ${
                    isSelected ? styles.itemSelected : ''
                  }`}
                  onClick={isPaid ? undefined : () => toggleSelection(item.id)}
                >
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

                      {paid > 0 && !isPaid && (
                        <span className={styles.partiallyPaid}>
                          Pago {paid}/{item.quantity}
                        </span>
                      )}

                      {isPaid && (
                        <span className={styles.paidBadge}>
                          <CheckCircle />
                          Pago {paid}/{item.quantity}
                        </span>
                      )}
                    </div>

                    {observation && (
                      <p className={styles.observation}>
                        Observação: {observation}
                      </p>
                    )}

                    {!isPaid && isSelected && (
                      <div
                        className={styles.qtySelector}
                        onClick={event => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          className={styles.qtyButton}
                          aria-label="Diminuir quantidade a pagar"
                          onClick={() =>
                            changeSelectionQuantity(
                              item.id,
                              -1,
                              remaining,
                            )
                          }
                        >
                          <Minus />
                        </button>

                        <span className={styles.qtyValue}>
                          {selections[item.id]}
                        </span>

                        <button
                          type="button"
                          className={styles.qtyButton}
                          aria-label="Aumentar quantidade a pagar"
                          onClick={() =>
                            changeSelectionQuantity(item.id, 1, remaining)
                          }
                        >
                          <Plus />
                        </button>
                      </div>
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
            <span className={styles.totalLabel}>Total da comanda</span>

            <span className={styles.totalValue}>{FormatCurrency(total)}</span>
          </div>

          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>
              Selecionado para pagamento
            </span>

            <span className={styles.selectedValue}>
              {FormatCurrency(selectedSubtotal)}
            </span>
          </div>

          <button
            type="button"
            className={styles.payButton}
            onClick={handlePay}
            disabled={!hasSelection}
          >
            Pagar
          </button>

          <button type="button" className={styles.backButton} onClick={onClose}>
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}