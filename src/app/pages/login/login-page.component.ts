import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: []
})
export class LoginPageComponent {
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
      });
  }
}
