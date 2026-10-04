import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../../../components/Container';
import { useEmployees } from '../../../contexts/EmployeeContext';
import { firstAllowedRoute } from '../../../utils/permissions';
import styles from './styles.module.css';

export function Forbidden() {
  const navigate = useNavigate();
  const { currentEmployee } = useEmployees();
  const backTo = firstAllowedRoute(currentEmployee?.role ?? null);

  return (
    <Container>
      <section className={styles.section}>
        <div className={styles.card}>
          <ShieldAlert className={styles.icon} />

          <h1 className={styles.title}>Acesso Negado</h1>

          <p className={styles.message}>
            Você não tem permissão para acessar esta página. Seu cargo é{' '}
            <strong>{currentEmployee?.role ?? 'não autenticado'}</strong>.
          </p>

          <button type="button" className={styles.button} onClick={() => navigate(backTo)}>
            Voltar
          </button>
        </div>
      </section>
    </Container>
  );
}
