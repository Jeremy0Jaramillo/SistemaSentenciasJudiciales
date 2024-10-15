import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  currentRoute: string = '';
  private routerSubscription: Subscription;
  private authStateSubscription: Subscription | undefined;

  constructor(
    private router: Router,
    private afAuth: AngularFireAuth
  ) {
    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentRoute = event.url;
      }
    });
  }

  ngOnInit() {
    this.authStateSubscription = this.afAuth.authState.subscribe(user => {
      if (user) {
        // Usuario ha iniciado sesión
        sessionStorage.setItem('sessionToken', 'active');
      } else {
        // Usuario ha cerrado sesión
        sessionStorage.removeItem('sessionToken');
      }
    });

    // Verificar si hay una sesión activa al cargar la página
    if (!sessionStorage.getItem('sessionToken')) {
      this.logout();
    }
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.authStateSubscription) {
      this.authStateSubscription.unsubscribe();
    }
  }

  private logout() {
    this.afAuth.signOut().then(() => {
      console.log('Sesión cerrada');
      this.router.navigate(['/login']);
    }).catch(error => {
      console.error('Error al cerrar sesión:', error);
    });
  }

  isLoginPage(): boolean {
    return this.currentRoute === '/login';
  }
}