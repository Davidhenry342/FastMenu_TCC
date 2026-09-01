import { LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ContainerHead } from '../ContainerHead';
import { useEmployees } from '../../contexts/EmployeeContext';
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
  const navigate = useNavigate();
  const { logout } = useEmployees();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
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

            <button
              type="button"
              className={styles.logoutButton}
              onClick={handleLogout}
              aria-label="Sair da área do administrador"
            >
              <LogOut />
              Sair
            </button>
          </nav>
        </div>
      </ContainerHead>
    </header>
  );
}