import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { catchError, first, Observable, Subscription, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AuthenticationResult } from '@azure/msal-browser';
import { MsalService } from '@azure/msal-angular';
import firebase from 'firebase/compat/app';

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
    private authService: AuthService,
    private router: Router,
    private firestore: AngularFirestore,
    private msalService: MsalService 
  ) { }

  onLogin() {
    this.authService.login();
  }

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
      if (user && this.authService.isAuthenticated()) {
        this.router.navigate(['/principal']);
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
  // async login(email: string, password: string) {
  //   try {
  //     await this.authService.loginWithFirebase(email, password);
  //     this.router.navigate(['/principal']);
  //   } catch (error: any) {
  //     console.error('Login error:', error);
  //     this.alerta = true;
  //     // this.alertaMessage = this.getErrorMessage(error.code);
  //   }
  // }

  

  loginWithAzure() {
    const microsoftProvide = new firebase.auth.OAuthProvider("microsoft.com")
    microsoftProvide.setCustomParameters({tenant: "6eeb49aa-436d-43e6-becd-bbdf79e5077d"})
    microsoftProvide.addScope('user.read')
    microsoftProvide.addScope('openid')
    microsoftProvide.addScope('profile')

    this.afAuth.signInWithPopup(microsoftProvide)
  .then(response => {
    const profile = response.additionalUserInfo?.profile as any;
    const userId = response.user?.uid;

    // Primero, consulta el rol actual en Firestore
    this.firestore.collection('users').doc(userId).get().pipe(
      first() // Toma solo el primer valor del observable
    ).subscribe(doc => {
      let currentRole = 'estudiante'; // Valor por defecto
    
      if (doc.exists) {
        // Usa aserción de tipo para indicar a TypeScript la estructura
        const userData = doc.data() as UserData;
        currentRole = userData.role || 'estudiante';
      }
      const userData = {
        name: profile.displayName || profile.name,
        email: profile.mail || profile.userPrincipalName,
        role: currentRole // Usa el rol existente
      };

      this.firestore.collection('users').doc(userId).set(userData, { merge: true })
        .then(() => {
          console.log('User data saved successfully');
        })
        .catch(error => {
          console.error('Error saving user data', error);
        });
    });
  });

  }


  register(name: string, email: string, password: string) {
    this.afAuth.createUserWithEmailAndPassword(email, password)
      .then(userCredential => {
        if (userCredential.user) {
          this.firestore.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: userCredential.user.email,
            role: 'estudiante'
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

interface UserData {
  name: string;
  email: string;
  role: string;
} 
  /* next: (response: AuthenticationResult) => {
          const account = this.msalService.instance.getActiveAccount();
          if (account) {
            // Guardar usuario en Firestore
            this.firestore.collection('users').doc(response.uniqueId).set({
              name: account.name,
              email: account.username,
              role: 'estudiante',
              authProvider: 'azure',
              createdAt: new Date()
            }).then(() => {
              // Establecer sesión
              this.authService.setUserSession('azure', response.uniqueId);
              this.router.navigate(['/principal']);
            }).catch(error => {
              console.error('Error guardando usuario:', error);
              this.alerta = true;
              this.alertaMessage = 'Error al guardar información de usuario';
            });
          } else {
            console.error('No se pudo obtener la cuenta activa');
            this.alerta = true;
            this.alertaMessage = 'No se pudo obtener la información de la cuenta';
          }
        },
        error: (error) => {
          console.error('Azure login error:', error);
          this.alerta = true;
          this.alertaMessage = 'Error al iniciar sesión con Azure';
        } */

  