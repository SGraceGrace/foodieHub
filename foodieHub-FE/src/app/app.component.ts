import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, RouterOutlet, Router } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { map } from 'rxjs';
import { TokenService } from './core/shared/token.service';
import { UserHeaderComponent } from "./user/user-header/user-header.component";
import { AdminHeaderComponent } from "./admin/admin-header/admin-header.component";
import { GlobalLoaderComponent } from "./core/shared/components/global-loader/global-loader.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, HeaderComponent, UserHeaderComponent, AdminHeaderComponent, GlobalLoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'foodieHub-FE';
  currentUrl: string = '';
  showHeader: boolean = true;

  role$: any;

  constructor(private router: Router, private tokenService: TokenService) {
    this.role$ = this.tokenService.userInfo$.pipe(
      map(user => user?.role?.roleName ?? 'guest')
    );
    
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentUrl = event.url;
        const path = event.urlAfterRedirects.split('?')[0];
        this.showHeader = path !== '/login' && path !== '/signup' && path !== '/admin/login';
      }
    });
  }
}
