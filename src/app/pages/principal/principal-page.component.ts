import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { Observable, combineLatest, of, BehaviorSubject } from 'rxjs';
import { switchMap, map, startWith } from 'rxjs/operators';

interface Sentencia {
 numero_proceso: string;
 asunto: string;
 nombre_estudiante: string;
 nombre_docente: string;
 archivoURL?: string;
 estado?: 'aceptar' | 'negar' | null;
 razon?: string;
 email?: string;
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
           sentencias.filter(sentencia => 
             this.userRole === 'estudiante'
               ? sentencia.email?.toLowerCase().includes(searchText.toLowerCase())
               : sentencia.nombre_docente.toLowerCase().includes(searchText.toLowerCase())
           )
         )
       )
     )
   );
 }

 abrirRazon(sentencia: Sentencia, accion: 'aceptar' | 'negar') {
   this.sentenciaPendiente = sentencia;
   this.accionPendiente = accion;
   this.razonTexto = '';
   this.showRazonOverlay = true;
 }
 showOverlay = false;
 selectedSentencia: Sentencia | null = null;

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

 async guardarDecision() {
   if (!this.sentenciaPendiente || !this.razonTexto.trim()) {
     console.error('Falta información necesaria para actualizar la sentencia');
     return;
   }
 
   try {
     // Query for the document with matching numero_proceso
     const querySnapshot = await this.firestore.collection('sentencias')
       .ref.where('numero_proceso', '==', this.sentenciaPendiente.numero_proceso)
       .limit(1)
       .get();
 
     if (querySnapshot.empty) {
       console.error('No se encontró la sentencia con el número de proceso especificado');
       return;
     }
 
     // Get the first (and should be only) matching document
     const docSnapshot = querySnapshot.docs[0];
 
     // Update the document using its actual ID
     await docSnapshot.ref.update({
       estado: this.accionPendiente,
       razon: this.razonTexto.trim(),
     });
 
     this.showRazonOverlay = false;
     this.sentenciaPendiente = null;
     this.razonTexto = '';
     console.log('Sentencia actualizada exitosamente');
   } catch (error) {
     console.error('Error al guardar la decisión:', error);
   }
 }

 cancelarDecision() {
   this.showRazonOverlay = false;
   this.sentenciaPendiente = null;
   this.razonTexto = '';
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

 userName: string = ""
 userEmail: string = ""

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
   if (userRole === 'estudiante') {
     return this.firestore.collection<Sentencia>('sentencias', ref =>
       ref.where('email', '==', userEmail)
     ).valueChanges();
   } else {
     // Assuming 'docente' role
     return this.firestore.collection<Sentencia>('sentencias', ref =>
       ref.where('nombre_docente', '==', userName)
     ).valueChanges();
   }
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
   this.searchSubject.next(this.searchText);
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

// Método de búsqueda actualizado
async buscarPorNumeroProceso() {
  const numeroProceso = this.numeroProcesoBusqueda.trim();
  
  if (!numeroProceso) {
    this.mostrarMensaje('Por favor, ingrese un número de proceso');
    return;
  }

  try {
    // Primero buscar la sentencia
    const sentenciaSnapshot = await this.firestore.collection('sentencias')
      .ref.where('numero_proceso', '==', numeroProceso)
      .get();

    if (sentenciaSnapshot.empty) {
      this.sentenciaEncontrada = null;
      this.mostrarMensaje('No se encontró ninguna sentencia con ese número de proceso');
      return;
    }

    // Obtener los datos de la sentencia
    const sentenciaData = sentenciaSnapshot.docs[0].data() as Sentencia;

    // Buscar el estado de bloqueo
    const lockDoc = await this.firestore.doc(`locks/${numeroProceso}`).get().toPromise();
    const lockData = lockDoc?.data() as { locked?: boolean } | undefined;
    
    // Asignar el estado de bloqueo
    this.sentenciaEncontrada = {
      ...sentenciaData,
      isLocked: lockData?.locked || false
    };

    this.mostrarMensaje('Sentencia encontrada');

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

// Method to save edited status
async guardarEdicionEstado() {
  if (!this.sentenciaEditar || !this.nuevoEstado || !this.razonTexto.trim()) {
    console.error('Falta información necesaria para actualizar el estado');
    return;
  }

  try {
    const querySnapshot = await this.firestore.collection('sentencias')
      .ref.where('numero_proceso', '==', this.sentenciaEditar.numero_proceso)
      .limit(1)
      .get();

    if (!querySnapshot.empty) {
      const docSnapshot = querySnapshot.docs[0];
      await docSnapshot.ref.update({
        estado: this.nuevoEstado,
        razon: this.razonTexto.trim(),
      });

      this.closeEditarEstadoOverlay();
      console.log('Estado actualizado exitosamente');
    }
  } catch (error) {
    console.error('Error al actualizar el estado:', error);
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

}