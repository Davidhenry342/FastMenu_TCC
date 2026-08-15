import styles from './styles.module.css';

type DefaultButtonProps = {
  children: React.ReactNode;
};

export function DefaultButton({ children }: DefaultButtonProps) {
  return <div className={styles.defaultButton}>{children}</div>;
}
