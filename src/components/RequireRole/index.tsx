import type { ReactNode } from 'react';
import { useEmployees } from '../../contexts/EmployeeContext';
import type { EmployeeRole } from '../../models/employee';
import { Forbidden } from '../../pages/admin/Forbidden';

type RequireRoleProps = {
  roles: EmployeeRole[];
  children: ReactNode;
};

export function RequireRole({ roles, children }: RequireRoleProps) {
  const { currentEmployee, isLoading } = useEmployees();

  if (isLoading) return null;

  if (!currentEmployee || !roles.includes(currentEmployee.role)) {
    return <Forbidden />;
  }

  return <>{children}</>;
}
