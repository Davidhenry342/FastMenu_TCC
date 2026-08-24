import styles from './styles.module.css';

type UnderConstructionProps = {
  title: string;
};

export function UnderConstruction({ title }: UnderConstructionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>

      <p className={styles.message}>Página em construção.</p>
    </section>
  );
}