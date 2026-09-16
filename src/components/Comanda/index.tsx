import { useEffect, useState } from 'react';
import { CheckCircle, Minus, Plus, Trash2, X } from 'lucide-react';
import { useComandas } from '../../contexts/ComandaContext';
import { useCustomers } from '../../contexts/CustomerContext';
import { useOrder } from '../../contexts/OrderContext';
import { useTables } from '../../contexts/TableContext';
import type { OrderItem, OrderStatus } from '../../models/order';
import {
  FormatCurrency,
  FormatCurrencyInput,
  FormatTime,
  ParseCurrency,
} from '../../utils/format';
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

type PaymentMode = 'quantity' | 'value';

export function Comanda({
  onClose,
  tableNumber: filterTableNumber,
  canDelete = false,
}: ComandaProps) {
  const { orderItems, updateOrderItem, deleteOrderItem } = useOrder();
  const { customers } = useCustomers();
  const { tables, updateTable } = useTables();
  const {
    comandas,
    getOpenComandaByTable,
    closeComanda,
    removeOrderFromComandas,
  } = useComandas();

  const [selections, setSelections] = useState<Record<string, number>>({});
  const [valueSelections, setValueSelections] = useState<Record<string, string>>({});
  const [itemModes, setItemModes] = useState<Record<string, PaymentMode>>({});

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getPaidAmount = (item: OrderItem) =>
    item.paidAmount ?? (item.paidQuantity ?? 0) * item.product.price;

  const getTotalPrice = (item: OrderItem) => item.product.price * item.quantity;

  const getRemainingAmount = (item: OrderItem) =>
    Math.max(0, getTotalPrice(item) - getPaidAmount(item));

  const getRemainingQuantity = (item: OrderItem) => {
    const remaining = getRemainingAmount(item);

    if (remaining <= 0.009) {
      return 0;
    }

    return Math.ceil(remaining / item.product.price - 1e-9);
  };

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

  const displayedItems = (() => {
    if (filterTableNumber !== undefined) {
      const open = getOpenComandaByTable(filterTableNumber);

      if (!open) {
        return [];
      }

      return orderItems.filter(item => open.orderItemIds.includes(item.id));
    }

    const openIds = new Set(
      comandas.filter(c => c.status === 'Aberta').flatMap(c => c.orderItemIds),
    );

    return orderItems.filter(item => openIds.has(item.id));
  })();

  const total = displayedItems.reduce((sum, item) => {
    if (isCancelled(item) || isAwaiting(item)) {
      return sum;
    }

    return sum + getRemainingAmount(item);
  }, 0);

  const selectedSubtotal = displayedItems.reduce((sum, item) => {
    if (isCancelled(item) || isAwaiting(item)) {
      return sum;
    }

    const mode = itemModes[item.id] ?? 'quantity';

    if (mode === 'quantity') {
      const qty = selections[item.id];

      if (!qty) {
        return sum;
      }

      return sum + Math.min(item.product.price * qty, getRemainingAmount(item));
    }

    const raw = valueSelections[item.id];

    if (!raw) {
      return sum;
    }

    const parsed = ParseCurrency(raw);

    if (parsed <= 0) {
      return sum;
    }

    return sum + Math.min(parsed, getRemainingAmount(item));
  }, 0);

  const hasSelection = displayedItems.some(item => {
    if (isCancelled(item) || isAwaiting(item)) {
      return false;
    }

    const mode = itemModes[item.id] ?? 'quantity';

    if (mode === 'quantity') {
      return Boolean(selections[item.id]);
    }

    return ParseCurrency(valueSelections[item.id] ?? '') > 0;
  });

  const toggleSelection = (id: string) => {
    const isSelected =
      selections[id] !== undefined || valueSelections[id] !== undefined;

    if (isSelected) {
      setSelections(current => {
        const next = { ...current };

        delete next[id];

        return next;
      });
      setValueSelections(current => {
        const next = { ...current };

        delete next[id];

        return next;
      });
      setItemModes(current => {
        const next = { ...current };

        delete next[id];

        return next;
      });
    } else {
      setItemModes(current => ({ ...current, [id]: 'quantity' }));
      setSelections(current => ({ ...current, [id]: 1 }));
    }
  };

  const setItemMode = (id: string, mode: PaymentMode) => {
    setItemModes(current => ({ ...current, [id]: mode }));

    if (mode === 'quantity' && selections[id] === undefined) {
      setSelections(current => ({ ...current, [id]: 1 }));
    }

    if (mode === 'value' && valueSelections[id] === undefined) {
      setValueSelections(current => ({ ...current, [id]: '' }));
    }
  };

  const changeSelectionQuantity = (id: string, delta: number, max: number) => {
    setSelections(current => ({
      ...current,
      [id]: Math.min(max, Math.max(1, (current[id] ?? 1) + delta)),
    }));
  };

  const handleValueChange = (id: string, raw: string, max: number) => {
    const formatted = FormatCurrencyInput(raw);
    const parsed = ParseCurrency(formatted);

    if (formatted && parsed > max) {
      setValueSelections(current => ({
        ...current,
        [id]: FormatCurrency(max),
      }));

      return;
    }

    setValueSelections(current => ({
      ...current,
      [id]: formatted,
    }));
  };

  const handlePay = () => {
    const updatedMap = new Map<string, OrderItem>();

    for (const item of displayedItems) {
      if (isCancelled(item) || isAwaiting(item)) {
        continue;
      }

      if (
        filterTableNumber !== undefined &&
        item.tableNumber !== filterTableNumber
      ) {
        continue;
      }

      const mode = itemModes[item.id] ?? 'quantity';

      if (mode === 'quantity') {
        const qty = selections[item.id];

        if (!qty) {
          continue;
        }

        const deltaAmount = Math.min(
          item.product.price * qty,
          getRemainingAmount(item),
        );
        const nextPaidAmount = getPaidAmount(item) + deltaAmount;
        const nextPaidQuantity = (item.paidQuantity ?? 0) + qty;

        updateOrderItem(item.id, {
          paidAmount: nextPaidAmount,
          paidQuantity: nextPaidQuantity,
        });
        updatedMap.set(item.id, {
          ...item,
          paidAmount: nextPaidAmount,
          paidQuantity: nextPaidQuantity,
        });
      } else {
        const raw = valueSelections[item.id];

        if (!raw) {
          continue;
        }

        const parsed = ParseCurrency(raw);

        if (parsed <= 0) {
          continue;
        }

        const remaining = getRemainingAmount(item);
        const delta = Math.min(parsed, remaining);
        const nextPaidAmount = getPaidAmount(item) + delta;

        updateOrderItem(item.id, { paidAmount: nextPaidAmount });
        updatedMap.set(item.id, { ...item, paidAmount: nextPaidAmount });
      }
    }

    setSelections({});
    setValueSelections({});
    setItemModes({});

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

      const paid = updatedMap.has(item.id)
        ? getPaidAmount(updatedMap.get(item.id)!)
        : getPaidAmount(item);

      return sum + Math.max(0, getTotalPrice(item) - paid);
    }, 0);

    if (remainingForTable <= 0.01) {
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
    setValueSelections(current => {
      const next = { ...current };

      delete next[id];

      return next;
    });
    setItemModes(current => {
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
              const paidAmount = getPaidAmount(item);
              const totalPrice = getTotalPrice(item);
              const remainingAmount = getRemainingAmount(item);
              const remainingQty = getRemainingQuantity(item);
              const isPaid = remainingAmount <= 0.01;
              const cancelled = isCancelled(item);
              const awaiting = isAwaiting(item);
              const isLocked = isPaid || cancelled || awaiting;
              const isSelected =
                selections[item.id] !== undefined ||
                valueSelections[item.id] !== undefined;
              const mode = itemModes[item.id] ?? 'quantity';

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

                      {paidAmount > 0.01 && !isPaid && (
                        <span className={styles.partiallyPaid}>
                          Pago {FormatCurrency(paidAmount)} /{' '}
                          {FormatCurrency(totalPrice)}
                        </span>
                      )}

                      {isPaid && (
                        <span className={styles.paidBadge}>
                          <CheckCircle />
                          Pago {FormatCurrency(paidAmount)} /{' '}
                          {FormatCurrency(totalPrice)}
                        </span>
                      )}
                    </div>

                    {observation && (
                      <p className={styles.observation}>
                        Observação: {observation}
                      </p>
                    )}

                    {!isLocked && isSelected && (
                      <>
                        <div className={styles.itemModeTabs}>
                          <button
                            type="button"
                            className={`${styles.itemModeTab} ${mode === 'quantity' ? styles.itemModeTabActive : ''}`}
                            onClick={event => {
                              event.stopPropagation();
                              setItemMode(item.id, 'quantity');
                            }}
                          >
                            Qtd
                          </button>

                          <button
                            type="button"
                            className={`${styles.itemModeTab} ${mode === 'value' ? styles.itemModeTabActive : ''}`}
                            onClick={event => {
                              event.stopPropagation();
                              setItemMode(item.id, 'value');
                            }}
                          >
                            R$
                          </button>
                        </div>

                        {mode === 'quantity' ? (
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
                                  remainingQty,
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
                                changeSelectionQuantity(item.id, 1, remainingQty)
                              }
                            >
                              <Plus />
                            </button>
                          </div>
                        ) : (
                          <div
                            className={styles.valueField}
                            onClick={event => event.stopPropagation()}
                          >
                            <input
                              type="text"
                              inputMode="numeric"
                              className={styles.valueInput}
                              value={valueSelections[item.id] ?? ''}
                              onChange={event =>
                                handleValueChange(
                                  item.id,
                                  event.target.value,
                                  remainingAmount,
                                )
                              }
                              placeholder={FormatCurrency(remainingAmount)}
                            />

                            <span className={styles.remainingHint}>
                              Restante: {FormatCurrency(remainingAmount)}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    <span className={styles.itemSubtotal}>
                      {FormatCurrency(remainingAmount)}
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