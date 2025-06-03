import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs/operators'

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
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      console.log('🔍 Parámetros recibidos en editar-sentencia:', params);

      const numeroProceso = params['numero_proceso'];
      const emailEstudiante = params['email_estudiante'];
      const emailDocente = params['email_docente'];

      console.log('📋 Valores extraídos:');
      console.log('- numero_proceso:', numeroProceso);
      console.log('- email_estudiante:', emailEstudiante);
      console.log('- email_docente:', emailDocente);

      // Si tenemos al menos el número de proceso, intentamos cargar
      if (numeroProceso) {
        console.log('✅ Intentando cargar sentencia con número de proceso:', numeroProceso);

        // Primero intentamos con email si está disponible
        if (emailEstudiante) {
          this.cargarSentencia(numeroProceso, emailEstudiante, emailDocente);
        } else {
          // Si no tenemos email, intentamos cargar solo por número de proceso
          this.cargarSentenciaPorNumero(numeroProceso);
        }

        this.cargarDocentes();
      } else {
        console.error('❌ No se proporcionó número de proceso');
        this.alertas.push('No se proporcionó número de proceso para editar.');
        setTimeout(() => this.router.navigate(['/principal']), 3000);
      }
    });
  }

  cargarSentenciaPorNumero(numeroProceso: string): void {
    console.log('🔍 Buscando sentencia solo por número de proceso:', numeroProceso);

    this.firestore.collection('sentencias', ref =>
      ref.where('numero_proceso', '==', numeroProceso).limit(1)
    ).get().subscribe(
      snapshot => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          this.sentenciaId = doc.id;
          this.sentencia = doc.data() as Sentencia;

          console.log('✅ Sentencia encontrada por número de proceso:');
          console.log('- ID:', this.sentenciaId);
          console.log('- Datos:', this.sentencia);

          if (this.sentencia.archivoURL) {
            this.archivoMensaje = 'Archivo actual cargado';
            this.fileLoaded = true;
          }
        } else {
          console.error('❌ No se encontró ninguna sentencia con ese número de proceso');
          this.alertas.push(`No se encontró ninguna sentencia con el número de proceso: ${numeroProceso}`);
          setTimeout(() => this.router.navigate(['/principal']), 3000);
        }
      },
      error => {
        console.error('❌ Error al cargar la sentencia:', error);
        this.alertas.push('Error al cargar la sentencia: ' + error.message);
      }
    );
  }

  cargarDocentes(): void {
    this.firestore.collection('users', ref => ref.where('role', '==', 'docente'))
      .valueChanges()
      .subscribe((docentes: any[]) => {
        this.docentesLista = docentes.sort((a, b) => a.name.localeCompare(b.name));
        console.log('📚 Docentes cargados:', this.docentesLista.length);
      });
  }

  cargarSentencia(numeroProceso: string, emailEstudiante: string, emailDocente?: string): void {
    console.log('🔍 Buscando sentencia con criterios:');
    console.log('- numero_proceso:', numeroProceso);
    console.log('- email_estudiante:', emailEstudiante);
    console.log('- email_docente:', emailDocente);

    // Query más específica si tenemos el email del docente
    const query = this.firestore.collection('sentencias', ref => {
      let baseQuery = ref
        .where('numero_proceso', '==', numeroProceso)
        .where('email_estudiante', '==', emailEstudiante);

      // Si tenemos el email del docente, agregarlo para mayor especificidad
      if (emailDocente) {
        baseQuery = baseQuery.where('email_docente', '==', emailDocente);
      }

      return baseQuery.limit(1);
    });

    query.get().subscribe(
      snapshot => {
        console.log('📊 Resultados de búsqueda:', snapshot.docs.length);

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          this.sentenciaId = doc.id;
          this.sentencia = doc.data() as Sentencia;

          console.log('✅ Sentencia cargada:');
          console.log('- ID del documento:', this.sentenciaId);
          console.log('- Datos:', this.sentencia);

          if (this.sentencia.archivoURL) {
            this.archivoMensaje = 'Archivo actual cargado';
            this.fileLoaded = true;
          }
        } else {
          console.error('❌ No se encontró la sentencia');

          // Búsqueda alternativa sin email del docente por si acaso
          if (emailDocente) {
            console.log('🔄 Intentando búsqueda sin email del docente...');
            this.cargarSentencia(numeroProceso, emailEstudiante);
            return;
          }

          this.alertas.push(`No se encontró la sentencia para editar con los criterios:
          Número de proceso: ${numeroProceso}
          Email estudiante: ${emailEstudiante}`);

          setTimeout(() => {
            this.router.navigate(['/principal']);
          }, 3000);
        }
      },
      error => {
        console.error('❌ Error al cargar sentencia:', error);
        this.alertas.push('Error al cargar la sentencia: ' + error.message);
      }
    );
  }

  actualizarCorreoDocente(): void {
    const docente = this.docentesLista.find(d => d.name === this.sentencia.nombre_docente);
    this.sentencia.email_docente = docente ? docente.email : '';
    console.log('📧 Email del docente actualizado:', this.sentencia.email_docente);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.archivo = file;
      this.archivoMensaje = `Archivo cargado: ${file.name}`;
      this.fileLoaded = true;
      console.log('📎 Archivo seleccionado:', file.name);
    } else {
      this.archivo = null;
      this.archivoMensaje = 'Sin subir archivo';
      this.fileLoaded = false;
    }
  }

async submitForm(): Promise<void> {
  this.alertas = [];
  this.cargando = true;

  console.log('💾 Iniciando actualización de sentencia...');

  // Validación: no permitir agregar si ya existe una sentencia aprobada con el mismo número de proceso
  await new Promise<void>((resolve) => {
    this.firestore.collection('sentencias', ref =>
      ref.where('numero_proceso', '==', this.sentencia.numero_proceso)
    ).get().subscribe(querySnapshot => {
      const yaExisteAprobada = querySnapshot.docs.some(doc => (doc.data() as any)['estado'] === 'aceptar');
      if (yaExisteAprobada) {
        this.alertas.push('El número de proceso ya fue aprobado y no se puede volver a subir.');
        this.cargando = false;
        resolve();
        return;
      }
      // Si no existe aprobada, continuar con el flujo normal
      if (this.archivo) {
        console.log('📤 Subiendo nuevo archivo...');
        const filePath = `sentencias/${this.archivo.name}_${Date.now()}`;
        const fileRef = this.storage.ref(filePath);
        const uploadTask = this.storage.upload(filePath, this.archivo);

        uploadTask.snapshotChanges().pipe(
          finalize(() => {
            fileRef.getDownloadURL().subscribe(url => {
              console.log('✅ Archivo subido, URL:', url);
              this.sentencia.archivoURL = url;
              this.actualizarSentencia();
              resolve();
            });
          })
        ).subscribe();
      } else {
        console.log('📝 Actualizando sin cambio de archivo...');
        this.actualizarSentencia();
        resolve();
      }
    });
  });
}

  actualizarSentencia(): void {
    console.log('🔄 Actualizando documento con ID:', this.sentenciaId);
    console.log('📋 Datos a actualizar:', {
      numero_proceso: this.sentencia.numero_proceso,
      asunto: this.sentencia.asunto,
      nombre_docente: this.sentencia.nombre_docente,
      email_docente: this.sentencia.email_docente,
      archivoURL: this.sentencia.archivoURL
    });

    this.firestore.collection('sentencias').doc(this.sentenciaId).update({
      numero_proceso: this.sentencia.numero_proceso,
      asunto: this.sentencia.asunto,
      nombre_docente: this.sentencia.nombre_docente,
      email_docente: this.sentencia.email_docente,
      archivoURL: this.sentencia.archivoURL || null,
      fecha_actualizacion: new Date() // Agregar timestamp de actualización
    }).then(() => {
      console.log('✅ Sentencia actualizada correctamente');
      this.cargando = false;
      this.mensajeExito = 'Sentencia actualizada correctamente';
      this.mostrarMensajeExito = true;
      setTimeout(() => this.router.navigate(['/principal']), 2000);
    }).catch(error => {
      console.error('❌ Error actualizando sentencia:', error);
      this.alertas.push('Hubo un error al actualizar la sentencia: ' + error.message);
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