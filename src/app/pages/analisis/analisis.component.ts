import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router, ActivatedRoute } from '@angular/router';
import { switchMap, map } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, of } from 'rxjs';
// import { log } from '@angular-devkit/build-angular/src/builders/ssr-dev-server'; // <-- REMOVIDO: esta importación no se usa

interface User {
  uid: string;
  role: string;
  [key: string]: any; // Para manejar propiedades adicionales
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
  dataLoaded = false;
  isDocente = false;
  currentUser: Observable<User | null | undefined> = of(null); // Permitir null y undefined
  selectedButtons: { [key: string]: string } = {};
  cargando: boolean = false; // Propiedad para controlar el estado de carga
  mensajeExito: string = '';
  mostrarMensaje: boolean = false;
  mensajeError: string = '';
  mostrarRetroalimentacion: boolean[] = [];
  private isSubmitting = false;
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
    private afAuth: AngularFireAuth
  ) {
    // Modificación en la creación del FormGroup
    this.analisisForm = this.fb.group({
      numero_proceso: ['', Validators.required],
      normativas: this.fb.array(
        [
          this.fb.group({
            pregunta: ['', Validators.required],
            respuesta: ['', Validators.required],
            calificacion: ['No Calificado'],
            retroalimentacion: [''],
            showCalificar: [false],
          }),
        ],
        Validators.required
      ), // Validators.required hace que el array no pueda estar vacío
      facticas: this.fb.array(
        [
          this.fb.group({
            pregunta: ['', Validators.required],
            respuesta: ['', Validators.required],
            calificacion: ['No Calificado'],
            retroalimentacion: [''],
            showCalificar: [false],
          }),
        ],
        Validators.required
      ),
      saved: [false],
      docenteSaved: [false],
      problem_question: this.fb.group({
        pregunta: ['', Validators.required],
        calificacion: ['No Calificado'],
        retroalimentacion: [''],
        showCalificar: [false],
      }),
      problem_decision: this.fb.group({
        decision: ['', Validators.required],
        calificacion: ['No Calificado'],
        retroalimentacion: [''],
        showCalificar: [false],
      }),
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
      // Solo marcar como no guardado si los datos ya fueron cargados y no estamos enviando el formulario
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
      // Pequeño retraso para asegurar que los datos del formulario se carguen antes de verificar el bloqueo
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
        this.disableFormControls(this.analisisForm); // Deshabilita el formulario si está bloqueado
      } else {
        // Asegúrate de habilitar el formulario si se desbloquea o nunca estuvo bloqueado
        this.enableFormControls(this.analisisForm);
      }
    });
  }

  lockForm() {
    this.firestore.collection('locks').doc(this.numero_proceso).set({ locked: true })
      .then(() => {
        this.disableFormControls(this.analisisForm); // Deshabilita los controles del formulario
        this.mostrarMensajeExito('Formulario bloqueado con éxito.');
      })
      .catch(error => {
        console.error("Error al bloquear el formulario: ", error); // Utiliza console.error para errores
        this.mostrarMensajeError('Error al bloquear el formulario. Por favor, intente de nuevo.');
      });
  }

  disableFormControls(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.disable(); // Deshabilita el control
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.disableFormControls(control); // Deshabilita recursivamente los controles anidados
      }
    });
  }

  enableFormControls(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.enable(); // Habilita el control
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.enableFormControls(control); // Habilita recursivamente los controles anidados
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
          } else {
            this.isDocente = false; // Asegúrate de restablecer si no es docente
          }
        });
        this.loadAnalisisData(); // Cargar datos del análisis una vez que el usuario esté autenticado
      } else {
        // Manejar caso donde no hay usuario autenticado si es necesario
        // Por ejemplo, redirigir al login o deshabilitar ciertas funcionalidades
        this.mostrarMensajeError('No hay usuario autenticado. Algunas funcionalidades podrían no estar disponibles.');
      }
    });
  }

  onFormChange() {
    // Este método ya estaba bien para marcar que hay cambios no guardados
    if (!this.isSubmitting && this.dataLoaded) { // Asegúrate de que los datos ya estén cargados
      this.saved = false;
      this.analisisForm.patchValue({ saved: false }, { emitEvent: false });
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
      calificacion: ['No Calificado'],
      retroalimentacion: [''],
      showCalificar: [false]
    }));
    this.mostrarRetroalimentacion.push(false);
    this.onFormChange();
  }

  removeNormativa(index: number) {
    this.normativas.removeAt(index);
    this.mostrarRetroalimentacion.splice(index, 1);
    this.onFormChange();
  }

  addFactica() {
    this.facticas.push(this.fb.group({
      pregunta: ['', Validators.required],
      respuesta: ['', Validators.required],
      calificacion: ['No Calificado'], // Asegúrate de inicializar aquí también si es 'No Calificado'
      retroalimentacion: [''],
      showCalificar: [false]
    }));
    this.onFormChange();
    this.mostrarRetroalimentacion.push(false); // Considera si esto debería ser para facticas o una sola variable de control
  }

  removeFactica(index: number) {
    this.facticas.removeAt(index);
    this.mostrarRetroalimentacion.splice(index, 1); // Considera si esto debería ser para facticas
    this.onFormChange();
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
    // Suscribirse a los cambios en Firestore para cargar datos en tiempo real
    this.firestore.collection('analisis').doc(this.numero_proceso).valueChanges()
      .subscribe((analisis: any) => {
        if (analisis) {
          // Usar { emitEvent: false } para evitar que valueChanges se dispare y marque el formulario como no guardado inmediatamente
          this.analisisForm.patchValue({
            numero_proceso: analisis.numero_proceso,
            saved: analisis.saved || false,
            docenteSaved: analisis.docenteSaved || false,
          }, { emitEvent: false });

          // Limpiar arrays existentes antes de cargar nuevos datos
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
            this.analisisForm.get('problem_question')?.patchValue(problemQuestion, { emitEvent: false });
            // this.mostrarRetroalimentacionPregunta = false; // No es necesario restablecer aquí, se maneja con toggle
          } else {
            // Inicializar si no existe en la base de datos
            this.analisisForm.get('problem_question')?.patchValue({
              pregunta: '',
              calificacion: 'No Calificado',
              retroalimentacion: '',
              showCalificar: false
            }, { emitEvent: false });
          }

          // Cargar decision
          if (analisis.problem_decision) {
            const problemDecision = {
              decision: analisis.problem_decision.decision || '',
              calificacion: analisis.problem_decision.calificacion || 'No Calificado',
              retroalimentacion: analisis.problem_decision.retroalimentacion || '',
              showCalificar: analisis.problem_decision.showCalificar || false
            };
            this.analisisForm.get('problem_decision')?.patchValue(problemDecision, { emitEvent: false });
            // this.mostrarRetroalimentacionDecision = false; // No es necesario restablecer aquí
          } else {
            // Inicializar si no existe en la base de datos
            this.analisisForm.get('problem_decision')?.patchValue({
              decision: '',
              calificacion: 'No Calificado',
              retroalimentacion: '',
              showCalificar: false
            }, { emitEvent: false });
          }

          // Cargar preguntas normativas
          if (analisis.normativas && Array.isArray(analisis.normativas)) {
            analisis.normativas.forEach((normativa: any) => {
              this.normativas.push(this.fb.group({
                pregunta: [normativa.pregunta || ''],
                respuesta: [normativa.respuesta || ''],
                // valida: [normativa.valida || ''], // 'valida' no está en la definición del FormGroup
                calificacion: [normativa.calificacion || 'No Calificado'],
                retroalimentacion: [normativa.retroalimentacion || ''],
                showCalificar: [normativa.showCalificar || false] // Asegúrate de cargar este valor
              }));
            });
          } else {
            // Si no hay normativas, añadir una por defecto
            if (this.normativas.length === 0) {
              this.addNormativa();
            }
          }

          // Cargar preguntas fácticas
          if (analisis.facticas && Array.isArray(analisis.facticas)) {
            analisis.facticas.forEach((factica: any) => {
              this.facticas.push(this.fb.group({
                pregunta: [factica.pregunta || ''],
                respuesta: [factica.respuesta || ''],
                // valida: [factica.valida || ''], // 'valida' no está en la definición del FormGroup
                calificacion: [factica.calificacion || 'No Calificado'],
                retroalimentacion: [factica.retroalimentacion || ''],
                showCalificar: [factica.showCalificar || false] // Asegúrate de cargar este valor
              }));
            });
          } else {
            // Si no hay facticas, añadir una por defecto
            if (this.facticas.length === 0) {
              this.addFactica();
            }
          }

          // Inicializar arrays de control de retroalimentación
          this.inicializarMostrarRetroalimentacion();

          // Marcar como cargado y actualizar estado
          this.dataLoaded = true;
          this.saved = analisis.saved || false;

          // Verificar el estado de bloqueo después de cargar los datos
          this.checkLockStatus();
        } else {
          // Si no hay datos en Firestore para este proceso, inicializar el formulario con valores por defecto
          if (this.normativas.length === 0) {
            this.addNormativa();
          }
          if (this.facticas.length === 0) {
            this.addFactica();
          }
          // Asegurarse de que problem_decision y problem_question estén inicializados si no hay datos
          this.analisisForm.get('problem_decision')?.patchValue({
            decision: '',
            calificacion: 'No Calificado',
            retroalimentacion: '',
            showCalificar: false
          }, { emitEvent: false });
          this.analisisForm.get('problem_question')?.patchValue({
            pregunta: '',
            calificacion: 'No Calificado',
            retroalimentacion: '',
            showCalificar: false
          }, { emitEvent: false });

          this.dataLoaded = true;
          this.mostrarRetroalimentacionPregunta = false;
          this.mostrarRetroalimentacionDecision = false;
        }
      }, error => {
        console.error('Error al cargar los datos:', error);
        this.mostrarMensajeError('Error al cargar los datos. Por favor, intente de nuevo.');
        this.dataLoaded = true; // Es importante marcar como cargado incluso si hay un error para evitar bucles.
      });
  }

  onRetroalimentacionChange() {
    // Este método ya estaba bien
    if (!this.isSubmitting && this.dataLoaded) { // Asegúrate de que los datos ya estén cargados
      this.saved = false;
      this.analisisForm.patchValue({ saved: false }, { emitEvent: false });
    }
  }

  submitForm() {
    if (this.analisisForm.valid) {
      this.isSubmitting = true;
      this.cargando = true;

      // Obtener los valores de normativas y facticas directamente de los FormArrays
      const analisisData = {
        ...this.analisisForm.value,
        normativas: this.normativas.value, // Asegúrate de incluir las normativas
        facticas: this.facticas.value,     // Asegúrate de incluir las facticas
        problem_question: {
          ...this.analisisForm.get('problem_question')?.value,
        },
        problem_decision: {
          ...this.analisisForm.get('problem_decision')?.value,
        },
        saved: true,
        timestamp: new Date() // Agregamos un timestamp para asegurar que se detecte el cambio
      };

      // Guardar los datos en Firestore
      this.firestore.collection('analisis').doc(this.numero_proceso).set(analisisData)
        .then(() => {
          this.saved = true;
          this.analisisForm.patchValue({ saved: true }, { emitEvent: false });
          this.cargando = false;
          this.mostrarMensajeExito('Guardado con éxito.');
          this.isSubmitting = false; // Restablecer el flag de envío
          // Después de guardar, recargamos los datos para asegurar que el formulario refleje la BD
          // Esto es mucho más limpio que un window.location.reload()
          this.loadAnalisisData();
        })
        .catch(error => {
          console.error("Error al guardar el documento: ", error);
          this.cargando = false;
          this.mostrarMensajeError('Error al guardar. Por favor, intente de nuevo.');
          this.isSubmitting = false; // Restablecer el flag de envío en caso de error
        });
    } else {
      this.isSubmitting = false; // Restablecer el flag si el formulario no es válido
      this.mostrarMensajeError('Por favor, complete todos los campos requeridos antes de guardar.');
      // Opcional: Marcar los campos no válidos para que el usuario los vea
      this.analisisForm.markAllAsTouched();
    }
  }

  // Método para mostrar mensaje de éxito
  mostrarMensajeExito(mensaje: string) {
    this.mensajeExito = mensaje;
    this.mostrarMensaje = true;
    setTimeout(() => {
      this.mostrarMensaje = false;
      this.mensajeExito = '';
    }, 3000); // El mensaje se ocultará después de 3 segundos
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
      // No necesitas verificar problem_question.pregunta si el formulario es válido y tiene Validators.required
      // en problem_question.pregunta
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
      this.mostrarMensajeError('Por favor, complete todos los campos obligatorios antes de continuar.');
      this.analisisForm.markAllAsTouched(); // Marcar para mostrar errores de validación
    }
  }

  toggleCalificar(index: number, type: string) {
    const formArray = type === 'normativa' ? this.normativas : this.facticas;
    const control = formArray.at(index);
    if (control) {
      const newShowCalificar = !control.value.showCalificar;
      control.patchValue({ showCalificar: newShowCalificar }, { emitEvent: false });

      // Si se desactiva la calificación, elimina la selección del botón
      if (!newShowCalificar) {
        const key = `${type}_${index}`;
        delete this.selectedButtons[key];
        control.patchValue({ calificacion: 'No Calificado' }, { emitEvent: false }); // Resetea calificación
        control.patchValue({ retroalimentacion: '' }, { emitEvent: false }); // Resetea retroalimentación
      }
    }
  }

  toggleCalificar2(section: string) {
    this.calificarState[section] = !this.calificarState[section];
    // console.log(this.calificarState); // Para depuración
  }

  setCalificacion(index: number, type: string, calificacion: string) {
    const control = type === 'normativa' ? this.normativas.at(index) : this.facticas.at(index);
    control.patchValue({ calificacion });
    this.selectedButtons[`${type}_${index}`] = calificacion;
    this.onFormChange(); // Indicar que hay cambios
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
    } else if (type === 'problem_decision') { // Añadido else if para manejar ambos casos explícitamente
      return this.analisisForm.get('problem_decision.calificacion')?.value === 'Correcto';
    }
    return false;
  }

  isCalificacionIncorrecta2(type: string): boolean {
    if (type === 'problem_question') {
      return this.analisisForm.get('problem_question.calificacion')?.value === 'Incorrecto';
    } else if (type === 'problem_decision') { // Añadido else if
      return this.analisisForm.get('problem_decision.calificacion')?.value === 'Incorrecto';
    }
    return false;
  }

  setCalificacion2(type: string, calificacion: string) {
    if (type === 'problem_question') {
      this.analisisForm.get('problem_question')?.patchValue({ calificacion: calificacion });
      this.onFormChange(); // Indicar que hay cambios
    }
    if (type === 'problem_decision') {
      this.analisisForm.get('problem_decision')?.patchValue({ calificacion: calificacion });
      this.onFormChange(); // Indicar que hay cambios
    }
  }

  setRetroalimentacion(section: string, event: any) {
    const retroalimentacion = (event && event.target) ? event.target.value : event;
    let controlGroup: FormGroup | null = null;

    if (section === 'problem_question') {
      controlGroup = this.analisisForm.get('problem_question') as FormGroup;
    } else if (section === 'problem_decision') {
      controlGroup = this.analisisForm.get('problem_decision') as FormGroup;
    }

    if (controlGroup) {
      controlGroup.patchValue({
        retroalimentacion: retroalimentacion
      }, { emitEvent: false }); // Usar emitEvent: false para no marcar el formulario como sucio por cada cambio de retroalimentación

      // Si quieres guardar automáticamente la retroalimentación al escribir, puedes llamar a submitForm aquí.
      // Sin embargo, para una mejor experiencia de usuario y rendimiento, podría ser mejor guardar
      // al perder el foco del campo o con un botón de "Guardar".
      // Si la carga de datos ya está hecha (this.dataLoaded), y no estamos ya enviando el formulario, guardamos.
      if (this.dataLoaded && !this.isSubmitting) {
        this.submitForm();
      }
    }
  }
}