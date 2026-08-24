export type EmployeeRole = 'Garçom' | 'Cozinheiro(a)' | 'Caixa' | 'Gerente';

export const employeeRoles: EmployeeRole[] = [
  'Garçom',
  'Cozinheiro(a)',
  'Caixa',
  'Gerente',
];

export type Employee = {
  id: string;
  cpf: string;
  name: string;
  phone: string;
  address: string;
  role: EmployeeRole;
};