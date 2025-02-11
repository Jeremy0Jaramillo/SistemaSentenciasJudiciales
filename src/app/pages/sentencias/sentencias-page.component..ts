import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';

interface Sentencia {
  numero_proceso: string;
  asunto: string;
  nombre_estudiante: string;
  email: string;
  nombre_docente: string;
  archivoURL?: string; // Add archivoURL to store the URL of the uploaded file
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
    nombre_docente: '',
    email: ''
  };
  docentes$: Observable<any[]> = new Observable<any[]>();
  selectedFile: File | null = null;
  archivoMensaje: string = 'Sin subir archivo'; // Inicialización del mensaje de archivo
  alertas: string[] = [];
  mensajeExito: string = '';
  mostrarMensajeExito: boolean = false;
  archivo: File | null = null; // Almacena el archivo seleccionado

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private router: Router  // Añade esta línea

  ) { }

  ngOnInit(): void {
    this.afAuth.authState.subscribe(user => {
      if (user) {
        this.firestore.collection('users').doc(user.uid).valueChanges().subscribe((userData: any) => {
          this.sentencia.nombre_estudiante = userData.name;
          this.sentencia.email = userData.email;
        });
      }
    });

    this.docentes$ = this.firestore.collection('users', ref => ref.where('role', '==', 'docente')).valueChanges();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.archivo = file;  // Asigna el archivo a la propiedad 'archivo'
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
    this.firestore.collection('sentencias', ref => ref.where('numero_proceso', '==', this.sentencia.numero_proceso))
      .get()
      .subscribe(querySnapshot => {
        if (querySnapshot.size > 0) {
          this.alertas.push('El número de proceso ya existe.');
        }
        resolve();
      }, error => {
        console.error('Error checking for duplicate numero_proceso: ', error);
        this.alertas.push('Error al verificar el número de proceso.');
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
              
              // Espera 2 segundos antes de redirigir
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
    // Bloquear espacios
    if (event.key === ' ') {
      event.preventDefault();
      return false;
    }

    // Permitir solo números y guiones
    const pattern = /[0-9-]/;
    const inputChar = String.fromCharCode(event.charCode);

    // Si el carácter no coincide con el patrón, prevenir la entrada
    if (!pattern.test(inputChar)) {
      event.preventDefault();
      return false;
    }

    return true;
  }

  // Método para formatear el número de proceso
  formatearNumeroProcess(event: any) {
    const input = event.target;
    let valor = input.value;

    // Eliminar cualquier carácter que no sea número o guion
    valor = valor.replace(/[^0-9-]/g, '');
    
    // Actualizar el valor
    this.sentencia.numero_proceso = valor;
  } 
}



