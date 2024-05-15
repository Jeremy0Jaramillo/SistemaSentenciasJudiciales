import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { Observable, combineLatest, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

interface Sentencia {
  numero_proceso: string;
  asunto: string;
  nombre_estudiante: string;
  nombre_docente: string;
}

@Component({
  selector: 'app-principal-page',
  templateUrl: './principal-page.component.html',
  styleUrls: []
})
export class PrincipalPageComponent implements OnInit {
  user: any = null;
  sentencias$: Observable<Sentencia[]> = of([]);

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router
  ) {}

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

  loadUserData(uid: string) {
    this.firestore.collection('users').doc(uid).valueChanges().pipe(
      switchMap((userData: any) => {
        if (userData && userData.name) {
          const userName = userData.name;
          return this.loadSentencias(userName);
        } else {
          return of([]);
        }
      })
    ).subscribe((sentencias) => {
      this.sentencias$ = of(sentencias);
    });
  }

  loadSentencias(userName: string): Observable<Sentencia[]> {
    return combineLatest([
      this.firestore.collection<Sentencia>('sentencias', ref =>
        ref.where('nombre_estudiante', '==', userName)
      ).valueChanges(),
      this.firestore.collection<Sentencia>('sentencias', ref =>
        ref.where('nombre_docente', '==', userName)
      ).valueChanges()
    ]).pipe(
      map(([estudianteDocs, docenteDocs]) => {
        // Combine and remove duplicates
        const combinedDocs = [...estudianteDocs, ...docenteDocs];
        const uniqueDocs = Array.from(new Set(combinedDocs.map(doc => doc.numero_proceso)))
          .map(numero_proceso => combinedDocs.find(doc => doc.numero_proceso === numero_proceso)!);
        return uniqueDocs;
      })
    );
  }

  redirectToNuevaSentencia() {
    this.router.navigate(['/nueva-sentencia']);
  }
}
