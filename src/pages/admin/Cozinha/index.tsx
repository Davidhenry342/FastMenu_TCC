import { CheckCircle, Clock, Timer, XCircle } from 'lucide-react';
import { Container } from '../../../components/Container';
import { useOrder } from '../../../contexts/OrderContext';
import type { OrderItem } from '../../../models/order';
import { FormatTime } from '../../../utils/format';
import { DefaultProductImage } from '../../../utils/imageDefault';
import styles from './styles.module.css';

export function Cozinha() {
  const { orderItems, updateOrderItem } = useOrder();

  const statusRank = (item: OrderItem) =>
    item.status === 'Aguardando confirmação' ? 0 : 1;

  const sortedOrders = [...orderItems].sort((a, b) => {
    if (statusRank(a) !== statusRank(b)) {
      return statusRank(a) - statusRank(b);
    }

    return a.orderedAt.getTime() - b.orderedAt.getTime();
  });

  const deliveryEstimate = (item: OrderItem) =>
    new Date(item.orderedAt.getTime() + item.product.preparationTime * 60000);

  const handleAccept = (id: string) => {
    updateOrderItem(id, { status: 'Em produção' });
  };

  const handleRefuse = (id: string) => {
    updateOrderItem(id, { status: 'Cancelado' });
  };

  return (
    <Container>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Cozinha</h2>

          <span className={styles.pendingCount}>
            {sortedOrders.filter(item => item.status === 'Aguardando confirmação').length}{' '}
            aguardando confirmação
          </span>
        </div>

        {orderItems.length === 0 ? (
          <p className={styles.emptyState}>Nenhum pedido recebido.</p>
        ) : (
          <div className={styles.orderGrid}>
            {sortedOrders.map(item => (
              <article key={item.id} className={styles.orderCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.tableLabel}>
                    Pedido Mesa {item.tableNumber ?? '—'}
                  </span>

                  <span className={styles.orderTime}>
                    <Clock />
                    {FormatTime(item.orderedAt)}
                  </span>
                </div>

                <div className={styles.dish}>
                  <img
                    src={item.product.imageUrl ?? DefaultProductImage}
                    alt={item.product.name}
                    className={styles.thumbnail}
                  />

                  <div className={styles.dishInfo}>
                    <span className={styles.dishName}>{item.product.name}</span>

                    <span className={styles.quantity}>× {item.quantity}</span>
                  </div>
                </div>

                {item.observation?.trim() && (
                  <p className={styles.observation}>
                    Observação: {item.observation.trim()}
                  </p>
                )}

                <div className={styles.meta}>
                  <Timer />
                  Previsão de entrega: {FormatTime(deliveryEstimate(item))}
                </div>

                <div className={styles.footer}>
                  {item.status === 'Aguardando confirmação' && (
                    <>
                      <button
                        type="button"
                        className={styles.acceptButton}
                        onClick={() => handleAccept(item.id)}
                      >
                        Aceitar
                      </button>

                      <button
                        type="button"
                        className={styles.refuseButton}
                        onClick={() => handleRefuse(item.id)}
                      >
                        Recusar
                      </button>
                    </>
                  )}

                  {item.status === 'Em produção' && (
                    <span className={`${styles.statusBadge} ${styles.acceptedBadge}`}>
                      <CheckCircle />
                      Pedido aceito
                    </span>
                  )}

                  {item.status === 'Cancelado' && (
                    <span className={`${styles.statusBadge} ${styles.refusedBadge}`}>
                      <XCircle />
                      Pedido recusado
                    </span>
                  )}

                  {item.status === 'Entregue' && (
                    <span className={`${styles.statusBadge} ${styles.deliveredBadge}`}>
                      Entregue
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </Container>
  );
}