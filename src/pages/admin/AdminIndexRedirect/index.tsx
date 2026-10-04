import { Navigate } from 'react-router-dom';
import { useEmployees } from '../../../contexts/EmployeeContext';
import { firstAllowedRoute } from '../../../utils/permissions';

export function AdminIndexRedirect() {
  const { currentEmployee, isLoading } = useEmployees();

  if (isLoading) return null;

  const target = firstAllowedRoute(currentEmployee?.role ?? null);

  if (target === '/admin/login') {
    return <Navigate to="/admin/login" replace />;
  }

  const suffix = target.replace('/admin/', '');

  return <Navigate to={suffix} replace />;
}
