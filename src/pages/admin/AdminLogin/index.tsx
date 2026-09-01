import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployees } from '../../../contexts/EmployeeContext';
import { FormatCpf } from '../../../utils/format';
import styles from './styles.module.css';

export function AdminLogin() {
  const navigate = useNavigate();
  const { findByCpf, login } = useEmployees();

  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const digits = cpf.replace(/\D/g, '');

    if (digits.length !== 11) {
      setError('Informe um CPF válido com 11 dígitos.');

      return;
    }

    if (!password.trim()) {
      setError('Informe a senha.');

      return;
    }

    const employee = findByCpf(digits);

    if (!employee || employee.password !== password) {
      setError('CPF ou senha inválidos.');

      return;
    }

    login(employee);
    navigate('/admin/mesas');
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Área do Administrador</h1>
        <p className={styles.subtitle}>Entre com seu CPF e senha</p>

        <label htmlFor="admin-cpf" className={styles.label}>
          CPF
        </label>

        <input
          id="admin-cpf"
          type="text"
          inputMode="numeric"
          maxLength={14}
          className={styles.input}
          value={cpf}
          onChange={event => {
            setCpf(FormatCpf(event.target.value));
            setError(null);
          }}
          placeholder="000.000.000-00"
        />

        <label htmlFor="admin-password" className={styles.label}>
          Senha
        </label>

        <input
          id="admin-password"
          type="password"
          className={styles.input}
          value={password}
          onChange={event => {
            setPassword(event.target.value);
            setError(null);
          }}
          placeholder="Sua senha"
        />

        {error && <p className={styles.error}>{error}</p>}

        <button
          type="button"
          className={styles.primaryButton}
          onClick={handleSubmit}
        >
          Entrar
        </button>
      </div>
    </main>
  );
}
