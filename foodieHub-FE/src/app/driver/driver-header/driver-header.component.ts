import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { TokenService } from '../../core/shared/token.service';

@Component({
  selector: 'app-driver-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './driver-header.component.html',
  styleUrl: './driver-header.component.scss',
})
export class DriverHeaderComponent {
  @Output() navigateTab = new EventEmitter<string>();

  driverInitials = 'DR';

  constructor(private router: Router, private toastr: ToastrService, private tokenService: TokenService) {
    const info = localStorage.getItem('driverInfo');
    if (info) {
      const driver = JSON.parse(info);
      const name: string = driver?.firstName ?? driver?.name ?? '';
      if (name) {
        this.driverInitials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
      }
    }
  }

  logout() {
    if (confirm('Logout from driver account?')) {
      localStorage.removeItem('driverAuthenticated');
      localStorage.removeItem('driverInfo');
      this.tokenService.clearTokens();
      this.router.navigateByUrl('/driver/login');
    }
  }

  goProfile() { this.navigateTab.emit('profile'); }
}
