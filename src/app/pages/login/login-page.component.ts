import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css']
})
export class LoginPageComponent implements OnInit, OnDestroy {
  alerta: boolean = false;
  isLogin = true;
  alertaMessage = '';
  private authStateSubscription: Subscription | undefined;

  constructor(
    private afAuth: AngularFireAuth,
    private router: Router,
    private firestore: AngularFirestore
  ) {}

  ngOnInit() {
    this.authStateSubscription = this.afAuth.authState.subscribe(user => {
      if (user) {
        // User is logged in
        sessionStorage.setItem('sessionToken', 'active');
        this.router.navigate(['/principal']);
      } else {
        // User is logged out
        sessionStorage.removeItem('sessionToken');
      }
    });

    // Check for existing session on page load
    if (sessionStorage.getItem('sessionToken') === 'active') {
      this.router.navigate(['/principal']);
    }
  }

  ngOnDestroy() {
    if (this.authStateSubscription) {
      this.authStateSubscription.unsubscribe();
    }
  }

  login(email: string, password: string) {
    this.afAuth.signInWithEmailAndPassword(email, password)
      .then(userCredential => {
        // Handle successful login
        sessionStorage.setItem('sessionToken', 'active');
      })
      .catch(error => {
        // Handle login error
        console.error('Login error:', error);
        this.alerta = true;
      });
  }

  register(email: string, password: string) {
    this.afAuth.createUserWithEmailAndPassword(email, password)
      .then(userCredential => {
        if (userCredential.user) {
          // Registration successful, write user data to Firestore
          this.firestore.collection('users').doc(userCredential.user.uid).set({
            email: userCredential.user.email
            // Add additional user data as needed
          });
          sessionStorage.setItem('sessionToken', 'active');
        }
      })
      .catch(error => {
        // Handle registration error
        console.error('Registration error:', error);
      });
  }

  toggleForm(event: Event) {
    event.preventDefault();
    this.isLogin = !this.isLogin;
    this.alerta = false; // Resetea la alerta al cambiar de formulario
  }
}