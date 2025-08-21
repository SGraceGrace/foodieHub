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

  constructor(
    private cloudinaryService: CloudinaryService,
    private fb: FormBuilder
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
      const { uname, pwd } = this.loginForm.value;
      console.log('Form Submitted', { uname, pwd });
      this.loginForm.reset();
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
