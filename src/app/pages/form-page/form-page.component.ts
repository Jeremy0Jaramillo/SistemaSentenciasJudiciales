import { Component } from '@angular/core';


@Component({
  selector: 'app-form-page',
  templateUrl: './form-page.component.html',
  styleUrls: ['./form-page.component.css']
})
export class FormPageComponent {
  activeTab: string = 'analysis'; // Default active tab is 'analysis'
  analysisQuestion: string = '';
  analysisReasons: string = '';
  validQuestion: string = '';

  submitForm() {
    // Handle form submission logic
    console.log('Analysis Question:', this.analysisQuestion);
    console.log('Analysis Reasons:', this.analysisReasons);
    console.log('Valid Question:', this.validQuestion);
  }
}

