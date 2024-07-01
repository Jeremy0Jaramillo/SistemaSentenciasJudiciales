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
  dataLoaded = false;
  isDocente = false;
  currentUser: Observable<User | null | undefined> = of(null);
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
      decision_retroalimentacion: ['']
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
          this.loadAnalisisData();
        });
      } else {
        this.loadAnalisisData();
      }
    });
  }

  loadAnalisisData() {
    this.firestore.collection<Analisis2>('analisis2', ref => ref.where('numero_proceso', '==', this.numero_proceso))
      .valueChanges().pipe(
        map(analisis2Array => {
          console.log('Fetched analisis2 data:', analisis2Array);  // Check if data is fetched correctly
          if (analisis2Array && analisis2Array.length > 0) {
            const data: Analisis2 = analisis2Array[0];
            this.analisis2Form.patchValue(data);
            this.dataLoaded = true;
          }
        })
      ).subscribe();
  }

  submitForm() {
    const analisisData = this.analisis2Form.value;
    this.firestore.collection('analisis2').doc(this.numero_proceso).set(analisisData)
      .then(() => {
        this.saved = true;
        setTimeout(() => {
          window.location.reload();
        }, 500);
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
    this.router.navigate(['/evaluacion'], {
      queryParams: {
        numero_proceso: this.numero_proceso,
        asunto: this.asunto,
        estudiante: this.estudiante,
        docente: this.docente
      }
    });
  }

  toggleCalificar(section: string) {
    const control = this.analisis2Form.get(section);
    if (control) {
      control.patchValue({ showCalificar: !control.value.showCalificar });
    }
  }

  setCalificacion(section: string, calificacion: string) {
    this.analisis2Form.patchValue({ [`${section}_calificacion`]: calificacion });
  }

  isSiguienteButtonEnabled() {
    return this.dataLoaded;
  }
}