import styles from './styles.module.css';
import { ContainerHead } from '../ContainerHead';
import { ShoppingCart } from 'lucide-react';

type HeaderProps = {
  restaurantName: string;
  onCartClick?: () => void;
};

export function Header({ restaurantName, onCartClick }: HeaderProps) {
  return (
    <header className={styles.header}>
      <ContainerHead>
        <div className={styles.content}>
          <div className={styles.brand}>
            <span className={styles.logo}>
              <img src="https://placehold.co/50X50" alt="" />
            </span>

            <span className={styles.restaurantName}>{restaurantName}</span>
          </div>
          <button type="button" className={styles.buttonCart} onClick={onCartClick}>
            <ShoppingCart />
          </button>
        </div>
      </ContainerHead>
    </header>
  );
}
