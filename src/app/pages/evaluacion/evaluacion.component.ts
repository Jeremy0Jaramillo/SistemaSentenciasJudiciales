import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, AbstractControl, FormArray } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ActivatedRoute, Router } from '@angular/router';
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
  docenteSaved = false;
  isDocente = false;
  currentUser: Observable<User | null | undefined> = of(null);
  selectedButton: string | null = null;
  calificarState: { [key: string]: boolean } = {};

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private router: Router,
    private route: ActivatedRoute,
    private afAuth: AngularFireAuth
  ) {
    this.evaluacionForm = this.fb.group({
      numero_proceso: new FormControl (''),
      saved: [false],
      docenteSaved: [false],
      motivationType: new FormControl (''),
      motivationType_calificacion: new FormControl (''),
      motivationType_retroalimentacion: new FormControl (''),
      nonexistinence: this.fb.group({
        lackFoundationNormative: new FormControl (''),
        reasonsNormative: new FormControl (''),
        normative_calificacion: new FormControl (''),
        normative_retroalimentacion: new FormControl (''),
        lackFoundationFactual: new FormControl (''),
        reasonsFactual: new FormControl (''),
        factual_calificacion: new FormControl (''),
        factual_retroalimentacion: new FormControl (''),
        lackMotivation: new FormControl (''),
        reasonsMotivation: new FormControl (''),
        motivation_calificacion: new FormControl (''),
        motivation_retroalimentacion: new FormControl ('')
      }),
      insufficiency: this.fb.group({
        lackFoundationNormative: new FormControl (''),
        reasonsNormative: new FormControl (''),
        normative_calificacion: new FormControl (''),
        normative_retroalimentacion: new FormControl (''),
        lackFoundationFactual: new FormControl (''),
        reasonsFactual: new FormControl (''),
        factual_calificacion: new FormControl (''),
        factual_retroalimentacion: new FormControl (''),
        lackMotivation: new FormControl (''),
        reasonsMotivation: new FormControl (''),
        motivation_calificacion: new FormControl (''),
        motivation_retroalimentacion: new FormControl ('')
      }),
      appearance: this.fb.group({
        appearanceReason: new FormControl (''),
        motivationalHabit: new FormControl (''),
        motivationalHabit_calificacion: new FormControl (''),
        motivationalHabit_retroalimentacion: new FormControl (''),
        incoherence: this.fb.group({
          existsLogicalNormative: new FormControl (''),
          reasonsLogicaNormative: new FormControl (''),
          logicaNormative_calificacion: new FormControl (''),
          logicaNormative_retroalimentacion: new FormControl (''),
          existsDecisionalNormative: new FormControl (''),
          reasonsDecisionalNormative: new FormControl (''),
          decisionalNormative_calificacion: new FormControl (''),
          decisionalNormative_retroalimentacion: new FormControl (''),
          existsLogicalFactual: new FormControl (''),
          reasonsLogicalFactual: new FormControl (''),
          logicalFactual_calificacion: new FormControl (''),
          logicalFactual_retroalimentacion: new FormControl (''),
          existsDecisionalFactual: new FormControl (''),
          reasonsDecisionalFactual: new FormControl (''),
          decisionalFactual_calificacion: new FormControl (''),
          decisionalFactual_retroalimentacion: new FormControl (''),
          lackMotivation: new FormControl (''),
          reasonsMotivation: new FormControl (''),
          motivation_calificacion: new FormControl (''),
          motivation_retroalimentacion: new FormControl ('')
        }),
        inatinence: this.fb.group({
          existsInatinenceJuridical: new FormControl (''),
          reasonsInatinenceJuridical: new FormControl (''),
          inatinenceJuridical_calificacion: new FormControl (''),
          inatinenceJuridical_retroalimentacion: new FormControl (''),
          existsInatinenceFactual: new FormControl (''),
          reasonsInatinenceFactual: new FormControl (''),
          inatinenceFactual_calificacion: new FormControl (''),
          inatinenceFactual_retroalimentacion: new FormControl ('')
        }),
        incomprehensibility: this.fb.group({
          existsIncomprehensibilityJuridical: new FormControl (''),
          reasonsIncomprehensibilityJuridical: new FormControl (''),
          incomprehensibilityJuridical_calificacion: new FormControl (''),
          incomprehensibilityJuridical_retroalimentacion: new FormControl (''),
          existsIncomprehensibilityFactual: new FormControl (''),
          reasonsIncomprehensibilityFactual: new FormControl (''),
          incomprehensibilityFactual_calificacion: new FormControl (''),
          incomprehensibilityFactual_retroalimentacion: new FormControl ('')
        }),
        incongruity: this.fb.group({
          existsIncongruityNormativeParticipants: new FormControl (''),
          reasonsIncongruityNormativeParticipants: new FormControl (''),
          normativeParticipants_calificacion: new FormControl (''),
          normativeParticipants_retroalimentacion: new FormControl (''),
          existsIncongruityNormativeLaw: new FormControl (''),
          reasonsIncongruityNormativeLaw: new FormControl (''),
          normativeLaw_calificacion: new FormControl (''),
          normativeLaw_retroalimentacion: new FormControl (''),
          existsIncongruityFactualParticipants: new FormControl (''),
          reasonsIncongruityFactualParticipants: new FormControl (''),
          factualParticipants_calificacion: new FormControl (''),
          factualParticipants_retroalimentacion: new FormControl (''),
          existsIncongruityFactualLaw: new FormControl (''),
          reasonsIncongruityFactualLaw: new FormControl (''),
          factualLaw_calificacion: new FormControl (''),
          factualLaw_retroalimentacion: new FormControl ('')
        })
      })
    });
    // Call the method on form changes
    this.evaluacionForm.get('motivationType')?.valueChanges.subscribe(value => {
      this.handleMotivationTypeChange(value);
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
      this.checkDocenteSaved();
      setTimeout(() => {
        this.checkLockStatus();
      }, 1000);
    });
  }

  checkLockStatus() {
    this.firestore.collection('locks').doc(this.numero_proceso).valueChanges().subscribe((data: any) => {
      if (data && data.locked) {
        this.disableFormControls(this.evaluacionForm); // Disable the form if it's locked
      }
    });
  }
  

  lockForm() {
    this.firestore.collection('locks').doc(this.numero_proceso).set({ locked: true })
      .then(() => {
        this.disableFormControls(this.evaluacionForm); // Disable the form controls
      })
      .catch(error => {
        console.error("Error locking form: ", error);
      });
  }
  
  disableFormControls(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.disable(); // Disable the control
      if (control instanceof FormGroup || control instanceof FormArray) {
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
            this.checkDocenteSaved();
          }
        });
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
        }
      });
  }

  handleMotivationTypeChange(value: string): void {
    const nonexistinence = this.evaluacionForm.get('nonexistinence') as FormGroup;
    const insufficiency = this.evaluacionForm.get('insufficiency') as FormGroup;
    const appearance = this.evaluacionForm.get('appearance') as FormGroup;
  
    if (nonexistinence && insufficiency && appearance) {
      // Disable and clear the other sections
      if (value === 'nonexistinence') {
        insufficiency.reset();
        insufficiency.disable();
        appearance.reset();
        appearance.disable();
        nonexistinence.enable();
      } else if (value === 'insufficiency') {
        nonexistinence.reset();
        nonexistinence.disable();
        appearance.reset();
        appearance.disable();
        insufficiency.enable();
      } else if (value === 'appearance') {
        nonexistinence.reset();
        nonexistinence.disable();
        insufficiency.reset();
        insufficiency.disable();
        appearance.enable();
      } else {
        nonexistinence.disable();
        insufficiency.disable();
        appearance.disable();
      }
    }
  }

  resetOtherAppearanceFields(selectedField: string): void {
    const appearance = this.evaluacionForm.get('appearance') as FormGroup;
  
    if (!appearance) return;
  
    const fields = ['incoherence', 'inatinence', 'incomprehensibility', 'incongruity'];
  
    fields.forEach(field => {
      if (field !== selectedField) {
        const control = appearance.get(field);
        if (control) {
          control.reset();
        }
      }
    });
  }

  handleAppearanceFieldChange(selectedField: string): void {
    this.resetOtherAppearanceFields(selectedField);
  }
  
  checkDocenteSaved() {
    this.firestore.collection('evaluacion').doc(this.numero_proceso).valueChanges()
      .subscribe((data: any) => {
        if (data && data.saved) {
          this.docenteSaved = data.docenteSaved || false;
        }
      });
  }

  getCalificacionValue(controlName: string): string {
    const control = this.evaluacionForm.get(controlName);
    return control && control.value ? control.value : 'No Calificado';
  }
  
  submitForm() {
    this.evaluacionForm.patchValue({ saved: true });
    if (this.isDocente) {
      this.evaluacionForm.patchValue({ docenteSaved: true });
    }
    
    const analisisData = this.evaluacionForm.value;
    this.firestore.collection('evaluacion').doc(this.numero_proceso).set(analisisData)
      .then(() => {
        this.saved = true;
        window.location.reload();
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
    if (this.docenteSaved) {
      this.router.navigate(['/evaluacion2'], {
        queryParams: {
          numero_proceso: this.numero_proceso,
          asunto: this.asunto,
          estudiante: this.estudiante,
          docente: this.docente
        }
      });
    }
  }

  toggleCalificar(section: string) {
    this.calificarState[section] = !this.calificarState[section];
  }

  selectButton(section: string, controlName: string, value: string) {
    const controlPath = `${section}.${controlName}`;
    const control = this.evaluacionForm.get(controlPath);
    if (control) {
      control.setValue(value);
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