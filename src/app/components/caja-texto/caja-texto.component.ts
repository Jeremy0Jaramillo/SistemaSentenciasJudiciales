import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

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
  value: string = '';
  onChange = (value: any) => {};
  onTouched = () => {};

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    this.onChange(this.value);
    this.onTouched();
  }

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // Opcional: maneja el estado deshabilitado aquí
  }
}
