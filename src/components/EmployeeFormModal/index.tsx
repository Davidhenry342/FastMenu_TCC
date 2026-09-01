import { useEffect, useState } from 'react';
import type { Employee, EmployeeRole } from '../../models/employee';
import { employeeRoles } from '../../models/employee';
import { FormatCpf, FormatPhone } from '../../utils/format';
import styles from './styles.module.css';

type EmployeeFormData = Omit<Employee, 'id'>;

type EmployeeFormModalProps = {
  title: string;
  initialEmployee?: Employee;
  takenCpfs: string[];
  takenEmails: string[];
  onSubmit: (employee: EmployeeFormData) => void;
  onClose: () => void;
};

export function EmployeeFormModal({
  title,
  initialEmployee,
  takenCpfs,
  takenEmails,
  onSubmit,
  onClose,
}: EmployeeFormModalProps) {
  const [cpf, setCpf] = useState(initialEmployee?.cpf ?? '');
  const [name, setName] = useState(initialEmployee?.name ?? '');
  const [phone, setPhone] = useState(initialEmployee?.phone ?? '');
  const [address, setAddress] = useState(initialEmployee?.address ?? '');
  const [email, setEmail] = useState(initialEmployee?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<EmployeeRole | ''>(
    initialEmployee?.role ?? '',
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = () => {
    if (
      !cpf.trim() ||
      !name.trim() ||
      !phone.trim() ||
      !address.trim() ||
      !email.trim()
    ) {
      setError('Preencha todos os campos.');

      return;
    }

    if (!role) {
      setError('Selecione o cargo.');

      return;
    }

    const isCreating = !initialEmployee;

    if (isCreating && !password.trim()) {
      setError('Informe a senha.');

      return;
    }

    if (password.trim() && password.trim().length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');

      return;
    }

    const cpfDigits = cpf.replace(/\D/g, '');

    if (cpfDigits.length !== 11) {
      setError('O CPF deve ter 11 dígitos.');

      return;
    }

    const formattedCpf = FormatCpf(cpfDigits);

    if (takenCpfs.includes(formattedCpf)) {
      setError('Já existe um funcionário com esse CPF.');

      return;
    }

    const emailTrimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(emailTrimmed)) {
      setError('Informe um e-mail válido.');

      return;
    }

    if (takenEmails.includes(emailTrimmed)) {
      setError('Já existe um funcionário com esse e-mail.');

      return;
    }

    const phoneDigits = phone.replace(/\D/g, '');

    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setError('O telefone deve ter 10 ou 11 dígitos com DDD.');

      return;
    }

    onSubmit({
      cpf: formattedCpf,
      name: name.trim(),
      phone: FormatPhone(phoneDigits),
      address: address.trim(),
      email: emailTrimmed,
      // Na edição, senha vazia mantém a anterior (tratado no caller)
      password: password.trim()
        ? password.trim()
        : (initialEmployee?.password ?? ''),
      role,
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-form-title"
        onClick={event => event.stopPropagation()}
      >
        <h2 id="employee-form-title">{title}</h2>

        <div className={styles.field}>
          <label htmlFor="employee-cpf" className={styles.label}>
            CPF
          </label>

          <input
            id="employee-cpf"
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
        </div>

        <div className={styles.field}>
          <label htmlFor="employee-name" className={styles.label}>
            Nome do funcionário
          </label>

          <input
            id="employee-name"
            type="text"
            className={styles.input}
            value={name}
            onChange={event => {
              setName(event.target.value);
              setError(null);
            }}
            placeholder="Nome completo"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="employee-email" className={styles.label}>
            E-mail
          </label>

          <input
            id="employee-email"
            type="email"
            className={styles.input}
            value={email}
            onChange={event => {
              setEmail(event.target.value);
              setError(null);
            }}
            placeholder="funcionario@fastmenu.com"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="employee-password" className={styles.label}>
            Senha {initialEmployee ? '(deixe em branco para manter)' : ''}
          </label>

          <input
            id="employee-password"
            type="password"
            className={styles.input}
            value={password}
            onChange={event => {
              setPassword(event.target.value);
              setError(null);
            }}
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="employee-phone" className={styles.label}>
            Telefone
          </label>

          <input
            id="employee-phone"
            type="text"
            inputMode="numeric"
            maxLength={15}
            className={styles.input}
            value={phone}
            onChange={event => {
              setPhone(FormatPhone(event.target.value));
              setError(null);
            }}
            placeholder="(00) 00000-0000"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="employee-address" className={styles.label}>
            Endereço
          </label>

          <input
            id="employee-address"
            type="text"
            className={styles.input}
            value={address}
            onChange={event => {
              setAddress(event.target.value);
              setError(null);
            }}
            placeholder="Rua, número - cidade/UF"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="employee-role" className={styles.label}>
            Cargo
          </label>

          <select
            id="employee-role"
            className={styles.select}
            value={role}
            onChange={event => {
              setRole(event.target.value as EmployeeRole);
              setError(null);
            }}
          >
            <option value="" disabled>
              Selecione o cargo
            </option>

            {employeeRoles.map(employeeRole => (
              <option key={employeeRole} value={employeeRole}>
                {employeeRole}
              </option>
            ))}
          </select>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          type="button"
          className={styles.confirmButton}
          onClick={handleSubmit}
        >
          Confirmar
        </button>

        <button type="button" className={styles.backButton} onClick={onClose}>
          Voltar
        </button>
      </div>
    </div>
  );
}