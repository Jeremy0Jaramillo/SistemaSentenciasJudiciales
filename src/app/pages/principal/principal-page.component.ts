// card-list.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'principal-page-list',
  templateUrl: './principal-page.component.html',
  styleUrls: []
})
export class PrincipalPageComponent {

  constructor(private router: Router) { }

  redirectToThirdPage() {
    this.router.navigate(['/nueva-sentencia']);
  }

}
