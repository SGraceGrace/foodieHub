import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CloudinaryService } from '../core/shared/cloudinary.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { LoginService } from './login.service';
import { Login } from '../model/login.model';
import { DeviceService } from '../core/shared/device.service';
import { ApiResponse } from '../model/apiResponse.model';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Router, RouterModule } from '@angular/router';
import { TokenService } from '../core/shared/token.service';
import { UserService } from '../user/user.service';
import { UserDetails } from '../model/user.model';
import { toUserDetails } from '../convertors/user-details.converter';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatButtonModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  loginBigScreenUrl!: string;
  loginSmallScreenUrl!: string;
  loginForm!: FormGroup;
  showRules: boolean = false;
  showPassword = false;

  loginData!: Login;
  userDetails!: UserDetails;

  constructor(
    private cloudinaryService: CloudinaryService,
    private fb: FormBuilder,
    private loginService: LoginService,
    private deviceService: DeviceService,
    private toastr: ToastrService,
    private router: Router,
    private tokenService: TokenService,
    private userService: UserService
  ) {
    this.loginForm = this.fb.group({
      email: ['', Validators.required],
      pwd: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(15),
          Validators.pattern(
            '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,15}$'
          ),
        ],
      ],
    });
  }

  ngOnInit(): void {
    const cld = this.cloudinaryService.getInstance();
    this.loginBigScreenUrl = cld.image('docs/models').toURL();
    this.loginSmallScreenUrl = cld.image('docs/loginbackgroundsmall').toURL();
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, pwd } = this.loginForm.getRawValue();

      this.loginData = {
        username: email.trim(),
        password: pwd.trim(),
        deviceId: this.deviceService.getDeviceId(),
      };
      this.loginService.onLogin(this.loginData).subscribe({
        next: (response) => {
          const accessToken = response.headers.get('Authorization');
          const refreshToken = response.headers.get('X-Refresh-Token');
          const toast = this.toastr.success(
            response.successMessage || 'Login Successful!'
          );
          toast.onHidden?.subscribe(() => {
            this.loginForm.reset();
            this.tokenService.setTokens(accessToken, refreshToken);
            this.userService.getUserInfo().subscribe({
              next: (apiResponse) => {
                this.userDetails = toUserDetails(apiResponse.data);
                this.tokenService.setUserInfo(this.userDetails);
                this.router.navigateByUrl('/home');
              },
              error: (error) => {
                this.router.navigateByUrl('/login');
                this.tokenService.clearTokens();
                this.toastr.error(
                  Array.isArray(error?.errorMsg)
                    ? error.errorMsg.join('\n')
                    : error?.errorMsg || 'Something went wrong',
                  'Try again...'
                );
              },
            });
          });
        },
        error: (error: HttpErrorResponse) => {
          const backendError = error.error as ApiResponse<any>;
          this.toastr.error(
            Array.isArray(backendError?.errorMsg)
              ? backendError.errorMsg.join('\n')
              : backendError?.errorMsg || 'Something went wrong',
            'Try again...'
          );
        },
      });
    }
  }

  hideRules() {
    const pwdControl = this.loginForm.get('pwd');
    if (!pwdControl?.value) {
      this.showRules = false;
    }
  }

  get pwd() {
    return this.loginForm.get('pwd');
  }

  get pwdValue(): string {
    return this.loginForm.get('pwd')?.value || '';
  }

  get isMinLength(): boolean {
    return this.pwdValue.length >= 8;
  }
  get isMaxLength(): boolean {
    return this.pwdValue.length <= 15 && this.pwdValue.length > 0;
  }
  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.pwdValue);
  }
  get hasLowercase(): boolean {
    return /[a-z]/.test(this.pwdValue);
  }
  get hasNumber(): boolean {
    return /[0-9]/.test(this.pwdValue);
  }
  get hasSpecial(): boolean {
    return /[!@#$%^&*]/.test(this.pwdValue);
  }
}
