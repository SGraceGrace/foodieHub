import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CouponService, Coupon } from '../../core/services/coupon.service';

@Component({
  selector: 'app-deals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deals.component.html',
  styleUrl: './deals.component.scss'
})
export class DealsComponent implements OnInit {

  coupons: Coupon[] = [];
  loading = true;
  copiedCode: string | null = null;

  constructor(private couponService: CouponService) {}

  ngOnInit() {
    this.couponService.getActiveCoupons().subscribe({
      next: res => {
        this.coupons = res.data ?? [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  discountLabel(c: Coupon): string {
    if (c.discountType === 'PERCENTAGE') {
      return c.maxDiscount > 0
        ? `${c.discountValue}% OFF (up to ₹${c.maxDiscount})`
        : `${c.discountValue}% OFF`;
    }
    return `₹${c.discountValue} OFF`;
  }

  copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.copiedCode = code;
      setTimeout(() => { this.copiedCode = null; }, 2000);
    });
  }

  daysLeft(expiresAt: string): number {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  get hasExpiringSoon(): Coupon[] {
    return this.coupons.filter(c => this.daysLeft(c.expiresAt) <= 3);
  }
}
