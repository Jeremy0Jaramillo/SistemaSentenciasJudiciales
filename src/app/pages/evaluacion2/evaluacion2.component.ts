import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { switchMap, map } from 'rxjs/operators';
import { Observable,of } from 'rxjs';

interface User {
  uid: string;
  role: string;
  [key: string]: any;
}

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
  selectedButton: string | null = null;
  isDocente = false;
  currentUser: Observable<User | null | undefined> = of(null);

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private router: Router,
    private route: ActivatedRoute,
    private afAuth: AngularFireAuth
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
      properUse_calificacion: [''],
      lawAnalysis: [''],
      normativeEvaluation: [''],
      normativeEvaluation_calificacion: [''],
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
          this.loadEvaluacion2Data();
        });
      } else {
        this.loadEvaluacion2Data();
      }
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
          const evaluation2Data = data as any; // Cast to the correct type
          this.evaluacion2Form.patchValue(evaluation2Data);

          // Manually update FormArray values
          this.setSentenceSubject(evaluation2Data.sentenceSubject);
          this.setMultiOption(evaluation2Data.multicomponent.multiOption);
        }
      });
  }

  setSentenceSubject(subjects: string[]) {
    const sentenceSubject = this.evaluacion2Form.get('sentenceSubject') as FormArray;
    subjects.forEach(subject => {
      sentenceSubject.push(this.fb.control(subject));
    });
  }

  setMultiOption(options: string[]) {
    const multiOption = this.evaluacion2Form.get('multicomponent.multiOption') as FormArray;
    options.forEach(option => {
      multiOption.push(this.fb.control(option));
    });
  }

  onCheckboxChange(event: any, controlName: string) {
    const formArray: FormArray = this.evaluacion2Form.get(controlName) as FormArray;

    if (event.target.checked) {
      formArray.push(this.fb.control(event.target.value));
    } else {
      let i: number = 0;
      formArray.controls.forEach((ctrl: any) => {
        if (ctrl.value == event.target.value) {
          formArray.removeAt(i);
          return;
        }
        i++;
      });
    }
  }

  toggleCalificar(controlPath: string): void {
    const control = this.evaluacion2Form.get(controlPath);
    if (control) {
      const currentValue = control.value;
      control.setValue({
        ...currentValue,
        showCalificar: !currentValue.showCalificar,
      });
    }
  }

  setCalificacion(controlPath: string, calificacion: string): void {
    const control = this.evaluacion2Form.get(controlPath);
    if (control) {
      const currentValue = control.value;
      control.setValue({
        ...currentValue,
        calificacion,
      });
      this.selectedButton = calificacion;
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


