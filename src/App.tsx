import './styles/global.css';
import './styles/theme.css';

import { OrderProvider } from './contexts/OrderContext';
import { Home } from './pages/Home';

export function App() {
  return (
    <OrderProvider>
      <Home />
    </OrderProvider>
  );
}
