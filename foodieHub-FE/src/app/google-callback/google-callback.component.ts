import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TokenService } from '../core/shared/token.service';
import { UserService } from '../user/user.service';
import { ToastrService } from 'ngx-toastr';
import { toUserDetails } from '../convertors/user-details.converter';
import { UserDetails } from '../model/user.model';

@Component({
  selector: 'app-google-callback',
  imports: [],
  templateUrl: './google-callback.component.html',
  styleUrl: './google-callback.component.scss'
})
export class GoogleCallbackComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tokenService: TokenService,
    private userService: UserService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const accessToken = this.route.snapshot.queryParamMap.get('accessToken');
    const refreshToken = this.route.snapshot.queryParamMap.get('refreshToken');

    if (!accessToken || !refreshToken) {
      this.toastr.error('Missing tokens from Google login');
      this.router.navigate(['/login']);
      return;
    }

    this.tokenService.setTokens(`Bearer ${accessToken}`, refreshToken);

    // Fetch user info exactly like your normal login
    this.userService.getUserInfo().subscribe({
      next: (apiResponse) => {
        const user: UserDetails = toUserDetails(apiResponse.data);
        this.tokenService.setUserInfo(user);
        this.toastr.success('Login Successful!');
        const returnUrl =
          this.route.snapshot.queryParamMap.get('returnUrl') || '/home';
        this.router.navigateByUrl(returnUrl);
      },
      error: () => {
        this.tokenService.clearTokens();
        this.router.navigate(['/login']);
        this.toastr.error('Could not fetch user info');
      }
    });
  }

}
