import { MercadoPagoConfig, Payment, Preference, WebhookSignatureValidator } from 'mercadopago';

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

export type CreatePreferenceInput = {
  orderItemId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  payerEmail?: string;
  notificationUrl?: string;
  backUrls?: { success: string; failure: string; pending: string };
};

export type CreatePreferenceResult = {
  preferenceId: string;
  initPoint: string;
};

export async function createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceResult> {
  const preference = new Preference(getClient());

  const result = await preference.create({
    body: {
      items: [
        {
          id: input.orderItemId,
          title: input.title,
          quantity: input.quantity,
          unit_price: input.unitPrice,
          currency_id: 'BRL',
        },
      ],
      external_reference: input.orderItemId,
      notification_url: input.notificationUrl,
      back_urls: input.backUrls,
      auto_return:
        input.backUrls && input.backUrls.success.startsWith('https') ? 'approved' : undefined,
      statement_descriptor: 'FASTMENU',
      metadata: { orderItemId: input.orderItemId },
      payer: input.payerEmail ? { email: input.payerEmail } : undefined,
    },
  });

  const preferenceId = result.id;
  const initPoint =
    (isTestCredential() ? result.sandbox_init_point : undefined) ??
    result.init_point ??
    result.sandbox_init_point;

  if (!preferenceId || !initPoint) {
    throw new Error('MercadoPago não retornou id/init_point da preferência.');
  }

  return { preferenceId, initPoint };
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
