import { Container } from '../../components/Container';
import { Header } from '../../components/Header';
import styles from './styles.module.css';

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
          </section>
        </Container>
      </main>
    </>
  );
}
