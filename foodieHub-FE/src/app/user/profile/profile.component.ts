import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { TokenService } from '../../core/shared/token.service';
import { UserService } from '../user.service';
import { UserDetails } from '../../model/user.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  user$!: Observable<UserDetails | null>;
  profileForm!: FormGroup;
  initials = '';
  fullName = '';
  saving = false;
  private currentUser: UserDetails | null = null;

  constructor(
    private tokenService: TokenService,
    private userService: UserService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit() {
    this.user$ = this.tokenService.userInfo$;

    this.profileForm = this.fb.group({
      firstName:   ['', Validators.required],
      lastName:    ['', Validators.required],
      email:       [{ value: '', disabled: true }],
      phone:       [''],
      dateOfBirth: [''],
      gender:      [''],
      bio:         [''],
    });

    this.tokenService.userInfo$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.initials = ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase();
        this.fullName = `${user.firstName} ${user.lastName}`;
        this.profileForm.patchValue({
          firstName:   user.firstName,
          lastName:    user.lastName,
          email:       user.email,
          phone:       user.phone       ?? '',
          dateOfBirth: user.dateOfBirth ?? '',
          gender:      user.gender      ?? '',
          bio:         user.bio         ?? '',
        });
      }
    });

    // Refresh from API
    this.userService.getUserInfo().subscribe({
      next: (res) => { if (res?.data) this.tokenService.setUserInfo(res.data); },
    });
  }

  isInvalid(field: string): boolean {
    const ctrl = this.profileForm.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  onSave() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const { firstName, lastName, phone, dateOfBirth, gender, bio } = this.profileForm.value;

    this.userService.updateProfile({ firstName, lastName, phone, dateOfBirth, gender, bio }).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success('Profile saved successfully!');
        if (this.currentUser) {
          this.tokenService.setUserInfo({ ...this.currentUser, firstName, lastName, phone, dateOfBirth, gender, bio });
        }
      },
      error: () => {
        this.saving = false;
        this.toastr.error('Failed to save profile. Please try again.');
      },
    });
  }

  onCancel() {
    const user = this.currentUser;
    if (user) {
      this.profileForm.patchValue({
        firstName:   user.firstName,
        lastName:    user.lastName,
        email:       user.email,
        phone:       user.phone       ?? '',
        dateOfBirth: user.dateOfBirth ?? '',
        gender:      user.gender      ?? '',
        bio:         user.bio         ?? '',
      });
    }
  }

  logout() {
    this.userService.logout().subscribe({
      next: () => {
        this.toastr.success('Logged out successfully');
        this.tokenService.clearTokens();
        this.router.navigateByUrl('/login');
      },
      error: () => {
        this.toastr.error('Logout failed');
      },
    });
  }
}
