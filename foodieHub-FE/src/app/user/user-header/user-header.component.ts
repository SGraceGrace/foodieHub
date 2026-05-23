import { Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SharedServiceService } from '../../core/shared/shared-service.service';
import { TokenService } from '../../core/shared/token.service';
import { CartService } from '../../core/shared/cart.service';
import { UserService } from '../user.service';
import { ToastrService } from 'ngx-toastr';
import { DeliveryAddressService } from '../../core/shared/delivery-address.service';

@Component({
  selector: 'app-user-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule, ReactiveFormsModule],
  templateUrl: './user-header.component.html',
  styleUrl: './user-header.component.scss',
})
export class UserHeaderComponent implements OnInit, OnDestroy {
  searchControl = new FormControl('');
  searchFocused = false;
  menuOpen = false;
  initials = '';
  cartCount = 0;

  private subs = new Subscription();

  constructor(
    private router: Router,
    private sharedService: SharedServiceService,
    private tokenService: TokenService,
    private cartService: CartService,
    private userService: UserService,
    private toaster: ToastrService,
    private elRef: ElementRef,
    private deliveryAddressService: DeliveryAddressService
  ) {}

  ngOnInit() {
    this.subs.add(
      this.tokenService.userInfo$.subscribe(user => {
        if (user) {
          this.initials = (user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '');
          this.initials = this.initials.toUpperCase();
        } else {
          this.initials = 'U';
        }
      })
    );

    this.subs.add(
      this.cartService.cart$.subscribe(() => {
        this.cartCount = this.cartService.totalItems;
      })
    );

    if (!this.deliveryAddressService.get()) {
      this.userService.getAddresses().subscribe({
        next: (res) => {
          const defaultAddr = (res?.data ?? []).find(a => a.defaultAddress);
          if (defaultAddr) {
            this.deliveryAddressService.set(defaultAddr);
          }
        },
      });
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.menuOpen = false;
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  onSearch() {
    const searchTerm = this.searchControl.value ?? '';
    this.router.navigateByUrl('/user/search');
    this.sharedService.onSearch(searchTerm);
    this.searchControl.reset();
  }

  logout() {
    this.menuOpen = false;
    this.userService.logout().subscribe({
      next: (response) => {
        this.toaster.success('Logged out successfully');
        this.tokenService.clearTokens();
        this.router.navigateByUrl('/login');
      },
      error: () => {
        this.toaster.error('Logout failed');
      },
    });
  }
}
