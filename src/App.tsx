import './styles/global.css';
import './styles/theme.css';

import { Navigate, Route, Routes } from 'react-router-dom';
import { OrderProvider } from './contexts/OrderContext';
import { TableProvider } from './contexts/TableContext';
import { AdminLayout } from './pages/admin/AdminLayout';
import { Mesas } from './pages/admin/Mesas';
import { UnderConstruction } from './pages/admin/UnderConstruction';
import { Home } from './pages/Home';

export function App() {
  return (
    <OrderProvider>
      <TableProvider>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="mesas" replace />} />
            <Route path="mesas" element={<Mesas />} />
            <Route
              path="funcionarios"
              element={<UnderConstruction title="Funcionários" />}
            />
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
      </TableProvider>
    </OrderProvider>
  );
}
