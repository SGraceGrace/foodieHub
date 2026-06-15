export interface InitiatePaymentResponse {
  razorpayOrderId: string;
  amount: number;    // in paise (1 INR = 100 paise)
  currency: string;
  keyId: string;     // Razorpay public key sent from backend — never expose secret key to frontend
}

export interface VerifyPaymentRequest {
  razorpayOrderId:  string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  restaurantId:      string;
  deliveryAddress:   string;
  customerName:      string;
  couponCode?:       string;
  discountAmount?:   number;
}

/** Razorpay returns these three fields in the handler callback after successful payment */
export interface RazorpaySuccessResponse {
  razorpay_order_id:   string;
  razorpay_payment_id: string;
  razorpay_signature:  string;
}

export interface RazorpayCheckoutOptions {
  key:         string;
  amount:      number;
  currency:    string;
  name:        string;
  description?: string;
  order_id:    string;
  prefill?:    { name?: string; email?: string; contact?: string };
  theme?:      { color?: string };
}
