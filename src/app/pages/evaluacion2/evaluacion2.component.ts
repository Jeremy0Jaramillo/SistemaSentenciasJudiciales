import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router, ActivatedRoute } from '@angular/router';
import { switchMap, map } from 'rxjs/operators';

@Component({
  selector: 'app-evaluacion2',
  templateUrl: './evaluacion2.component.html',
  styleUrls: ['./evaluacion2.component.css']
})
export class Evaluacion2Component implements OnInit {
  evaluacion2Form: FormGroup;
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
    this.evaluacion2Form = this.fb.group({
      numero_proceso: ['', Validators.required],
      sentenceSubject: ['', Validators.required],
      validSummary: ['', Validators.required],
      factsConception: ['', Validators.required],
      finalDecision: ['', Validators.required],
      properUse: ['', Validators.required],
      lawAnalysis: ['', Validators.required],
      normativeEvaluation: ['', Validators.required],
      precedentsAplication: ['', Validators.required],
      expressionClarity: ['', Validators.required],
      crimeClassification: ['', Validators.required],
      properAnalysis: ['', Validators.required],
      againstProperty: ['', Validators.required],
      precedentsAplication2: ['', Validators.required],
      expressionClarity2: ['', Validators.required],
      judgeAnalysis: ['', Validators.required],
      reasonsNormative: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.numero_proceso = params.get('numero_proceso') || '';
      this.asunto = params.get('asunto') || '';
      this.estudiante = params.get('estudiante') || '';
      this.docente = params.get('docente') || '';  
  
      this.evaluacion2Form.patchValue({
        numero_proceso: this.numero_proceso
      });
    });
  }

  submitForm() {
    const evaluacion2Data = this.evaluacion2Form.value;
    this.firestore.collection('evaluacion2').doc(this.numero_proceso).set(evaluacion2Data)
      .then(() => {
        this.saved = true;
        setTimeout(() => {
          window.location.reload(); // Reload the page after 2 seconds
        }, 2000);
      })
      .catch(error => {
        console.error("Error saving document: ", error);
      });
  }

  redirectToEvaluacion2() {
    this.router.navigate(['/evaluacion'], {
      queryParams: {
        numero_proceso: this.numero_proceso,
        asunto: this.asunto,
        estudiante: this.estudiante,
        docente: this.docente
      }
    });
  }

  redirectToSiguiente() {
    // Implement the redirection to the next component/page if needed
  }
}
