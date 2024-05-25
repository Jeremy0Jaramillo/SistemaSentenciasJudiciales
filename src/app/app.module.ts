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
<<<<<<< HEAD
import { FormPageComponent } from './pages/form-page/form-page.component';
import { CajaTextoComponent } from './components/header/caja-texto/caja-texto.component';
=======
import { AnalisisComponent } from './pages/analisis/analisis.component';
import { ReactiveFormsModule } from '@angular/forms';
import { EvaluacionComponent } from './pages/evaluacion/evaluacion.component';
import { Analisis2Component } from './pages/analisis2/analisis2.component';
>>>>>>> a87354a1a276d92c1b39214c4c4cf7257622d3e8

@NgModule({
  declarations: [
    AppComponent,
    LoginPageComponent,
    HeaderComponent,
    SentenciasPageComponent,
    PrincipalPageComponent,
<<<<<<< HEAD
    FormPageComponent,
    CajaTextoComponent
=======
    AnalisisComponent,
    Analisis2Component,
    EvaluacionComponent
>>>>>>> a87354a1a276d92c1b39214c4c4cf7257622d3e8
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebase), // Initialize AngularFireModule here
    AngularFireAuthModule,
    ReactiveFormsModule,
    FormsModule,
    AngularFirestoreModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
