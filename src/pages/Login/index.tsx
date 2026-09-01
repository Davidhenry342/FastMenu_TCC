import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../../contexts/CustomerContext';
import { FormatPhone } from '../../utils/format';
import styles from './styles.module.css';

type Step = 'phone' | 'confirm' | 'register';

export function Login() {
  const navigate = useNavigate();
  const { findByPhone, addCustomer, login } = useCustomers();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [foundName, setFoundName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const digits = phone.replace(/\D/g, '');

  const handlePhoneSubmit = () => {
    if (digits.length < 10 || digits.length > 11) {
      setError('Informe um telefone válido com DDD (10 ou 11 dígitos).');

      return;
    }

    const found = findByPhone(digits);

    if (found) {
      setFoundName(found.name);
      setStep('confirm');
      setError(null);

      return;
    }

    setName('');
    setEmail('');
    setStep('register');
    setError(null);
  };

  const handleConfirmYes = () => {
    const found = findByPhone(digits);

    if (!found) {
      setError('Cliente não encontrado.');

      return;
    }

    login(found);
    navigate('/cardapio');
  };

  const handleConfirmNo = () => {
    setName('');
    setEmail('');
    setStep('register');
    setError(null);
  };

  const handleRegister = () => {
    if (!name.trim() || !email.trim()) {
      setError('Preencha nome e e-mail.');

      return;
    }

    if (name.trim().length < 2) {
      setError('O nome deve ter pelo menos 2 caracteres.');

      return;
    }

    const emailTrimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(emailTrimmed)) {
      setError('Informe um e-mail válido.');

      return;
    }

    if (digits.length < 10 || digits.length > 11) {
      setError('Informe um telefone válido com DDD.');

      return;
    }

    const formattedPhone = FormatPhone(digits);

    if (findByPhone(digits)) {
      setError(
        `Telefone já cadastrado para ${foundName || 'outro cliente'}. Use outro telefone.`,
      );

      return;
    }

    const newCustomer = {
      id: crypto.randomUUID(),
      phone: formattedPhone,
      name: name.trim(),
      email: emailTrimmed,
      createdAt: new Date(),
    };

    addCustomer(newCustomer);
    login(newCustomer);
    navigate('/cardapio');
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setError(null);
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Fast Menu</h1>
        <p className={styles.subtitle}>Informe seu telefone para continuar</p>

        {step === 'phone' && (
          <>
            <label htmlFor="login-phone" className={styles.label}>
              Telefone com DDD
            </label>

            <input
              id="login-phone"
              type="tel"
              inputMode="numeric"
              maxLength={15}
              className={styles.input}
              value={phone}
              onChange={event => {
                setPhone(FormatPhone(event.target.value));
                setError(null);
              }}
              placeholder="(11) 98888-7777"
            />

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="button"
              className={styles.primaryButton}
              onClick={handlePhoneSubmit}
            >
              Continuar
            </button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <p className={styles.confirmText}>
              Encontramos <strong>{foundName}</strong> para o telefone{' '}
              <strong>{FormatPhone(digits)}</strong>.
            </p>

            <p className={styles.confirmQuestion}>Este é você?</p>

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleConfirmYes}
            >
              Sim, sou eu
            </button>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleConfirmNo}
            >
              Não, não sou eu
            </button>

            <button
              type="button"
              className={styles.linkButton}
              onClick={handleBackToPhone}
            >
              Voltar e corrigir telefone
            </button>
          </>
        )}

        {step === 'register' && (
          <>
            <p className={styles.registerInfo}>
              Vamos criar seu cadastro para o telefone{' '}
              <strong>{FormatPhone(digits) || phone}</strong>.
            </p>

            <label htmlFor="register-phone" className={styles.label}>
              Telefone com DDD
            </label>

            <input
              id="register-phone"
              type="tel"
              inputMode="numeric"
              maxLength={15}
              className={styles.input}
              value={phone}
              onChange={event => {
                setPhone(FormatPhone(event.target.value));
                setError(null);
              }}
              placeholder="(11) 98888-7777"
            />

            <label htmlFor="register-name" className={styles.label}>
              Nome
            </label>

            <input
              id="register-name"
              type="text"
              className={styles.input}
              value={name}
              onChange={event => {
                setName(event.target.value);
                setError(null);
              }}
              placeholder="Seu nome completo"
            />

            <label htmlFor="register-email" className={styles.label}>
              E-mail
            </label>

            <input
              id="register-email"
              type="email"
              className={styles.input}
              value={email}
              onChange={event => {
                setEmail(event.target.value);
                setError(null);
              }}
              placeholder="seu@email.com"
            />

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleRegister}
            >
              Cadastrar e entrar
            </button>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleBackToPhone}
            >
              Voltar
            </button>
          </>
        )}
      </div>
    </main>
  );
}
