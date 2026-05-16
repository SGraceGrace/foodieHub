import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../loading.service';

@Component({
  selector: 'app-global-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-loader.component.html',
  styleUrl: './global-loader.component.scss',
})
export class GlobalLoaderComponent {
  constructor(public loadingService: LoadingService) {}
}
