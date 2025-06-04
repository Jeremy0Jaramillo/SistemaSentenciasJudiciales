import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { Observable, combineLatest, of, BehaviorSubject } from 'rxjs';
import { switchMap, map, startWith } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import * as Papa from 'papaparse'; // Asegúrate de instalar papaparse con `npm install papaparse`

interface Sentencia {
  id: any;
  docente?: any; // Puede que necesites definir un tipo más específico para 'docente'
  numero_proceso: string;
  asunto: string;
  nombre_estudiante: string;
  email_estudiante: string;
  nombre_docente: string;
  email_docente: string;
  archivoURL?: string;
  estado?: 'aceptar' | 'negar' | null;
  razon?: string;
  isLocked?: boolean; // Esta propiedad parece venir de tu HTML original, la mantengo
  isLockedForAcceptance?: boolean; // Indica si los botones de aceptar/negar deben estar deshabilitados
}

@Component({
  selector: 'app-principal-page',
  templateUrl: './principal-page.component.html',
  styleUrls: ['./principal-page.component.css'],
})
export class PrincipalPageComponent implements OnInit {
  user: any = null;
  userRole: string | null = null;
  // Cambiamos sentencias$ para que sea un BehaviorSubject que se actualizará con los datos crudos
  private _allSentencias = new BehaviorSubject<Sentencia[]>([]);
  public filteredSentencias$: Observable<Sentencia[]>; // Este es el observable que usará el HTML
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
    // Configurar filteredSentencias$ para que reaccione a cambios en _allSentencias y searchSubject
    this.filteredSentencias$ = combineLatest([
      this._allSentencias.asObservable(),
      this.searchSubject.asObservable()
    ]).pipe(
      map(([sentencias, searchText]) => {
        // Paso 1: Identificar todos los numero_proceso que ya tienen una sentencia 'aceptar'
        const acceptedProcessNumbers = new Set<string>();
        sentencias.forEach(s => {
          if (s.estado === 'aceptar') {
            acceptedProcessNumbers.add(s.numero_proceso);
          }
        });

        // Paso 2: Mapear las sentencias para añadir la bandera isLockedForAcceptance
        const processedSentencias = sentencias.map(s => {
          const isLocked = acceptedProcessNumbers.has(s.numero_proceso);
          return {
            ...s,
            isLockedForAcceptance: isLocked
          };
        });

        // Paso 3: Aplicar lógica de filtrado por búsqueda (searchText)
        let filtered = processedSentencias;
        if (searchText) {
          if (this.userRole === 'estudiante') {
            filtered = filtered.filter(s =>
              s.email_estudiante?.toLowerCase().includes(searchText.toLowerCase())
            );
          } else if (this.userRole === 'docente') {
            filtered = filtered.filter(s =>
              s.nombre_estudiante?.toLowerCase().includes(searchText.toLowerCase()) ||
              s.numero_proceso.toLowerCase().includes(searchText.toLowerCase()) ||
              s.asunto?.toLowerCase().includes(searchText.toLowerCase())
            );
          } else if (this.userRole === 'administrador') {
            filtered = filtered.filter(s =>
              Object.values(s).some(value =>
                value?.toString().toLowerCase().includes(searchText.toLowerCase())
              )
            );
          }
        }
        return filtered;
      })
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
      console.error('Falta información necesaria para actualizar la sentencia.');
      return;
    }

    try {
      console.log('🔍 Iniciando actualización de sentencia...');
      console.log('Número de proceso:', this.sentenciaPendiente.numero_proceso);
      console.log('Email estudiante:', this.sentenciaPendiente.email_estudiante);
      console.log('Usuario actual:', this.userEmail);

      // Verificar conexión
      await this.firestore.firestore.enableNetwork();

      // PASO 1: Verificar si este numero_proceso ya ha sido aceptado por CUALQUIER sentencia.
      // Esto previene que se acepten múltiples sentencias para el mismo proceso.
      if (this.accionPendiente === 'aceptar') {
        console.log('🔎 Verificando si el número de proceso ya está aceptado globalmente...');
        const existingAcceptedQuery = await this.firestore
          .collection('sentencias')
          .ref.where('numero_proceso', '==', this.sentenciaPendiente.numero_proceso)
          .where('estado', '==', 'aceptar')
          .limit(1)
          .get();

        if (!existingAcceptedQuery.empty) {
          console.warn('⚠️ Este número de proceso ya ha sido aceptado por otra sentencia. No se puede aceptar de nuevo.');
          this.resetFormState(); // Limpiar el estado del formulario
          // Opcional: mostrar una notificación al usuario aquí
          this.showNotification('Este número de proceso ya ha sido aceptado por otra sentencia.', 'error');
          return; // Detener el proceso
        }
        console.log('✅ Número de proceso no encontrado como aceptado previamente.');
      }

      // PASO 2: Obtener la sentencia específica que este docente está manejando
      const querySnapshot = await this.firestore
        .collection('sentencias')
        .ref.where('numero_proceso', '==', this.sentenciaPendiente.numero_proceso)
        .where('email_estudiante', '==', this.sentenciaPendiente.email_estudiante)
        .where('email_docente', '==', this.userEmail) // Asegurar que es la sentencia asignada a este docente
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        console.error('❌ No se encontró la sentencia específica para este estudiante y docente.');
        console.log('Criterios de búsqueda:', {
          numero_proceso: this.sentenciaPendiente.numero_proceso,
          email_estudiante: this.sentenciaPendiente.email_estudiante,
          email_docente: this.userEmail,
        });
        this.resetFormState();
        return;
      }

      const docSnapshot = querySnapshot.docs[0];
      console.log('📄 Documento encontrado con ID:', docSnapshot.id);
      console.log('📊 Datos actuales del documento:', docSnapshot.data());

      // PASO 3: Usar una transacción para garantizar la consistencia
      await this.firestore.firestore.runTransaction(async (transaction) => {
        const docRef = docSnapshot.ref;
        const doc = await transaction.get(docRef);

        if (!doc.exists) {
          throw new Error('Documento no existe en la transacción.');
        }

        // Datos para actualizar la sentencia actual
        const updateData = {
          estado: this.accionPendiente,
          razon: this.razonTexto.trim(),
          fecha_actualizacion: new Date(),
          actualizado_por: this.userEmail,
        };

        console.log('🔄 Datos que se van a actualizar (sentencia actual):', updateData);
        transaction.update(docRef, updateData); // Actualizar la sentencia actual

        // PASO 4: Si la acción es 'aceptar', rechazar automáticamente todas las demás sentencias con el mismo numero_proceso
        if (this.accionPendiente === 'aceptar') {
          console.log('🌐 Acción: Aceptar. Rechazando otras sentencias con el mismo número de proceso...');
          const numeroProcesoAceptado = this.sentenciaPendiente!.numero_proceso;

          // Obtener todas las demás sentencias con el mismo numero_proceso
          const otherSentenciasQuery = await this.firestore
            .collection('sentencias')
            .ref.where('numero_proceso', '==', numeroProcesoAceptado)
            .get();

          otherSentenciasQuery.docs.forEach((otherDoc) => {
            // Solo actualizar si no es la sentencia que acabamos de aceptar y su estado no es ya 'aceptar'
            const otherDocData = otherDoc.data() as Sentencia;
            if (otherDoc.id !== docSnapshot.id && otherDocData.estado !== 'aceptar') {
              console.log(`  - Rechazando documento con ID: ${otherDoc.id}`);
              transaction.update(otherDoc.ref, {
                estado: 'negar', // Cambiado a 'negar' para rechazo automático
                razon: `Rechazada automáticamente: Sentencia con el número de proceso '${numeroProcesoAceptado}' ya fue aceptada por ${this.userEmail}.`,
                fecha_actualizacion: new Date(),
                actualizado_por: 'Sistema (auto-rechazo)',
              });
            }
          });
          console.log('✅ Proceso de auto-rechazo de sentencias completado.');
        }
        console.log('✅ Transacción de actualización ejecutada.');
      });

      // Recargar datos para reflejar cambios en la UI
      this.loadUserData(this.user.uid); // Recarga completa para actualizar el estado isLockedForAcceptance

      this.resetFormState(); // Limpiar el estado del formulario
      console.log('✅ Proceso de actualización completado');
      this.showNotification('Decisión guardada exitosamente.', 'success');

    } catch (error) {
      console.error('❌ Error detallado al actualizar:', error);
      console.error('Código de error:', (error as any).code);
      console.error('Mensaje:', (error as any).message);
      this.showNotification('Error al guardar la decisión.', 'error');
    }
  }

  // Función auxiliar para limpiar el estado del formulario
  private resetFormState() {
    this.showRazonOverlay = false;
    this.sentenciaPendiente = null;
    this.razonTexto = '';
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
          // Ahora llamamos a loadSentencias sin pasar los parámetros, ya que userEmail y userRole están en la clase
          return this.loadSentencias();
        } else {
          return of([]);
        }
      })
    ).subscribe((sentencias) => {
      // Directamente actualizamos el BehaviorSubject con las sentencias cargadas
      this._allSentencias.next(sentencias);
      this.searchSubject.next(this.searchText); // trigger initial filter
    });
  }

  // loadSentencias ahora solo carga los datos relevantes al rol del usuario,
  // y la lógica de isLockedForAcceptance se maneja en filteredSentencias$
  loadSentencias(): Observable<Sentencia[]> {
    let query;

    // Se cargan todas las sentencias si es administrador para poder calcular isLockedForAcceptance globalmente
    // Si es docente o estudiante, se carga solo lo suyo para reducir el tráfico,
    // pero la lógica de isLockedForAcceptance seguirá funcionando si ya hay una aceptada globalmente
    if (this.userRole === 'estudiante' && this.userEmail) {
      query = this.firestore.collection('sentencias', ref =>
        ref.where('email_estudiante', '==', this.userEmail)
      );
    } else if (this.userRole === 'docente' && this.userEmail) {
      query = this.firestore.collection('sentencias', ref =>
        ref.where('email_docente', '==', this.userEmail)
      );
    } else if (this.userRole === 'administrador') {
      query = this.firestore.collection('sentencias');
    } else {
      return of([]);
    }

    return query.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Sentencia;
        const id = a.payload.doc.id;
        return { ...data, id };
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
    // Simplemente actualiza el BehaviorSubject para que filteredSentencias$ reaccione
    this.searchSubject.next(this.searchText);
  }

  // Método para mostrar mensajes
  private mostrarMensaje(mensaje: string, p0: boolean) {
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
      console.log('Por favor, ingrese un número de proceso');
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
        console.log('No se encontró ninguna sentencia con ese número de proceso');
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
        // Si es administrador o estudiante, mostrar la primera encontrada (o la más relevante si tienes un criterio)
        sentenciaParaMostrar = sentenciaSnapshot.docs[0];
      }

      const sentenciaData = sentenciaParaMostrar.data() as Sentencia;

      // Buscar el estado de bloqueo (si usas una colección 'locks' separada)
      // Si el bloqueo se basa en el estado 'aceptar' de la sentencia, esto podría simplificarse
      const lockDoc = await this.firestore.doc(`locks/${numeroProceso}`).get().toPromise();
      const lockData = lockDoc?.data() as { locked?: boolean } | undefined;

      this.sentenciaEncontrada = {
        ...sentenciaData,
        isLocked: lockData?.locked || false,
      };

      console.log(`Sentencia encontrada (${sentenciaSnapshot.docs.length} total)`);
    } catch (error) {
      console.error('Error al buscar la sentencia:', error);
      console.log('Error al buscar la sentencia');
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
      const querySnapshot = await this.firestore
        .collection('sentencias')
        .ref.where('numero_proceso', '==', this.sentenciaEditar.numero_proceso)
        .where('email_estudiante', '==', this.sentenciaEditar.email_estudiante)
        .where('email_docente', '==', this.sentenciaEditar.email_docente)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        const docSnapshot = querySnapshot.docs[0];

        const updateData = {
          estado: this.nuevoEstado,
          razon: this.razonTexto.trim(),
          fecha_actualizacion: new Date(),
          editado_por: this.userEmail,
        };

        await docSnapshot.ref.update(updateData);
        console.log('✅ Estado actualizado exitosamente');

        this.closeEditarEstadoOverlay();
        this.loadUserData(this.user.uid); // Recargar datos para reflejar cambios
        this.showNotification('Estado de sentencia actualizado.', 'success');
      } else {
        console.error('❌ No se encontró la sentencia específica para editar');
        this.showNotification('No se encontró la sentencia para editar.', 'error');
      }
    } catch (error) {
      console.error('❌ Error al actualizar el estado:', error);
      this.showNotification('Error al actualizar el estado de la sentencia.', 'error');
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

    // Obtener las sentencias actuales del BehaviorSubject
    const sentencias = this._allSentencias.getValue();
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
      this.showNotification('No se encontró la sentencia para editar.', 'error');
    }
  }

  confirmarEliminacion(sentencia: any) {
    this.sentenciaAEliminar = sentencia;
  }

  cancelarEliminacion() {
    this.sentenciaAEliminar = null;
  }

eliminarSentenciaConfirmada() {
    const sentencia = this.sentenciaAEliminar as Sentencia; // Castear a Sentencia
    if (!sentencia || !sentencia.id) {
      // Verificar si hay sentencia y si tiene ID
      console.error(
        'No se puede eliminar la sentencia: falta información o ID.'
      );
      this.sentenciaAEliminar = null;
      this.mostrarMensaje('Error al intentar eliminar la sentencia.', true);
      return;
    }

    this.firestore
      .collection('sentencias')
      .doc(sentencia.id)
      .delete()
      .then(() => {
        console.log('Sentencia eliminada correctamente con ID:', sentencia.id);
        this.mostrarMensaje('Sentencia eliminada con éxito.', false);
        this.loadUserData(this.user.uid); // Recargar datos
      })
      .catch((error) => {
        console.error('Error al eliminar la sentencia:', error);
        this.mostrarMensaje('Error al eliminar la sentencia.', true);
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