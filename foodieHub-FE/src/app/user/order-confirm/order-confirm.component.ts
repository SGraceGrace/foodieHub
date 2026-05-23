import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { OrderService } from '../../core/shared/order.service';
import { Order } from '../../model/order.model';

@Component({
  selector: 'app-order-confirm',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './order-confirm.component.html',
  styleUrl: './order-confirm.component.scss',
})
export class OrderConfirmComponent implements OnInit {
  order: Order | null = null;
  loading = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error = true; this.loading = false; return; }

    this.orderService.getOrder(id).subscribe({
      next: res => {
        this.order   = res.data;
        this.loading = false;
      },
      error: () => {
        this.error   = true;
        this.loading = false;
      }
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      PLACED:     '✅ Order placed',
      CONFIRMED:  '🔔 Confirmed',
      PREPARING:  '👨‍🍳 Preparing',
      READY:      '📦 Ready for pickup',
      DELIVERED:  '🎉 Delivered',
      CANCELLED:  '❌ Cancelled',
    };
    return map[status] ?? status;
  }
}
