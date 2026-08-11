import styles from './styles.module.css';

type ContainerProps = {
  children: React.ReactNode;
};

export function ContainerHead({ children }: ContainerProps) {
  return (
    <div className={styles['containerHead-fluid']}>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
