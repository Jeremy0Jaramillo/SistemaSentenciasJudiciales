import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login/login-page.component';
import { PrincipalPageComponent } from './pages/principal/principal-page.component';
import { SentenciasPageComponent } from './pages/sentencias/sentencias-page.component.';
import { FormPageComponent } from './pages/form-page/form-page.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginPageComponent },
  { path: 'principal', component: PrincipalPageComponent },
  { path: 'nueva-sentencia', component: SentenciasPageComponent },
  { path: 'form-page', component: FormPageComponent }
  // Define other routes here
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

