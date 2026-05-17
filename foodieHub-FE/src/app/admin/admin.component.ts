import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { AdminService, SlideRequest } from './admin.service';
import { Slide } from '../model/restaurant.model';

type Tab = 'dashboard' | 'users' | 'restaurants' | 'orders' | 'payments' | 'support' | 'reports' | 'slides';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  activeTab: Tab = 'dashboard';

  // Slides
  slides: Slide[] = [];
  showEditModal = false;
  editingSlide: Slide | null = null;
  form: SlideRequest = this.emptyForm();
  editForm: SlideRequest = this.emptyForm();

  constructor(private adminService: AdminService, private toastr: ToastrService) {}

  ngOnInit() {
    this.loadSlides();
  }

  goTab(tab: Tab) {
    this.activeTab = tab;
  }

  // ── Slides ──────────────────────────────────────────────────────

  loadSlides() {
    this.adminService.getSlides().subscribe({
      next: (res) => (this.slides = res.data ?? []),
    });
  }

  addSlide() {
    if (!this.form.title.trim()) { this.toastr.error('Title is required.'); return; }
    this.adminService.createSlide(this.form).subscribe({
      next: (res) => {
        this.slides.push(res.data);
        this.form = this.emptyForm();
        this.toastr.success('Slide added!');
      },
      error: () => this.toastr.error('Failed to add slide.'),
    });
  }

  openEdit(slide: Slide) {
    this.editingSlide = slide;
    this.editForm = {
      title: slide.title, highlightWord: slide.highlightWord,
      description: slide.description, btn1Text: slide.btn1Text,
      btn2Text: slide.btn2Text, emoji: slide.emoji,
      badgeIcon: slide.badgeIcon, badgeText: slide.badgeText,
      displayOrder: slide.displayOrder,
    };
    this.showEditModal = true;
  }

  saveEdit() {
    if (!this.editingSlide) return;
    this.adminService.updateSlide(this.editingSlide.id, this.editForm).subscribe({
      next: (res) => {
        const idx = this.slides.findIndex((s) => s.id === this.editingSlide!.id);
        if (idx !== -1) this.slides[idx] = res.data;
        this.showEditModal = false;
        this.toastr.success('Slide updated!');
      },
      error: () => this.toastr.error('Failed to update slide.'),
    });
  }

  deleteSlide(slide: Slide) {
    if (!confirm('Delete this slide?')) return;
    this.adminService.deleteSlide(slide.id).subscribe({
      next: () => {
        this.slides = this.slides.filter((s) => s.id !== slide.id);
        this.toastr.success('Slide deleted.');
      },
    });
  }

  toggle(slide: Slide) {
    this.adminService.toggleSlide(slide.id).subscribe({
      next: (res) => {
        const idx = this.slides.findIndex((s) => s.id === slide.id);
        if (idx !== -1) this.slides[idx] = res.data;
      },
    });
  }

  clearForm() { this.form = this.emptyForm(); }

  private emptyForm(): SlideRequest {
    return { title: '', highlightWord: '', description: '', btn1Text: '', btn2Text: '', emoji: '🍛', badgeIcon: '⚡', badgeText: '', displayOrder: 0 };
  }
}
