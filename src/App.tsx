import './styles/global.css';
import './styles/theme.css';

import { Route, Routes } from 'react-router-dom';
import { AdminIndexRedirect } from './pages/admin/AdminIndexRedirect';
import { ComandaProvider } from './contexts/ComandaContext';
import { CustomerProvider } from './contexts/CustomerContext';
import { EmployeeProvider } from './contexts/EmployeeContext';
import { OrderProvider } from './contexts/OrderContext';
import { ProductProvider } from './contexts/ProductContext';
import { TableProvider } from './contexts/TableContext';
import { RequireRole } from './components/RequireRole';
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
      <ComandaProvider>
        <OrderProvider>
          <TableProvider>
            <EmployeeProvider>
              <ProductProvider>
                <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/cardapio" element={<Home />} />
              <Route path="/admin/login" element={<AdminLogin />} />

              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminIndexRedirect />} />
                <Route
                  path="mesas"
                  element={
                    <RequireRole roles={['Gerente', 'Garçom', 'Caixa']}>
                      <Mesas />
                    </RequireRole>
                  }
                />
                <Route
                  path="funcionarios"
                  element={
                    <RequireRole roles={['Gerente']}>
                      <Funcionarios />
                    </RequireRole>
                  }
                />
                <Route
                  path="cardapio"
                  element={
                    <RequireRole roles={['Gerente']}>
                      <Cardapio />
                    </RequireRole>
                  }
                />
                <Route
                  path="cozinha"
                  element={
                    <RequireRole roles={['Gerente', 'Garçom', 'Cozinheiro(a)']}>
                      <Cozinha />
                    </RequireRole>
                  }
                />
              </Route>
                </Routes>
              </ProductProvider>
            </EmployeeProvider>
          </TableProvider>
        </OrderProvider>
      </ComandaProvider>
    </CustomerProvider>
  );
}
