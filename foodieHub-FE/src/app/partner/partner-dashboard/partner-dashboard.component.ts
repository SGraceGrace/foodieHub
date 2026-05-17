import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TokenService } from '../../core/shared/token.service';
import { UserDetails } from '../../model/user.model';

type Tab = 'dashboard' | 'orders' | 'menu' | 'analytics' | 'settings';

@Component({
  selector: 'app-partner-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './partner-dashboard.component.html',
  styleUrl: './partner-dashboard.component.scss',
})
export class PartnerDashboardComponent implements OnInit {
  activeTab: Tab = 'dashboard';
  user: UserDetails | null = null;

  get restaurantName(): string { return this.user?.bio || 'My Restaurant'; }
  get ownerInitials(): string {
    const f = this.user?.firstName?.[0] ?? '';
    const l = this.user?.lastName?.[0] ?? '';
    return (f + l).toUpperCase() || 'RO';
  }

  constructor(private tokenService: TokenService, private router: Router) {}

  ngOnInit() {
    this.tokenService.userInfo$.subscribe(u => this.user = u);
  }

  goTab(tab: Tab) { this.activeTab = tab; }

  logout() {
    if (confirm('Logout?')) {
      this.tokenService.clearTokens();
      this.router.navigateByUrl('/partner/login');
    }
  }
}
