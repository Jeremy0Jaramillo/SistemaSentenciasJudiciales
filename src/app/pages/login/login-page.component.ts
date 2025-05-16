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
        // console.error('Login error:', error);
        this.alerta = true;
      });
  }

  loginWithAzure() {
    const microsoftProvide = new firebase.auth.OAuthProvider("microsoft.com")
    microsoftProvide.setCustomParameters({tenant: "6eeb49aa-436d-43e6-becd-bbdf79e5077d"})
    microsoftProvide.addScope('user.read')
    microsoftProvide.addScope('openid')
    microsoftProvide.addScope('profile')
  
    this.afAuth.signInWithPopup(microsoftProvide)
    .then(async (response) => {
      const profile = response.additionalUserInfo?.profile as any;
      const azureUserId = response.user?.uid;
      const azureUserEmail = profile.mail || profile.userPrincipalName;
  
      // Buscar si existe un usuario con el mismo correo registrado por email/password
      const emailPasswordUsers = await this.firestore.collection('users', 
        ref => ref.where('email', '==', azureUserEmail)
      ).get().toPromise();
  
      let currentRole = 'estudiante'; // Rol por defecto
      let existingUserIds: string[] = [];
  
      // Verificar si hay documentos antes de iterar
      if (emailPasswordUsers && emailPasswordUsers.docs.length > 0) {
        for (let doc of emailPasswordUsers.docs) {
          const userData = doc.data() as UserData;
          
          // Si el rol es docente, mantenerlo
          if (userData.role === 'docente') {
            currentRole = 'docente';
          }

           if (userData.role === 'administrador') {
            currentRole = 'administrador';
          }
  
          // Recopilar IDs de usuarios a eliminar (excluyendo el usuario de Azure)
          if (doc.id !== azureUserId) {
            existingUserIds.push(doc.id);
          }
        }
  
        // Eliminar documentos de usuarios duplicados
        for (let userId of existingUserIds) {
          try {
            // Eliminar el documento de Firestore
            await this.firestore.collection('users').doc(userId).delete();
            
            // Opcional: Intentar eliminar el usuario de autenticación
            try {
              const userToDelete = await this.afAuth.fetchSignInMethodsForEmail(azureUserEmail);
              if (userToDelete.includes('password')) {
                // Nota: Esto requeriría re-autenticación del usuario actual
                const user = await this.afAuth.currentUser;
                await user?.delete();
              }
            } catch (authError) {
              console.error('Error eliminando usuario de autenticación:', authError);
            }
          } catch (firestoreError) {
            console.error('Error eliminando documento de Firestore:', firestoreError);
          }
        }
      }
  
      // Guardar datos de usuario de Azure
      const azureUserData = {
        name: profile.displayName || profile.name,
        email: azureUserEmail,
        role: currentRole
      };
  
      await this.firestore.collection('users').doc(azureUserId).set(azureUserData, { merge: true });
  
      // Navegación después del inicio de sesión
      this.router.navigate(['/principal']);
    })
    .catch(error => {
      console.error('Error en inicio de sesión con Azure:', error);
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
        // console.error('Registration error:', error);
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
 