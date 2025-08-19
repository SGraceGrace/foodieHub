import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CloudinaryImage } from '@cloudinary/url-gen/index';
import { CloudinaryService } from '../shared/cloudinary.service';
import { CommonModule } from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips';
import {MatButtonModule} from '@angular/material/button';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatChipsModule, MatButtonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit{
  loginBigScreenUrl!: string;
  loginSmallScreenUrl!: string;

  constructor(private cloudinaryService: CloudinaryService) {};

  ngOnInit(): void {
    const cld = this.cloudinaryService.getInstance();
    this.loginBigScreenUrl = cld.image('docs/models').toURL();
    this.loginSmallScreenUrl = cld.image('docs/loginbackgroundsmall').toURL();
  }


}
