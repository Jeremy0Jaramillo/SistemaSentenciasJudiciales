import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router, ActivatedRoute } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

interface User {
  uid: string;
  role: string;
  [key: string]: any;
}

interface Analisis2 {
  narracion_hechos: string;
  narracion_hechos_calificacion: string;
  narracion_hechos_retroalimentacion: string;
  problema_juridico: string;
  problema_juridico_calificacion: string;
  problema_juridico_retroalimentacion: string;
  cuestiones_subcuestiones: string;
  cuestiones_subcuestiones_calificacion: string;
  cuestiones_subcuestiones_retroalimentacion: string;
  respuesta_cuestiones: string;
  respuesta_cuestiones_calificacion: string;
  respuesta_cuestiones_retroalimentacion: string;
  ratio_obiter: string;
  ratio_obiter_calificacion: string;
  ratio_obiter_retroalimentacion: string;
  solucion_problema: string;
  solucion_problema_calificacion: string;
  solucion_problema_retroalimentacion: string;
  decision: string;
  decision_calificacion: string;
  decision_retroalimentacion: string;
}

@Component({
  selector: 'app-analisis2',
  templateUrl: './analisis2.component.html',
  styleUrls: ['./analisis2.component.css']
})

export class Analisis2Component implements OnInit {
  analisis2Form: FormGroup;
  numero_proceso: string = '';
  asunto: string = '';
  estudiante: string = '';
  docente: string = '';
  saved = false;
  docenteSaved = false;
  dataLoaded = false;
  isDocente = false;
  currentUser: Observable<User | null | undefined> = of(null);
  calificarState: { [key: string]: boolean } = {};


  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private router: Router,
    private route: ActivatedRoute,
    private afAuth: AngularFireAuth
  ) {
    this.analisis2Form = this.fb.group({
      numero_proceso: ['', Validators.required],
      narracion_hechos: ['', Validators.required],
      narracion_hechos_calificacion: [''],
      narracion_hechos_retroalimentacion: [''],
      problema_juridico: ['', Validators.required],
      problema_juridico_calificacion: [''],
      problema_juridico_retroalimentacion: [''],
      cuestiones_subcuestiones: ['', Validators.required],
      cuestiones_subcuestiones_calificacion: [''],
      cuestiones_subcuestiones_retroalimentacion: [''],
      respuesta_cuestiones: ['', Validators.required],
      respuesta_cuestiones_calificacion: [''],
      respuesta_cuestiones_retroalimentacion: [''],
      ratio_obiter: ['', Validators.required],
      ratio_obiter_calificacion: [''],
      ratio_obiter_retroalimentacion: [''],
      solucion_problema: ['', Validators.required],
      solucion_problema_calificacion: [''],
      solucion_problema_retroalimentacion: [''],
      decision: ['', Validators.required],
      decision_calificacion: [''],
      decision_retroalimentacion: [''],
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

      this.analisis2Form.patchValue({
        numero_proceso: this.numero_proceso
      });
      this.loadUserData();
      this.checkDocenteSaved();
      this.checkLockStatus();
    });
  }

  checkLockStatus() {
    this.firestore.collection('locks').doc(this.numero_proceso).valueChanges().subscribe((data: any) => {
      if (data && data.locked) {
        this.disableFormControls(this.analisis2Form); // Disable the form if it's locked
      }
    });
  }

  lockForm() {
    this.firestore.collection('locks').doc(this.numero_proceso).set({ locked: true })
      .then(() => {
        this.disableFormControls(this.analisis2Form); // Disable the form controls
      })
      .catch(error => {
        console.error("Error locking form: ", error);
      });
  }
  
  disableFormControls(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.disable(); // Disable the control
      if (control instanceof FormGroup) {
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
          }
        });
        this.loadAnalisisData();
      }
    });
  }

  loadAnalisisData() {
    this.firestore.collection<Analisis2>('analisis2', ref => ref.where('numero_proceso', '==', this.numero_proceso))
      .valueChanges().pipe(
        map(analisis2Array => {
          if (analisis2Array && analisis2Array.length > 0) {
            const data: Analisis2 = analisis2Array[0];
            this.analisis2Form.patchValue(data);
            this.dataLoaded = true;
          } else {
            // Handle case where no data is found
            this.dataLoaded = true;
          }
        })
      ).subscribe();
  }

  submitForm() {
    this.analisis2Form.patchValue({ saved: true });
    if (this.isDocente) {
      this.analisis2Form.patchValue({ docenteSaved: true });
    }
    const analisisData = this.analisis2Form.value;

    const dataToSave: any = {};
    Object.keys(analisisData).forEach(key => {
      if (!key.endsWith('_showCalificar')) {
        dataToSave[key] = analisisData[key];
      }
    });
    this.firestore.collection('analisis2').doc(this.numero_proceso).set(analisisData)
      .then(() => {
        this.saved = true;
        window.location.reload();
      })
      .catch(error => {
        console.error("Error saving document: ", error);
      });
  }
  

  redirectToAnalisis() {
    this.router.navigate(['/analisis'], {
      queryParams: {
        numero_proceso: this.numero_proceso,
        asunto: this.asunto,
        estudiante: this.estudiante,
        docente: this.docente
      }
    });
  }

  redirectToEvaluacion() {
    if (this.docenteSaved) {
      this.router.navigate(['/evaluacion'], {
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
    this.firestore.collection('analisis2').doc(this.numero_proceso).valueChanges()
      .subscribe((data: any) => {
        if (data && data.saved) {
          this.docenteSaved = data.docenteSaved || false;
        }
      });
  }

  toggleCalificar(section: string) {
    this.calificarState[section] = !this.calificarState[section];
  }

  setCalificacion(section: string, calificacion: string) {
    this.analisis2Form.patchValue({ [`${section}_calificacion`]: calificacion });
  }

  getCalificacionValue(controlName: string): string {
    const control = this.analisis2Form.get(controlName);
    return control && control.value ? control.value : 'No Calificado';
  }

}
