import styles from './styles.module.css';

type DefaultButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
};

export function DefaultButton({
  children,
  onClick,
  isActive,
}: DefaultButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.defaultButton} ${isActive ? styles.active : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
