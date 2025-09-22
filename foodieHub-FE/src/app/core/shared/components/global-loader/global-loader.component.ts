import { Component } from '@angular/core';
import { LoadingService } from '../../loading.service';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-global-loader',
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './global-loader.component.html',
  styleUrl: './global-loader.component.scss',
})
export class GlobalLoaderComponent {
  constructor(public loadingService: LoadingService) {}
}
