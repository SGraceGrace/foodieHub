import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { PartnerService } from '../partner.service';

@Component({
  selector: 'app-partner-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './partner-signup.component.html',
  styleUrl: './partner-signup.component.scss',
})
export class PartnerSignupComponent {
  form: FormGroup;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private partnerService: PartnerService,
    private toastr: ToastrService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      firstName:         ['', Validators.required],
      lastName:          ['', Validators.required],
      restaurantName:    ['', Validators.required],
      restaurantAddress: ['', Validators.required],
      fssaiNumber:       ['', [Validators.required, Validators.pattern('^[0-9]{14}$')]],
      gstNumber:         [''],
      email:             ['', [Validators.required, Validators.email]],
      phone:             ['', Validators.required],
      password:          ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern('^(?=.*[A-Z])(?=.*[0-9]).{8,}$'),
      ]],
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.partnerService.register(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.toastr.success(res.successMessage || 'Registration submitted! Await admin approval.');
        this.router.navigateByUrl('/partner/login');
      },
      error: (err) => {
        const msg = err?.error?.errorMsg;
        this.toastr.error(Array.isArray(msg) ? msg.join('\n') : msg || 'Registration failed.');
      },
    });
  }

  get pwdValue(): string { return this.form.get('password')?.value || ''; }
  get pwHasLength():   boolean { return this.pwdValue.length >= 8; }
  get pwHasUppercase():boolean { return /[A-Z]/.test(this.pwdValue); }
  get pwHasNumber():   boolean { return /[0-9]/.test(this.pwdValue); }

  get fssaiInvalid(): boolean {
    const ctrl = this.form.get('fssaiNumber');
    return !!(ctrl?.invalid && ctrl?.dirty);
  }
}
