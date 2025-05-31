import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarSentenciaComponent } from './editar-sentencia.component';

describe('EditarSentenciaComponent', () => {
  let component: EditarSentenciaComponent;
  let fixture: ComponentFixture<EditarSentenciaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarSentenciaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditarSentenciaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
