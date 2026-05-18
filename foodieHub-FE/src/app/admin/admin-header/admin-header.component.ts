import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TokenService } from '../../core/shared/token.service';
import { AdminService } from '../admin.service';
import { AdminNotification } from '../../model/restaurant.model';

@Component({
  selector: 'app-admin-header',
  imports: [CommonModule],
  templateUrl: './admin-header.component.html',
  styleUrl: './admin-header.component.scss'
})
export class AdminHeaderComponent implements OnInit {

  notifications: AdminNotification[] = [];
  unreadCount = 0;
  showDropdown = false;

  constructor(
    private tokenService: TokenService,
    private router: Router,
    private adminService: AdminService
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    this.adminService.getNotifications().subscribe({
      next: res => {
        this.notifications = res.data ?? [];
        this.unreadCount = this.notifications.length;
      }
    });
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) {
      this.unreadCount = 0;
    }
  }

  @HostListener('document:click')
  closeDropdown() {
    this.showDropdown = false;
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  logout() {
    if (confirm('Logout from admin panel?')) {
      this.tokenService.clearTokens();
      this.router.navigateByUrl('/admin/login');
    }
  }
}
