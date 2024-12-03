import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router, ActivatedRoute } from '@angular/router';
import { switchMap, map } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, of } from 'rxjs';
import { log } from '@angular-devkit/build-angular/src/builders/ssr-dev-server';

interface User {
  uid: string;
  role: string;
  [key: string]: any; // To handle any additional properties
}

@Component({
  selector: 'app-analisis',
  templateUrl: './analisis.component.html',
  styleUrls: ['./analisis.component.css']
})
export class AnalisisComponent implements OnInit {
  analisisForm: FormGroup;
  numero_proceso: string = '';
  asunto: string = '';
  estudiante: string = '';
  docente: string = '';
  saved = false;
  // docenteSaved = false;
  dataLoaded = false;
  isDocente = false;
  currentUser: Observable<User | null | undefined> = of(null); // Allow null and undefined
  selectedButtons: { [key: string]: string } = {};
  cargando: boolean = false; // Nueva propiedad para controlar el estado de carga
  mensajeExito: string = '';
  mostrarMensaje: boolean = false;
  mensajeError: string = '';
  mostrarRetroalimentacion: boolean[] = [];
  private isSubmitting = false
  problem_question: any;
  problem_decision: any;
  calificarState: { [key: string]: boolean } = {};
  mostrarRetroalimentacionPregunta: boolean = false;
  mostrarRetroalimentacionDecision: boolean = false;


  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private router: Router,
    private route: ActivatedRoute,
    private afAuth: AngularFireAuth,
  ) {
    // Modificación en la creación del FormGroup
    this.analisisForm = this.fb.group({
      numero_proceso: ['', Validators.required],
      normativas: this.fb.array([], Validators.required),
      facticas: this.fb.array([], Validators.required),
      saved: [false],
      docenteSaved: [false],
      problem_question: this.fb.group({
        pregunta: [''],
        calificacion: ['No Calificado'],  
        retroalimentacion: [''],
        showCalificar: [false]
      }),
      problem_decision: this.fb.group({
        decision: [''],
        calificacion: ['No Calificado'],  
        retroalimentacion: [''],
        showCalificar: [false]
      })
    });
    

  this.mostrarRetroalimentacion = [];
  }

  toggleRetroalimentacion(event: Event, index: number) {
    event.preventDefault();
    event.stopPropagation();
    this.mostrarRetroalimentacion[index] = !this.mostrarRetroalimentacion[index];
  }

  toggleRetroalimentacion2(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const showCalificarControl = this.analisisForm.get('problem_question.showCalificar');

    if (showCalificarControl) {
      const currentValue = showCalificarControl.value;
      showCalificarControl.setValue(!currentValue);  // Alterna el valor true/false
    }
  }

  ngOnInit() {
    this.calificarState = {
      'problem_question': false,
      'problem_decision': false
    };
    this.analisisForm.valueChanges.subscribe(() => {
      if (this.dataLoaded && !this.isSubmitting) {
        this.saved = false;
        this.analisisForm.patchValue({ saved: false }, { emitEvent: false });
      }
    });
    this.route.queryParamMap.subscribe(params => {
      this.numero_proceso = params.get('numero_proceso') || '';
      this.asunto = params.get('asunto') || '';
      this.estudiante = params.get('estudiante') || '';
      this.docente = params.get('docente') || '';
      this.analisisForm.patchValue({
        numero_proceso: this.numero_proceso
      });
      this.inicializarMostrarRetroalimentacion();
      this.loadUserData();
      //this.checkDocenteSaved();
      setTimeout(() => {
        this.checkLockStatus();
      }, 1000);
    });
  }

  inicializarMostrarRetroalimentacion() {
    const normativasArray = this.analisisForm.get('normativas') as FormArray;
    this.mostrarRetroalimentacion = new Array(normativasArray.length).fill(false);
  }

  checkLockStatus() {
    this.firestore.collection('locks').doc(this.numero_proceso).valueChanges().subscribe((data: any) => {
      if (data && data.locked) {
        this.disableFormControls(this.analisisForm); // Disable the form if it's locked
      }
    });
  }

  lockForm() {
    this.firestore.collection('locks').doc(this.numero_proceso).set({ locked: true })
      .then(() => {
        this.disableFormControls(this.analisisForm); // Disable the form controls
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
            //this.checkDocenteSaved();
          }
        });
        this.loadAnalisisData();
      }
    });
  }

  onFormChange() {
    if (!this.isSubmitting && this.saved) {
      console.log('Formulario modificado, reseteando saved');
      this.saved = true;
    }
  }

  get normativas() {
    return this.analisisForm.get('normativas') as FormArray;
  }

  get facticas() {
    return this.analisisForm.get('facticas') as FormArray;
  }

  addNormativa() {
    this.normativas.push(this.fb.group({
      pregunta: ['', Validators.required],
      respuesta: ['', Validators.required],
      valida: ['', Validators.required],
      calificacion: [''],
      retroalimentacion: [''],
      showCalificar: [false]
    }));
    this.mostrarRetroalimentacion.push(false);
    this.onFormChange();
  }

  removeNormativa(index: number) {
    this.normativas.removeAt(index);
    this.mostrarRetroalimentacion.splice(index, 1);
    this.normativas.removeAt(index);
    this.onFormChange()
  }

  addFactica() {
    this.facticas.push(this.fb.group({
      pregunta: ['', Validators.required],
      respuesta: ['', Validators.required],
      valida: ['', Validators.required],
      calificacion: [''],
      retroalimentacion: [''],
      showCalificar: [false]
    }));
    this.onFormChange();
    this.mostrarRetroalimentacion.push(false);
  }

  removeFactica(index: number) {
    this.facticas.removeAt(index);
    this.normativas.removeAt(index);
    this.mostrarRetroalimentacion.splice(index, 1);
    this.onFormChange()
  }

  toggleRetroalimentacionPregunta(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.mostrarRetroalimentacionPregunta = !this.mostrarRetroalimentacionPregunta;
  }

  toggleRetroalimentacionDecision(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.mostrarRetroalimentacionDecision = !this.mostrarRetroalimentacionDecision;
  }

  getRetroalimentacionValue(controlPath: string): string {
    const control = this.analisisForm.get(controlPath);
    return control && control.value ? control.value : '';
  }

  hasRetroalimentacion(controlPath: string): boolean {
    const retroalimentacion = this.getRetroalimentacionValue(controlPath);
    return retroalimentacion !== '' && retroalimentacion !== null && retroalimentacion !== undefined;
  }

  loadAnalisisData() {
    this.firestore.collection('analisis').doc(this.numero_proceso).valueChanges()
      .subscribe((analisis: any) => {
        if (analisis) {
          // Actualizar valores básicos del formulario
          this.analisisForm.patchValue({
            numero_proceso: analisis.numero_proceso,
            saved: analisis.saved || false,
            docenteSaved: analisis.docenteSaved || false,
          }, { emitEvent: false });
          // Limpiar arrays existentes
          while (this.normativas.length !== 0) {
            this.normativas.removeAt(0);
          }
          while (this.facticas.length !== 0) {
            this.facticas.removeAt(0);
          }
          // Cargar problema
          if (analisis.problem_question) {
            const problemQuestion = {
              pregunta: analisis.problem_question.pregunta || '',
              calificacion: analisis.problem_question.calificacion || 'No Calificado',
              retroalimentacion: analisis.problem_question.retroalimentacion || '',
              showCalificar: analisis.problem_question.showCalificar || false
            };
            this.analisisForm.get('problem_question')?.patchValue(problemQuestion);
            this.mostrarRetroalimentacionPregunta = false;
          }
          // Cargar decision
          if (analisis.problem_decision) {
            const problemDecision = {
              decision: analisis.problem_decision.decision || '',
              calificacion: analisis.problem_decision.calificacion || 'No Calificado',
              retroalimentacion: analisis.problem_decision.retroalimentacion || '',
              showCalificar: analisis.problem_decision.showCalificar || false
            };
            this.analisisForm.get('problem_decision')?.patchValue(problemDecision);
            this.mostrarRetroalimentacionDecision = false;
          }
          // Cargar preguntas normativas
          if (analisis.normativas && Array.isArray(analisis.normativas)) {
            analisis.normativas.forEach((normativa: any) => {
              this.normativas.push(this.fb.group({
                pregunta: [normativa.pregunta || ''],
                respuesta: [normativa.respuesta || ''],
                valida: [normativa.valida || ''],
                calificacion: [normativa.calificacion || 'No Calificado'],
                retroalimentacion: [normativa.retroalimentacion || ''],
                showCalificar: [false]
              }));
            });
          }
          // Cargar preguntas fácticas
          if (analisis.facticas && Array.isArray(analisis.facticas)) {
            analisis.facticas.forEach((factica: any) => {
              this.facticas.push(this.fb.group({
                pregunta: [factica.pregunta || ''],
                respuesta: [factica.respuesta || ''],
                valida: [factica.valida || ''],
                calificacion: [factica.calificacion || 'No Calificado'],
                retroalimentacion: [factica.retroalimentacion || ''],
                showCalificar: [false]
              }));
            });
          }
          // Inicializar arrays de control de retroalimentación
        this.inicializarMostrarRetroalimentacion();       
        // Marcar como cargado y actualizar estado
          this.dataLoaded = true;
          this.saved = analisis.saved || false;

          // Verificar el estado de bloqueo después de cargar
          this.checkLockStatus();
        } else {
          // Si no hay datos, inicializar con valores por defecto
          if (this.normativas.length === 0) {
            this.addNormativa();
          }
          if (this.facticas.length === 0) {
            this.addFactica();
          }
          // Inicializar decision del problema
          this.analisisForm.get('problem_decision')?.patchValue({
            decision: '',
            calificacion: 'No calificado',
            retroalimentacion: '',
            showCalificar: false
          })
          // Inicializar pregunta del problema
          this.analisisForm.get('problem_question')?.patchValue({
            pregunta: '',
            calificacion: 'No Calificado',
            retroalimentacion: '',
            showCalificar: false
          },
        );
          this.dataLoaded = true;
          this.mostrarRetroalimentacionPregunta = false;
          this.mostrarRetroalimentacionDecision = false;
        }
      }, error => {
        console.error('Error al cargar los datos:', error);
        this.mostrarMensajeError('Error al cargar los datos. Por favor, intente de nuevo.');
      });
  }

  onRetroalimentacionChange() {
    if (!this.isSubmitting) {
      this.saved = false;
      this.analisisForm.patchValue({ saved: false }, { emitEvent: false });
    }
  }

  submitForm() {
        if (this.analisisForm.valid){
      this.isSubmitting = true;
    this.cargando = true;
    const problemQuestionValue = this.analisisForm.get('problem_question')?.value;
    const problemDecisionValue = this.analisisForm.get('problem_decision')?.value;
    const analisisData = {
      ...this.analisisForm.value,
      problem_question: {
        pregunta: problemQuestionValue.pregunta || '',
        calificacion: problemQuestionValue.calificacion || 'No Calificado',
        retroalimentacion: problemQuestionValue.retroalimentacion || '',
        showCalificar: problemQuestionValue.showCalificar || false
      },
      problem_decision: {
        decision: problemDecisionValue.decision || '',
        calificacion: problemDecisionValue.calificacion || 'No Calificado',
        retroalimentacion: problemDecisionValue.retroalimentacion || '',
        showCalificar: problemDecisionValue.showCalificar || false
      },
      saved: true,
      timestamp: new Date() // Agregamos timestamp para asegurar que se detecte el cambio
    };

    console.log('Datos enviados:', analisisData);
    
    // Guardar los datos en Firestore
    this.firestore.collection('analisis').doc(this.numero_proceso).set(analisisData)
      .then(() => {
        this.saved = true;
        this.analisisForm.patchValue({ saved: true }, { emitEvent: false });
        this.cargando = false;
        this.mostrarMensajeExito('Guardado con éxito');
        
        // Esperamos un momento para asegurar que los datos se guardaron
        setTimeout(() => {
          this.isSubmitting = false;
          // Forzamos la recarga de la página
          window.location.reload();
        }, 1000); // Esperamos 1 segundo antes de recargar
      })
      .catch(error => {
        console.error("Error saving document: ", error);
        this.cargando = false;
        this.mostrarMensajeError('Error al guardar. Por favor, intente de nuevo.');
        this.isSubmitting = false;
      });
    }
}

  // Método para mostrar mensaje de éxito
  mostrarMensajeExito(mensaje: string) {
    // Aquí puedes implementar la lógica para mostrar el mensaje
    // Por ejemplo, podrías usar un servicio de notificaciones o actualizar una variable en el componente
    this.mensajeExito = mensaje;
    this.mostrarMensaje = true;
  }

  // Método para mostrar mensaje de error
  mostrarMensajeError(mensaje: string) {
    this.mensajeError = mensaje;
    this.mostrarMensaje = true;
    setTimeout(() => {
      this.mostrarMensaje = false;
      this.mensajeError = '';
    }, 5000); // El mensaje se ocultará después de 5 segundos
  }

  getCalificacionValue(controlName: string): string {
    const control = this.analisisForm.get(controlName);
    return control && control.value ? control.value : 'No Calificado';
  }

  redirectToAnalisis2(event: Event) {
    event.preventDefault();

    if (this.analisisForm.valid) {
      const problemQuestionValid = this.analisisForm.get('problem_question.pregunta')?.value;

      if (problemQuestionValid) {
        if (this.saved) {
          this.router.navigate(['/analisis2'], {
            queryParams: {
              numero_proceso: this.numero_proceso,
              asunto: this.asunto,
              estudiante: this.estudiante,
              docente: this.docente
            }
          });
        } else {
          this.mostrarMensajeError('Por favor, guarde los cambios antes de continuar.');
        }
      } else {
        this.mostrarMensajeError('Por favor, complete la pregunta del problema antes de continuar.');
      }
    } else {
      this.mostrarMensajeError('Por favor, complete todos los campos obligatorios antes de continuar.');
    }
  }

  toggleCalificar(index: number, type: string) {
    const formArray = type === 'normativa' ? this.normativas : this.facticas;
    const control = formArray.at(index);
    if (control) {
      const newShowCalificar = !control.value.showCalificar;
      control.patchValue({ showCalificar: newShowCalificar }, { emitEvent: false });
      
      if (!newShowCalificar) {
        const key = `${type}_${index}`;
        delete this.selectedButtons[key];
      }
    }
  }
  toggleCalificar2(section: string) {
    this.calificarState[section] = !this.calificarState[section];
    console.log(this.calificarState);
  }

  setCalificacion(index: number, type: string, calificacion: string) {
    const control = type === 'normativa' ? this.normativas.at(index) : this.facticas.at(index);
    control.patchValue({ calificacion });
    // Actualizar en la base de datos
    const updatedData = { [`${type}s`]: this.analisisForm.get(`${type}s`)?.value };
    this.firestore.collection('analisis').doc(this.numero_proceso).update(updatedData)
      .then(() => {
        console.log('Calificación actualizada en la base de datos');
      })
      .catch(error => {
        console.error('Error al actualizar la calificación:', error);
      });

    this.selectedButtons[`${type}_${index}`] = calificacion;
  }

  isCalificacionCorrecta(type: string, index: number): boolean {
    const formArray = type === 'normativa' ? this.normativas : this.facticas;
    const control = formArray.at(index);
    return control?.get('calificacion')?.value === 'Correcto' || false;
  }

  isCalificacionIncorrecta(type: string, index: number): boolean {
    const formArray = type === 'normativa' ? this.normativas : this.facticas;
    const control = formArray.at(index);
    return control?.get('calificacion')?.value === 'Incorrecto' || false;
  }

  isCalificacionCorrecta2(type: string): boolean {
    if (type === 'problem_question') {
      return this.analisisForm.get('problem_question.calificacion')?.value === 'Correcto';
    } else {
      return this.analisisForm.get('problem_decision.calificacion')?.value === 'Correcto';
    }
    return false;
  }

  isCalificacionIncorrecta2(type: string): boolean {
    if (type === 'problem_question') {
      return this.analisisForm.get('problem_question.calificacion')?.value === 'Incorrecto';
    } else {
      return this.analisisForm.get('problem_decision.calificacion')?.value === 'Incorrecto';
    }
    return false;
  }

  setCalificacion2(type: string, calificacion: string) {
    if (type === 'problem_question') {
      this.analisisForm.get('problem_question')?.patchValue({ calificacion: calificacion });
    }
    if (type === 'problem_decision') {
      this.analisisForm.get('problem_decision')?.patchValue({ calificacion: calificacion });
    }
  }

  setRetroalimentacion(section: string, event: any) {
    console.log('setRetroalimentacion called with:', section, event);
    if (section === 'problem_question') {
      const retroalimentacion = (event && event.target) ? event.target.value : event;
      console.log('Setting retroalimentacion to:', retroalimentacion);
      const problemQuestionGroup = this.analisisForm.get('problem_question');
      if (problemQuestionGroup) {
        problemQuestionGroup.patchValue({
          retroalimentacion: retroalimentacion
        });
        // Verifica que se actualizó correctamente
        console.log('Updated form value:', this.analisisForm.get('problem_question')?.value);
        // Solo guarda si los datos ya están cargados
        if (this.dataLoaded) {
          this.submitForm();
        }
      }
    }



    if (section === 'problem_decision') {
      const retroalimentacion = (event && event.target) ? event.target.value : event;
      
      console.log('Setting retroalimentacion to:', retroalimentacion);
      
      const decisionQuestionGroup = this.analisisForm.get('problem_decision');
      if (decisionQuestionGroup) {
        decisionQuestionGroup.patchValue({
          retroalimentacion: retroalimentacion
        });
        console.log('Updated form value:', this.analisisForm.get('problem_decisions')?.value);
        if (this.dataLoaded) {
          this.submitForm();
        }
      }
    }
  }
}


