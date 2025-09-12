import { Component } from '@angular/core';
import { MatMenu, MatMenuModule } from "@angular/material/menu";
import { MatIconModule } from "@angular/material/icon";
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SharedServiceService } from '../../core/shared/shared-service.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-header',
  imports: [CommonModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, RouterLink, RouterModule, MatMenu, ReactiveFormsModule],
  templateUrl: './user-header.component.html',
  styleUrl: './user-header.component.scss'
})
export class UserHeaderComponent {

  constructor(private router: Router, private sharedService: SharedServiceService) { }

  searchControl = new FormControl('');

  onSearch() {
    const searchTerm = this.searchControl.value ?? '';
    this.router.navigateByUrl('/user/search');
    this.sharedService.onSearch(searchTerm);
    this.searchControl.reset();
  }

}
