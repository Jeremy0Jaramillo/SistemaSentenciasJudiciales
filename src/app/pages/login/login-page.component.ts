import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css']
})
export class LoginPageComponent {

  alerta: boolean = false;
  isLogin = true;
  alertaMessage = '';


  constructor(
    private afAuth: AngularFireAuth,
    private router: Router,
    private firestore: AngularFirestore
  ) {
    this.afAuth.authState.subscribe(user => {
      if (user) {
        // User is logged in, navigate to home page
        this.router.navigate(['/principal']);
      } else {
        // User is logged out
      }
    });
  }

  login(email: string, password: string) {
    this.afAuth.signInWithEmailAndPassword(email, password)
      .then(userCredential => {
        // Handle successful login
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
