import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, AbstractControl, FormArray } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';

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
  mostrarMensaje: boolean = false;
  calificaciones: { [key: string]: string } = {};
  currentUser: Observable<User | null | undefined> = of(null);
  selectedButtons: { [key: string]: string } = {};
  calificarState: { [key: string]: boolean } = {};
  cargando: boolean = false; // Nueva propiedad para controlar el estado de carga
  mostrarRetroalimentacion: { [key: string]: boolean } = {};
  mensajeError: string = '';
  private isSubmitting = false

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private router: Router,
    private route: ActivatedRoute,
    private afAuth: AngularFireAuth,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.evaluacionForm = this.fb.group({
      numero_proceso: new FormControl(''),
      saved: [false],
      docenteSaved: [false],
      motivationType: new FormControl(''),
      motivationType_calificacion: new FormControl(''),
      motivationType_retroalimentacion: new FormControl(''),
      nonexistinence: this.fb.group({
        lackFoundationNormative: new FormControl(''),
        reasonsNormative: new FormControl(''),
        normative_calificacion: new FormControl(''),
        normative_retroalimentacion: new FormControl(''),
        lackFoundationFactual: new FormControl(''),
        reasonsFactual: new FormControl(''),
        factual_calificacion: new FormControl(''),
        factual_retroalimentacion: new FormControl(''),
        lackMotivation: new FormControl(''),
        reasonsMotivation: new FormControl(''),
        motivation_calificacion: new FormControl(''),
        motivation_retroalimentacion: new FormControl('')
      }),
      insufficiency: this.fb.group({
        lackFoundationNormative: new FormControl(''),
        reasonsNormative: new FormControl(''),
        normative_calificacion: new FormControl(''),
        normative_retroalimentacion: new FormControl(''),
        lackFoundationFactual: new FormControl(''),
        reasonsFactual: new FormControl(''),
        factual_calificacion: new FormControl(''),
        factual_retroalimentacion: new FormControl(''),
        lackMotivation: new FormControl(''),
        reasonsMotivation: new FormControl(''),
        motivation_calificacion: new FormControl(''),
        motivation_retroalimentacion: new FormControl('')
      }),
      appearance: this.fb.group({
        appearanceReason: new FormControl(''),
        motivationalHabit: new FormControl(''),
        motivationalHabit_calificacion: new FormControl(''),
        motivationalHabit_retroalimentacion: new FormControl(''),
        incoherence: this.fb.group({
          existsLogicalNormative: new FormControl(''),
          reasonsLogicaNormative: new FormControl(''),
          logicaNormative_calificacion: new FormControl(''),
          logicaNormative_retroalimentacion: new FormControl(''),
          existsDecisionalNormative: new FormControl(''),
          reasonsDecisionalNormative: new FormControl(''),
          decisionalNormative_calificacion: new FormControl(''),
          decisionalNormative_retroalimentacion: new FormControl(''),
          existsLogicalFactual: new FormControl(''),
          reasonsLogicalFactual: new FormControl(''),
          logicalFactual_calificacion: new FormControl(''),
          logicalFactual_retroalimentacion: new FormControl(''),
          existsDecisionalFactual: new FormControl(''),
          reasonsDecisionalFactual: new FormControl(''),
          decisionalFactual_calificacion: new FormControl(''),
          decisionalFactual_retroalimentacion: new FormControl(''),
          lackMotivation: new FormControl(''),
          reasonsMotivation: new FormControl(''),
          motivation_calificacion: new FormControl(''),
          motivation_retroalimentacion: new FormControl('')
        }),
        inatinence: this.fb.group({
          existsInatinenceJuridical: new FormControl(''),
          reasonsInatinenceJuridical: new FormControl(''),
          inatinenceJuridical_calificacion: new FormControl(''),
          inatinenceJuridical_retroalimentacion: new FormControl(''),
          existsInatinenceFactual: new FormControl(''),
          reasonsInatinenceFactual: new FormControl(''),
          inatinenceFactual_calificacion: new FormControl(''),
          inatinenceFactual_retroalimentacion: new FormControl('')
        }),
        incomprehensibility: this.fb.group({
          existsIncomprehensibilityJuridical: new FormControl(''),
          reasonsIncomprehensibilityJuridical: new FormControl(''),
          incomprehensibilityJuridical_calificacion: new FormControl(''),
          incomprehensibilityJuridical_retroalimentacion: new FormControl(''),
          existsIncomprehensibilityFactual: new FormControl(''),
          reasonsIncomprehensibilityFactual: new FormControl(''),
          incomprehensibilityFactual_calificacion: new FormControl(''),
          incomprehensibilityFactual_retroalimentacion: new FormControl('')
        }),
        incongruity: this.fb.group({
          existsIncongruityNormativeParticipants: new FormControl(''),
          reasonsIncongruityNormativeParticipants: new FormControl(''),
          normativeParticipants_calificacion: new FormControl(''),
          normativeParticipants_retroalimentacion: new FormControl(''),
          existsIncongruityNormativeLaw: new FormControl(''),
          reasonsIncongruityNormativeLaw: new FormControl(''),
          normativeLaw_calificacion: new FormControl(''),
          normativeLaw_retroalimentacion: new FormControl(''),
          existsIncongruityFactualParticipants: new FormControl(''),
          reasonsIncongruityFactualParticipants: new FormControl(''),
          factualParticipants_calificacion: new FormControl(''),
          factualParticipants_retroalimentacion: new FormControl(''),
          existsIncongruityFactualLaw: new FormControl(''),
          reasonsIncongruityFactualLaw: new FormControl(''),
          factualLaw_calificacion: new FormControl(''),
          factualLaw_retroalimentacion: new FormControl('')
        })
      })
    });
    // Call the method on form changes
    this.evaluacionForm.get('motivationType')?.valueChanges.subscribe(value => {
      this.handleMotivationTypeChange(value);
    });
  }

  sectionErrors: { [key: string]: string[] } = {
    motivationType: [],
    nonexistence: [],
    insufficiency: [],
    appearance: []
  };

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
    setTimeout(() => {
      console.log('Estado de los radio buttons después de 2 segundos:');
      this.debugRadioButtons();
    }, 2000);
  }

  loadFormData() {
    this.firestore.collection('evaluacion').doc(this.numero_proceso).valueChanges()
      .subscribe((data: any) => {
        if (data) {
          // Aplicamos los valores al formulario
          this.evaluacionForm.patchValue(data, { emitEvent: false });

          // Forzamos la detección de cambios
          setTimeout(() => {
            this.changeDetectorRef.detectChanges();
          }, 100);

          // Si es necesario, forzamos otra actualización después de un momento
          setTimeout(() => {
            this.changeDetectorRef.detectChanges();
          }, 500);
        }
      });
  }

  handleRadioButtonValues(data: any) {
    // Función recursiva para manejar los valores de radio buttons
    const setRadioValues = (obj: any, parentPath: string = '') => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const currentPath = parentPath ? `${parentPath}.${key}` : key;

          if (typeof obj[key] === 'object' && obj[key] !== null) {
            setRadioValues(obj[key], currentPath);
          } else if (key.startsWith('lack') || key.includes('exists')) {
            const control = this.evaluacionForm.get(currentPath);
            if (control) {
              control.setValue(obj[key], { emitEvent: false });
            }
          }
        }
      }
    };

    setRadioValues(data);
  }

  submitForm() {
    if (!this.validateAllSections()) {
      return;
    }
    this.isSubmitting = true;
    this.cargando = true;
    this.evaluacionForm.patchValue({ saved: true });
    if (this.isDocente) {
      this.evaluacionForm.patchValue({ docenteSaved: true });
    }
    const analisisData = this.evaluacionForm.getRawValue();
    // Actualizar las calificaciones
    for (const [key, value] of Object.entries(this.buttonStates)) {
      const parts = key.split('.');
      let current: any = analisisData;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    }
    const processRadioValues = (obj: any) => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            processRadioValues(obj[key]);
          } else if (key.startsWith('lack') || key.includes('exists')) {
            // Asegurarnos de que los valores sean exactamente "Si" o "No"
            if (obj[key] === true) obj[key] = "Si";
            if (obj[key] === false) obj[key] = "No";
          }
        }
      }
    };

    processRadioValues(analisisData);
    this.firestore.collection('evaluacion').doc(this.numero_proceso).set(analisisData)
      .then(() => {
        this.saved = true;
        window.location.reload();
        this.cargando = false;
        setTimeout(() => {
          this.isSubmitting = false;
        }, 100);
      })
      .catch(error => {
        console.error("Error saving document: ", error);
        this.cargando = false;
        this.mostrarMensajeError('Error al guardar');
      });
  }

  mostrarMensajeError(mensaje: string) {
    this.mensajeError = mensaje;
    this.mostrarMensaje = true;
    setTimeout(() => {
      this.mostrarMensaje = false;
      this.mensajeError = '';
    }, 10000);
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

  // Modificamos el método para marcar/desmarcar radio buttons
  setRadioValue(controlPath: string, value: string) {
    const control = this.evaluacionForm.get(controlPath);
    if (control) {
      control.setValue(value, { emitEvent: true });
      this.changeDetectorRef.detectChanges();
    }
  }

  // Método para verificar el valor de un radio button
  isRadioSelected(controlPath: string, value: string): boolean {
    const control = this.evaluacionForm.get(controlPath);
    return control ? control.value === value : false;
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
    // Solo actualizar el valor sin resetear otros campos
    this.evaluacionForm.patchValue({ motivationType: value }, { emitEvent: false });
    // No hacer ningún reset de campos
    this.changeDetectorRef.detectChanges();
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
      this.selectedButtons['motivationType'] = calificacion;
    }
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

  redirectToEvaluacion2(event: Event) {
    event.preventDefault();
    if (!this.validateAllSections()) {
      return;
    }
    if (!this.saved) {
      this.mostrarMensajeError('Por favor, guarde los cambios antes de continuar.');
      return;
    }
    this.router.navigate(['/evaluacion2'], {
      queryParams: {
        numero_proceso: this.numero_proceso,
        asunto: this.asunto,
        estudiante: this.estudiante,
        docente: this.docente
      }
    });
  }


  toggleCalificar(section: string) {
    this.calificarState[section] = !this.calificarState[section];
  }

  selectButton(section: string, controlName: string, value: string) {
    this.calificaciones[section] = value;
    let controlPath = "";
    if (section === "motivationType") {
      controlPath = controlName;
    } else {
      controlPath = `${section}.${controlName}`;
    }
    let control = this.evaluacionForm.get(controlPath);
    if (control) {
      control.setValue(value, { emitEvent: false });
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
  getRetroalimentacionValue(controlName: string): string {
    return this.evaluacionForm.get(controlName)?.value || '';
  }

  toggleRetroalimentacion(sectionId: string) {
    this.mostrarRetroalimentacion[sectionId] = !this.mostrarRetroalimentacion[sectionId];
  }
  debugRadioButtons() {
    const searchRadioControls = (group: any, path = '') => {
      for (const key in group.controls) {
        const control = group.controls[key];
        const currentPath = path ? `${path}.${key}` : key;

        if (control instanceof FormGroup) {
          searchRadioControls(control, currentPath);
        } else if (key.startsWith('lack') || key.includes('exists')) {
          console.log(`Radio button ${currentPath}:`, {
            value: control.value,
            dirty: control.dirty,
            touched: control.touched,
            disabled: control.disabled
          });
        }
      }
    };

    console.log('=== Debug Radio Buttons ===');
    searchRadioControls(this.evaluacionForm);
  }

  validateSection(sectionName: string): string[] {
    const errors: string[] = [];
    const section = this.evaluacionForm.get(sectionName);

    if (!section) return errors;

    switch (sectionName) {
      case 'motivationType':
        if (!section.value) {
          errors.push('Seleccione un tipo de motivación | ');
        }
        break;

      case 'nonexistinence':
        const nonexistence = section.value;
        if (!nonexistence.lackFoundationNormative) {
          errors.push('Complete el campo de fundamentación normativa | ');
        }
        if (nonexistence.lackFoundationNormative === 'Si' && !nonexistence.reasonsNormative) {
          errors.push('Ingrese las razones de la fundamentación normativa | ');
        }
        if (!nonexistence.normative_calificacion) {
          errors.push('Califique la fundamentación normativa | ');
        }
        // Similar validations for factual and motivation fields
        if (!nonexistence.lackFoundationFactual) {
          errors.push('Complete el campo de fundamentación fáctica | ');
        }
        if (!nonexistence.lackMotivation) {
          errors.push('Complete el campo de motivación | ');
        }
        break;

      case 'insufficiency':
        const insufficiency = section.value;
        if (!insufficiency.lackFoundationNormative) {
          errors.push('Complete el campo de fundamentación normativa | ');
        }
        if (insufficiency.lackFoundationNormative === 'Si' && !insufficiency.reasonsNormative) {
          errors.push('Ingrese las razones de la fundamentación normativa | ');
        }
        // Similar validations for factual and motivation fields
        break;

      case 'appearance':
        const appearance = section.value;
        if (!appearance.appearanceReason) {
          errors.push('Complete el motivo de apariencia | ');
        }
        if (!appearance.motivationalHabit) {
          errors.push('Complete el hábito motivacional | ');
        }

        // Validate incoherence subsection
        const incoherence = appearance.incoherence;
        if (incoherence) {
          if (!incoherence.existsLogicalNormative) {
            errors.push('Complete el campo de incoherencia lógica normativa | ');
          }
          // Add more specific validations for incoherence fields
        }

        // Validate inatinence subsection
        const inatinence = appearance.inatinence;
        if (inatinence) {
          if (!inatinence.existsInatinenceJuridical) {
            errors.push('Complete el campo de inatinencia jurídica | ');
          }
          // Add more specific validations for inatinence fields
        }
        break;
    }

    return errors;
  }

  validateAllSections(): boolean {
    let isValid = true;
    this.sectionErrors = {
      motivationType: [],
      nonexistence: [],
      insufficiency: [],
      appearance: []
    };

    // Validate each section
    Object.keys(this.sectionErrors).forEach(sectionName => {
      const errors = this.validateSection(sectionName);
      if (errors.length > 0) {
        this.sectionErrors[sectionName] = errors;
        isValid = false;
      }
    });

    // Show error messages if there are any
    if (!isValid) {
      let errorMessage = '';
      Object.entries(this.sectionErrors).forEach(([section, errors]) => {
        if (errors.length > 0) {
          errorMessage += `\n${this.getSectionTitle(section)}:\n`;
          errors.forEach(error => {
            errorMessage += `- ${error}\n`;
          });
        }
      });
      this.mostrarMensajeError(errorMessage.trim());
    }

    return isValid;
  }

  getSectionTitle(section: string): string {
    switch (section) {
      case 'motivationType':
        return 'Tipo de Motivación';
      case 'nonexistence':
        return 'Inexistencia';
      case 'insufficiency':
        return 'Insuficiencia';
      case 'appearance':
        return 'Apariencia';
      default:
        return section;
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