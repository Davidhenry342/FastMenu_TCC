import { Outlet } from 'react-router-dom';
import { AdminHeader } from '../../../components/AdminHeader';
import styles from './styles.module.css';

export function AdminLayout() {
  return (
    <>
      <AdminHeader restaurantName="Fast Menu - Administrador" />

      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  );
}
