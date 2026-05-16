import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LoginService } from './login.service';
import { Login } from '../model/login.model';
import { ApiResponse } from '../model/apiResponse.model';
import { DeviceService } from '../core/shared/device.service';
import { TokenService } from '../core/shared/token.service';
import { UserService } from '../user/user.service';
import { UserDetails } from '../model/user.model';
import { toUserDetails } from '../convertors/user-details.converter';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  showRules = false;
  showPassword = false;

  slides = [
    { emoji: '🍜', title: 'Order Your Favourite Food',  desc: 'Discover the best food from 1,200+ restaurants with fast delivery to your door.' },
    { emoji: '🍕', title: 'Hot Deals Every Day',        desc: 'Save up to 40% on your favourite meals with exclusive daily offers.' },
    { emoji: '🚀', title: 'Lightning Fast Delivery',    desc: 'Get your food delivered in 30 minutes or less, guaranteed fresh.' },
  ];
  currentSlide = 0;
  animating = false;

  private slideInterval: any;
  private loginData!: Login;
  private userDetails!: UserDetails;

  constructor(
    private fb: FormBuilder,
    private loginService: LoginService,
    private deviceService: DeviceService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
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
    this.slideInterval = setInterval(() => this.goToSlide((this.currentSlide + 1) % this.slides.length), 3500);
  }

  ngOnDestroy() {
    clearInterval(this.slideInterval);
  }

  goToSlide(index: number) {
    if (this.animating || index === this.currentSlide) return;
    this.animating = true;
    this.currentSlide = index;
    this.cdr.markForCheck();
    setTimeout(() => { this.animating = false; this.cdr.markForCheck(); }, 400);
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
        next: (response) => this.postLoginRedirect(response),
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
    if (!this.loginForm.get('pwd')?.value) {
      this.showRules = false;
    }
  }

  signInWithGoogle() {
    const deviceId = this.deviceService.getDeviceId();
    window.location.href = `http://localhost:8080/oauth2/authorization/google?deviceId=${encodeURIComponent(deviceId)}`;
  }

  get pwd() { return this.loginForm.get('pwd'); }

  private get pwdValue(): string { return this.pwd?.value || ''; }

  get isMinLength(): boolean { return this.pwdValue.length >= 8; }
  get isMaxLength(): boolean { return this.pwdValue.length <= 15 && this.pwdValue.length > 0; }
  get hasUppercase(): boolean { return /[A-Z]/.test(this.pwdValue); }
  get hasLowercase(): boolean { return /[a-z]/.test(this.pwdValue); }
  get hasNumber(): boolean    { return /[0-9]/.test(this.pwdValue); }
  get hasSpecial(): boolean   { return /[!@#$%^&*]/.test(this.pwdValue); }

  private postLoginRedirect(response: HttpResponse<ApiResponse<any>>) {
    const accessToken  = response.headers.get('Authorization') ?? '';
    const refreshToken = response.headers.get('X-Refresh-Token') ?? '';
    this.tokenService.setTokens(accessToken, refreshToken);

    this.userService.getUserInfo().subscribe({
      next: (apiResponse) => {
        this.userDetails = toUserDetails(apiResponse.data);
        this.tokenService.setUserInfo(this.userDetails);
        this.toastr.success('Login Successful!');
        this.loginForm.reset();
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/home';
        this.router.navigateByUrl(returnUrl);
      },
      error: () => {
        this.tokenService.clearTokens();
        this.router.navigateByUrl('/login');
        this.toastr.error('Something went wrong', 'Try again...');
      },
    });
  }
}
