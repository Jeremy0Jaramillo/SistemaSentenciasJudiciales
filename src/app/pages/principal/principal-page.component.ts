import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { Observable, combineLatest, of, BehaviorSubject } from 'rxjs';
import { switchMap, map, startWith } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import * as Papa from 'papaparse'; // Asegúrate de instalar papaparse con `npm install papaparse`

interface Sentencia {
  docente: any;
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
}

@Component({
  selector: 'app-principal-page',
  templateUrl: './principal-page.component.html',
  styleUrls: ['./principal-page.component.css'],
})
export class PrincipalPageComponent implements OnInit {
  user: any = null;
  userRole: string | null = null;
  sentencias$: Observable<Sentencia[]> = of([]);
  filteredSentencias$: Observable<Sentencia[]>;
  searchText: string = '';
  private searchSubject = new BehaviorSubject<string>('');
  showRazonOverlay = false;
  razonTexto = '';
  accionPendiente: 'aceptar' | 'negar' = 'aceptar';
  sentenciaPendiente: Sentencia | null = null;
  numeroProcesoBusqueda: string = '';
  sentenciaEncontrada: Sentencia | null = null;
  mensajeBusqueda: string = '';
  mostrarMensajeBusqueda: boolean = false;
  showEditarEstadoOverlay = false;
  nuevoEstado: 'aceptar' | 'negar' | null = null;
  sentenciaEditar: Sentencia | null = null;
  archivoSeleccionado: File | null = null;
  docentesCargados: { nombre: string; email: string }[] = [];
  alert: string = '';
  alertype: 'success' | 'error' = 'success';
  sentenciaAEliminar: any = null;
  userName: string = "";
  userEmail: string = "";
  showOverlay = false;
  selectedSentencia: Sentencia | null = null;

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router
  ) {
    this.filteredSentencias$ = this.searchSubject.pipe(
      startWith(''),
      switchMap(searchText =>
        this.sentencias$.pipe(
          map(sentencias =>
            sentencias.filter(sentencia => {
              if (this.userRole === 'estudiante') {
                return sentencia.email_estudiante?.toLowerCase().includes(searchText.toLowerCase());
              } else if (this.userRole === 'docente') {
                return sentencia.nombre_estudiante?.toLowerCase().includes(searchText.toLowerCase());
              }
              return true;
            })
          )
        )
      )
    );
  }

  ngOnInit() {
    this.afAuth.authState.subscribe(user => {
      if (user) {
        this.user = user;
        this.loadUserData(user.uid);
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  abrirRazon(sentencia: Sentencia, accion: 'aceptar' | 'negar') {
    this.sentenciaPendiente = sentencia;
    this.accionPendiente = accion;
    this.razonTexto = '';
    this.showRazonOverlay = true;
  }

  openOverlay(sentencia: Sentencia) {
    this.selectedSentencia = sentencia;
    this.showOverlay = true;
  }

  closeOverlay() {
    this.showOverlay = false;
    this.selectedSentencia = null;
  }

  getStatusText(estado: 'aceptar' | 'negar' | null): string {
    switch (estado) {
      case 'aceptar':
        return 'Sentencia aceptada';
      case 'negar':
        return 'Sentencia negada';
      default:
        return 'Estado de sentencia desconocido';
    }
  }

  getStatusClass(estado: 'aceptar' | 'negar' | null): string {
    switch (estado) {
      case 'aceptar':
        return 'estado-aceptado';
      case 'negar':
        return 'estado-negado';
      default:
        return 'estado-desconocido';
    }
  }

  // Método corregido para actualizar la sentencia correcta
  async guardarDecision() {
    if (!this.sentenciaPendiente || !this.razonTexto.trim()) {
      console.error('Falta información necesaria para actualizar la sentencia');
      return;
    }

    try {
      // console.log('🔍 Iniciando actualización de sentencia...');
      // console.log('Número de proceso:', this.sentenciaPendiente.numero_proceso);
      // console.log('Email estudiante:', this.sentenciaPendiente.email_estudiante);
      // console.log('Usuario actual:', this.userEmail);

      // Verificar conexión
      await this.firestore.firestore.enableNetwork();

      // Query más específica usando numero_proceso Y email_estudiante Y email_docente
      const querySnapshot = await this.firestore
        .collection('sentencias')
        .ref.where('numero_proceso', '==', this.sentenciaPendiente.numero_proceso)
        .where('email_estudiante', '==', this.sentenciaPendiente.email_estudiante)
        .where('email_docente', '==', this.userEmail) // Asegurar que es la sentencia asignada a este docente
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        // console.error('❌ No se encontró la sentencia específica para este estudiante y docente');
        // console.log('Criterios de búsqueda:', {
        //   numero_proceso: this.sentenciaPendiente.numero_proceso,
        //   email_estudiante: this.sentenciaPendiente.email_estudiante,
        //   email_docente: this.userEmail,
        // });
        return;
      }

      const docSnapshot = querySnapshot.docs[0];
      // console.log('📄 Documento encontrado con ID:', docSnapshot.id);
      // console.log('📊 Datos actuales del documento:', docSnapshot.data());

      const updateData = {
        estado: this.accionPendiente,
        razon: this.razonTexto.trim(),
        fecha_actualizacion: new Date(),
        actualizado_por: this.userEmail,
      };

      // console.log('🔄 Datos que se van a actualizar:', updateData);

      // Usar transacción para garantizar consistencia
      await this.firestore.firestore.runTransaction(async (transaction) => {
        const docRef = docSnapshot.ref;
        const doc = await transaction.get(docRef);

        if (!doc.exists) {
          throw new Error('Documento no existe en la transacción');
        }

        console.log('📋 Datos antes de la transacción:', doc.data());
        transaction.update(docRef, updateData);
        // console.log('✅ Transacción de actualización ejecutada');
      });

      // Verificar la actualización
      const updatedDoc = await docSnapshot.ref.get();
      // console.log('🔍 Verificación post-actualización:', updatedDoc.data());

      // Recargar datos para reflejar cambios
      this.loadUserData(this.user.uid);

      this.showRazonOverlay = false;
      this.sentenciaPendiente = null;
      this.razonTexto = '';

      // console.log('✅ Proceso de actualización completado');
    } catch (error) {
      // console.error('❌ Error detallado al actualizar:', error);
      // console.error('Código de error:', (error as any).code);
      // console.error('Mensaje:', (error as any).message);
    }
  }

  cancelarDecision() {
    this.showRazonOverlay = false;
    this.sentenciaPendiente = null;
    this.razonTexto = '';
  }

  loadUserData(uid: string) {
    this.firestore.collection('users').doc(uid).valueChanges().pipe(
      switchMap((userData: any) => {
        if (userData) {
          this.userName = userData.name;
          this.userEmail = userData.email;
          this.userRole = userData.role;
          return this.loadSentencias(this.userName, this.userEmail, this.userRole);
        } else {
          return of([]);
        }
      })
    ).subscribe((sentencias) => {
      this.sentencias$ = of(sentencias);
      this.searchSubject.next(this.searchText); // trigger initial filter
    });
  }

  loadSentencias(userName: string, userEmail: string, userRole: any): Observable<Sentencia[]> {
    let query;

    if (userRole === 'estudiante') {
      query = this.firestore.collection('sentencias', ref =>
        ref.where('email_estudiante', '==', userEmail)
      );
    } else if (userRole === 'docente') {
      query = this.firestore.collection('sentencias', ref =>
        ref.where('email_docente', '==', userEmail)
      );
    } else if (userRole === 'administrador') {
      query = this.firestore.collection('sentencias');
    } else {
      return of([]);
    }

    return query.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Sentencia;
        const id = a.payload.doc.id;
        return { id, ...data };
      }))
    );
  }

  redirectToNuevaSentencia() {
    this.router.navigate(['/nueva-sentencia']);
  }

  redirectToAnalisis(sentencia: Sentencia) {
    this.router.navigate(['/analisis'], {
      queryParams: {
        numero_proceso: sentencia.numero_proceso,
        asunto: sentencia.asunto,
        estudiante: sentencia.nombre_estudiante,
        docente: sentencia.nombre_docente
      }
    });
  }

  onSearchTextChanged() {
    const query = this.searchText.toLowerCase();

    if (this.userRole === 'administrador') {
      this.filteredSentencias$ = this.sentencias$.pipe(
        map(sentencias =>
          sentencias.filter(sentencia =>
            Object.values(sentencia).some(value =>
              value?.toString().toLowerCase().includes(query)
            )
          )
        )
      );
    } else if (this.userRole === 'docente') {
      this.filteredSentencias$ = this.sentencias$.pipe(
        map(sentencias =>
          sentencias.filter(sentencia =>
            sentencia.nombre_estudiante?.toLowerCase().includes(query)
          )
        )
      );
    }
  }

  // Método para mostrar mensajes
  private mostrarMensaje(mensaje: string) {
    this.mensajeBusqueda = mensaje;
    this.mostrarMensajeBusqueda = true;
    setTimeout(() => {
      this.mostrarMensajeBusqueda = false;
    }, 3000);
  }

  // Método para limpiar la búsqueda
  limpiarBusqueda() {
    this.numeroProcesoBusqueda = '';
    this.sentenciaEncontrada = null;
    this.mostrarMensajeBusqueda = false;
  }

  validarBusquedaProceso(event: KeyboardEvent): boolean {
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

  // Método para formatear el input de búsqueda
  formatearBusquedaProceso(event: any) {
    let valor = event.target.value;
    // Eliminar cualquier carácter que no sea número o guion
    valor = valor.replace(/[^0-9-]/g, '');
    this.numeroProcesoBusqueda = valor;
  }

  // Método corregido para búsqueda por número de proceso
  async buscarPorNumeroProceso() {
    const numeroProceso = this.numeroProcesoBusqueda.trim();

    if (!numeroProceso) {
      this.mostrarMensaje('Por favor, ingrese un número de proceso');
      return;
    }

    try {
      console.log('🔍 Buscando sentencias con número de proceso:', numeroProceso);

      // Buscar TODAS las sentencias con ese número de proceso
      const sentenciaSnapshot = await this.firestore
        .collection('sentencias')
        .ref.where('numero_proceso', '==', numeroProceso)
        .get();

      if (sentenciaSnapshot.empty) {
        this.sentenciaEncontrada = null;
        this.mostrarMensaje('No se encontró ninguna sentencia con ese número de proceso');
        return;
      }

      console.log(`📊 Se encontraron ${sentenciaSnapshot.docs.length} sentencia(s) con ese número`);

      // Si hay múltiples sentencias, mostrar información adicional
      if (sentenciaSnapshot.docs.length > 1) {
        console.log('⚠️ Múltiples sentencias encontradas:');
        sentenciaSnapshot.docs.forEach((doc, index) => {
          const data = doc.data() as Sentencia;
          console.log(`${index + 1}. Estudiante: ${data.nombre_estudiante}, Estado: ${data.estado || 'Pendiente'}`);
        });
      }

      // Para la búsqueda, mostrar la más reciente o la que corresponda al rol del usuario
      let sentenciaParaMostrar;

      if (this.userRole === 'docente') {
        // Si es docente, buscar la sentencia asignada a él
        const sentenciaDocente = sentenciaSnapshot.docs.find((doc) =>
          (doc.data() as Sentencia).email_docente === this.userEmail
        );
        sentenciaParaMostrar = sentenciaDocente || sentenciaSnapshot.docs[0];
      } else {
        // Si es administrador, mostrar la más reciente
        sentenciaParaMostrar = sentenciaSnapshot.docs[0];
      }

      const sentenciaData = sentenciaParaMostrar.data() as Sentencia;

      // Buscar el estado de bloqueo
      const lockDoc = await this.firestore.doc(`locks/${numeroProceso}`).get().toPromise();
      const lockData = lockDoc?.data() as { locked?: boolean } | undefined;

      this.sentenciaEncontrada = {
        ...sentenciaData,
        isLocked: lockData?.locked || false,
      };

      this.mostrarMensaje(`Sentencia encontrada (${sentenciaSnapshot.docs.length} total)`);
    } catch (error) {
      console.error('Error al buscar la sentencia:', error);
      this.mostrarMensaje('Error al buscar la sentencia');
    }
  }

  // Método para obtener el texto del estado de bloqueo
  getEstadoBloqueo(sentencia: Sentencia): string {
    return sentencia.isLocked ? 'Finalizada' : 'En proceso';
  }

  abrirEdicionEstado(sentencia: Sentencia) {
    this.sentenciaEditar = sentencia;
    this.nuevoEstado = sentencia.estado ?? null;
    this.razonTexto = sentencia.razon || '';
    this.showEditarEstadoOverlay = true;
  }

  // Método corregido para editar estado (administrador)
  async guardarEdicionEstado() {
    if (!this.sentenciaEditar || !this.nuevoEstado || !this.razonTexto.trim()) {
      console.error('Falta información necesaria para actualizar el estado');
      return;
    }

    try {
      // console.log('🔍 Iniciando edición de estado...');
      // console.log('Sentencia a editar:', {
      //   numero_proceso: this.sentenciaEditar.numero_proceso,
      //   email_estudiante: this.sentenciaEditar.email_estudiante,
      //   email_docente: this.sentenciaEditar.email_docente,
      // });

      // Query específica para encontrar la sentencia exacta
      const querySnapshot = await this.firestore
        .collection('sentencias')
        .ref.where('numero_proceso', '==', this.sentenciaEditar.numero_proceso)
        .where('email_estudiante', '==', this.sentenciaEditar.email_estudiante)
        .where('email_docente', '==', this.sentenciaEditar.email_docente)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        const docSnapshot = querySnapshot.docs[0];
        // console.log('📄 Documento a editar encontrado:', docSnapshot.id);

        const updateData = {
          estado: this.nuevoEstado,
          razon: this.razonTexto.trim(),
          fecha_actualizacion: new Date(),
          editado_por: this.userEmail,
        };

        await docSnapshot.ref.update(updateData);
        console.log('✅ Estado actualizado exitosamente');

        this.closeEditarEstadoOverlay();
        this.loadUserData(this.user.uid); // Recargar datos
      } else {
        console.error('❌ No se encontró la sentencia específica para editar');
      }
    } catch (error) {
      console.error('❌ Error al actualizar el estado:', error);
    }
  }

  // Method to close edit status overlay
  closeEditarEstadoOverlay() {
    this.showEditarEstadoOverlay = false;
    this.sentenciaEditar = null;
    this.nuevoEstado = null;
    this.razonTexto = '';
  }

  // Method to cancel edit status
  cancelarEdicionEstado() {
    this.closeEditarEstadoOverlay();
  }

  onFileSelected(event: any) {
    const input = event.target;
    const file = input.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result: { data: { email: string; name: string; }[]; }) => {
        const rows = result.data as { email: string; name: string }[];

        for (const row of rows) {
          const email = row.email?.trim().toLowerCase();
          const name = row.name?.trim().toUpperCase();

          if (!email || !name) continue;

          const userQuery = await this.firestore.collection('users', ref =>
            ref.where('email', '==', email)
          ).get().toPromise();

          if (userQuery?.empty) {
            await this.firestore.collection('users').add({
              email,
              name,
              role: 'docente'
            });
          }
        }

        this.showNotification('Carga de docentes completa.', 'success');
        input.value = '';
      },
      error: (err: any) => {
        console.error('Error al procesar el CSV:', err);
        this.showNotification('Error al procesar el archivo CSV.', 'error');
        input.value = '';
      }
    });
  }

  showNotification(message: string, type: 'success' | 'error') {
    this.alert = message;
    this.alertype = type;
    setTimeout(() => {
      this.alert = '';
    }, 4000); // Se oculta después de 4 segundos
  }

  procesarArchivo(): void {
    if (!this.archivoSeleccionado) return;

    const reader = new FileReader();

    reader.onload = (e: any) => {
      const contenido = e.target.result as string;

      // Si es un CSV simple, separado por comas: nombre,email
      const lineas = contenido.split('\n');
      this.docentesCargados = [];

      for (let linea of lineas) {
        const [nombre, email] = linea.trim().split(',');
        if (nombre && email) {
          this.docentesCargados.push({ nombre, email });
        }
      }
    };

    reader.readAsText(this.archivoSeleccionado);
  }

  async cargarUsuariosDesdeCSV(usuarios: { nombre: string; email: string }[]) {
    const batch = this.firestore.firestore.batch(); // Lote para optimización

    for (const usuario of usuarios) {
      const docRef = this.firestore.collection('users').doc(usuario.email).ref;

      const existingDoc = await docRef.get();
      if (!existingDoc.exists) {
        // Solo agregar si no existe
        batch.set(docRef, {
          name: usuario.nombre,
          email: usuario.email,
          role: 'docente',
        });
      } else {
        console.log(`El usuario con email ${usuario.email} ya existe, se omite.`);
      }
    }

    try {
      await batch.commit();
      console.log('Carga finalizada sin duplicados');
    } catch (error) {
      console.error('Error al guardar usuarios desde CSV:', error);
    }
  }

  // Método corregido para editar sentencia en principal-page.component.ts
  async editarSentencia(numero_proceso: string, email_estudiante?: string, email_docente?: string): Promise<void> {
    console.log('🔧 Iniciando edición de sentencia:', numero_proceso);

    const sentencias = await firstValueFrom(this.sentencias$);
    console.log('📋 Buscando en', sentencias.length, 'sentencias');
    let sentencia;

    if (this.userRole === 'docente') {
      sentencia = sentencias.find(s =>
        s.numero_proceso === numero_proceso &&
        s.email_docente === this.userEmail
      );
    } else if (this.userRole === 'estudiante') {
      sentencia = sentencias.find(s =>
        s.numero_proceso === numero_proceso &&
        s.email_estudiante === this.userEmail
      );
    } else if (this.userRole === 'administrador') {
      sentencia = sentencias.find(s =>
        s.numero_proceso === numero_proceso &&
        s.email_estudiante === email_estudiante &&
        s.email_docente === email_docente
      );
      if (!sentencia) {
        console.warn('❌ No se encontró coincidencia exacta, revisa los parámetros.');
      }
    }

    if (sentencia) {
      console.log('✅ Sentencia encontrada para editar:');
      this.router.navigate(['/editar-sentencia'], {
        queryParams: {
          numero_proceso: sentencia.numero_proceso,
          email_estudiante: sentencia.email_estudiante,
          email_docente: sentencia.email_docente
        }
      });
    } else {
      console.error('❌ No se encontró la sentencia con los parámetros proporcionados');
    }
  }

  confirmarEliminacion(sentencia: any) {
    this.sentenciaAEliminar = sentencia;
  }

  cancelarEliminacion() {
    this.sentenciaAEliminar = null;
  }

  eliminarSentenciaConfirmada() {
    const sentencia = this.sentenciaAEliminar;
    if (!sentencia || !sentencia.numero_proceso) return;

    // Query específica para eliminar la sentencia correcta
    this.firestore.collection('sentencias', ref =>
      ref.where('numero_proceso', '==', sentencia.numero_proceso)
        .where('email_estudiante', '==', sentencia.email_estudiante)
        .where('email_docente', '==', sentencia.email_docente)
    ).get().subscribe(snapshot => {
      snapshot.forEach(doc => {
        this.firestore.collection('sentencias').doc(doc.id).delete().then(() => {
          console.log('Sentencia eliminada correctamente');
          this.loadUserData(this.user.uid); // Recargar datos
        });
      });
    });

    this.sentenciaAEliminar = null;
  }

  // Método auxiliar para crear un identificador único de sentencia
  private crearIdentificadorSentencia(sentencia: Sentencia): string {
    return `${sentencia.numero_proceso}_${sentencia.email_estudiante}_${sentencia.email_docente}`;
  }

  // Método para verificar si hay duplicados (útil para debugging)
  async verificarDuplicados(numeroProceso: string) {
    try {
      const snapshot = await this.firestore
        .collection('sentencias')
        .ref.where('numero_proceso', '==', numeroProceso)
        .get();

      console.log(`📊 Sentencias con número ${numeroProceso}:`, snapshot.docs.length);

      snapshot.docs.forEach((doc, index) => {
        const data = doc.data() as Sentencia;
        console.log(`${index + 1}. ID: ${doc.id}`);
        console.log(`   Estudiante: ${data.nombre_estudiante} (${data.email_estudiante})`);
        console.log(`   Docente: ${data.nombre_docente} (${data.email_docente})`);
        console.log(`   Estado: ${data.estado || 'Pendiente'}`);
        console.log(`   Razón: ${data.razon || 'N/A'}`);
        console.log('---');
      });
    } catch (error) {
      console.error('Error al verificar duplicados:', error);
    }
  }
}