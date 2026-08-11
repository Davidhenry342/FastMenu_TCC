import styles from './styles.module.css';
import { ContainerHead } from '../ContainerHead';
import { ShoppingCart } from 'lucide-react';

type HeaderProps = {
  restaurantName: string;
};

export function Header({ restaurantName }: HeaderProps) {
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
          <button className={styles.buttonCart}>
            <ShoppingCart />
          </button>
        </div>
      </ContainerHead>
    </header>
  );
}
