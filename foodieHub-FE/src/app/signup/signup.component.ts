import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCard, MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { RouterModule } from '@angular/router';
import { CloudinaryService } from '../core/shared/cloudinary.service';

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

  constructor(private cloudinaryService: CloudinaryService, private fb: FormBuilder) {
    this.signupForm = this.fb.group({
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
