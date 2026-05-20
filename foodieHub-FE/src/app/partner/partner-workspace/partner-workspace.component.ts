import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TokenService } from '../../core/shared/token.service';
import { PartnerService } from '../partner.service';
import { UserDetails } from '../../model/user.model';
import { Restaurant, DaySchedule } from '../../model/restaurant.model';

type WorkspaceTab = 'overview' | 'orders' | 'menu' | 'analytics' | 'hours' | 'settings';

export interface DayHours {
  day: string;
  short: string;
  open: boolean;
  openTime: string;
  closeTime: string;
}

@Component({
  selector: 'app-partner-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partner-workspace.component.html',
  styleUrl: './partner-workspace.component.scss',
})
export class PartnerWorkspaceComponent implements OnInit {
  activeTab: WorkspaceTab = 'overview';
  user: UserDetails | null = null;
  restaurant: Restaurant | null = null;
  loading = false;

  // ── Operating hours ──────────────────────────────────────────────
  hours: DayHours[] = [
    { day: 'Monday',    short: 'MON', open: true,  openTime: '09:00', closeTime: '22:00' },
    { day: 'Tuesday',   short: 'TUE', open: true,  openTime: '09:00', closeTime: '22:00' },
    { day: 'Wednesday', short: 'WED', open: true,  openTime: '09:00', closeTime: '22:00' },
    { day: 'Thursday',  short: 'THU', open: true,  openTime: '09:00', closeTime: '22:00' },
    { day: 'Friday',    short: 'FRI', open: true,  openTime: '09:00', closeTime: '23:00' },
    { day: 'Saturday',  short: 'SAT', open: true,  openTime: '10:00', closeTime: '23:00' },
    { day: 'Sunday',    short: 'SUN', open: false, openTime: '10:00', closeTime: '22:00' },
  ];
  savingHours = false;
  hoursSavedMsg = '';

  get openDaysCount(): number {
    return this.hours.filter(h => h.open).length;
  }

  applyToAllDays(source: DayHours) {
    this.hours = this.hours.map(h => ({
      ...h,
      openTime:  source.openTime,
      closeTime: source.closeTime,
    }));
  }

  saveHours() {
    if (!this.restaurant) return;
    this.savingHours = true;
    this.hoursSavedMsg = '';

    const payload: DaySchedule[] = this.hours.map(h => ({
      day:       h.day.toUpperCase(),
      open:      h.open,
      openTime:  h.openTime,
      closeTime: h.closeTime,
    }));

    this.partnerService.updateRestaurantHours(this.restaurant.id, payload).subscribe({
      next: res => {
        if (res.data) this.restaurant = res.data;
        this.savingHours = false;
        this.hoursSavedMsg = 'Hours saved successfully.';
        setTimeout(() => { this.hoursSavedMsg = ''; }, 3000);
      },
      error: () => {
        this.savingHours = false;
        this.hoursSavedMsg = 'Failed to save. Please try again.';
        setTimeout(() => { this.hoursSavedMsg = ''; }, 3000);
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────
  get ownerInitials(): string {
    const f = this.user?.firstName?.[0] ?? '';
    const l = this.user?.lastName?.[0] ?? '';
    return (f + l).toUpperCase() || 'RO';
  }

  get ownerName(): string {
    return [this.user?.firstName, this.user?.lastName].filter(Boolean).join(' ') || 'Owner';
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tokenService: TokenService,
    private partnerService: PartnerService
  ) {}

  ngOnInit() {
    this.tokenService.userInfo$.subscribe(u => this.user = u);
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadRestaurant(id);
  }

  loadRestaurant(id: string) {
    this.loading = true;
    this.partnerService.getRestaurantById(id).subscribe({
      next: res => {
        this.restaurant = res.data ?? null;
        if (this.restaurant?.operatingHours?.length) {
          this.hours = this.mapHoursFromApi(this.restaurant.operatingHours);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.router.navigateByUrl('/partner');
      }
    });
  }

  private mapHoursFromApi(apiHours: DaySchedule[]): DayHours[] {
    return this.hours.map(d => {
      const match = apiHours.find(h => h.day.toUpperCase() === d.day.toUpperCase());
      return match ? { ...d, open: match.open, openTime: match.openTime, closeTime: match.closeTime } : d;
    });
  }

  goTab(tab: WorkspaceTab) {
    this.activeTab = tab;
  }

  goBack() {
    this.router.navigateByUrl('/partner');
  }

  logout() {
    if (confirm('Logout?')) {
      this.tokenService.clearTokens();
      this.router.navigateByUrl('/partner/login');
    }
  }

  getMenuItemCount(): number {
    if (!this.restaurant?.menu) return 0;
    return this.restaurant.menu.reduce((sum, cat) => sum + (cat.items?.length ?? 0), 0);
  }

  formatTime(t: string): string {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  }
}
