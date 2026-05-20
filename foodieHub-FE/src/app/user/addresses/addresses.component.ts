import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { UserService } from '../user.service';
import { UserAddress } from '../../model/address.model';
import { ToastrService } from 'ngx-toastr';
import { DeliveryAddressService } from '../../core/shared/delivery-address.service';
import { LocationPickerComponent, PickedLocation } from '../../core/shared/components/location-picker/location-picker.component';

const LABEL_ICONS: Record<string, string> = {
  HOME: '🏠',
  WORK: '💼',
  OTHER: '⭐',
};

@Component({
  selector: 'app-addresses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TitleCasePipe, LocationPickerComponent],
  templateUrl: './addresses.component.html',
  styleUrl: './addresses.component.scss',
})
export class AddressesComponent implements OnInit {
  addresses: UserAddress[] = [];
  addressForm!: FormGroup;
  loading = false;
  showForm = false;
  saving = false;

  pickedLat: number | undefined;
  pickedLng: number | undefined;
  pickedLocationName = '';
  showLocationPicker = false;

  selectedAddressId: number | null = null;

  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private location: Location,
    private deliveryAddressService: DeliveryAddressService
  ) {}

  ngOnInit() {
    this.addressForm = this.fb.group({
      label:          ['HOME', Validators.required],
      addressText:    ['', Validators.required],
      landmark:       [''],
      defaultAddress: [false],
    });

    this.selectedAddressId = this.deliveryAddressService.get()?.id ?? null;
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

  onLocationPicked(loc: PickedLocation) {
    this.pickedLat = loc.lat;
    this.pickedLng = loc.lng;
    this.pickedLocationName = loc.displayName;
    if (!this.addressForm.value.addressText) {
      this.addressForm.patchValue({ addressText: loc.displayName.slice(0, 200) });
    }
    this.showLocationPicker = false;
  }

  onAddAddress() {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const { label, addressText, landmark, defaultAddress } = this.addressForm.value;

    this.userService.addAddress({
      label, addressText, landmark, defaultAddress,
      lat: this.pickedLat,
      lng: this.pickedLng,
    }).subscribe({
      next: (res) => {
        this.saving = false;
        this.showForm = false;
        this.toastr.success('Address saved!');
        this.addressForm.reset({ label: 'HOME', defaultAddress: false });
        this.pickedLat = undefined;
        this.pickedLng = undefined;
        this.pickedLocationName = '';
        this.loadAddresses();
        if (defaultAddress && res.data) {
          this.deliverHere(res.data);
        }
      },
      error: () => {
        this.saving = false;
        this.toastr.error('Failed to save address.');
      },
    });
  }

  deliverHere(addr: UserAddress) {
    this.deliveryAddressService.set(addr);
    this.selectedAddressId = addr.id;
    this.toastr.success(`Delivering to ${addr.label}`);
  }

  deleteAddress(addr: UserAddress) {
    this.userService.deleteAddress(addr.id).subscribe({
      next: () => {
        this.addresses = this.addresses.filter(a => a.id !== addr.id);
        if (this.selectedAddressId === addr.id) {
          this.deliveryAddressService.clear();
          this.selectedAddressId = null;
        }
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

  cancelForm() {
    this.showForm = false;
    this.pickedLat = undefined;
    this.pickedLng = undefined;
    this.pickedLocationName = '';
    this.addressForm.reset({ label: 'HOME', defaultAddress: false });
  }

  goBack() {
    this.location.back();
  }
}
