import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';



interface User {
  uid: string;
  role: string;
  [key: string]: any;
}

interface Section {
  title: string;
  questions: string[];
}

@Component({
  selector: 'app-evaluacion2',
  templateUrl: './evaluacion2.component.html',
  styleUrls: ['./evaluacion2.component.css']
})
export class Evaluacion2Component implements OnInit {
  evaluacion2Form!: FormGroup;
  sections: Section[] = [
    //SECCION 1: "Argumentacion juridica y motivacion correcta"
    {
      title: 'Argumentación jurídica y motivación correcta',
      questions: [
        'Resumen de los hechos y fundamentos de Derecho encontrados como válidos para establecer la motivación correspondiente a la parte considerativa y expositiva de la resolución.',
        'Conceptualización de los hechos descritos en el proceso de acuerdo a la materia y la norma legal vigente aplicable. Fundamentación normativa correcta, entendida como la mejor argumentación posible conforme al Derecho.',
        'Conclusión de la decisión final frente a los hechos presentados en base al análisis realizado.',
        'Adecuado uso y aplicación de medidas cautelares/protección dentro del proceso.'
      ]
    },
    //SECCION 2: "Principios constitucionales"
    {
      title: 'Principios constitucionales',
      questions: [
        'Análisis del derecho de la tutela judicial efectiva y de los principios y reglas del debido proceso.',
        'Evaluación normativa de los hechos presentados y ponderación para la valoración de la prueba. Fundamentación fática correcta, entendida como la mejor argumentación posible conforme a los hechos.'
      ]
    },
    //SECCION 3: "Aplicación de precedentes obligatorios, jurisprudencia y/o doctrina aplicada."
    {
      title: 'Aplicación de precedentes obligatorios, jurisprudencia y/o doctrina aplicada.',
      questions: [
        'Aplicación de precedentes obligatorios, jurisprudencia y/o doctrina aplicada con la norma legal vigente y de acuerdo al caso.',
        'Claridad en la expresión escrita y uso apropiado del lenguaje técnico jurídico.',
      ]
    },
     //SECCION 4: "Aplicación de procedimientos directos y abreviados."
     {
      title: 'Aplicación de procedimientos directos y abreviados.',
      questions: [
        'Adecuado análisis y calificación del delito',
        'Apropiado análisis y consideración de la Pena para la calificación del procedimiento especial de acuerdo al art. 640 del COIP y abreviado.',
        'Adecuado análisis de la procedencia de identificación del delito y/o monto en los delitos contra la propiedad.'
      ]
    },
    //SECCION 5: "Reducir a escrito las sentencias o resoluciones judiciales, de acuerdo a la materia, en los plazos o términos previstos en la ley."
    {
      title: 'Reducir a escrito las sentencias o resoluciones judiciales, de acuerdo a la materia, en los plazos o  términos previstos en la ley.',
      questions: [
        'Aplicación de precedentes obligatorios, jurisprudencia y/o doctrina aplicada con la norma legal vigente y de acuerdo al caso.',
        'Claridad en la expresión escrita y uso apropiado del lenguaje técnico jurídico.',
        'Adecuado análisis de la procedencia de identificación del delito y/o monto en los delitos contra la propiedad.'
      ]
    },
  ];
  isFormLocked: boolean = false;
  cargando: boolean = false; // Nueva propiedad para controlar el estado de carga
  numero_proceso: string = '';
  asunto: string = '';
  estudiante: string = '';
  docente: string = '';
  saved = false;
  docenteSaved = false;
  selectedButton: string | null = null;
  isDocente = false;
  currentUser: Observable<User | null | undefined> = of(null);
  calificarState: { [key: string]: boolean } = {};
  calificaciones: { [key: string]: string } = {};
  buttonStates: { [key: string]: string } = {};
  docenteSelections: { [key: string]: boolean } = {};
  studentSelections: { [key: string]: boolean } = {};
  mostrarRetroalimentacion: { [key: string]: boolean } = {};
  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private router: Router,
    private route: ActivatedRoute,
    private afAuth: AngularFireAuth,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.evaluacion2Form = this.fb.group({
      numero_proceso: [''],
      saved: [false],
      docenteSaved: [false],
      sentenceSubject: this.fb.array([]),
      multicomponent: this.fb.group({
        multiOption: this.fb.array([])
      }),
      other: this.fb.group({
        otherSubject: ['']
      }),
      sentenceSubject_calificacion: [''],
      sentenceSubject_retroalimentacion: [''],
      judgeAnalysis: [''],
      reasonsNormative: [''],
      reasonsNormative_calificacion: [''],
      reasonsNormative_retroalimentacion: [''],
      finalConclusion: [''],
      finalConclusion_calificacion: [''],
      finalConclusion_retroalimentacion: [''],
    });
  }
  

  finalizarEvaluacion() {
    if (this.docenteSaved) {
      this.router.navigate(['/principal']);
    }
  }

  
  initForm() {
    const formGroup: {[key: string]: any} = {};
    this.sections.forEach((section, sIndex) => {
      section.questions.forEach((_, qIndex) => {
        formGroup[`section${sIndex}_question${qIndex}`] = [''];  // Preguntas
      });
      formGroup[`section${sIndex}_calificacion`] = [''];  // Calificación
      formGroup[`section${sIndex}_retroalimentacion`] = [''];  // Retroalimentación
    });
    this.evaluacion2Form = this.fb.group(formGroup);
  }
  
  ngOnInit() {
    this.initForm();
    this.route.queryParamMap.subscribe(params => {
      this.numero_proceso = params.get('numero_proceso') || '';
      this.asunto = params.get('asunto') || '';
      this.estudiante = params.get('estudiante') || '';
      this.docente = params.get('docente') || '';
      this.evaluacion2Form.patchValue({
        numero_proceso: this.numero_proceso
      });
      this.loadEvaluacion2Data();
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
        this.evaluacion2Form.disable();
        this.isFormLocked = true;
      }
    });
  }
  lockForm() {
    this.firestore.collection('locks').doc(this.numero_proceso).set({ locked: true })
      .then(() => {
        this.evaluacion2Form.disable();
        this.isFormLocked = true;
        console.log('Formulario bloqueado');
      })
      .catch(error => {
        console.error("Error locking form: ", error);
      });
  }

  disableFormControls(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.disableFormControls(control);
      } else {
        control?.disable();
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
          }
          this.loadEvaluacion2Data();
        });
      } else {
        this.loadEvaluacion2Data();
      }
    });
  }

  submitForm() {
    this.cargando = true;
    this.evaluacion2Form.patchValue({ saved: true });

    const analisisData = this.evaluacion2Form.value;
    this.firestore.collection('evaluacion2').doc(this.numero_proceso).set(analisisData)
      .then(() => {
        if (this.isDocente) {
          this.docenteSaved = true;
        }
        this.cargando = false; // Desactivar el estado de carga
        this.saved = true;
        window.location.reload();
      })
      .catch(error => {
        console.error("Error saving document: ", error);
        this.cargando = false; // Desactivar el estado de carga
      });
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


  loadEvaluacion2Data() {
    this.firestore.collection('evaluacion2').doc(this.numero_proceso)
      .valueChanges()
      .subscribe(data => {
        if (data) {
          const evaluation2Data = data as any;
          this.evaluacion2Form.patchValue(evaluation2Data);
          this.loadCalificaciones(data);
          if (evaluation2Data.docenteSelections) {
            this.docenteSelections = evaluation2Data.docenteSelections;
          }
          Object.keys(evaluation2Data).forEach(key => {
            if (key.endsWith('_calificacion')) {
              this.buttonStates[key] = evaluation2Data[key];
            }
          });
          if (evaluation2Data.docenteSelections) {
            this.docenteSelections = evaluation2Data.docenteSelections;
          }
          this.checkLockStatus();
          ['sentenceSubject', 'reasonsNormative', 'finalConclusion'].forEach(field => {
            const retroKey = `${field}_retroalimentacion`;
            if (evaluation2Data[retroKey]) {
              this.evaluacion2Form.get(retroKey)?.setValue(evaluation2Data[retroKey]);
            }  
          });
          this.changeDetectorRef.detectChanges();
        }
      });
  }

  updateFormArray(controlName: string, values: any[]) {
    const formArray = this.evaluacion2Form.get(controlName) as FormArray;
    formArray.clear();
    if (values && Array.isArray(values)) {
      values.forEach(value => {
        formArray.push(this.fb.control(value));
      });
    }
  }

  saveDocenteSelections() {
    const updateData = {
      docenteSelections: this.docenteSelections,
      sentenceSubject: this.evaluacion2Form.get('sentenceSubject')?.value,
      'multicomponent.multiOption': this.evaluacion2Form.get('multicomponent.multiOption')?.value
    };

    this.firestore.collection('evaluacion2').doc(this.numero_proceso).update(updateData)
      .then(() => {
        console.log('Selecciones del docente guardadas');
      }).catch(error => {
        console.error('Error al guardar las selecciones del docente:', error);
      });
  }

  isDocenteSelected(value: string): boolean {
    return this.docenteSelections[value] === true;
  }

  isStudentSelected(value: string): boolean {
    return this.studentSelections[value] === true && !this.isDocenteSelected(value);
  }

  checkDocenteSaved() {
    this.firestore.collection('evaluacion2').doc(this.numero_proceso).valueChanges()
      .subscribe((data: any) => {
        if (data && data.saved) {
          this.docenteSaved = data.docenteSaved || false;
        }
      });
  }

  setFormArrayValues(controlName: string, values: any[]) {
    const formArray = this.evaluacion2Form.get(controlName) as FormArray;
    // formArray.clear(); // Clear existing values

    if (values) {
      values.forEach(value => {
        formArray.push(this.fb.control(value));
      });
    }
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

  toggleCalificar(section: string) {
    this.calificarState[section] = !this.calificarState[section];
  }

  toggleCalificar2(key: string) {
    this.calificarState[key] = !this.calificarState[key];
  }

  setCalificacion2(controlName: string, value: string) {
    this.evaluacion2Form.get(controlName)?.setValue(value);
  }

  isButtonSelected2(controlName: string, value: string): boolean {
    return this.evaluacion2Form.get(controlName)?.value === value;
  }

  setCalificacion(controlPath: string, calificacion: string): void {
    const control = this.evaluacion2Form.get(controlPath);
    console.log(control)
    if (control) {
      control.setValue(calificacion);
      this.buttonStates[controlPath] = calificacion;
      console.log(`Control ${controlPath} set to: ${calificacion}`);
      this.saveFormChanges();
    }
  }

  isButtonSelected(controlPath: string, calificacion: string): boolean {
    return this.buttonStates[controlPath] === calificacion;
  }

  resetOtherCheckboxes(controlName: string) {
    Object.keys(this.evaluacion2Form.controls).forEach(key => {
      if (key !== controlName) {
        this.evaluacion2Form.get(key)?.setValue(null);
      }
    });
  }

  
  getCalificacionValue(controlName: string): string {
    const control = this.evaluacion2Form.get(controlName);
    const value = control?.value;
    console.log(`Getting calificacion for ${controlName}:`, value); // Para depuración
    return value ? value : 'No Calificado';
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

  saveFormChanges() {
    const formData = this.evaluacion2Form.value;
    console.log('Saving form data:', formData); // Para depuración
    this.firestore.collection('evaluacion2').doc(this.numero_proceso).update(formData)
      .then(() => {
        console.log('Cambios guardados correctamente');
      })
      .catch(error => {
        console.error('Error al guardar los cambios:', error);
      });
  }

  getRetroalimentacionValue(controlName: string): string {
    return this.evaluacion2Form.get(controlName)?.value || '';
  }
  
  toggleRetroalimentacion(sectionId: string) {
    this.mostrarRetroalimentacion[sectionId] = !this.mostrarRetroalimentacion[sectionId];
  }
}