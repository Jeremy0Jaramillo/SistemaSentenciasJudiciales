// form-page.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'sentencias-page',
  templateUrl: './sentencias-page.component.html',
  styleUrls: []
})
export class SentenciasPageComponent {

  constructor(private router: Router) { }

  submitForm() {
    // Handle form submission logic here
  }

}
