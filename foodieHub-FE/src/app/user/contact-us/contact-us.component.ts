import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ContactUsService } from './contact-us.service';

@Component({
  selector: 'app-contact-us',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact-us.component.html',
  styleUrl: './contact-us.component.scss',
})
export class ContactUsComponent {
  contactForm: FormGroup;
  focused = false;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private contactUsService: ContactUsService
  ) {
    this.contactForm = this.fb.group({
      name:    ['', Validators.required],
      email:   ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.toastr.error('Please fill in all fields.');
      return;
    }

    this.loading = true;
    this.contactUsService.submit(this.contactForm.value).subscribe({
      next: (res) => {
        this.toastr.success(res.successMessage);
        this.contactForm.reset();
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Something went wrong. Please try again.');
        this.loading = false;
      },
    });
  }
}
