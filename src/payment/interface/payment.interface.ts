export interface IpaymuCreatePaymentParams {
  orderId: string;
  amount: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  product: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

export interface IpaymuResponse {
  Status: number;
  Message: string;
  Data: {
    Url: string;
    SessionId: string;
    TransactionId?: number | string;
  };
}

export interface IpaymuTransactionResponse {
  Status: number;
  Message: string;
  Data: {
    Status: number;
    PaymentMethod: string;
  };
}

export interface IpaymuCallbackBody {
  sid: string;
  trx_id: string;
  status: string;
  payment_method?: string;
}

export interface CreatePaymentDto {
  bookingId: string;
}
