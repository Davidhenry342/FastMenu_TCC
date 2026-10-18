/* eslint-disable @typescript-eslint/no-explicit-any */
import { MercadoPagoConfig, Payment, WebhookSignatureValidator } from 'mercadopago';

const PLACEHOLDER_TOKENS = new Set(['', 'sua_access_token_aqui', 'TEST-SEU_ACCESS_TOKEN_AQUI']);

export type PaymentRecordStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function mapMpStatus(mpStatus?: string): PaymentRecordStatus {
  switch (mpStatus) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'cancelled':
      return 'cancelled';
    case 'refunded':
    case 'charged_back':
      return 'refunded';
    default:
      return 'pending';
  }
}

export function computePaymentDelta(remaining: number, transactionAmount: number): number {
  return Math.max(0, Math.min(round2(remaining), round2(transactionAmount)));
}

let cachedClient: MercadoPagoConfig | null = null;

export function getAccessToken(): string {
  return process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() ?? '';
}

export function isMercadoPagoConfigured(): boolean {
  return !PLACEHOLDER_TOKENS.has(getAccessToken());
}

export function isTestCredential(): boolean {
  return getAccessToken().startsWith('TEST-');
}

export function getClient(): MercadoPagoConfig {
  if (!isMercadoPagoConfigured()) {
    throw new Error(
      'MERCADOPAGO_ACCESS_TOKEN não configurado. Adicione o access token (TEST-... ou APP_USR-...) no server/.env.',
    );
  }

  if (!cachedClient) {
    cachedClient = new MercadoPagoConfig({ accessToken: getAccessToken() });
  }

  return cachedClient;
}

export type CreatePixPaymentInput = {
  amount: number;
  description: string;
  externalReference: string;
  payerEmail: string;
  notificationUrl?: string;
  expiresAt?: Date;
};

export type CreatePixPaymentResult = {
  paymentId: string;
  status: PaymentRecordStatus;
  qrCode: string;
  qrCodeBase64: string;
  expiresAt: string | null;
};

export function extractPixTransaction(result: any): CreatePixPaymentResult {
  const transactionData = result?.point_of_interaction?.transaction_data;
  const qrCode = transactionData?.qr_code as string | undefined;
  const qrCodeBase64 = transactionData?.qr_code_base64 as string | undefined;

  if (result?.id === undefined || result.id === null || !qrCode) {
    throw new Error('MercadoPago não retornou o código Pix (qr_code).');
  }

  return {
    paymentId: String(result.id),
    status: mapMpStatus(result.status as string),
    qrCode,
    qrCodeBase64: qrCodeBase64 ?? '',
    expiresAt: (result.date_of_expiration as string | undefined) ?? null,
  };
}

export async function createPixPayment(input: CreatePixPaymentInput): Promise<CreatePixPaymentResult> {
  const payment = new Payment(getClient());

  const result = await payment.create({
    body: {
      transaction_amount: round2(input.amount),
      description: input.description,
      payment_method_id: 'pix',
      external_reference: input.externalReference,
      notification_url: input.notificationUrl,
      date_of_expiration: input.expiresAt?.toISOString(),
      payer: { email: input.payerEmail },
    },
  } as any);

  return extractPixTransaction(result);
}

export async function getPaymentById(paymentId: string) {
  const payment = new Payment(getClient());

  return payment.get({ id: paymentId });
}

export type WebhookSignatureInput = {
  xSignature?: string;
  xRequestId?: string;
  dataId?: string;
};

export function validateWebhookSignature(input: WebhookSignatureInput): {
  validated: boolean;
  reason?: string;
} {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();

  if (!secret) {
    return { validated: false, reason: 'MERCADOPAGO_WEBHOOK_SECRET não configurado' };
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: input.xSignature,
      xRequestId: input.xRequestId,
      dataId: input.dataId,
      secret,
      toleranceSeconds: 300,
    });

    return { validated: true };
  } catch (error) {
    return { validated: false, reason: error instanceof Error ? error.message : 'assinatura inválida' };
  }
}
