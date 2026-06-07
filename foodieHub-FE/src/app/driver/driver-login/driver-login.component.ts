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
  selector: 'app-driver-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './driver-login.component.html',
  styleUrl: './driver-login.component.scss',
})
export class DriverLoginComponent {
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

    if (localStorage.getItem('driverAuthenticated') === 'true') {
      this.router.navigateByUrl('/driver');
    }
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
            if (user.role?.roleName !== 'DRIVER') {
              this.tokenService.clearTokens();
              this.toastr.error('This portal is for delivery partners only.');
              return;
            }
            localStorage.setItem('driverInfo', JSON.stringify(res.data));
            localStorage.setItem('driverAuthenticated', 'true');
            this.toastr.success('Welcome back!');
            this.router.navigateByUrl('/driver');
          },
          error: () => {
            this.tokenService.clearTokens();
            this.toastr.error('Something went wrong. Please try again.');
          },
        });
      },
      error: (err) => {
        const msg = err?.error?.errorMsg;
        const text = Array.isArray(msg) ? msg.join('\n') : msg;
        if (err?.status === 403) {
          this.toastr.warning(text || 'Your account is pending admin approval.', 'Pending Approval');
        } else {
          this.toastr.error(text || 'Invalid credentials.');
        }
      },
    });
  }

  get email()    { return this.form.get('email'); }
  get password() { return this.form.get('password'); }
}
