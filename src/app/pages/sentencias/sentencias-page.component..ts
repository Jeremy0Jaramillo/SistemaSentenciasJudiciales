import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface Sentencia {
  numero_proceso: string;
  asunto: string;
  nombre_estudiante: string;
  nombre_docente: string;
}

@Component({
  selector: 'app-sentencias-page',
  templateUrl: './sentencias-page.component.html',
  styleUrls: ['./sentencias-page.component.css']
})
export class SentenciasPageComponent implements OnInit {
  sentencia: Sentencia = {
    numero_proceso: '',
    asunto: '',
    nombre_estudiante: '',
    nombre_docente: ''
  };
  docentes$: Observable<any[]> = new Observable<any[]>();

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore
  ) { }

  ngOnInit(): void {
    this.afAuth.authState.subscribe(user => {
      if (user) {
        this.firestore.collection('users').doc(user.uid).valueChanges().subscribe((userData: any) => {
          this.sentencia.nombre_estudiante = userData.name;
        });
      }
    });

    this.docentes$ = this.firestore.collection('users', ref => ref.where('role', '==', 'docente')).valueChanges();
  }

  submitForm() {
    this.firestore.collection('sentencias').add(this.sentencia)
      .then(() => {
        console.log('Sentencia added successfully!');
        // Clear the form or navigate to another page
      })
      .catch(error => {
        console.error('Error adding sentencia: ', error);
      });
  }
}
