import { Component, OnInit } from '@angular/core';
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
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit{
  
  img!: CloudinaryImage;
  backgroundUrl!: string;

  constructor(private cloudinaryService: CloudinaryService) {};

  ngOnInit(): void {
    const cld = this.cloudinaryService.getInstance();
    this.img = cld.image('docs/models');
    this.backgroundUrl = this.img.toURL();
  }


}
