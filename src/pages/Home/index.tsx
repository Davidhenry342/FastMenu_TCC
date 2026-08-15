import { Container } from '../../components/Container';
import { Header } from '../../components/Header';
import { ProdutcCard } from '../../components/ProductCard';
import type { Product } from '../../models/product';
import styles from './styles.module.css';

const products: Product[] = [
  {
    id: '1',
    name: 'Hambúrgher Artesanal',
    description:
      'Pão Brioche, Hambúrguer artesanal bovino, queijo, alface e molho especial.',
    price: 32.9,
    preparationTime: 20,
  },

  {
    id: '2',
    name: 'Filé com Fritas',
    description: 'Filé gralhado acompanhado de batatas fritas crocantes.',
    price: 42.9,
    preparationTime: 25,
  },

  {
    id: '3',
    name: 'Risoto de Camarão',
    description: 'Risoto cremoso preparado com camarões e temperos especiais.',
    price: 49.9,
    preparationTime: 30,
  },
];

export function Home() {
  return (
    <>
      <Header restaurantName="Fast Menu restaurante" />

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
              <button>Entradas</button>
              <button>Pratos principais</button>
              <button>Bebidas</button>
              <button>Sobremesas</button>
            </div>
          </section>

          <section className={styles.highlights}>
            <div className={styles.sectionHeader}>
              <h2>Destaques</h2>

              <span>Confira nossas opções</span>
            </div>

            <div className={styles.productGrid}>
              {products.map(product => (
                <ProdutcCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        </Container>
      </main>
    </>
  );
}
