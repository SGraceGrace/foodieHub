import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CuisineComponent } from './cuisine.component';

describe('CuisineComponent', () => {
  let component: CuisineComponent;
  let fixture: ComponentFixture<CuisineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CuisineComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CuisineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
