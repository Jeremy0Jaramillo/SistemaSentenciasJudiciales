import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router, ActivatedRoute } from '@angular/router';
import { switchMap, map } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, of } from 'rxjs';

interface User {
  uid: string;
  role: string;
  [key: string]: any; // To handle any additional properties
}

@Component({
  selector: 'app-analisis',
  templateUrl: './analisis.component.html',
  styleUrls: ['./analisis.component.css']
})
export class AnalisisComponent implements OnInit {
  analisisForm: FormGroup;
  numero_proceso: string = '';
  asunto: string = '';
  estudiante: string = '';
  docente: string = '';
  saved = false;
  docenteSaved = false;
  dataLoaded = false;
  isDocente = false;
  currentUser: Observable<User | null | undefined> = of(null); // Allow null and undefined
  selectedButton: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private router: Router,
    private route: ActivatedRoute,
    private afAuth: AngularFireAuth
  ) {
    this.analisisForm = this.fb.group({
      numero_proceso: ['', Validators.required],
      normativas: this.fb.array([]),
      facticas: this.fb.array([]),
      saved: [false],
      docenteSaved: [false]
    });
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.numero_proceso = params.get('numero_proceso') || '';
      this.asunto = params.get('asunto') || '';
      this.estudiante = params.get('estudiante') || '';
      this.docente = params.get('docente') || '';

      this.analisisForm.patchValue({
        numero_proceso: this.numero_proceso
      });

      this.loadUserData();
      this.checkDocenteSaved();
      setTimeout(() => {
        this.checkLockStatus();
      }, 1000);
    });
  }

  checkLockStatus() {
    this.firestore.collection('locks').doc(this.numero_proceso).valueChanges().subscribe((data: any) => {
      if (data && data.locked) {
        this.disableFormControls(this.analisisForm); // Disable the form if it's locked
      }
    });
  }

  lockForm() {
    this.firestore.collection('locks').doc(this.numero_proceso).set({ locked: true })
      .then(() => {
        this.disableFormControls(this.analisisForm); // Disable the form controls
      })
      .catch(error => {
        console.error("Error locking form: ", error);
      });
  }
  
  disableFormControls(formGroup: FormGroup | FormArray) {
  Object.keys(formGroup.controls).forEach(key => {
    const control = formGroup.get(key);
    control?.disable(); // Disable the control
    if (control instanceof FormGroup || control instanceof FormArray) {
      this.disableFormControls(control); // Recursively disable nested controls
    }
  });
}

  loadUserData() {
    this.afAuth.user.subscribe(user => {
      if (user) {
        this.currentUser = this.firestore.collection('users').doc<User>(user.uid).valueChanges();
        this.currentUser.subscribe(userData => {
          if (userData && userData.role === 'docente') {
            this.isDocente = true;
            this.checkDocenteSaved();
          }
        });
        this.loadAnalisisData();
      }
    });
  }

  get normativas() {
    return this.analisisForm.get('normativas') as FormArray;
  }

  get facticas() {
    return this.analisisForm.get('facticas') as FormArray;
  }

  addNormativa() {
    this.normativas.push(this.fb.group({
      pregunta: ['', Validators.required],
      respuesta: ['', Validators.required],
      valida: ['', Validators.required],
      calificacion: [''],
      retroalimentacion: [''],
      showCalificar: [false]
    }));
  }

  removeNormativa(index: number) {
    this.normativas.removeAt(index);
  }

  addFactica() {
    this.facticas.push(this.fb.group({
      pregunta: ['', Validators.required],
      respuesta: ['', Validators.required],
      valida: ['', Validators.required],
      calificacion: [''],
      retroalimentacion: [''],
      showCalificar: [false]
    }));
  }

  removeFactica(index: number) {
    this.facticas.removeAt(index);
  }

  loadAnalisisData() {
    this.firestore.collection('analisis').doc(this.numero_proceso).valueChanges()
      .subscribe((analisis: any) => {
        if (analisis) {
          this.analisisForm.patchValue({
            numero_proceso: analisis.numero_proceso,
            saved: analisis.saved || false
          });
  
          analisis.normativas.forEach((normativa: any) => {
            this.normativas.push(this.fb.group({
              pregunta: normativa.pregunta,
              respuesta: normativa.respuesta,
              valida: normativa.valida,
              calificacion: normativa.calificacion || '',
              retroalimentacion: normativa.retroalimentacion || '',
              showCalificar: [false]
            }));
          });
  
          analisis.facticas.forEach((factica: any) => {
            this.facticas.push(this.fb.group({
              pregunta: factica.pregunta,
              respuesta: factica.respuesta,
              valida: factica.valida,
              calificacion: factica.calificacion || '',
              retroalimentacion: factica.retroalimentacion || '',
              showCalificar: [false]
            }));
          });
  
          this.dataLoaded = true;
        } else {
          this.addFactica();
          this.addNormativa();
          this.dataLoaded = true;
        }
      });
  }
  

  submitForm() {
    // Set the saved flag to true before submitting
    this.analisisForm.patchValue({ saved: true });
    if (this.isDocente) {
      this.analisisForm.patchValue({ docenteSaved: true });
    }
    
    const analisisData = this.analisisForm.value;
    this.firestore.collection('analisis').doc(this.numero_proceso).set(analisisData)
      .then(() => {
        this.saved = true;
        window.location.reload();
      })
      .catch(error => {
        console.error("Error saving document: ", error);
      });
  }
  
  

  getCalificacionValue(controlName: string): string {
    if (!this.saved) {
      return '';
    }
    const control = this.analisisForm.get(controlName);
    return control && control.value ? control.value : 'No Calificado';
  }
  

  redirectToAnalisis2() {
    if (this.docenteSaved) {
      this.router.navigate(['/analisis2'], {
        queryParams: {
          numero_proceso: this.numero_proceso,
          asunto: this.asunto,
          estudiante: this.estudiante,
          docente: this.docente
        }
      });
    }
  }

  checkDocenteSaved() {
    this.firestore.collection('analisis').doc(this.numero_proceso).valueChanges()
      .subscribe((data: any) => {
        if (data && data.saved) {
          this.docenteSaved = data.docenteSaved || false;
        }
      });
  }


  toggleCalificar(index: number, type: string) {
    const control = type === 'normativa' ? this.normativas.at(index) : this.facticas.at(index);
    control.patchValue({ showCalificar: !control.value.showCalificar });
  }

  setCalificacion(index: number, type: string, calificacion: string) {
    const control = type === 'normativa' ? this.normativas.at(index) : this.facticas.at(index);
    control.patchValue({ calificacion });
    this.selectedButton = calificacion;
  }
}