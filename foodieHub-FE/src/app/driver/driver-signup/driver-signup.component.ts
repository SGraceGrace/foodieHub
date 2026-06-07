import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { DriverService } from '../driver.service';

@Component({
  selector: 'app-driver-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './driver-signup.component.html',
  styleUrl: './driver-signup.component.scss',
})
export class DriverSignupComponent {
  step = 1;
  showPassword = false;

  step1Form: FormGroup;
  step2Form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastr: ToastrService,
    private driverService: DriverService,
  ) {
    this.step1Form = this.fb.group({
      fullName:  ['', [Validators.required, Validators.minLength(2)]],
      email:     ['', [Validators.required, Validators.email]],
      phone:     ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    });

    this.step2Form = this.fb.group({
      vehicleType: ['', Validators.required],
      licenseNumber: ['', [Validators.required, Validators.minLength(4)]],
      bankAccount:   ['', [Validators.required, Validators.minLength(9)]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(15),
        Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,15}$'),
      ]],
      agreeTerms: [false, Validators.requiredTrue],
    });
  }

  nextStep() {
    if (this.step1Form.invalid) { this.step1Form.markAllAsTouched(); return; }
    this.step = 2;
  }

  prevStep() { this.step = 1; }

  onSubmit() {
    if (this.step2Form.invalid) { this.step2Form.markAllAsTouched(); return; }

    const [firstName, ...rest] = (this.step1Form.get('fullName')!.value as string).trim().split(' ');
    const lastName = rest.join(' ');

    this.driverService.register({
      firstName,
      lastName,
      email:         this.step1Form.get('email')!.value,
      phone:         this.step1Form.get('phone')!.value,
      vehicleType:   this.step2Form.get('vehicleType')!.value,
      licenseNumber: this.step2Form.get('licenseNumber')!.value,
      bankAccount:   this.step2Form.get('bankAccount')!.value,
      password:      this.step2Form.get('password')!.value,
    }).subscribe({
      next: (res) => {
        this.toastr.success(res.successMessage || 'Application submitted! Awaiting admin approval.');
        this.router.navigateByUrl('/driver/login');
      },
      error: (err) => {
        const msg = err?.error?.errorMsg;
        this.toastr.error(Array.isArray(msg) ? msg.join('\n') : msg || 'Registration failed.');
      },
    });
  }

  get fullName()      { return this.step1Form.get('fullName'); }
  get email()         { return this.step1Form.get('email'); }
  get phone()         { return this.step1Form.get('phone'); }
  get vehicleType()   { return this.step2Form.get('vehicleType'); }
  get licenseNumber() { return this.step2Form.get('licenseNumber'); }
  get bankAccount()   { return this.step2Form.get('bankAccount'); }
  get password()      { return this.step2Form.get('password'); }

  get pwHasLength():   boolean { return (this.password?.value?.length ?? 0) >= 8; }
  get pwHasUpper():    boolean { return /[A-Z]/.test(this.password?.value ?? ''); }
  get pwHasLower():    boolean { return /[a-z]/.test(this.password?.value ?? ''); }
  get pwHasNumber():   boolean { return /[0-9]/.test(this.password?.value ?? ''); }
  get pwHasSpecial():  boolean { return /[!@#$%^&*]/.test(this.password?.value ?? ''); }
}
