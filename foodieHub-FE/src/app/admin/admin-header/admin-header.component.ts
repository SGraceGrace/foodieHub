import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TokenService } from '../../core/shared/token.service';

@Component({
  selector: 'app-admin-header',
  imports: [],
  templateUrl: './admin-header.component.html',
  styleUrl: './admin-header.component.scss'
})
export class AdminHeaderComponent {

  constructor(private tokenService: TokenService, private router: Router) {}

  logout() {
    if (confirm('Logout from admin panel?')) {
      this.tokenService.clearTokens();
      this.router.navigateByUrl('/admin/login');
    }
  }
}
