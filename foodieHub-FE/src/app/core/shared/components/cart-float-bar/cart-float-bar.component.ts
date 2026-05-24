import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { CartService } from '../../cart.service';

@Component({
  selector: 'app-cart-float-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart-float-bar.component.html',
  styleUrl: './cart-float-bar.component.scss',
})
export class CartFloatBarComponent implements OnInit, OnDestroy {
  totalItems  = 0;
  totalAmount = 0;
  onCartPage  = false;

  private subs = new Subscription();

  constructor(private cartService: CartService, private router: Router) {}

  get visible(): boolean {
    return this.totalItems > 0 && !this.onCartPage;
  }

  ngOnInit() {
    // Seed the current URL so the bar knows its starting page
    this.onCartPage = this.isCartUrl(this.router.url);

    // Keep onCartPage in sync with every navigation
    this.subs.add(
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd)
      ).subscribe(e => {
        this.onCartPage = this.isCartUrl(e.urlAfterRedirects ?? e.url);
      })
    );

    // Keep totalItems / totalAmount in sync with every cart change
    this.subs.add(
      this.cartService.cart$.subscribe(() => {
        this.totalItems  = this.cartService.totalItems;
        this.totalAmount = this.cartService.totalAmount;
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  goToCart() {
    this.router.navigateByUrl('/user/cart');
  }

  private isCartUrl(url: string): boolean {
    return url.split('?')[0] === '/user/cart';
  }
}
