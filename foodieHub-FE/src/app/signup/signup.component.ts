import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SignupService } from './signup.service';
import { Signup } from '../model/signup.model';
import { DeviceService } from '../core/shared/device.service';
import { TokenService } from '../core/shared/token.service';
import { UserService } from '../user/user.service';
import { UserDetails } from '../model/user.model';
import { toUserDetails } from '../convertors/user-details.converter';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent implements OnInit, OnDestroy {
  signupForm: FormGroup;
  showRules = false;
  showPassword = false;

  slides = [
    { emoji: '🎉', title: 'Join FoodieHub Today!',     desc: 'Get ₹100 off your first order. Fresh food from the best restaurants, delivered fast.' },
    { emoji: '🍕', title: 'Hot Deals Every Day',       desc: 'Save up to 40% on your favourite meals with exclusive daily offers.' },
    { emoji: '🚀', title: 'Lightning Fast Delivery',   desc: 'Get your food delivered in 30 minutes or less, guaranteed fresh.' },
  ];
  currentSlide = 0;
  animating = false;

  private slideInterval: any;
  private userDetails!: UserDetails;

  constructor(
    private fb: FormBuilder,
    private signupService: SignupService,
    private toastr: ToastrService,
    private router: Router,
    private userService: UserService,
    private tokenService: TokenService,
    private deviceService: DeviceService,
    private cdr: ChangeDetectorRef,
  ) {
    this.signupForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName:  ['', Validators.required],
      email:     ['', Validators.required],
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
    if (this.signupForm.valid) {
      const { firstName, lastName, email, pwd } = this.signupForm.getRawValue();
      const signupRequest: Signup = {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     email.trim(),
        password:  pwd.trim(),
        deviceId:  this.deviceService.getDeviceId(),
      };
      this.signupService.onSignup(signupRequest).subscribe({
        next: (response) => {
          const accessToken  = response.headers?.get?.('Authorization') ?? '';
          const refreshToken = response.headers?.get?.('X-Refresh-Token') ?? '';
          this.tokenService.setTokens(accessToken, refreshToken);
          this.userService.getUserInfo().subscribe({
            next: (apiResponse) => {
              this.userDetails = toUserDetails(apiResponse.data);
              this.tokenService.setUserInfo(this.userDetails);
              this.toastr.success('Signup Successful!');
              this.signupForm.reset();
              this.router.navigateByUrl('/home');
            },
            error: () => {
              this.tokenService.clearTokens();
              this.router.navigateByUrl('/login');
              this.toastr.error('Something went wrong', 'Try again...');
            },
          });
        },
        error: (error) => {
          const backendError = error.error;
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
    if (!this.signupForm.get('pwd')?.value) {
      this.showRules = false;
    }
  }

  signInWithGoogle() {
    const deviceId = this.deviceService.getDeviceId();
    window.location.href = `http://localhost:8080/oauth2/authorization/google?deviceId=${encodeURIComponent(deviceId)}`;
  }

  get pwd() { return this.signupForm.get('pwd'); }

  private get pwdValue(): string { return this.pwd?.value || ''; }

  get isMinLength(): boolean { return this.pwdValue.length >= 8; }
  get isMaxLength(): boolean { return this.pwdValue.length <= 15 && this.pwdValue.length > 0; }
  get hasUppercase(): boolean { return /[A-Z]/.test(this.pwdValue); }
  get hasLowercase(): boolean { return /[a-z]/.test(this.pwdValue); }
  get hasNumber(): boolean    { return /[0-9]/.test(this.pwdValue); }
  get hasSpecial(): boolean   { return /[!@#$%^&*]/.test(this.pwdValue); }
}
