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
    CajaTextoComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebase), // Initialize AngularFireModule here
    AngularFireAuthModule,
    ReactiveFormsModule,
    FormsModule,
    AngularFirestoreModule,
    RouterModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }