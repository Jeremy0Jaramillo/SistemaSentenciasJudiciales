import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule

import { FormPageComponent } from './form-page.component';

@NgModule({
  declarations: [FormPageComponent],
  imports: [
    CommonModule,
    FormsModule // Add FormsModule to the imports array
  ],
})
export class FormPageModule {}
