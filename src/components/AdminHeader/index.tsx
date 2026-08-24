import { NavLink } from 'react-router-dom';
import { ContainerHead } from '../ContainerHead';
import styles from './styles.module.css';

const navItems = [
  { to: '/admin/mesas', label: 'Mesas' },
  { to: '/admin/funcionarios', label: 'Funcionários' },
  { to: '/admin/cardapio', label: 'Cardápio' },
  { to: '/admin/cozinha', label: 'Cozinha' },
];

type AdminHeaderProps = {
  restaurantName: string;
};

export function AdminHeader({ restaurantName }: AdminHeaderProps) {
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

          <nav className={styles.nav}>
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </ContainerHead>
    </header>
  );
}