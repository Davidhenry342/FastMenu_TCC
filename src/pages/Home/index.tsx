import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Comanda } from '../../components/Comanda';
import { Container } from '../../components/Container';
import { DefaultButton } from '../../components/DefaultButton';
import { Header } from '../../components/Header';
import { ProductCard } from '../../components/ProductCard';
import { ProductModal } from '../../components/ProductModal';
import { useComandas } from '../../contexts/ComandaContext';
import { useCustomers } from '../../contexts/CustomerContext';
import { useOrder } from '../../contexts/OrderContext';
import { useProducts } from '../../contexts/ProductContext';
import { useTables } from '../../contexts/TableContext';
import { categories } from '../../data/categories';
import type { Product } from '../../models/product';
import { averageWaitByCategory } from '../../utils/waitTime';
import styles from './styles.module.css';

export function Home() {
  const navigate = useNavigate();
  const { currentCustomer } = useCustomers();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isComandaOpen, setIsComandaOpen] = useState(false);
  const { addOrderItem, orderItems } = useOrder();
  const { products } = useProducts();
  const { tables, updateTable } = useTables();
  const { openComanda, addOrderToComanda, getOpenComandaByTable } =
    useComandas();

  useEffect(() => {
    if (!currentCustomer) {
      navigate('/', { replace: true });
    }
  }, [currentCustomer, navigate]);

  const averageWait = useMemo(
    () => averageWaitByCategory(orderItems),
    [orderItems],
  );

  const waitFor = (categoryId: string, fallback: number) =>
    fallback + (averageWait.get(categoryId) ?? 0);

  const categoryOrder = new Map(
    categories.map((category, index) => [category.id, index]),
  );

  const visibleProducts = (
    selectedCategory
      ? products.filter(product => product.categoryId === selectedCategory)
      : [...products]
  ).sort(
    (a, b) =>
      (categoryOrder.get(a.categoryId) ?? Number.POSITIVE_INFINITY) -
      (categoryOrder.get(b.categoryId) ?? Number.POSITIVE_INFINITY),
  );

  const activeCategoryName =
    categories.find(category => category.id === selectedCategory)?.name ??
    'Destaques';

  if (!currentCustomer) {
    return null;
  }

  return (
    <>
      <Header
        restaurantName="Fast Menu Restaurante"
        onCartClick={() => setIsComandaOpen(true)}
      />

      <main>
        <Container>
          <section className={styles.hero}>
            <div className={styles.heroContent}>
              <span className={styles.eyeBrow}>
                Bem Vindo! {currentCustomer.name}
              </span>

              <h1>Nosso Cardápio</h1>

              <p>
                Escolha seus pratos favoritos e faça seu pedido de forma rápida
                e pratica.
              </p>
            </div>
          </section>

          <section className={styles.categories}>
            <div className={styles.sectionHeader}>
              <h2>Categorias</h2>
            </div>

            <div className={styles.categoryList}>
              <DefaultButton
                onClick={() => setSelectedCategory(null)}
                isActive={selectedCategory === null}
              >
                Todos
              </DefaultButton>
              {categories.map(category => (
                <DefaultButton
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  isActive={selectedCategory === category.id}
                >
                  {category.name}
                </DefaultButton>
              ))}
            </div>
          </section>

          <section className={styles.highlights}>
            <div className={styles.sectionHeader}>
              <h2>{activeCategoryName}</h2>

              <span>Confira nossas opções</span>
            </div>

            <div className={styles.productGrid}>
              {visibleProducts.map(product => {
                const categoryName = categories.find(
                  category => category.id === product.categoryId,
                )?.name;

                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    categoryName={categoryName}
                    estimatedWaitTime={waitFor(
                      product.categoryId,
                      product.preparationTime,
                    )}
                    onAdd={setSelectedProduct}
                  />
                );
              })}
            </div>
          </section>
        </Container>
      </main>

      {isComandaOpen && <Comanda onClose={() => setIsComandaOpen(false)} />}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onConfirm={(product, quantity, observation) => {
            const tableNumber = 1;
            const table = tables.find(entry => entry.number === tableNumber);

            if (!table) {
              return;
            }

            const orderId = crypto.randomUUID();

            addOrderItem({
              id: orderId,
              product,
              quantity,
              orderedAt: new Date(),
              status: 'Aguardando confirmação',
              observation: observation.trim() || undefined,
              tableNumber,
              customerId: currentCustomer.id,
            });

            if (table.status !== 'Ocupada') {
              updateTable(table.id, { status: 'Ocupada' });
            }

            const existingComanda = getOpenComandaByTable(tableNumber);

            if (existingComanda) {
              addOrderToComanda(existingComanda.id, orderId);
            } else {
              const newComanda = openComanda(table.id, tableNumber);

              addOrderToComanda(newComanda.id, orderId);
            }

            setSelectedProduct(null);
          }}
        />
      )}
    </>
  );
}
