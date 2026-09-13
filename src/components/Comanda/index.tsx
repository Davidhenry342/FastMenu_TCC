import { useEffect, useState } from 'react';
import { CheckCircle, Minus, Plus, Trash2, X } from 'lucide-react';
import { useComandas } from '../../contexts/ComandaContext';
import { useCustomers } from '../../contexts/CustomerContext';
import { useOrder } from '../../contexts/OrderContext';
import { useTables } from '../../contexts/TableContext';
import type { OrderItem, OrderStatus } from '../../models/order';
import { FormatCurrency, FormatTime } from '../../utils/format';
import { DefaultProductImage } from '../../utils/imageDefault';
import styles from './styles.module.css';

type ComandaProps = {
  onClose: () => void;
  tableNumber?: number;
  canDelete?: boolean;
};

const statusClass: Record<OrderStatus, string> = {
  'Em produção': styles.statusEmProducao,
  'Aguardando confirmação': styles.statusAguardando,
  Cancelado: styles.statusCancelado,
  Entregue: styles.statusEntregue,
};

export function Comanda({
  onClose,
  tableNumber: filterTableNumber,
  canDelete = false,
}: ComandaProps) {
  const { orderItems, updateOrderItem, deleteOrderItem } = useOrder();
  const { customers } = useCustomers();
  const { tables, updateTable } = useTables();
  const { getOpenComandaByTable, closeComanda, removeOrderFromComandas } =
    useComandas();

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

  const isCancelled = (item: OrderItem) => item.status === 'Cancelado';
  const isAwaiting = (item: OrderItem) =>
    item.status === 'Aguardando confirmação';

  const getCustomerName = (customerId?: string) => {
    if (!customerId) {
      return 'Cliente não identificado';
    }

    return (
      customers.find(customer => customer.id === customerId)?.name ??
      'Cliente não identificado'
    );
  };

  const displayedItems =
    filterTableNumber !== undefined
      ? orderItems.filter(item => item.tableNumber === filterTableNumber)
      : orderItems;

  const total = displayedItems.reduce((sum, item) => {
    if (isCancelled(item) || isAwaiting(item)) {
      return sum;
    }

    return sum + item.product.price * getRemaining(item);
  }, 0);

  const selectedSubtotal = displayedItems.reduce((sum, item) => {
    const qty = selections[item.id];

    if (!qty || isCancelled(item) || isAwaiting(item)) {
      return sum;
    }

    return sum + item.product.price * qty;
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
    const updatedItems = new Map<string, OrderItem>();

    Object.entries(selections).forEach(([id, qty]) => {
      const item = orderItems.find(orderItem => orderItem.id === id);

      if (!item || isCancelled(item) || isAwaiting(item)) {
        return;
      }

      if (
        filterTableNumber !== undefined &&
        item.tableNumber !== filterTableNumber
      ) {
        return;
      }

      const nextPaid = (item.paidQuantity ?? 0) + qty;

      updateOrderItem(id, { paidQuantity: nextPaid });
      updatedItems.set(id, { ...item, paidQuantity: nextPaid });
    });

    setSelections({});

    // Se todos os itens pagáveis da mesa foram pagos, fecha a comanda e libera a mesa
    const targetTableNumber = filterTableNumber ?? 1;
    const openComanda = getOpenComandaByTable(targetTableNumber);

    if (!openComanda) {
      return;
    }

    const remainingForTable = orderItems.reduce((sum, item) => {
      if (item.tableNumber !== targetTableNumber) {
        return sum;
      }

      if (isCancelled(item) || isAwaiting(item)) {
        return sum;
      }

      const paid = updatedItems.has(item.id)
        ? (updatedItems.get(item.id)?.paidQuantity ?? 0)
        : (item.paidQuantity ?? 0);

      return sum + (item.quantity - paid);
    }, 0);

    if (remainingForTable === 0) {
      closeComanda(openComanda.id);

      const table = tables.find(entry => entry.number === targetTableNumber);

      if (table) {
        updateTable(table.id, { status: 'Disponível' });
      }
    }
  };

  const handleDeleteOrder = (id: string) => {
    deleteOrderItem(id);
    removeOrderFromComandas(id);
    setSelections(current => {
      const next = { ...current };

      delete next[id];

      return next;
    });
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
          <h2 id="comanda-title">
            Comanda{filterTableNumber ? ` - Mesa ${filterTableNumber}` : ''}
          </h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Fechar comanda"
          >
            <X />
          </button>
        </div>

        {displayedItems.length === 0 ? (
          <p className={styles.emptyState}>Nenhum item adicionado ainda.</p>
        ) : (
          <ul className={styles.itemList}>
            {displayedItems.map(item => {
              const observation = formatObservation(item);
              const paid = item.paidQuantity ?? 0;
              const remaining = getRemaining(item);
              const isPaid = remaining === 0;
              const cancelled = isCancelled(item);
              const awaiting = isAwaiting(item);
              const isLocked = isPaid || cancelled || awaiting;
              const isSelected = Boolean(selections[item.id]);

              return (
                <li
                  key={item.id}
                  className={`${styles.item} ${isPaid ? styles.itemPaid : ''} ${
                    cancelled ? styles.itemCancelled : ''
                  } ${awaiting ? styles.itemAwaiting : ''} ${
                    isSelected && !isLocked ? styles.itemSelected : ''
                  }`}
                  onClick={isLocked ? undefined : () => toggleSelection(item.id)}
                >
                  <img
                    src={item.product.imageUrl ?? DefaultProductImage}
                    alt={item.product.name}
                    className={styles.thumbnail}
                  />

                  <div className={styles.itemInfo}>
                    <span className={styles.customerName}>
                      Pedido por: {getCustomerName(item.customerId)}
                    </span>

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

                    {!isLocked && isSelected && (
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

                    {canDelete && (
                      <button
                        type="button"
                        className={styles.deleteOrderButton}
                        aria-label={`Excluir pedido ${item.product.name}`}
                        onClick={event => {
                          event.stopPropagation();
                          handleDeleteOrder(item.id);
                        }}
                      >
                        <Trash2 />
                      </button>
                    )}
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