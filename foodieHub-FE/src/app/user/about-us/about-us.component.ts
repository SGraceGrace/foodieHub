import { Component, ElementRef, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './about-us.component.html',
  styleUrl: './about-us.component.scss',
})
export class AboutUsComponent {
  @ViewChild('joinSection') joinSection!: ElementRef;

  scrollToJoin(): void {
    this.joinSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
