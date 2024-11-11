import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SentenciaToPDFComponent } from './sentencia-to-pdf.component';

describe('SentenciaToPDFComponent', () => {
  let component: SentenciaToPDFComponent;
  let fixture: ComponentFixture<SentenciaToPDFComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SentenciaToPDFComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SentenciaToPDFComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
