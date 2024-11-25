// auth.service.ts
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult } from '@azure/msal-browser';
import { Observable, from, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  router: any;
  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private msalService: MsalService
  ) {}

  login() {
    const loginRequest = {
      scopes: [
        "User.Read",      
        "openid",         
        "profile"       
      ]
    };
  
    this.msalService.loginPopup(loginRequest)
      .subscribe({
        next: (response) => {
          console.log('Login successful', response);
          this.router.navigate(['/principal']);
        },
        error: (error) => {
          console.error('Login failed', error);

        }
      });
  }

  async loginWithFirebase(email: string, password: string): Promise<any> {
    try {
      const result = await this.afAuth.signInWithEmailAndPassword(email, password);
      if (result.user) {
        await this.setUserSession('firebase', result.user.uid);
        return result;
      }
    } catch (error) {
      throw error;
    }
  }

  async registerWithFirebase(email: string, password: string): Promise<any> {
    try {
      const result = await this.afAuth.createUserWithEmailAndPassword(email, password);
      if (result.user) {
        await this.firestore.collection('users').doc(result.user.uid).set({
          email: result.user.email,
          authProvider: 'firebase',
          createdAt: new Date()
        });
        await this.setUserSession('firebase', result.user.uid);
        return result;
      }
    } catch (error) {
      throw error;
    }
  }

  // Azure Authentication Methods
  loginWithAzure(): Observable<AuthenticationResult> {
    const loginRequest = {
      scopes: ['user.read']
    };

    return from(this.msalService.loginPopup(loginRequest)).pipe(
      tap((response: AuthenticationResult) => {
        this.setUserSession('azure', response.uniqueId);
      }),
      catchError(error => {
        console.error('Azure login error:', error);
        throw error;
      })
    );
  }

  // Common Authentication Methods
  private async setUserSession(provider: 'firebase' | 'azure', userId: string): Promise<void> {
    sessionStorage.setItem('sessionToken', 'active');
    sessionStorage.setItem('authProvider', provider);
    sessionStorage.setItem('userId', userId);
  }

  logout(): Promise<void> {
    const provider = sessionStorage.getItem('authProvider');
    
    sessionStorage.clear();

    if (provider === 'azure') {
        return this.msalService.logout().toPromise();
      } else {
        return this.afAuth.signOut();
      }
    }

  isAuthenticated(): boolean {
    return sessionStorage.getItem('sessionToken') === 'active';
  }

  getCurrentUser(): Observable<any> {
    const provider = sessionStorage.getItem('authProvider');
    const userId = sessionStorage.getItem('userId');

    if (!provider || !userId) {
      return of(null);
    }

    if (provider === 'azure') {
        return of(this.msalService.instance.getActiveAccount()).pipe(
          map(account => account || null)
        );
      } else {
        return this.afAuth.authState;
      }
  }
}