import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs/operators'
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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
}

@Component({
  selector: 'app-editar-sentencia',
  templateUrl: './editar-sentencia.component.html',
  styleUrls: ['./editar-sentencia.component.css']
})

export class EditarSentenciaComponent implements OnInit {
  sentencia: Sentencia = {
    numero_proceso: '',
    asunto: '',
    nombre_estudiante: '',
    email_estudiante: '',
    nombre_docente: '',
    email_docente: ''
  };

  sentenciaId: string = '';
  archivo: File | null = null;
  archivoMensaje: string = 'Sin subir archivo';
  fileLoaded: boolean = false;
  cargando: boolean = false;
  mensajeExito: string = '';
  mostrarMensajeExito: boolean = false;
  alertas: string[] = [];
  docentesLista: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const numeroProceso = params['numero_proceso'];
      if (numeroProceso) {
        this.cargarSentencia(numeroProceso);
        this.cargarDocentes();
      } else {
        this.alertas.push('No se proporcionó número de proceso para editar.');
      }
    });
  }

  cargarDocentes(): void {
    this.firestore.collection('users', ref => ref.where('role', '==', 'docente'))
      .valueChanges()
      .subscribe((docentes: any[]) => {
        this.docentesLista = docentes.sort((a, b) => a.name.localeCompare(b.name));
      });
  }

  cargarSentencia(numeroProceso: string): void {
    this.firestore.collection('sentencias', ref =>
      ref.where('numero_proceso', '==', numeroProceso).limit(1)
    ).get().subscribe(snapshot => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        this.sentenciaId = doc.id;
        this.sentencia = doc.data() as Sentencia;

        if (this.sentencia.archivoURL) {
          this.archivoMensaje = 'Archivo actual cargado';
          this.fileLoaded = true;
        }
      } else {
        this.alertas.push('No se encontró la sentencia para editar.');
        this.router.navigate(['/principal']);
      }
    });
  }

  actualizarCorreoDocente(): void {
    const docente = this.docentesLista.find(d => d.name === this.sentencia.nombre_docente);
    this.sentencia.email_docente = docente ? docente.email : '';
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.archivo = file;
      this.archivoMensaje = `Archivo cargado: ${file.name}`;
      this.fileLoaded = true;
    } else {
      this.archivo = null;
      this.archivoMensaje = 'Sin subir archivo';
      this.fileLoaded = false;
    }
  }

  submitForm(): void {
    this.alertas = [];
    this.cargando = true;

    if (this.archivo) {
      const filePath = `sentencias/${this.archivo.name}_${Date.now()}`;
      const fileRef = this.storage.ref(filePath);
      const uploadTask = this.storage.upload(filePath, this.archivo);

      uploadTask.snapshotChanges().pipe(
        finalize(() => {
          fileRef.getDownloadURL().subscribe(url => {
            this.sentencia.archivoURL = url;
            this.actualizarSentencia();
          });
        })
      ).subscribe();
    } else {
      this.actualizarSentencia();
    }
  }

  actualizarSentencia(): void {
    this.firestore.collection('sentencias').doc(this.sentenciaId).update({
      numero_proceso: this.sentencia.numero_proceso,
      asunto: this.sentencia.asunto,
      nombre_docente: this.sentencia.nombre_docente,
      email_docente: this.sentencia.email_docente,
      archivoURL: this.sentencia.archivoURL || null
    }).then(() => {
      this.cargando = false;
      this.mensajeExito = 'Sentencia actualizada correctamente';
      this.mostrarMensajeExito = true;
      setTimeout(() => this.router.navigate(['/principal']), 2000);
    }).catch(error => {
      console.error('Error actualizando sentencia:', error);
      this.alertas.push('Hubo un error al actualizar la sentencia.');
      this.cargando = false;
    });
  }

  cancelar(): void {
    this.router.navigate(['/principal']);
  }

  cerrarAlerta(index: number): void {
    this.alertas.splice(index, 1);
  }

  validarNumeroProcess(event: KeyboardEvent): boolean {
    const pattern = /[0-9-]/;
    const inputChar = String.fromCharCode(event.charCode);
    if (!pattern.test(inputChar)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  formatearNumeroProcess(event: any): void {
    const input = event.target;
    this.sentencia.numero_proceso = input.value.replace(/[^0-9-]/g, '');
  }
}
