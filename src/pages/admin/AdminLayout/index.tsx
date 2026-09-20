import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AdminHeader } from '../../../components/AdminHeader';
import { useEmployees } from '../../../contexts/EmployeeContext';
import styles from './styles.module.css';

export function AdminLayout() {
  const navigate = useNavigate();
  const { currentEmployee, isLoading } = useEmployees();

  useEffect(() => {
    if (!isLoading && !currentEmployee) {
      navigate('/admin/login', { replace: true });
    }
  }, [currentEmployee, isLoading, navigate]);

  if (isLoading) {
    return null;
  }

  if (!currentEmployee) {
    return null;
  }

  return (
    <>
      <AdminHeader restaurantName={`Fast Menu - ${currentEmployee.role}`} />

      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  );
}
