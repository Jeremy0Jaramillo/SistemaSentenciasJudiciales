import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
  buttonStates: { [key: string]: string } = {};
  evaluacionForm: FormGroup;
  numero_proceso: string = '';
  asunto: string = '';
  estudiante: string = '';
  docente: string = '';
  saved: boolean = false;
  docenteSaved = false;
  isDocente = false;
  calificaciones: { [key: string]: string } = {};
  currentUser: Observable<User | null | undefined> = of(null);
  selectedButtons: { [key: string]: string } = {};
  calificarState: { [key: string]: boolean } = {};
  cargando: boolean = false; // Nueva propiedad para controlar el estado de carga

  

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private router: Router,
    private route: ActivatedRoute,
    private afAuth: AngularFireAuth,
    private changeDetectorRef: ChangeDetectorRef
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
      this.checkSavedStatus();
      this.checkDocenteSaved();
      setTimeout(() => {
        this.checkLockStatus();
      }, 1000);
      this.loadFormData();
    });
    this.evaluacionForm.get('motivationType_calificacion')?.valueChanges.subscribe(value => {
      console.log('Calificación changed to:', value);
    });
    this.changeDetectorRef.detectChanges();
  }

  loadFormData() {
    this.firestore.collection('evaluacion').doc(this.numero_proceso).valueChanges()
      .subscribe((data: any) => {
        if (data) {
          this.evaluacionForm.patchValue(data);
          this.saved = data.saved || false;
          this.loadCalificaciones(data);

          // Asegúrate de que todas las secciones del formulario se actualicen
          this.evaluacionForm.markAsPristine();
          this.evaluacionForm.markAsUntouched();
        }
      });
  }

  isButtonSelected(section: string, controlName: string, value: string): boolean {
      this.calificaciones[section] = value;
      let controlPath = "";
      if (section === "motivationType") {
        controlPath = controlName
      } else {
        controlPath = `${section}.${controlName}`
        console.log(controlPath)
      }
    return this.buttonStates[controlPath] === value;
  }

  loadCalificaciones(data: any) {
    this.buttonStates = {}; // Reinicia buttonStates
    this.updateButtonStates(data, '');
    this.changeDetectorRef.detectChanges(); // Forzar actualización de la vista
  }
  

  updateButtonStates(obj: any, prefix: string) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          this.updateButtonStates(obj[key], fullPath);
        } else if (key.endsWith('_calificacion')) {
          this.buttonStates[fullPath] = obj[key];
        }
      }
    }
  }

  checkSavedStatus() {
    this.firestore.collection('evaluacion').doc(this.numero_proceso).valueChanges()
      .subscribe((data: any) => {
        if (data) {
          this.saved = data.saved || false;
        }
        if (data && data.saved) {
          this.saved = true;
          // Desactiva el select
          const selectElement = document.getElementById('motivationType') as HTMLSelectElement;
          if (selectElement) {
            selectElement.disabled = true;
          }
        }
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
    // No resetear ni deshabilitar los FormGroups
    // Solo actualizar la visibilidad en el HTML
    this.evaluacionForm.patchValue({ motivationType: value });
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

  getCalificacionValue(controlPath: string): string {
    const control = this.evaluacionForm.get(controlPath);
    if (control) {
      return control.value ? control.value : 'No Calificado';
    }
    return 'No Calificado';
  }
  
  
  setCalificacion(controlPath: string, calificacion: string): void {
    const control = this.evaluacionForm.get(controlPath);
    if (control) {
      control.setValue(calificacion);
      this.selectedButtons['motivationType'] = calificacion;    }
  }
  
  
  submitForm() {
    this.cargando = true; // Activar el estado de carga
    this.evaluacionForm.patchValue({ saved: true });
    if (this.isDocente) {
      this.evaluacionForm.patchValue({ docenteSaved: true });
    }
    
    const analisisData = this.evaluacionForm.value;

    for (const [key, value] of Object.entries(this.buttonStates)) {
      const parts = key.split('.');
      let current: any = analisisData;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    }

    this.firestore.collection('evaluacion').doc(this.numero_proceso).set(analisisData)
      .then(() => {
        this.saved = true;
        window.location.reload();
        this.cargando = false; // Desactivar el estado de carga

      })
      .catch(error => {
        console.error("Error saving document: ", error);
        this.cargando = false; // Desactivar el estado de carga
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
    this.calificaciones[section] = value;
    let controlPath = "";
    if (section === "motivationType") {
      controlPath = controlName
    } else {
      controlPath = `${section}.${controlName}`
    }
    let control = this.evaluacionForm.get(controlPath);
    if(control){
      control.setValue(value);
      this.buttonStates[controlPath] = value;
    }
    this.changeDetectorRef.detectChanges();
  }

  isCalificacionCorrecta(field: string): boolean {
    return this.calificaciones[field] === 'Correcto';
  }
  
  isCalificacionIncorrecta(field: string): boolean {
    return this.calificaciones[field] === 'Incorrecto';
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