import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import { Router } from '@angular/router';

interface Sentencia {
  numero_proceso: string;
  asunto: string;
  nombre_estudiante: string;
  email_estudiante: string;
  nombre_docente: string;
  email_docente: string;
  archivoURL?: string;
  estado?: 'aceptar' | 'negar' | null;
  razon?: string;
  isLocked?: boolean;
  periodo_academico?: string;
}

@Component({
  selector: 'app-sentencias-page',
  templateUrl: './sentencias-page.component.html',
  styleUrls: ['./sentencias-page.component.css']
})
export class SentenciasPageComponent implements OnInit {
  alerta: boolean = false;
  fileLoaded: boolean = false;
  cargando = false;

  sentencia: Sentencia = {
    numero_proceso: '',
    asunto: '',
    nombre_estudiante: '',
    email_estudiante: '',
    nombre_docente: '',
    email_docente: '',
    archivoURL: '',
    estado: null,
    razon: '',
    isLocked: false
  };

  docentes$: Observable<any[]> = new Observable<any[]>();
  selectedFile: File | null = null;
  archivoMensaje: string = 'Sin subir archivo';
  alertas: string[] = [];
  mensajeExito: string = '';
  mostrarMensajeExito: boolean = false;
  archivo: File | null = null;
  docentesLista: any[] = [];

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.afAuth.authState.subscribe(user => {
      if (user) {
        this.firestore.collection('users').doc(user.uid).valueChanges().subscribe((userData: any) => {
          this.sentencia.nombre_estudiante = userData.name;
          this.sentencia.email_estudiante = userData.email;
        });
      }
    });

    this.firestore
      .collection('users', ref => ref.where('role', '==', 'docente'))
      .valueChanges()
      .pipe(map((docentes: any[]) => docentes.sort((a, b) => a.name.localeCompare(b.name))))
      .subscribe(data => {
        this.docentesLista = data;
      });

    this.docentes$ = this.firestore
      .collection('users', ref => ref.where('role', '==', 'docente'))
      .valueChanges()
      .pipe(
        map((docentes: any[]) => docentes.sort((a, b) => a.name.localeCompare(b.name)))
      );

      this.asignarPeriodoAcademico();
  }

asignarPeriodoAcademico() {
  const hoy = new Date();
  const mes = hoy.getMonth() + 1;
  const anio = hoy.getFullYear();

  let nombreBase = '';
  let nombreCompleto = '';

  if (mes >= 4 && mes <= 9) {
    nombreBase = 'abril - agosto';
    nombreCompleto = `${nombreBase} ${anio}`;
  } else {
    nombreBase = 'octubre - febrero';
    const siguienteAnio = anio + 1;
    nombreCompleto = `octubre ${anio} - febrero ${siguienteAnio}`;
  }

  this.firestore.collection('periodoAcademico', ref =>
    ref.where('nombre', '==', nombreBase)
  ).get().subscribe(snapshot => {
    if (!snapshot.empty) {
      // Si el periodo base existe, usamos el nombre completo con año
      this.sentencia.periodo_academico = nombreCompleto;
    } else {
      console.warn(`El periodo académico "${nombreBase}" no está registrado en la base de datos.`);
    }
  });
}




  actualizarCorreoDocente() {
    const docenteSeleccionado = this.docentesLista.find(doc => doc.name === this.sentencia.nombre_docente);
    if (docenteSeleccionado) {
      this.sentencia.email_docente = docenteSeleccionado.email;
    } else {
      this.sentencia.email_docente = '';
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.archivo = file;
      this.fileLoaded = true;
      this.archivoMensaje = 'Archivo cargado: ' + file.name;
    } else {
      this.selectedFile = null;
      this.archivo = null;
      this.fileLoaded = false;
      this.archivoMensaje = 'Sin subir archivo';
    }
  }

  submitForm(): void {
    this.alertas = [];
    this.cargando = true;

    const checkArchivo = new Promise<void>((resolve) => {
      if (!this.archivo) {
        this.alertas.push('Debe seleccionar un archivo PDF.');
      }
      resolve();
    });

    const checkNumeroProceso = new Promise<void>((resolve) => {
      this.firestore.collection('sentencias', ref =>
        ref.where('numero_proceso', '==', this.sentencia.numero_proceso)
      ).get().subscribe(querySnapshot => {
        const yaExisteAprobada = querySnapshot.docs.some(doc => (doc.data() as any)['estado'] === 'aceptar');
        if (yaExisteAprobada) {
          this.alertas.push('El número de proceso ya fue aprobado y no se puede volver a subir.');
        }
        resolve();
      });
    });

    Promise.all([checkArchivo, checkNumeroProceso]).then(() => {
      if (this.alertas.length === 0) {
        this.uploadFileAndSaveSentencia();
      } else {
        this.cargando = false;
      }
    });
  }

  private uploadFileAndSaveSentencia(): void {
    const filePath = `sentencias/${this.archivo!.name}_${Date.now()}`;
    const fileRef = this.storage.ref(filePath);
    const uploadTask = this.storage.upload(filePath, this.archivo);

    uploadTask.snapshotChanges().pipe(
      finalize(() => {
        fileRef.getDownloadURL().subscribe(url => {
          this.sentencia.archivoURL = url;
          this.firestore.collection('sentencias').add(this.sentencia)
            .then(() => {
              console.log('Sentencia added successfully!');
              this.mensajeExito = 'Sentencia guardada';
              this.mostrarMensajeExito = true;
              this.cargando = false;
              setTimeout(() => {
                this.router.navigate(['/principal']);
              }, 2000);
            })
            .catch(error => {
              console.error('Error adding sentencia: ', error);
              this.alertas.push('Error al guardar la sentencia.');
              this.cargando = false;
            });
        });
      })
    ).subscribe();
  }

  cerrarAlerta(index: number) {
    this.alertas.splice(index, 1);
  }

  validarNumeroProcess(event: KeyboardEvent): boolean {
    if (event.key === ' ') {
      event.preventDefault();
      return false;
    }
    const pattern = /[0-9-]/;
    const inputChar = String.fromCharCode(event.charCode);
    if (!pattern.test(inputChar)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  formatearNumeroProcess(event: any) {
    const input = event.target;
    let valor = input.value;
    valor = valor.replace(/[^0-9-]/g, '');
    this.sentencia.numero_proceso = valor;
  }
}
