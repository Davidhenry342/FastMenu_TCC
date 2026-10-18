export type PixChargeItem = {
  orderItemId: string;
  amount?: number;
  quantity?: number;
};

export type PixCharge = {
  paymentId: string;
  amount: number;
  qrCode: string;
  qrCodeBase64: string;
  expiresAt: string | null;
};

export type PixChargeStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'refunded';

export type PixStatus = {
  status: PixChargeStatus;
  amount: number;
  method?: string | null;
  mpPaymentId?: string | null;
  paidAt?: string | null;
};
