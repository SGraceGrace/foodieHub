import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LoginService } from '../../login/login.service';
import { Login } from '../../model/login.model';
import { ApiResponse } from '../../model/apiResponse.model';
import { DeviceService } from '../../core/shared/device.service';
import { TokenService } from '../../core/shared/token.service';
import { UserService } from '../../user/user.service';
import { UserDetails } from '../../model/user.model';
import { toUserDetails } from '../../convertors/user-details.converter';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginComponent implements OnInit {
  loginForm: FormGroup;
  showPassword = false;
  showRules = false;

  constructor(
    private fb: FormBuilder,
    private loginService: LoginService,
    private deviceService: DeviceService,
    private toastr: ToastrService,
    private router: Router,
    private tokenService: TokenService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
  ) {
    this.loginForm = this.fb.group({
      email: ['', Validators.required],
      pwd: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(15),
        Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,15}$'),
      ]],
    });
  }

  ngOnInit() {
    const userInfo = localStorage.getItem('userInfo');
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (isAuthenticated && userInfo) {
      const user: UserDetails = JSON.parse(userInfo);
      if (user.role?.roleName === 'ADMIN' || user.role?.roleName === 'SUPER_ADMIN') {
        this.router.navigateByUrl('/admin');
      }
    }
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, pwd } = this.loginForm.getRawValue();
      const loginData: Login = {
        username: email.trim(),
        password: pwd.trim(),
        deviceId: this.deviceService.getDeviceId(),
      };
      this.loginService.onLogin(loginData).subscribe({
        next: (response) => this.handleLoginResponse(response),
        error: (error: HttpErrorResponse) => {
          const backendError = error.error as ApiResponse<any>;
          this.toastr.error(
            Array.isArray(backendError?.errorMsg)
              ? backendError.errorMsg.join('\n')
              : backendError?.errorMsg || 'Something went wrong',
            'Login Failed'
          );
        },
      });
    }
  }

  hideRules() {
    if (!this.loginForm.get('pwd')?.value) {
      this.showRules = false;
    }
  }

  get pwd() { return this.loginForm.get('pwd'); }
  private get pwdValue(): string { return this.pwd?.value || ''; }
  get isMinLength(): boolean { return this.pwdValue.length >= 8; }
  get isMaxLength(): boolean { return this.pwdValue.length <= 15 && this.pwdValue.length > 0; }
  get hasUppercase(): boolean { return /[A-Z]/.test(this.pwdValue); }
  get hasLowercase(): boolean { return /[a-z]/.test(this.pwdValue); }
  get hasNumber(): boolean    { return /[0-9]/.test(this.pwdValue); }
  get hasSpecial(): boolean   { return /[!@#$%^&*]/.test(this.pwdValue); }

  private handleLoginResponse(response: HttpResponse<ApiResponse<any>>) {
    const accessToken  = response.headers.get('Authorization') ?? '';
    const refreshToken = response.headers.get('X-Refresh-Token') ?? '';
    this.tokenService.setTokens(accessToken, refreshToken);

    this.userService.getUserInfo().subscribe({
      next: (apiResponse) => {
        const userDetails = toUserDetails(apiResponse.data);
        const role = userDetails.role?.roleName;
        if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
          this.tokenService.clearTokens();
          this.toastr.error('You are not authorized to access the admin portal.', 'Access Denied');
          this.loginForm.reset();
          this.cdr.markForCheck();
          return;
        }
        this.tokenService.setUserInfo(userDetails);
        this.toastr.success('Welcome, Admin!');
        this.router.navigateByUrl('/admin');
      },
      error: () => {
        this.tokenService.clearTokens();
        this.toastr.error('Something went wrong', 'Try again...');
      },
    });
  }
}
