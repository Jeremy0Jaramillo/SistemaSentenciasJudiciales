import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AngularFireModule } from '@angular/fire/compat';
import { environment } from '../../src/environments/environment'; // Import environment variable
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { LoginPageComponent } from '../app/pages/login/login-page.component';
import { FormsModule } from '@angular/forms';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { HeaderComponent } from '../app/components/header/header.component';
import { SentenciasPageComponent } from '../app/pages/sentencias/sentencias-page.component.';
import { PrincipalPageComponent } from '../app/pages/principal/principal-page.component';
import { AnalisisComponent } from './pages/analisis/analisis.component';
import { ReactiveFormsModule } from '@angular/forms';
import { EvaluacionComponent } from './pages/evaluacion/evaluacion.component';
import { Analisis2Component } from './pages/analisis2/analisis2.component';
import { RouterModule } from '@angular/router';
import { CajaTextoComponent } from './components/caja-texto/caja-texto.component';
import { Evaluacion2Component } from './pages/evaluacion2/evaluacion2.component';
import { msalConfig } from '../app/auth-config';
import { MsalModule, MsalService, MsalGuard, MsalInterceptor, MSAL_INSTANCE, MsalBroadcastService, MsalRedirectComponent, MsalGuardConfiguration, MsalInterceptorConfiguration } from '@azure/msal-angular';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { IPublicClientApplication, InteractionType, PublicClientApplication, BrowserCacheLocation, LogLevel  } from '@azure/msal-browser';
import { AuthService } from './services/auth.service';


const isIE = window.navigator.userAgent.indexOf('MSIE ') > -1 || window.navigator.userAgent.indexOf('Trident/') > -1;

const msalGuardConfig: MsalGuardConfiguration = {
  interactionType: InteractionType.Popup, // O InteractionType.Redirect
  authRequest: {
    scopes: ['user.read'] // Scopes básicos
  }
};

const msalInterceptorConfig: MsalInterceptorConfiguration = {
  interactionType: InteractionType.Popup,
  protectedResourceMap: new Map([
    ['https://graph.microsoft.com/v1.0/me', ['user.read']]
  ])
};

export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: 'aaad0f75-155d-4ad2-9463-03586ed64f25', 
      authority: 'https://login.microsoftonline.com/6eeb49aa-436d-43e6-becd-bbdf79e5077d',
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
      navigateToLoginRequestUrl: true
    },
    cache: {
      cacheLocation: BrowserCacheLocation.LocalStorage,
      storeAuthStateInCookie: isIE
    },
    system: {
      loggerOptions: {
        loggerCallback: (level, message, containsPii) => {
          if (containsPii) {
            return;
          }
          switch (level) {
            case LogLevel.Error:
              console.error(message);
              return;
            case LogLevel.Info:
              console.info(message);
              return;
            case LogLevel.Verbose:
              console.debug(message);
              return;
            case LogLevel.Warning:
              console.warn(message);
              return;
          }
        }
      }
    }
  });
}


@NgModule({
  declarations: [
    AppComponent,
    LoginPageComponent,
    HeaderComponent,
    SentenciasPageComponent,
    PrincipalPageComponent,
    AnalisisComponent,
    Analisis2Component,
    EvaluacionComponent,
    CajaTextoComponent,
    Evaluacion2Component
  ],
  imports: [
    MsalModule.forRoot(new PublicClientApplication({
      auth: {
        clientId: 'aaad0f75-155d-4ad2-9463-03586ed64f25',
        authority: `https://login.microsoftonline.com/6eeb49aa-436d-43e6-becd-bbdf79e5077d`,
        redirectUri: 'http://localhost:4200' // Tu URL de redireccionamiento
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: true
    }
  }), msalGuardConfig, msalInterceptorConfig),
    BrowserModule,
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebase), // Initialize AngularFireModule here
    AngularFireAuthModule,
    ReactiveFormsModule,
    FormsModule,
    AngularFirestoreModule,
    RouterModule,
    MsalModule
  ],
  providers: [
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    },
    MsalService,
    MsalGuard,
    AuthService
  ],
  bootstrap: [AppComponent, MsalRedirectComponent]
})
export class AppModule { }