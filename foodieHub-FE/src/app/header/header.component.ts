import { Component } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SharedServiceService } from '../core/shared/shared-service.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterModule, ReactiveFormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  searchControl = new FormControl('');
  searchFocused = false;

  constructor(
    private router: Router,
    private sharedService: SharedServiceService
  ) {}

  onSearch() {
    const searchTerm = this.searchControl.value ?? '';
    this.router.navigateByUrl('/user/search');
    this.sharedService.onSearch(searchTerm);
    this.searchControl.reset();
  }

  onLogin() {
    this.router.navigateByUrl('/login');
  }

  onSignup() {
    this.router.navigateByUrl('/signup');
  }
}
