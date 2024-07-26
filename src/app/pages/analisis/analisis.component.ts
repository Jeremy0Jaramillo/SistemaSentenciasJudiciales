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
  docenteSaved = false;
  dataLoaded = false;
  isDocente = false;
  currentUser: Observable<User | null | undefined> = of(null); // Allow null and undefined
  selectedButtons: { [key: string]: string } = {};
  cargando: boolean = false; // Nueva propiedad para controlar el estado de carga
  mensajeExito: string = '';
  mostrarMensaje: boolean = false;
  mensajeError: string = '';
  mostrarRetroalimentacion: boolean[] = [];

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private router: Router,
    private route: ActivatedRoute,
    private afAuth: AngularFireAuth
  ) {
    this.analisisForm = this.fb.group({
      numero_proceso: ['', Validators.required],
      normativas: this.fb.array([]),
      facticas: this.fb.array([]),
      saved: [false],
      docenteSaved: [false]
    });
    this.mostrarRetroalimentacion = [];
  }

  toggleRetroalimentacion(event: Event, index: number) {
    event.preventDefault();
    event.stopPropagation();
    this.mostrarRetroalimentacion[index] = !this.mostrarRetroalimentacion[index];
  }

  ngOnInit() {
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
      this.checkDocenteSaved();
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
            this.checkDocenteSaved();
          }
        });
        this.loadAnalisisData();
      }
    });
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
  }

  removeNormativa(index: number) {
    this.normativas.removeAt(index);
    this.mostrarRetroalimentacion.splice(index, 1);
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
  }

  removeFactica(index: number) {
    this.facticas.removeAt(index);
  }

  loadAnalisisData() {
    this.firestore.collection('analisis').doc(this.numero_proceso).valueChanges()
      .subscribe((analisis: any) => {
        if (analisis) {
          this.analisisForm.patchValue({
            numero_proceso: analisis.numero_proceso,
            saved: analisis.saved || false,
            docenteSaved: analisis.docenteSaved || false

          });
          while (this.normativas.length !== 0) {
            this.normativas.removeAt(0);
          }
          while (this.facticas.length !== 0) {
            this.facticas.removeAt(0);
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
  

  submitForm() {
    this.cargando = true; // Activar el estado de carga

    // Set the saved flag to true before submitting
    this.analisisForm.patchValue({ saved: true });
    if (this.isDocente) {
      this.analisisForm.patchValue({ docenteSaved: true });
    }
    
    const analisisData = this.analisisForm.value;
    this.firestore.collection('analisis').doc(this.numero_proceso).set(analisisData)
      .then(() => {
        this.saved = true;
        this.cargando = false; // Desactivar el estado de carga
        this.mostrarMensajeExito('Guardado con éxito');
        window.location.reload();
      })
      .catch(error => {
        console.error("Error saving document: ", error);
        this.cargando = false; // Desactivar el estado de carga en caso de error
        this.mostrarMensajeError('Error al guardar. Por favor, intente de nuevo.');
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
  // Similar al método de éxito, pero para errores
  this.mensajeError = mensaje;
  this.mostrarMensaje = true;
}

  getCalificacionValue(controlName: string): string {
    const control = this.analisisForm.get(controlName);
    return control && control.value ? control.value : 'No Calificado';
  }
  

  redirectToAnalisis2() {
    if (this.docenteSaved) {
      this.router.navigate(['/analisis2'], {
        queryParams: {
          numero_proceso: this.numero_proceso,
          asunto: this.asunto,
          estudiante: this.estudiante,
          docente: this.docente
        }
      });
    }
  }

  checkDocenteSaved() {
    this.firestore.collection('analisis').doc(this.numero_proceso).valueChanges()
      .subscribe((data: any) => {
        if (data && data.saved) {
          this.docenteSaved = data.docenteSaved || false;
        }
      });
  }


  toggleCalificar(index: number, type: string) {
    const control = type === 'normativa' ? this.normativas.at(index) : this.facticas.at(index);
    const newShowCalificar = !control.value.showCalificar;
    control.patchValue({ showCalificar: newShowCalificar });
    if (!newShowCalificar) {
      delete this.selectedButtons[`${type}_${index}`];
    }
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
}