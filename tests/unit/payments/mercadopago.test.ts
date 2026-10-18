import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  computePaymentDelta,
  extractPixTransaction,
  isMercadoPagoConfigured,
  isTestCredential,
  mapMpStatus,
  validateWebhookSignature,
} from '../../../server/src/lib/mercadopago';

const originalToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
const originalSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

function signSignature(dataId: string, requestId: string, ts: string, secret: string): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  return `ts=${ts},v1=${hash}`;
}

describe('Pagamentos MercadoPago — helpers', () => {
  beforeEach(() => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    else process.env.MERCADOPAGO_ACCESS_TOKEN = originalToken;

    if (originalSecret === undefined) delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
    else process.env.MERCADOPAGO_WEBHOOK_SECRET = originalSecret;
  });

  describe('mapMpStatus', () => {
    it('mapeia statuses aprovados/negados/cancelados/reembolsados', () => {
      expect(mapMpStatus('approved')).toBe('approved');
      expect(mapMpStatus('rejected')).toBe('rejected');
      expect(mapMpStatus('cancelled')).toBe('cancelled');
      expect(mapMpStatus('refunded')).toBe('refunded');
    });

    it('charged_back vira refunded e desconhecidos viram pending', () => {
      expect(mapMpStatus('charged_back')).toBe('refunded');
      expect(mapMpStatus('in_process')).toBe('pending');
      expect(mapMpStatus('pending')).toBe('pending');
      expect(mapMpStatus(undefined)).toBe('pending');
    });
  });

  describe('extractPixTransaction', () => {
    it('extrai id, status, qr_code, qr_code_base64 e expiração', () => {
      const result = extractPixTransaction({
        id: 123456,
        status: 'pending',
        date_of_expiration: '2026-01-01T00:00:00.000Z',
        point_of_interaction: {
          transaction_data: {
            qr_code: '00020126580014BR.GOV.BCB.PIX',
            qr_code_base64: 'iVBORw0KGgo=',
          },
        },
      });

      expect(result).toEqual({
        paymentId: '123456',
        status: 'pending',
        qrCode: '00020126580014BR.GOV.BCB.PIX',
        qrCodeBase64: 'iVBORw0KGgo=',
        expiresAt: '2026-01-01T00:00:00.000Z',
      });
    });

    it('mapeia status aprovado e usa valores padrão', () => {
      const result = extractPixTransaction({
        id: '9',
        status: 'approved',
        point_of_interaction: { transaction_data: { qr_code: 'abc' } },
      });

      expect(result.status).toBe('approved');
      expect(result.qrCodeBase64).toBe('');
      expect(result.expiresAt).toBeNull();
    });

    it('lança erro quando o qr_code ou o id não vêm na resposta', () => {
      expect(() => extractPixTransaction({ id: 1, status: 'pending' })).toThrow(/qr_code/);
      expect(() =>
        extractPixTransaction({
          status: 'pending',
          point_of_interaction: { transaction_data: { qr_code: 'x' } },
        }),
      ).toThrow(/qr_code/);
    });
  });

  describe('computePaymentDelta', () => {
    it('limita o delta pelo restante', () => {
      expect(computePaymentDelta(10, 5)).toBe(5);
      expect(computePaymentDelta(5, 10)).toBe(5);
    });

    it('nunca retorna valor negativo', () => {
      expect(computePaymentDelta(10, -3)).toBe(0);
      expect(computePaymentDelta(-1, 5)).toBe(0);
    });

    it('arredonda para duas casas', () => {
      expect(computePaymentDelta(10.123, 10.129)).toBe(10.12);
    });
  });

  describe('isMercadoPagoConfigured / isTestCredential', () => {
    it('considera não configurado quando ausente ou placeholder', () => {
      expect(isMercadoPagoConfigured()).toBe(false);
      process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-SEU_ACCESS_TOKEN_AQUI';
      expect(isMercadoPagoConfigured()).toBe(false);
    });

    it('detecta credencial de teste e produção', () => {
      process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-123456';
      expect(isMercadoPagoConfigured()).toBe(true);
      expect(isTestCredential()).toBe(true);

      process.env.MERCADOPAGO_ACCESS_TOKEN = 'APP_USR-abcdef';
      expect(isTestCredential()).toBe(false);
    });
  });

  describe('validateWebhookSignature', () => {
    it('sem secret configurado retorna não validado', () => {
      const result = validateWebhookSignature({ dataId: '123' });

      expect(result.validated).toBe(false);
      expect(result.reason).toContain('não configurado');
    });

    it('aceita assinatura válida', () => {
      const secret = 'segredo-de-teste';
      const ts = Math.floor(Date.now() / 1000).toString();
      const xSignature = signSignature('123', 'req-1', ts, secret);

      process.env.MERCADOPAGO_WEBHOOK_SECRET = secret;

      const result = validateWebhookSignature({
        xSignature,
        xRequestId: 'req-1',
        dataId: '123',
      });

      expect(result.validated).toBe(true);
    });

    it('rejeita assinatura adulterada', () => {
      const secret = 'segredo-de-teste';
      const ts = Math.floor(Date.now() / 1000).toString();
      const xSignature = signSignature('123', 'req-1', ts, secret).replace(/v1=./, 'v1=0');

      process.env.MERCADOPAGO_WEBHOOK_SECRET = secret;

      const result = validateWebhookSignature({
        xSignature,
        xRequestId: 'req-1',
        dataId: '123',
      });

      expect(result.validated).toBe(false);
    });

    it('rejeita assinatura ausente', () => {
      process.env.MERCADOPAGO_WEBHOOK_SECRET = 'segredo-de-teste';

      const result = validateWebhookSignature({ dataId: '123' });

      expect(result.validated).toBe(false);
    });
  });
});
