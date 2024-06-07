import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Evaluacion2Component } from './evaluacion2.component';

describe('Evaluacion2Component', () => {
  let component: Evaluacion2Component;
  let fixture: ComponentFixture<Evaluacion2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Evaluacion2Component]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(Evaluacion2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
