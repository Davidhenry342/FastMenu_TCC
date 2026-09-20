import { LogOut, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ContainerHead } from '../ContainerHead';
import { useCustomers } from '../../contexts/CustomerContext';
import styles from './styles.module.css';

type HeaderProps = {
  restaurantName: string;
  onCartClick?: () => void;
};

export function Header({ restaurantName, onCartClick }: HeaderProps) {
  const navigate = useNavigate();
  const { logout } = useCustomers();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

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
          <div className={styles.actions}>
            <button type="button" className={styles.buttonCart} onClick={onCartClick}>
              <ShoppingCart />
            </button>

            <button
              type="button"
              className={styles.logoutButton}
              onClick={handleLogout}
              aria-label="Sair"
            >
              <LogOut />
              Sair
            </button>
          </div>
        </div>
      </ContainerHead>
    </header>
  );
}
