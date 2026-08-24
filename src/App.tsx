import './styles/global.css';
import './styles/theme.css';

import { Navigate, Route, Routes } from 'react-router-dom';
import { EmployeeProvider } from './contexts/EmployeeContext';
import { OrderProvider } from './contexts/OrderContext';
import { TableProvider } from './contexts/TableContext';
import { AdminLayout } from './pages/admin/AdminLayout';
import { Funcionarios } from './pages/admin/Funcionarios';
import { Mesas } from './pages/admin/Mesas';
import { UnderConstruction } from './pages/admin/UnderConstruction';
import { Home } from './pages/Home';

export function App() {
  return (
    <OrderProvider>
      <TableProvider>
        <EmployeeProvider>
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="mesas" replace />} />
              <Route path="mesas" element={<Mesas />} />
              <Route path="funcionarios" element={<Funcionarios />} />
              <Route
                path="cardapio"
                element={<UnderConstruction title="Cardápio" />}
              />
              <Route
                path="cozinha"
                element={<UnderConstruction title="Cozinha" />}
              />
            </Route>
          </Routes>
        </EmployeeProvider>
      </TableProvider>
    </OrderProvider>
  );
}
