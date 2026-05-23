import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../model/apiResponse.model';
import { Order } from '../../model/order.model';
import {
  InitiatePaymentResponse,
  VerifyPaymentRequest,
  RazorpayCheckoutOptions,
  RazorpaySuccessResponse,
} from '../../model/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {

  private base = environment.apiBaseUrl; // http://localhost:8080

  constructor(private http: HttpClient) {}

  /**
   * Step 1 — Ask backend to create a Razorpay order.
   * Backend reads the cart, calculates amount, calls Razorpay API.
   * Returns the Razorpay order ID + public key so we can open the modal.
   */
  initiatePayment(restaurantId: string): Observable<ApiResponse<InitiatePaymentResponse>> {
    return this.http.post<ApiResponse<InitiatePaymentResponse>>(
      `${this.base}/api/v1/payments/initiate`,
      { restaurantId }
    );
  }

  /**
   * Step 3 — After customer pays, send Razorpay response to backend for verification.
   * Backend verifies HMAC signature, creates the food order, publishes RabbitMQ event.
   * Returns the created Order — Angular navigates to /user/order-confirm/{id}.
   */
  verifyPayment(req: VerifyPaymentRequest): Observable<ApiResponse<Order>> {
    return this.http.post<ApiResponse<Order>>(
      `${this.base}/api/v1/payments/verify`,
      req
    );
  }

  /**
   * Dynamically loads the Razorpay checkout.js script (once).
   * EventSource / <script> in index.html not needed — we load it on demand.
   */
  loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Already loaded
      if (typeof (window as any)['Razorpay'] !== 'undefined') {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload  = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'));
      document.body.appendChild(script);
    });
  }

  /**
   * Step 2 — Opens the Razorpay payment modal.
   * Resolves with the payment response on success.
   * Rejects with Error('cancelled') if the user closes the modal.
   */
  openCheckout(options: RazorpayCheckoutOptions): Promise<RazorpaySuccessResponse> {
    return new Promise((resolve, reject) => {
      const rzp = new (window as any)['Razorpay']({
        ...options,
        handler: (response: RazorpaySuccessResponse) => resolve(response),
        modal: {
          ondismiss: () => reject(new Error('cancelled')),
        },
      });
      rzp.open();
    });
  }
}
