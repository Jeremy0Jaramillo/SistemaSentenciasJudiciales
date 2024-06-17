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
  dataLoaded = false;
  isDocente = false;
  currentUser: Observable<User | null | undefined> = of(null); // Allow null and undefined

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
      facticas: this.fb.array([])
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
    this.firestore.collection('analisis', ref => ref.where('numero_proceso', '==', this.numero_proceso))
      .valueChanges()
      .pipe(
        map(analisis => analisis[0]),
        switchMap((analisis: any) => {
          if (analisis) {
            this.analisisForm.patchValue({
              numero_proceso: analisis.numero_proceso
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
          return [];
        })
      ).subscribe();
  }

  submitForm() {
    const analisisData = this.analisisForm.value;
    this.firestore.collection('analisis').doc(this.numero_proceso).set(analisisData)
      .then(() => {
        this.saved = true;
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      })
      .catch(error => {
        console.error("Error saving document: ", error);
      });
  }

  redirectToAnalisis2() {
    this.router.navigate(['/analisis2'], {
      queryParams: {
        numero_proceso: this.numero_proceso,
        asunto: this.asunto,
        estudiante: this.estudiante,
        docente: this.docente
      }
    });
  }

  isSiguienteButtonEnabled() {
    return this.dataLoaded;
  }

  toggleCalificar(index: number, type: string) {
    const control = type === 'normativa' ? this.normativas.at(index) : this.facticas.at(index);
    control.patchValue({ showCalificar: !control.value.showCalificar });
  }

  setCalificacion(index: number, type: string, calificacion: string) {
    const control = type === 'normativa' ? this.normativas.at(index) : this.facticas.at(index);
    control.patchValue({ calificacion });
  }
}
