import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

interface KycDocument {
  label: string;
  key: string;
  file: File | null;
  preview: string | null;
}

@Component({
  selector: 'app-driver-kyc',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './driver-kyc.component.html',
  styleUrl: './driver-kyc.component.scss',
})
export class DriverKycComponent {
  submitting = false;

  documents: KycDocument[] = [
    { label: 'Driving License',          key: 'license',      file: null, preview: null },
    { label: 'Vehicle Registration',      key: 'registration', file: null, preview: null },
    { label: 'PAN Card / Aadhar',         key: 'identity',     file: null, preview: null },
    { label: 'Insurance Certificate',     key: 'insurance',    file: null, preview: null },
  ];

  constructor(private router: Router, private toastr: ToastrService) {}

  onFileSelected(event: Event, doc: KycDocument) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    doc.file = file;
    const reader = new FileReader();
    reader.onload = (e) => doc.preview = e.target?.result as string;
    reader.readAsDataURL(file);
  }

  get allUploaded(): boolean {
    return this.documents.every(d => d.file !== null);
  }

  get uploadedCount(): number {
    return this.documents.filter(d => d.file !== null).length;
  }

  submit() {
    if (!this.allUploaded) {
      this.toastr.error('Please upload all required documents.');
      return;
    }
    this.submitting = true;
    // TODO: wire to KYC upload API
    this.toastr.success('Documents submitted! Admin will verify in 24–48 hours.');
    this.router.navigateByUrl('/driver/login');
  }
}
