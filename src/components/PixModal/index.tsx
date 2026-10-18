import { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle, Copy, Loader, X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useOrder } from '../../contexts/OrderContext';
import type { PixCharge, PixChargeStatus } from '../../models/payment';
import { FormatCurrency } from '../../utils/format';
import styles from './styles.module.css';

type PixModalProps = {
  charge: PixCharge;
  variant: 'customer' | 'employee';
  onApproved: () => void;
  onClose: () => void;
};

const POLL_INTERVAL_MS = 4000;

export function PixModal({ charge, variant, onApproved, onClose }: PixModalProps) {
  const { fetchPixStatus } = useOrder();
  const [status, setStatus] = useState<PixChargeStatus>('pending');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const onApprovedRef = useRef(onApproved);
  const fetchStatusRef = useRef(fetchPixStatus);
  const approvedRef = useRef(false);

  useEffect(() => {
    onApprovedRef.current = onApproved;
    fetchStatusRef.current = fetchPixStatus;
  }, [onApproved, fetchPixStatus]);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const result = await fetchStatusRef.current(charge.paymentId);

        if (!active) {
          return;
        }

        setStatus(result.status);

        if (result.status === 'approved') {
          if (!approvedRef.current) {
            approvedRef.current = true;
            onApprovedRef.current();
          }

          return;
        }

        if (result.status !== 'pending') {
          setError('O pagamento não foi aprovado. Gere um novo código.');
          return;
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Falha ao consultar o pagamento.');
        }
      }

      if (active && !approvedRef.current) {
        timer = window.setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    timer = window.setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      active = false;

      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [charge.paymentId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(charge.qrCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Não foi possível copiar. Selecione o código manualmente.');
    }
  };

  const isApproved = status === 'approved';

  return (
    <div
      className={styles.overlay}
      onClick={event => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pix-title"
        onClick={event => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="pix-title">Pagamento via Pix</h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Fechar"
          >
            <X />
          </button>
        </div>

        <p className={styles.amount}>
          {FormatCurrency(charge.amount)}
        </p>

        {isApproved ? (
          <div className={styles.approved}>
            <CheckCircle />
            <span>Pagamento confirmado!</span>
          </div>
        ) : (
          <>
            {variant === 'employee' && (
              <div className={styles.qrWrapper}>
                <QRCodeCanvas
                  value={charge.qrCode}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                />
                <p className={styles.qrHint}>
                  Escaneie o QR Code com o app do banco
                </p>
              </div>
            )}

            <p className={styles.instructions}>
              Abra o app do seu banco e pague com o Pix Copia e Cola:
            </p>

            <div className={styles.copyRow}>
              <code className={styles.code}>{charge.qrCode}</code>

              <button
                type="button"
                className={styles.copyButton}
                onClick={handleCopy}
                aria-label="Copiar código Pix"
              >
                {copied ? <Check /> : <Copy />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <div className={styles.statusRow}>
              <Loader className={styles.spinner} />
              <span>Aguardando confirmação do pagamento...</span>
            </div>
          </>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <button type="button" className={styles.backButton} onClick={onClose}>
          {isApproved ? 'Fechar' : 'Cancelar'}
        </button>
      </div>
    </div>
  );
}
