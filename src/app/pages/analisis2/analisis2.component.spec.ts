import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Analisis2Component } from './analisis2.component';

describe('Analisis2Component', () => {
  let component: Analisis2Component;
  let fixture: ComponentFixture<Analisis2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Analisis2Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(Analisis2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
