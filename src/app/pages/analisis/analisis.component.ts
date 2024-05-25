import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router, ActivatedRoute } from '@angular/router';
import { switchMap, map } from 'rxjs/operators';

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

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private router: Router,
    private route: ActivatedRoute
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
  
      this.loadAnalisisData();
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
      valida: ['', Validators.required]
    }));
  }

  removeNormativa(index: number) {
    this.normativas.removeAt(index);
  }

  addFactica() {
    this.facticas.push(this.fb.group({
      pregunta: ['', Validators.required],
      respuesta: ['', Validators.required],
      valida: ['', Validators.required]
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
                valida: normativa.valida
              }));
            });
  
            analisis.facticas.forEach((factica: any) => {
              this.facticas.push(this.fb.group({
                pregunta: factica.pregunta,
                respuesta: factica.respuesta,
                valida: factica.valida
              }));
            });
  
            this.dataLoaded = true;
          } else {
            this.addNormativa();
            this.addFactica();
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
    return this.dataLoaded; // Enable the button if data is loaded
  }
}
