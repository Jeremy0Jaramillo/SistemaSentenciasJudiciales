import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router, ActivatedRoute } from '@angular/router';
import { switchMap, map } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, of } from 'rxjs';

interface User {
  uid: string;
  role: string;
  [key: string]: any; // To handle any additional properties
}

interface Question {
  pregunta: [''],
  calificacion: [''],
  retroalimentacion: [''],
  showCalificar: boolean;
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
  calificarState: { [key: string]: boolean } = {};

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private router: Router,
    private route: ActivatedRoute,
    private afAuth: AngularFireAuth,
  ) {
    this.analisisForm = this.fb.group({
      numero_proceso: ['', Validators.required],
      normativas: this.fb.array([], Validators.required),
      facticas: this.fb.array([], Validators.required),
      saved: [false],
      docenteSaved: [false],
      problem_question: this.fb.group<Question>({
        pregunta: [''],
        calificacion: [''],
        retroalimentacion: [''],
        showCalificar: false
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
      'problem_question': false
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

  loadAnalisisData() {
    this.firestore.collection('analisis').doc(this.numero_proceso).valueChanges()
      .subscribe((analisis: any) => {
        if (analisis) {
          this.analisisForm.patchValue({
            numero_proceso: analisis.numero_proceso,
            saved: analisis.saved || false,
            docenteSaved: analisis.docenteSaved || false,
          }, { emitEvent: false });
          while (this.normativas.length !== 0) {
            this.normativas.removeAt(0);
          }
          while (this.facticas.length !== 0) {
            this.facticas.removeAt(0);
          }
          if (analisis.problem_question) {
            this.analisisForm.get('problem_question')?.patchValue(analisis.problem_question);
          }
          analisis.normativas.forEach((normativa: any) => {
            this.normativas.push(this.fb.group({
              pregunta: normativa.pregunta,
              respuesta: normativa.respuesta,
              valida: normativa.valida,
              calificacion: normativa.calificacion || '',
              retroalimentacion: normativa.retroalimentacion || '',
              showCalificar: [false]
            }));
          });

          analisis.facticas.forEach((factica: any) => {
            this.facticas.push(this.fb.group({
              pregunta: factica.pregunta,
              respuesta: factica.respuesta,
              valida: factica.valida,
              calificacion: factica.calificacion || '',
              retroalimentacion: factica.retroalimentacion || '',
              showCalificar: [false]
            }));
          });
          this.dataLoaded = true;
          this.saved = analisis.saved || false;
        } else {
          if (this.normativas.length === 0) {
            this.addNormativa();
          }
          if (this.facticas.length === 0) {
            this.addFactica();
          }
          this.dataLoaded = true;
        }
      });
  }

  onRetroalimentacionChange() {
    if (!this.isSubmitting) {
      this.saved = false;
      this.analisisForm.patchValue({ saved: false }, { emitEvent: false });
    }
  }

  submitForm() {
    this.isSubmitting = true;
    this.cargando = true;
    const problemQuestion: Question = {
      pregunta: this.analisisForm.get('problem_question.pregunta')?.value || '',
      calificacion: this.analisisForm.get('problem_question.calificacion')?.value || '',
      retroalimentacion: this.analisisForm.get('problem_question.retroalimentacion')?.value || '',
      showCalificar: this.analisisForm.get('problem_question.showCalificar')?.value || false
    };
    console.log('Retroalimentación antes de enviar:', problemQuestion.retroalimentacion);
    const analisisData = {
      ...this.analisisForm.value,
      problem_question: problemQuestion,
      saved: true
    };
    console.log('Datos enviados:', analisisData);
    // Guardar los datos en Firestore
    this.firestore.collection('analisis').doc(this.numero_proceso).set(analisisData)
      .then(() => {
        this.saved = true;
        this.analisisForm.patchValue({ saved: true }, { emitEvent: false });
        this.cargando = false;
        this.mostrarMensajeExito('Guardado con éxito');
        // window.location.reload();
        setTimeout(() => {
          this.isSubmitting = false;
        }, 100);
      })
      .catch(error => {
        console.error("Error saving document: ", error);
        this.cargando = false;
        this.mostrarMensajeError('Error al guardar. Por favor, intente de nuevo.');
        this.isSubmitting = false;
      });
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

    // Opcionalmente, puedes agregar un temporizador para ocultar el mensaje después de un tiempo
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
    const control = type === 'normativa' ? this.normativas.at(index) : this.facticas.at(index);
    const newShowCalificar = !control.value.showCalificar;
    control.patchValue({ showCalificar: newShowCalificar });
    if (!newShowCalificar) {
      delete this.selectedButtons[`${type}_${index}`];
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
    const control = type === 'normativa' ? this.normativas.at(index) : this.facticas.at(index);
    return control.get('calificacion')?.value === 'Correcto';
  }

  isCalificacionIncorrecta(type: string, index: number): boolean {
    const control = type === 'normativa' ? this.normativas.at(index) : this.facticas.at(index);
    return control.get('calificacion')?.value === 'Incorrecto';
  }

  isCalificacionCorrecta2(type: string): boolean {
    if (type === 'problem_question') {
      return this.analisisForm.get('problem_question.calificacion')?.value === 'Correcto';
    }
    return false;
  }

  isCalificacionIncorrecta2(type: string): boolean {
    return !this.isCalificacionCorrecta2(type);
  }

  setCalificacion2(type: string, calificacion: string) {
    if (type === 'problem_question') {
      this.analisisForm.get('problem_question')?.patchValue({ calificacion: calificacion });
      this.submitForm(); // Automatically save when setting the calificacion
    }
  }

  setRetroalimentacion(section: string, event: Event) {
    if (section === 'problem_question') {
      const retroalimentacion = this.analisisForm.get(`problem_question.retroalimentacion`)?.value || '';
      this.analisisForm.get(`problem_question.retroalimentacion`)?.patchValue(retroalimentacion);
      this.submitForm();
    }
  }
}


