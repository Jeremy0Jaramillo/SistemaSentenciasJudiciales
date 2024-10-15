import { Component, Input, forwardRef, OnInit } from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ValidationErrors } from '@angular/forms';

@Component({
  selector: 'app-caja-texto',
  templateUrl: './caja-texto.component.html',
  styleUrls: ['./caja-texto.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CajaTextoComponent),
      multi: true
    }
  ]
})
export class CajaTextoComponent implements ControlValueAccessor {
  @Input() titulo: string = '';
  @Input() disabled: boolean = false;
  @Input() value: string = '';  // Añade esta línea
  onChange = (value: any) => { };
  onTouched = () => { };

  formControl = new FormControl({ value: '', disabled: this.disabled });

  ngOnInit() {
    if (this.disabled) {
      this.formControl.disable();
    }
  }

  onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    this.onChange(this.value);
    this.onTouched();
  }

  writeValue(value: any): void {
    this.value = value;
    this.formControl.setValue(value); 
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    isDisabled ? this.formControl.disable() : this.formControl.enable();
  }

  validate(control: AbstractControl): ValidationErrors | null {
    return this.formControl.valid ? null : { invalidForm: { valid: false, message: "form is invalid" } };
  }
}
