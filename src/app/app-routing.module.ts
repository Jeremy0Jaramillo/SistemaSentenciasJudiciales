import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login/login-page.component';
import { PrincipalPageComponent } from './pages/principal/principal-page.component';
import { SentenciasPageComponent } from './pages/sentencias/sentencias-page.component.';
import { AnalisisComponent } from './pages/analisis/analisis.component';
import { Analisis2Component } from './pages/analisis2/analisis2.component';
import { EvaluacionComponent } from './pages/evaluacion/evaluacion.component';
import { Evaluacion2Component } from './pages/evaluacion2/evaluacion2.component';
import { EditarSentenciaComponent } from './pages/editar-sentencia/editar-sentencia.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginPageComponent },
  { path: 'principal', component: PrincipalPageComponent },
  { path: 'nueva-sentencia', component: SentenciasPageComponent },
  { path: 'analisis', component: AnalisisComponent },
  { path: 'analisis2', component: Analisis2Component },
  { path: 'evaluacion', component: EvaluacionComponent },
  { path: 'evaluacion2', component: Evaluacion2Component },
  { path: 'editar-sentencia', component: EditarSentenciaComponent }
  // Define other routes here
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

