import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-sentencias-page',
  templateUrl: './sentencias-page.component.html',
  styleUrls: []
})
export class SentenciasPageComponent {
  sentencia = {
    numero_proceso: '',
    asunto: '',
    nombre_estudiante: '',
    nombre_docente: ''
  };

  constructor(private firestore: AngularFirestore) {}

  async submitForm() {
    try {
      // Check if numero_proceso is unique
      const snapshot = await this.firestore.collection('sentencias', ref => ref.where('numero_proceso', '==', this.sentencia.numero_proceso)).get().toPromise();

      if (snapshot && !snapshot.empty) {
        alert('El número de proceso ya existe.');
        return;
      }

      // Add the document to the collection
      await this.firestore.collection('sentencias').add(this.sentencia);
      alert('Sentencia guardada con éxito.');
      this.resetForm();
    } catch (error) {
      console.error('Error al guardar la sentencia:', error);
      alert('Ocurrió un error al guardar la sentencia.');
    }
  }

  resetForm() {
    this.sentencia = {
      numero_proceso: '',
      asunto: '',
      nombre_estudiante: '',
      nombre_docente: ''
    };
  }
}
