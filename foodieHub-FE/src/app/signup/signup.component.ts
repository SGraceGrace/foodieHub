import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { RouterModule } from '@angular/router';
import { CloudinaryService } from '../core/shared/cloudinary.service';
import { SignupService } from './signup.service';
import { Signup } from '../model/signup.model';
import { UserService } from '../user/user.service';
import { TokenService } from '../core/shared/token.service';
import { UserDetails } from '../model/user.model';
import { toUserDetails } from '../convertors/user-details.converter';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { DeviceService } from '../core/shared/device.service';

@Component({
  selector: 'app-signup',
  imports: [
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatButtonModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
})
export class SignupComponent implements OnInit {
  signupBigScreenUrl!: string;
  signupSmallScreenUrl!: string;
  signupForm!: FormGroup;
  showRules: boolean = false;
  showPassword = false;

  userDetails!: UserDetails;

  constructor(
    private cloudinaryService: CloudinaryService,
    private fb: FormBuilder,
    private signupService: SignupService,
    private toastr: ToastrService,
    private router: Router,
    private userService: UserService,
    private tokenService: TokenService,
    private deviceService: DeviceService
  ) {
    this.signupForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
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

  ngOnInit() {
    const cld = this.cloudinaryService.getInstance();
    this.signupBigScreenUrl = cld.image('docs/models').toURL();
    this.signupSmallScreenUrl = cld.image('docs/loginbackgroundsmall').toURL();
  }

  onSubmit() {
    if (this.signupForm.valid) {
      const { firstName, lastName, email, pwd } = this.signupForm.getRawValue();
      const signupRequest: Signup = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password: pwd.trim(),
        deviceId: this.deviceService.getDeviceId()
      };
      this.signupService.onSignup(signupRequest).subscribe({
        next: (response) => {
          const accessToken = response.headers?.get?.('Authorization');
          const refreshToken = response.headers?.get?.('X-Refresh-Token');
          this.tokenService.setTokens(accessToken, refreshToken);
          this.userService.getUserInfo().subscribe({
            next: (apiResponse) => {
              this.userDetails = toUserDetails(apiResponse.data);
              this.tokenService.setUserInfo(this.userDetails);
              this.toastr.success('Signup Successful!');
              this.signupForm.reset();
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
    const pwdControl = this.signupForm.get('pwd');
    if (!pwdControl?.value) {
      this.showRules = false;
    }
  }

  get pwd() {
    return this.signupForm.get('pwd');
  }

  get pwdValue(): string {
    return this.signupForm.get('pwd')?.value || '';
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
