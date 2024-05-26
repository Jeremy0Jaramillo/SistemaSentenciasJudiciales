import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';

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

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.analisis2Form = this.fb.group({
      numero_proceso: ['', Validators.required],
      narracion_hechos: ['', Validators.required],
      problema_juridico: ['', Validators.required],
      cuestiones_subcuestiones: ['', Validators.required],
      respuesta_cuestiones: ['', Validators.required],
      ratio_obiter: ['', Validators.required],
      solucion_problema: ['', Validators.required],
      decision: ['', Validators.required]
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

      this.loadAnalisis2Data();
    });
  }

  loadAnalisis2Data() {
    this.firestore.collection('analisis2', ref => ref.where('numero_proceso', '==', this.numero_proceso))
      .valueChanges()
      .subscribe(data => {
        if (data && data.length) {
          const analisis2Data = data[0] as Analisis2Data; // Cast to the correct type
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

interface Analisis2Data {
  numero_proceso: string;
  narracion_hechos: string;
  problema_juridico: string;
  cuestiones_subcuestiones: string;
  respuesta_cuestiones: string;
  ratio_obiter: string;
  solucion_problema: string;
  decision: string;
}
