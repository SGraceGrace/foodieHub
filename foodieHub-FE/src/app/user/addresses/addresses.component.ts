import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { UserService } from '../user.service';
import { UserAddress } from '../../model/address.model';
import { ToastrService } from 'ngx-toastr';

const LABEL_ICONS: Record<string, string> = {
  HOME: '🏠',
  WORK: '💼',
  OTHER: '⭐',
};

@Component({
  selector: 'app-addresses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TitleCasePipe],
  templateUrl: './addresses.component.html',
  styleUrl: './addresses.component.scss',
})
export class AddressesComponent implements OnInit {
  addresses: UserAddress[] = [];
  addressForm!: FormGroup;
  loading = false;
  showForm = false;
  saving = false;

  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private location: Location
  ) {}

  ngOnInit() {
    this.addressForm = this.fb.group({
      label:          ['HOME', Validators.required],
      addressText:    ['', Validators.required],
      landmark:       [''],
      defaultAddress: [false],
    });

    this.loadAddresses();
  }

  loadAddresses() {
    this.loading = true;
    this.userService.getAddresses().subscribe({
      next: (res) => {
        this.addresses = res?.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Failed to load addresses.');
      },
    });
  }

  getIcon(label: string): string {
    return LABEL_ICONS[label?.toUpperCase()] ?? '📍';
  }

  isInvalid(field: string): boolean {
    const ctrl = this.addressForm.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  onAddAddress() {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const { label, addressText, landmark, defaultAddress } = this.addressForm.value;

    this.userService.addAddress({ label, addressText, landmark, defaultAddress }).subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.toastr.success('Address saved successfully!');
        this.addressForm.reset({ label: 'HOME', defaultAddress: false });
        this.loadAddresses();
      },
      error: () => {
        this.saving = false;
        this.toastr.error('Failed to save address.');
      },
    });
  }

  deleteAddress(addr: UserAddress) {
    this.userService.deleteAddress(addr.id).subscribe({
      next: () => {
        this.addresses = this.addresses.filter(a => a.id !== addr.id);
        this.toastr.success('Address removed.');
      },
      error: () => this.toastr.error('Failed to delete address.'),
    });
  }

  setDefault(addr: UserAddress) {
    this.userService.setDefaultAddress(addr.id).subscribe({
      next: () => {
        this.addresses = this.addresses.map(a => ({ ...a, defaultAddress: a.id === addr.id }));
        this.toastr.success('Default address updated!');
      },
      error: () => this.toastr.error('Failed to update default address.'),
    });
  }

  goBack() {
    this.location.back();
  }

  cancelForm() {
    this.showForm = false;
    this.addressForm.reset({ label: 'HOME', defaultAddress: false });
  }
}
