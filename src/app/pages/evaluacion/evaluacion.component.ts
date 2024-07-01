import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { Observable,of } from 'rxjs';

interface User {
  uid: string;
  role: string;
  [key: string]: any;
}

@Component({
  selector: 'app-evaluacion',
  templateUrl: './evaluacion.component.html',
  styleUrls: ['./evaluacion.component.css']
})
export class EvaluacionComponent implements OnInit {
  evaluacionForm: FormGroup;
  numero_proceso: string = '';
  asunto: string = '';
  estudiante: string = '';
  docente: string = '';
  saved = false;
  isDocente = false;
  currentUser: Observable<User | null | undefined> = of(null);
  selectedButton: string | null = null;

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private router: Router,
    private route: ActivatedRoute,
    private afAuth: AngularFireAuth
  ) {
    this.evaluacionForm = this.fb.group({
      numero_proceso: ['', Validators.required],
      motivationType: ['', Validators.required],
      nonexistinence: this.fb.group({
        lackFoundationNormative: ['', Validators.required],
        reasonsNormative: ['', Validators.required],
        normative_calificacion: [''],
        normative_retroalimentacion: [''],
        lackFoundationFactual: ['', Validators.required],
        reasonsFactual: ['', Validators.required],
        factual_calificacion: [''],
        factual_retroalimentacion: [''],
        lackMotivation: ['', Validators.required],
        reasonsMotivation: ['', Validators.required],
        motivation_calificacion: [''],
        motivation_retroalimentacion: ['']
      }),
      insufficiency: this.fb.group({
        lackFoundationNormative: ['', Validators.required],
        reasonsNormative: ['', Validators.required],
        normative_calificacion: [''],
        normative_retroalimentacion: [''],
        lackFoundationFactual: ['', Validators.required],
        reasonsFactual: ['', Validators.required],
        factual_calificacion: [''],
        factual_retroalimentacion: [''],
        lackMotivation: ['', Validators.required],
        reasonsMotivation: ['', Validators.required],
        motivation_calificacion: [''],
        motivation_retroalimentacion: ['']
      }),
      appearance: this.fb.group({
        appearanceReason: ['', Validators.required],
        motivationalHabit: ['', Validators.required],
        incoherence: this.fb.group({
          existsLogicalNormative: ['', Validators.required],
          reasonsLogicaNormative: ['', Validators.required],
          logicaNormative_calificacion: ['', Validators.required],
          logicaNormative_retroalimentacion: ['', Validators.required],
          existsDecisionalNormative: ['', Validators.required],
          reasonsDecisionalNormative: ['', Validators.required],
          decisionalNormative_calificacion: ['', Validators.required],
          decisionalNormative_retroalimentacion: ['', Validators.required],
          existsLogicalFactual: ['', Validators.required],
          reasonsLogicalFactual: ['', Validators.required],
          logicalFactual_calificacion: ['', Validators.required],
          logicalFactual_retroalimentacion: ['', Validators.required],
          existsDecisionalFactual: ['', Validators.required],
          reasonsDecisionalFactual: ['', Validators.required],
          decisionalFactual_calificacion: ['', Validators.required],
          decisionalFactual_retroalimentacion: ['', Validators.required],
          lackMotivation: ['', Validators.required],
          reasonsMotivation: ['', Validators.required],
          motivation_calificacion: ['', Validators.required],
          motivation_retroalimentacion: ['', Validators.required]
        }),
        inatinence: this.fb.group({
          existsInatinenceJuridical: ['', Validators.required],
          reasonsInatinenceJuridical: ['', Validators.required],
          inatinenceJuridical_calificacion: ['', Validators.required],
          inatinenceJuridical_retroalimentacion: ['', Validators.required],
          existsInatinenceFactual: ['', Validators.required],
          reasonsInatinenceFactual: ['', Validators.required],
          inatinenceFactual_calificacion: ['', Validators.required],
          inatinenceFactual_retroalimentacion: ['', Validators.required]
        }),
        incomprehensibility: this.fb.group({
          existsIncomprehensibilityJuridical: ['', Validators.required],
          reasonsIncomprehensibilityJuridical: ['', Validators.required],
          incomprehensibilityJuridical_calificacion: ['', Validators.required],
          incomprehensibilityJuridical_retroalimentacion: ['', Validators.required],
          existsIncomprehensibilityFactual: ['', Validators.required],
          reasonsIncomprehensibilityFactual: ['', Validators.required],
          incomprehensibilityFactual_calificacion: ['', Validators.required],
          incomprehensibilityFactual_retroalimentacion: ['', Validators.required]
        }),
        incongruity: this.fb.group({
          existsIncongruityNormativeParticipants: ['', Validators.required],
          reasonsIncongruityNormativeParticipants: ['', Validators.required],
          normativeParticipants_calificacion: ['', Validators.required],
          normativeParticipants_retroalimentacion: ['', Validators.required],
          existsIncongruityNormativeLaw: ['', Validators.required],
          reasonsIncongruityNormativeLaw: ['', Validators.required],
          normativeLaw_calificacion: ['', Validators.required],
          normativeLaw_retroalimentacion: ['', Validators.required],
          existsIncongruityFactualParticipants: ['', Validators.required],
          reasonsIncongruityFactualParticipants: ['', Validators.required],
          factualParticipants_calificacion: ['', Validators.required],
          factualParticipants_retroalimentacion: ['', Validators.required],
          existsIncongruityFactualLaw: ['', Validators.required],
          reasonsIncongruityFactualLaw: ['', Validators.required],
          factualLaw_calificacion: ['', Validators.required],
          factualLaw_retroalimentacion: ['', Validators.required]
        })
      })
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.numero_proceso = params['numero_proceso'] || '';
      this.asunto = params['asunto'] || '';
      this.estudiante = params['estudiante'] || '';
      this.docente = params['docente'] || '';

      this.evaluacionForm.patchValue({
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
          this.loadEvaluacionData();
        });
      } else {
        this.loadEvaluacionData();
      }
    });
  }

  loadEvaluacionData() {
    this.firestore.collection('evaluacion', ref => ref.where('numero_proceso', '==', this.numero_proceso))
      .valueChanges()
      .subscribe(data => {
        if (data && data.length) {
          const evaluationData = data[0] as evaluacionData; // Cast to the correct type
          this.evaluacionForm.patchValue(evaluationData);
          this.saved = true;
        }
      });
  }

  submitForm() {
    const evaluacionData = this.evaluacionForm.value;
    this.firestore.collection('evaluacion').doc(this.numero_proceso).set(evaluacionData)
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

  redirectToEvaluacion2() {
    this.router.navigate(['/evaluacion2'], {
      queryParams: {
        numero_proceso: this.numero_proceso,
        asunto: this.asunto,
        estudiante: this.estudiante,
        docente: this.docente
      }
    });
  }

  toggleCalificar(controlPath: string): void {
    const control = this.evaluacionForm.get(controlPath);
    if (control) {
      const currentValue = control.value;
      control.setValue({
        ...currentValue,
        showCalificar: !currentValue.showCalificar,
      });
    }
  }

  setCalificacion(controlPath: string, calificacion: string): void {
    const control = this.evaluacionForm.get(controlPath);
    if (control) {
      const currentValue = control.value;
      control.setValue({
        ...currentValue,
        calificacion,
      });
      this.selectedButton = calificacion;
    }
  }
}


interface evaluacionData {
  numero_proceso: string;
  motivationType: string;
  inexistencia?: {
    faltaFundamentacionNormativa: string;
    motivoFundamentacionNormativa: string;
    normativa_calificacion: string;
    normativa_retroalimentacion: string;
    faltaFundamentacionFactica: string;
    motivoFundamentacionFactica: string;
    factica_calificacion: string;
    factica_retroalimentacion: string;
    deficitMotivacion: string;
    motivoDeficitMotivacion: string;
    motivacion_calificacion: string;
    motivacion_retroalimentacion: string;
  };
  insuficiencia?: {
    faltaFundamentacionNormativa: string;
    motivoFundamentacionNormativa: string;
    normativa_calificacion: string;
    normativa_retroalimentacion: string;
    faltaFundamentacionFactica: string;
    motivoFundamentacionFactica: string;
    factica_calificacion: string;
    factica_retroalimentacion: string;
    deficitMotivacion: string;
    motivoDeficitMotivacion: string;
    motivacioncalificacion: string;
    motivacionretroalimentacion: string;
  };
  apariencia?: {
    motivoApariencia: string;
    vicioMotivacional: string;
    incoherenciaJuridica: {
      incoherenciaLogicaNormativa: string;
      motivoLogicaNormativa: string;
      incoherenciaDecisionalNormativa: string;
      motivoDecisionalNormativa: string;
      incoherenciaLogicaFactica: string;
      motivoLogicaFactica: string;
      incoherenciaDecisionalFactica: string;
      motivoDecisionalFactica: string;
      deficitMotivacion: string;
      motivoDeficitMotivacion: string;
    };
  };
}