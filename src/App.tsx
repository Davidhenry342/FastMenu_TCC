import './styles/global.css';
import './styles/theme.css';

import { Navigate, Route, Routes } from 'react-router-dom';
import { CustomerProvider } from './contexts/CustomerContext';
import { EmployeeProvider } from './contexts/EmployeeContext';
import { OrderProvider } from './contexts/OrderContext';
import { ProductProvider } from './contexts/ProductContext';
import { TableProvider } from './contexts/TableContext';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminLogin } from './pages/admin/AdminLogin';
import { Cardapio } from './pages/admin/Cardapio';
import { Cozinha } from './pages/admin/Cozinha';
import { Funcionarios } from './pages/admin/Funcionarios';
import { Mesas } from './pages/admin/Mesas';
import { Home } from './pages/Home';
import { Login } from './pages/Login';

export function App() {
  return (
    <CustomerProvider>
      <OrderProvider>
        <TableProvider>
          <EmployeeProvider>
            <ProductProvider>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/cardapio" element={<Home />} />
              <Route path="/admin/login" element={<AdminLogin />} />

              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="mesas" replace />} />
                <Route path="mesas" element={<Mesas />} />
                <Route path="funcionarios" element={<Funcionarios />} />
                <Route path="cardapio" element={<Cardapio />} />
                <Route path="cozinha" element={<Cozinha />} />
              </Route>
            </Routes>
            </ProductProvider>
          </EmployeeProvider>
        </TableProvider>
      </OrderProvider>
    </CustomerProvider>
  );
}
