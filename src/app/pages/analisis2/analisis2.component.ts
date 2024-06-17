import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

interface User {
  uid: string;
  role: string;
  [key: string]: any;
}

interface Analisis2Data {
  numero_proceso: string;
  narracion_hechos: string;
  problema_juridico: string;
  cuestiones_subcuestiones: string;
  respuesta_cuestiones: string;
  ratio_obiter: string;
  solucion_problema: string;
  decision: string;
  narracion_hechos_retroalimentacion?: string;
  problema_juridico_retroalimentacion?: string;
  cuestiones_subcuestiones_retroalimentacion?: string;
  respuesta_cuestiones_retroalimentacion?: string;
  ratio_obiter_retroalimentacion?: string;
  solucion_problema_retroalimentacion?: string;
  decision_retroalimentacion?: string;
  narracion_hechos_calificacion?: string;
  problema_juridico_calificacion?: string;
  cuestiones_subcuestiones_calificacion?: string;
  respuesta_cuestiones_calificacion?: string;
  ratio_obiter_calificacion?: string;
  solucion_problema_calificacion?: string;
  decision_calificacion?: string;
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
  isDocente = false;
  currentUser: Observable<User | null | undefined> = of(null);

  analysisControls = [
    { id: 'narracion_hechos', formControlName: 'narracion_hechos', title: '1. Narración de los hechos', showCalificar: false, retroalimentacionControlName: 'narracion_hechos_retroalimentacion' },
    { id: 'problema_juridico', formControlName: 'problema_juridico', title: '2. Problema jurídico', showCalificar: false, retroalimentacionControlName: 'problema_juridico_retroalimentacion' },
    { id: 'cuestiones_subcuestiones', formControlName: 'cuestiones_subcuestiones', title: '3. Cuestiones o subcuestiones para solucionar el problema', showCalificar: false, retroalimentacionControlName: 'cuestiones_subcuestiones_retroalimentacion' },
    { id: 'respuesta_cuestiones', formControlName: 'respuesta_cuestiones', title: '4. Respuesta a las cuestiones', showCalificar: false, retroalimentacionControlName: 'respuesta_cuestiones_retroalimentacion' },
    { id: 'ratio_obiter', formControlName: 'ratio_obiter', title: '5. Ratio decidendi y obiter dictum', showCalificar: false, retroalimentacionControlName: 'ratio_obiter_retroalimentacion' },
    { id: 'solucion_problema', formControlName: 'solucion_problema', title: '6. Solución al problema', showCalificar: false, retroalimentacionControlName: 'solucion_problema_retroalimentacion' },
    { id: 'decision', formControlName: 'decision', title: '7. Desición', showCalificar: false, retroalimentacionControlName: 'decision_retroalimentacion' },
  ];
  control: any;

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
      problema_juridico: ['', Validators.required],
      cuestiones_subcuestiones: ['', Validators.required],
      respuesta_cuestiones: ['', Validators.required],
      ratio_obiter: ['', Validators.required],
      solucion_problema: ['', Validators.required],
      decision: ['', Validators.required],
      narracion_hechos_retroalimentacion: [''],
      problema_juridico_retroalimentacion: [''],
      cuestiones_subcuestiones_retroalimentacion: [''],
      respuesta_cuestiones_retroalimentacion: [''],
      ratio_obiter_retroalimentacion: [''],
      solucion_problema_retroalimentacion: [''],
      decision_retroalimentacion: [''],
      narracion_hechos_calificacion: [''],
      problema_juridico_calificacion: [''],
      cuestiones_subcuestiones_calificacion: [''],
      respuesta_cuestiones_calificacion: [''],
      ratio_obiter_calificacion: [''],
      solucion_problema_calificacion: [''],
      decision_calificacion: ['']
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.numero_proceso = params['numero_proceso'] || '';
      this.asunto = params['asunto'] || '';
      this.estudiante = params['estudiante'] || '';
      this.docente = params['docente'] || '';

      this.analisis2Form.patchValue({
        numero_proceso: this.numero_proceso
      });

      this.loadUserData();
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
          this.loadAnalisis2Data();
        });
      } else {
        this.loadAnalisis2Data();
      }
    });
  }

  loadAnalisis2Data() {
    this.firestore.collection('analisis2', ref => ref.where('numero_proceso', '==', this.numero_proceso))
      .valueChanges()
      .subscribe(data => {
        if (data && data.length) {
          const analisis2Data = data[0] as Analisis2Data;
          this.analisis2Form.patchValue(analisis2Data);
          this.saved = true;
        }
      });
  }

  submitForm() {
    const analisis2Data = this.analisis2Form.value;
    this.firestore.collection('analisis2').doc(this.numero_proceso).set(analisis2Data)
      .then(() => {
        this.saved = true;
      })
      .catch(error => {
        console.error("Error saving document: ", error);
      });
  }

  toggleCalificar(control: any) {
    control.showCalificar = !control.showCalificar;
  }

  setCalificacion(control: any, calificacion: string) {
    const calificacionControlName = `${control.formControlName}_calificacion`;
    this.analisis2Form.get(calificacionControlName)?.setValue(calificacion);
  }

  redirectToEvaluacion() {
    this.router.navigate(['/evaluacion'], {
      queryParams: {
        numero_proceso: this.numero_proceso,
        asunto: this.asunto,
        estudiante: this.estudiante,
        docente: this.docente
      }
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
}