import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { PartnerService } from '../partner.service';
import { LocationPickerComponent, PickedLocation } from '../../core/shared/components/location-picker/location-picker.component';
import { DaySchedule } from '../../model/restaurant.model';

const CUISINES = [
  'North Indian', 'South Indian', 'Chinese', 'Continental', 'Italian',
  'Mexican', 'Biryani', 'Fast Food', 'Pizza', 'Desserts',
  'Seafood', 'Mughlai', 'Thai', 'Lebanese', 'Beverages', 'Breakfast',
];

@Component({
  selector: 'app-partner-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, LocationPickerComponent],
  templateUrl: './partner-signup.component.html',
  styleUrl: './partner-signup.component.scss',
})
export class PartnerSignupComponent {
  currentStep = 1;

  form: FormGroup;
  showPassword = false;
  showLocationPicker = false;
  restaurantLocation: PickedLocation | null = null;
  locationError = false;

  readonly cuisines = CUISINES;
  selectedCuisines = new Set<string>();
  cuisineError = false;

  operatingHours: DaySchedule[] = [
    { day: 'Monday',    open: true,  openTime: '09:00', closeTime: '22:00' },
    { day: 'Tuesday',   open: true,  openTime: '09:00', closeTime: '22:00' },
    { day: 'Wednesday', open: true,  openTime: '09:00', closeTime: '22:00' },
    { day: 'Thursday',  open: true,  openTime: '09:00', closeTime: '22:00' },
    { day: 'Friday',    open: true,  openTime: '09:00', closeTime: '22:00' },
    { day: 'Saturday',  open: true,  openTime: '10:00', closeTime: '22:00' },
    { day: 'Sunday',    open: false, openTime: '10:00', closeTime: '22:00' },
  ];

  private readonly step1Keys = ['firstName', 'lastName', 'email', 'phone', 'password'];

  constructor(
    private fb: FormBuilder,
    private partnerService: PartnerService,
    private toastr: ToastrService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      // Step 1 — owner details
      firstName: ['', Validators.required],
      lastName:  ['', Validators.required],
      email:     ['', [Validators.required, Validators.email]],
      phone:     ['', Validators.required],
      password:  ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern('^(?=.*[A-Z])(?=.*[0-9]).{8,}$'),
      ]],
      // Step 2 — restaurant details
      restaurantName: ['', Validators.required],
      imageUrl:       [''],
      fssaiNumber:    ['', [Validators.required, Validators.pattern('^[0-9]{14}$')]],
      gstNumber:      [''],
      minOrder:       [0,    [Validators.required, Validators.min(0)]],
      deliveryTime:   [30,   [Validators.required, Validators.min(1)]],
      priceRange:     ['₹₹', Validators.required],
    });
  }

  nextStep() {
    this.step1Keys.forEach(k => this.form.get(k)?.markAsTouched());
    if (this.step1Keys.every(k => this.form.get(k)?.valid)) {
      this.currentStep = 2;
    }
  }

  prevStep() {
    this.currentStep = 1;
  }

  toggleCuisine(c: string) {
    this.selectedCuisines.has(c) ? this.selectedCuisines.delete(c) : this.selectedCuisines.add(c);
    this.cuisineError = false;
  }

  onLocationPicked(loc: PickedLocation) {
    this.restaurantLocation = loc;
    this.locationError = false;
    this.showLocationPicker = false;
  }

  setPriceRange(p: string) {
    this.form.get('priceRange')?.setValue(p);
  }

  onSubmit() {
    ['restaurantName', 'fssaiNumber', 'minOrder', 'deliveryTime'].forEach(k => this.form.get(k)?.markAsTouched());
    if (this.form.invalid) return;
    if (!this.restaurantLocation) { this.locationError = true; return; }
    if (this.selectedCuisines.size === 0) { this.cuisineError = true; return; }

    const v = this.form.getRawValue();
    this.partnerService.register({
      firstName: v.firstName, lastName: v.lastName,
      email: v.email, password: v.password, phone: v.phone,
      restaurantName: v.restaurantName,
      fssaiNumber: v.fssaiNumber, gstNumber: v.gstNumber,
      imageUrl: v.imageUrl,
      minOrder: v.minOrder, deliveryTime: v.deliveryTime, priceRange: v.priceRange,
      cuisine: Array.from(this.selectedCuisines),
      operatingHours: this.operatingHours,
      restaurantLocation: {
        city: this.restaurantLocation.city, state: this.restaurantLocation.state,
        country: this.restaurantLocation.country,
        lat: this.restaurantLocation.lat, lng: this.restaurantLocation.lng,
      },
    }).subscribe({
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

  get pwdValue() { return this.form.get('password')?.value || ''; }
  get pwHasLength()   { return this.pwdValue.length >= 8; }
  get pwHasUppercase(){ return /[A-Z]/.test(this.pwdValue); }
  get pwHasNumber()   { return /[0-9]/.test(this.pwdValue); }
  get fssaiInvalid()  {
    const c = this.form.get('fssaiNumber');
    return !!(c?.invalid && c?.touched);
  }
  get step1Valid() {
    return this.step1Keys.every(k => this.form.get(k)?.valid ?? false);
  }
}
