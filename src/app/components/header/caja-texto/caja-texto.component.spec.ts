import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CajaTextoComponent } from './caja-texto.component';

describe('CajaTextoComponent', () => {
  let component: CajaTextoComponent;
  let fixture: ComponentFixture<CajaTextoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CajaTextoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CajaTextoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
