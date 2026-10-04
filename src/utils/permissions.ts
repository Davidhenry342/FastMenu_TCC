import type { EmployeeRole } from '../models/employee';

export const routePermissions: Record<string, EmployeeRole[]> = {
  '/admin/mesas': ['Gerente', 'Garçom', 'Caixa'],
  '/admin/cozinha': ['Gerente', 'Garçom', 'Cozinheiro(a)'],
  '/admin/cardapio': ['Gerente'],
  '/admin/funcionarios': ['Gerente'],
};

export function canAccess(role: EmployeeRole | null | undefined, path: string): boolean {
  if (!role) return false;

  const allowed = routePermissions[path];

  return allowed ? allowed.includes(role) : false;
}

export function firstAllowedRoute(role: EmployeeRole | null | undefined): string {
  if (!role) return '/admin/login';

  const entry = Object.entries(routePermissions).find(([, roles]) => roles.includes(role));

  return entry ? entry[0] : '/admin/login';
}
