import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

interface Sentencia {
  numero_proceso: string;
  asunto: string;
  nombre_estudiante: string;
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
  sentencia: Sentencia = {
    numero_proceso: '',
    asunto: '',
    nombre_estudiante: '',
    nombre_docente: ''
  };
  docentes$: Observable<any[]> = new Observable<any[]>();
  selectedFile: File | null = null;

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private storage: AngularFireStorage
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

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
    this.fileLoaded = !!this.selectedFile;  // Set fileLoaded to true if a file is selected
  }

  submitForm(): void {
    this.firestore.collection('sentencias', ref => ref.where('numero_proceso', '==', this.sentencia.numero_proceso))
      .get()
      .subscribe(querySnapshot => {
        if (querySnapshot.size > 0) {
          // Duplicate found
          this.alerta = true;
          console.error('Duplicate numero_proceso found.');
        } else {
          // No duplicate found, proceed with submission
          if (this.selectedFile) {
            const filePath = `sentencias/${this.selectedFile.name}_${Date.now()}`;
            const fileRef = this.storage.ref(filePath);
            const uploadTask = this.storage.upload(filePath, this.selectedFile);
  
            uploadTask.snapshotChanges().pipe(
              finalize(() => {
                fileRef.getDownloadURL().subscribe(url => {
                  this.sentencia.archivoURL = url;
                  this.saveSentencia();
                });
              })
            ).subscribe();
          } else {
            this.saveSentencia();
          }
        }
      }, error => {
        console.error('Error checking for duplicate numero_proceso: ', error);
        this.alerta = true;
      });
  }
  
  saveSentencia(): void {
    this.firestore.collection('sentencias').add(this.sentencia)
      .then(() => {
        console.log('Sentencia added successfully!');
        this.alerta = true;
        this.fileLoaded = false; // Reset the fileLoaded flag after saving
        // Clear the form or navigate to another page
      })
      .catch(error => {
        console.error('Error adding sentencia: ', error);
        this.alerta = true;
      });
  }
  

  cerrarAlerta(): void {
    this.alerta = false;
  }
}

