import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
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
  evaluacion2Form: FormGroup;
  mensajeError: string = '';
  mostrarMensaje: boolean = false;
  sections = [
    //SECCION 1: "Argumentacion juridica y motivacion correcta"
    {
      id: '1',
      title: 'Argumentación jurídica y motivación correcta',
      questions: [
        'Parámetro 1:  Resumen de los hechos y fundamentos de Derecho encontrados como válidos para establecer la motivación correspondiente a la parte considerativa y expositiva de la resolución.',
        'Parámetro 2: Conceptualización de los hechos descritos en el proceso de acuerdo a la materia y la norma legal vigente aplicable. Fundamentación normativa correcta, entendida como la mejor argumentación posible conforme al Derecho.',
        'Parámetro 3: Conclusión de la decisión final frente a los hechos presentados en base al análisis realizado.',
        'Parámetro 4: Adecuado uso y aplicación de medidas cautelares/protección dentro del proceso.'
      ]
    },
    //SECCION 2: "Principios constitucionales"
    {
      id: '2',
      title: 'Principios constitucionales',
      questions: [
        'Parámetro 1: Análisis del derecho de la tutela judicial efectiva y de los principios y reglas del debido proceso.',
        'Parámetro 2: Evaluación normativa de los hechos presentados y ponderación para la valoración de la prueba. Fundamentación fática correcta, entendida como la mejor argumentación posible conforme a los hechos.'
      ]
    },
    //SECCION 3: "Aplicación de precedentes obligatorios, jurisprudencia y/o doctrina aplicada."
    {
      id: '3',
      title: 'Aplicación de precedentes obligatorios, jurisprudencia y/o doctrina aplicada.',
      questions: [
        'Parámetro 1: Aplicación de precedentes obligatorios, jurisprudencia y/o doctrina aplicada con la norma legal vigente y de acuerdo al caso.',
        'Parámetro 2: Claridad en la expresión escrita y uso apropiado del lenguaje técnico jurídico.',
      ]
    },
    //SECCION 4: "Aplicación de procedimientos directos y abreviados."
    {
      id: '4',
      title: 'Aplicación de procedimientos directos y abreviados.',
      questions: [
        'Parámetro 1: Adecuado análisis y calificación del delito',
        'Parámetro 2: Apropiado análisis y consideración de la Pena para la calificación del procedimiento especial de acuerdo al art. 640 del COIP y abreviado.',
        'Parámetro 3: Adecuado análisis de la procedencia de identificación del delito y/o monto en los delitos contra la propiedad.'
      ]
    },
    //SECCION 5: "Reducir a escrito las sentencias o resoluciones judiciales, de acuerdo a la materia, en los plazos o términos previstos en la ley."
    {
      id: '5',
      title: 'Reducir a escrito las sentencias o resoluciones judiciales, de acuerdo a la materia, en los plazos o  términos previstos en la ley.',
      questions: [
        'Parámetro 1: Aplicación de precedentes obligatorios, jurisprudencia y/o doctrina aplicada con la norma legal vigente y de acuerdo al caso.',
        'Parámetro 2: Claridad en la expresión escrita y uso apropiado del lenguaje técnico jurídico.',
        'Parámetro 3: Adecuado análisis de la procedencia de identificación del delito y/o monto en los delitos contra la propiedad.'
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
  private isSubmitting = false

  cdRef: any;
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
      multicomponent: this.fb.group({ // Grupo anidado
        multiOption: [''] // Cambiado de FormArray a control simple
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

  formatQuestion(question: string): string {
    return question.replace(/(Parámetro \d+:)/, '<strong>$1</strong>');
  }

  isMultiOption(value: string | null): boolean {
    return value === 'MultiComponent' ||
      value === 'MultiCivil' ||
      value === 'MultiPenal';
  }
  initForm() {
    const formGroup: { [key: string]: any } = {
      numero_proceso: [''],
      saved: [false],
      docenteSaved: [false],
      sentenceSubject: [''],
      judgeAnalysis: [''],
      reasonsNormative: [''],
      finalConclusion: [''],
      sentenceSubject_calificacion: [''],
      sentenceSubject_retroalimentacion: [''],
      reasonsNormative_calificacion: [''],
      reasonsNormative_retroalimentacion: [''],
      finalConclusion_calificacion: [''],
      finalConclusion_retroalimentacion: [''],
    };

    this.sections.forEach((section, sIndex) => {
      section.questions.forEach((_, qIndex) => {
        formGroup[`section${sIndex}_question${qIndex}`] = [''];
      });
      formGroup[`section${sIndex}_calificacion`] = [''];
      formGroup[`section${sIndex}_retroalimentacion`] = [''];
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
      this.loadEvaluacion2Data(this.numero_proceso);
      this.loadUserData();
      this.checkDocenteSaved();
      setTimeout(() => {
        console.log('isDocente:', this.isDocente);
        console.log('saved:', this.evaluacion2Form.get('saved')?.value);
        console.log('buttonStates:', this.buttonStates);
        console.log('Form value:', this.evaluacion2Form.value);
      }, 2000);
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
        this.firestore.collection('users').doc(user.uid).valueChanges().subscribe((userData: any) => {
          this.isDocente = userData && userData.role === 'docente';
        });
      }
    });
  }

  submitForm() {
    if (this.evaluacion2Form.valid) {
      this.isSubmitting =true;
      this.cargando = true;
      const analisisData = this.evaluacion2Form.value;
      analisisData.saved = true;
      this.firestore.collection('evaluacion2').doc(this.numero_proceso).set(analisisData)
        .then(() => {
          if (this.isDocente) {
            this.docenteSaved = true;
          }
          this.cargando = false;
          this.saved = true;
          this.evaluacion2Form.patchValue({ saved: true });
          console.log('Form submitted and saved:', analisisData);
          window.location.reload();
        })
        .catch(error => {
          console.error("Error saving document: ", error);
          this.cargando = false;
        });
    } else {
      this.isSubmitting = false;
      this.mostrarMensajeError('Por favor, llene todos los campos antes de guardar.');
    }
  }

  mostrarMensajeError(mensaje: string) {
    this.mensajeError = mensaje;
    this.mostrarMensaje = true;
  }

  loadCalificaciones(data: any) {
    this.buttonStates = {}; // Reinicia buttonStates
    this.updateButtonStates(data);
    this.changeDetectorRef.detectChanges(); // Forzar actualización de la vista
  }

  updateButtonStates(data: any) {
    Object.keys(data).forEach(key => {
      if (key.endsWith('_calificacion')) {
        this.buttonStates[key] = data[key];
      }
    });
  }

  loadEvaluacion2Data(numero_proceso: string) {
    this.firestore.collection('evaluacion2').doc(numero_proceso).get().subscribe(
      (doc) => {
        if (doc.exists) {
          const data = doc.data() as any;
          this.evaluacion2Form.patchValue(data);
          this.updateButtonStates(data);
        }
      },
      (error) => {
        console.error("Error loading document: ", error);
      }
    );
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

  setCalificacion(controlName: string, value: string) {
    this.evaluacion2Form.get(controlName)?.setValue(value);
    this.buttonStates[controlName] = value;
    this.saveFormChanges();
    this.changeDetectorRef.detectChanges();
  }

  setCalificacion2(controlName: string, value: string) {
    this.evaluacion2Form.get(controlName)?.setValue(value);
    this.buttonStates[controlName] = value;
    this.saveFormChanges();
    this.changeDetectorRef.detectChanges();
  }

  isButtonSelected2(controlName: string, value: string): boolean {
    return this.evaluacion2Form.get(controlName)?.value === value;
  }


  isButtonSelected(controlPath: string, calificacion: string): boolean {
    return this.buttonStates[controlPath] === calificacion;
  }

  getCalificacionValue(controlName: string): string {
    const value = this.evaluacion2Form.get(controlName)?.value;
    console.log(`Calificación para ${controlName}:`, value); // Para depuración
    return value ? value : 'No Calificado';
  }

  getRetroalimentacionValue(controlName: string): string {
    const value = this.evaluacion2Form.get(controlName)?.value;
    return value || 'Sin retroalimentación';
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

  saveFormChanges() {
    const formData = this.evaluacion2Form.value;
    formData.saved = true;
    console.log('Saving form data:', formData);
    this.firestore.collection('evaluacion2').doc(this.numero_proceso).update(formData)
      .then(() => {
        console.log('Cambios guardados correctamente');
        this.evaluacion2Form.patchValue({ saved: true });
      })
      .catch(error => {
        console.error('Error al guardar los cambios:', error);
      });
  }

  toggleRetroalimentacion(sectionId: string) {
    this.mostrarRetroalimentacion[sectionId] = !this.mostrarRetroalimentacion[sectionId];
  }
}