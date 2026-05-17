import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { LoginService } from '../../login/login.service';
import { TokenService } from '../../core/shared/token.service';
import { UserService } from '../../user/user.service';
import { DeviceService } from '../../core/shared/device.service';
import { ApiResponse } from '../../model/apiResponse.model';
import { toUserDetails } from '../../convertors/user-details.converter';

@Component({
  selector: 'app-partner-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './partner-login.component.html',
  styleUrl: './partner-login.component.scss',
})
export class PartnerLoginComponent {
  form: FormGroup;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private loginService: LoginService,
    private tokenService: TokenService,
    private userService: UserService,
    private deviceService: DeviceService,
    private toastr: ToastrService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    const { email, password } = this.form.getRawValue();

    this.loginService.onLogin({
      username: email.trim(),
      password: password.trim(),
      deviceId: this.deviceService.getDeviceId(),
    }).subscribe({
      next: (response: HttpResponse<ApiResponse<any>>) => {
        const accessToken  = response.headers.get('Authorization') ?? '';
        const refreshToken = response.headers.get('X-Refresh-Token') ?? '';
        this.tokenService.setTokens(accessToken, refreshToken);

        this.userService.getUserInfo().subscribe({
          next: (res) => {
            const user = toUserDetails(res.data);
            if (user.role?.roleName !== 'RESTAURANT_OWNER') {
              this.tokenService.clearTokens();
              this.toastr.error('This portal is for restaurant partners only.');
              return;
            }
            this.tokenService.setUserInfo(user);
            this.toastr.success('Welcome back!');
            this.router.navigateByUrl('/partner');
          },
          error: () => {
            this.tokenService.clearTokens();
            this.toastr.error('Something went wrong. Please try again.');
          },
        });
      },
      error: (err) => {
        const msg = err?.error?.errorMsg;
        this.toastr.error(Array.isArray(msg) ? msg.join('\n') : msg || 'Invalid credentials.');
      },
    });
  }
}
