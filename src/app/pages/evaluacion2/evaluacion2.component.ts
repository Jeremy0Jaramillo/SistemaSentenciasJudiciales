import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
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
      numero_proceso: [''],
      sentenceSubject: this.fb.array([]),
      multicomponent: this.fb.group({
        multiOption: this.fb.array([])
      }),
      other: this.fb.group({
        otherSubject: ['']
      }),
      validSummary: [''],
      factsConception: [''],
      finalDecision: [''],
      properUse: [''],
      lawAnalysis: [''],
      normativeEvaluation: [''],
      precedentsAplication: [''],
      expressionClarity: [''],
      crimeClassification: [''],
      properAnalysis: [''],
      againstProperty: [''],
      precedentsAplication2: [''],
      expressionClarity2: [''],
      judgeAnalysis: [''],
      reasonsNormative: ['']
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

      // Load existing data if available
      this.loadEvaluacion2Data();
    });
  }

  submitForm() {
    const evaluacion2Data = this.evaluacion2Form.value;
    this.firestore.collection('evaluacion2').doc(this.numero_proceso).set(evaluacion2Data)
      .then(() => {
        this.saved = true;
      })
      .catch(error => {
        console.error("Error saving document: ", error);
      });
  }

  loadEvaluacion2Data() {
    this.firestore.collection('evaluacion2').doc(this.numero_proceso)
      .valueChanges()
      .subscribe(data => {
        if (data) {
          const evaluation2Data = data as Evaluacion2Form; // Cast to the correct type
          this.evaluacion2Form.patchValue(evaluation2Data);

          // Manually update FormArray values
          this.setSentenceSubject(evaluation2Data.sentenceSubject || []);
          this.setMultiOption(evaluation2Data.multicomponent?.multiOption || []);

          this.saved = true;
        }
      });
  }

  setSentenceSubject(subjects: string[]) {
    const formArray = this.evaluacion2Form.get('sentenceSubject') as FormArray;
    subjects.forEach(subject => formArray.push(this.fb.control(subject)));
  }

  setMultiOption(options: string[]) {
    const formArray = this.evaluacion2Form.get(['multicomponent', 'multiOption']) as FormArray;
    options.forEach(option => formArray.push(this.fb.control(option)));
  }

  onCheckboxChange(e: any, controlName: string) {
    const formArray: FormArray = this.evaluacion2Form.get(controlName) as FormArray;
    if (e.target.checked) {
      formArray.push(this.fb.control(e.target.value));
    } else {
      const index = formArray.controls.findIndex(x => x.value === e.target.value);
      formArray.removeAt(index);
    }
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

  redirectToSiguiente() {
    // Implement the redirection to the next component/page if needed
  }
}

interface Evaluacion2Form {
  numero_proceso: string;
  sentenceSubject: string[];
  multicomponent: {
    multiOption: string[];
  };
  other: {
    otherSubject: string;
  };
  validSummary: string;
  factsConception: string;
  finalDecision: string;
  properUse: string;
  lawAnalysis: string;
  normativeEvaluation: string;
  precedentsAplication: string;
  expressionClarity: string;
  crimeClassification: string;
  properAnalysis: string;
  againstProperty: string;
  precedentsAplication2: string;
  expressionClarity2: string;
  judgeAnalysis: string;
  reasonsNormative: string;
}
