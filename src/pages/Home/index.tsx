import { useState } from 'react';
import { Comanda } from '../../components/Comanda';
import { Container } from '../../components/Container';
import { DefaultButton } from '../../components/DefaultButton';
import { Header } from '../../components/Header';
import { ProductCard } from '../../components/ProductCard';
import { ProductModal } from '../../components/ProductModal';
import { useOrder } from '../../contexts/OrderContext';
import { categories } from '../../data/categories';
import { products } from '../../data/products';
import type { Product } from '../../models/product';
import styles from './styles.module.css';

export function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isComandaOpen, setIsComandaOpen] = useState(false);
  const { addOrderItem } = useOrder();

  const visibleProducts = selectedCategory
    ? products.filter(product => product.categoryId === selectedCategory)
    : products;

  const activeCategoryName =
    categories.find(category => category.id === selectedCategory)?.name ??
    'Destaques';

  return (
    <>
      <Header
        restaurantName="Fast Menu restaurante"
        onCartClick={() => setIsComandaOpen(true)}
      />

      <main>
        <Container>
          <section className={styles.hero}>
            <div className={styles.heroContent}>
              <span className={styles.eyeBrow}>Bem Vindo!</span>

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
              {visibleProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={setSelectedProduct}
                />
              ))}
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
            addOrderItem({
              id: crypto.randomUUID(),
              product,
              quantity,
              orderedAt: new Date(),
              status: 'Aguardando confirmação',
              observation: observation.trim() || undefined,
            });
            setSelectedProduct(null);
          }}
        />
      )}
    </>
  );
}
