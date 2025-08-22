import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CloudinaryImage } from '@cloudinary/url-gen/index';
import { CloudinaryService } from '../shared/cloudinary.service';
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
import Swal from 'sweetalert2';
import { DeviceService } from '../shared/device.service';
import { ApiResponse } from '../model/apiResponse.model';
import { JwtResponse } from '../model/jwtResponse.model';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatButtonModule,
    ReactiveFormsModule,
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

  loginData!: Login;

  constructor(
    private cloudinaryService: CloudinaryService,
    private fb: FormBuilder,
    private loginService: LoginService,
    private deviceService: DeviceService,
    private toastr: ToastrService
  ) {
    this.loginForm = this.fb.group({
      uname: ['', Validators.required],
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
      const { uname, pwd } = this.loginForm.getRawValue();

      this.loginData = {
        username: uname.trim(),
        password: pwd.trim(),
        deviceId: this.deviceService.getDeviceId(),
      };

      console.log('Login successful', this.loginData);

      this.loginService.onLogin(this.loginData).subscribe({
        next: (response: ApiResponse<JwtResponse>) => {
          console.log('Login successful', response);
          this.toastr.success(response.successMessage || 'Login Successful!');
          this.loginForm.reset();
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
