import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router, ActivatedRoute } from '@angular/router';
import { switchMap, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

interface User {
  uid: string;
  role: string;
  [key: string]: any;
}

@Component({
  selector: 'app-evaluacion2',
  templateUrl: './evaluacion2.component.html',
  styleUrls: ['./evaluacion2.component.css']
})
export class Evaluacion2Component implements OnInit {
  evaluacion2Form: FormGroup;
  numero_proceso: string = '';
  asunto: string = '';
  estudiante: string = '';
  docente: string = '';
  saved = false;
  docenteSaved = false;
  selectedButton: string | null = null;
  isDocente = false;
  currentUser: Observable<User | null | undefined> = of(null);
  calificarState: { [key: string]: boolean } = {};
  calificaciones: { [key: string]: string } = {};
  buttonStates: { [key: string]: string } = {};

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private router: Router,
    private route: ActivatedRoute,
    private afAuth: AngularFireAuth
  ) {
    this.evaluacion2Form = this.fb.group({
      numero_proceso: [''],
      saved: [false],
      docenteSaved: [false],
      sentenceSubject: this.fb.array([]),
      multicomponent: this.fb.group({
        multiOption: this.fb.array([])
      }),
      other: this.fb.group({
        otherSubject: ['']
      }),
      sentenceSubject_calificacion: [''],
      sentenceOptions1: this.fb.array([]),
      sentenceOptions1_calificacion: [''],
      sentenceOptions2: this.fb.array([]),
      sentenceOptions2_calificacion: [''],
      sentenceOptions3: this.fb.array([]),
      sentenceOptions3_calificacion: [''],
      sentenceOptions4: this.fb.array([]),
      sentenceOptions4_calificacion: [''],
      sentenceOptions5: this.fb.array([]),
      sentenceOptions5_calificacion: [''],
      judgeAnalysis: [''],
      reasonsNormative: [''],
      reasonsNormative_calificacion: [''],
      reasonsNormative_retroalimentacion: ['']
    });
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.numero_proceso = params.get('numero_proceso') || '';
      this.asunto = params.get('asunto') || '';
      this.estudiante = params.get('estudiante') || '';
      this.docente = params.get('docente') || '';  
  
      this.evaluacion2Form.patchValue({
        numero_proceso: this.numero_proceso
      });
      
      this.loadUserData();
      this.checkDocenteSaved();
      setTimeout(() => {
        this.checkLockStatus();
      }, 1000);
    });
  }

checkLockStatus() {
    this.firestore.collection('locks').doc(this.numero_proceso).valueChanges().subscribe((data: any) => {
      if (data && data.locked) {
        this.disableFormControls(this.evaluacion2Form); // Disable the form if it's locked
      }
    });
  }

  lockForm() {
    this.firestore.collection('locks').doc(this.numero_proceso).set({ locked: true })
      .then(() => {
        this.disableFormControls(this.evaluacion2Form); // Disable the form controls
      })
      .catch(error => {
        console.error("Error locking form: ", error);
      });
  }  
  
  disableFormControls(formGroup: FormGroup | FormArray) {
  Object.keys(formGroup.controls).forEach(key => {
    const control = formGroup.get(key);
    if (control instanceof FormGroup || control instanceof FormArray) {
      this.disableFormControls(control); // Recursively disable nested controls
    } else {
      control?.disable();
    }
  });
}

  loadUserData() {
    this.afAuth.user.subscribe(user => {
      if (user) {
        this.currentUser = this.firestore.collection('users').doc<User>(user.uid).valueChanges();
        this.currentUser.subscribe(userData => {
          if (userData && userData.role === 'docente') {
            this.isDocente = true;
          }
          this.loadEvaluacion2Data();
        });
      } else {
        this.loadEvaluacion2Data();
      }
    });
  }

  submitForm() {
    this.evaluacion2Form.patchValue({ saved: true });
    
    const analisisData = this.evaluacion2Form.value;
    this.firestore.collection('evaluacion2').doc(this.numero_proceso).set(analisisData)
      .then(() => {
        if (this.isDocente) {
          this.docenteSaved = true;
        }
        this.saved = true;
        window.location.reload();
      })
      .catch(error => {
        console.error("Error saving document: ", error);
      });
  }
  
  loadEvaluacion2Data() {
    this.firestore.collection('evaluacion2').doc(this.numero_proceso)
      .valueChanges()
      .subscribe(data => {
        if (data) {
          const evaluation2Data = data as any; // Cast to the correct type
          this.evaluacion2Form.patchValue(evaluation2Data);
  
          // Manually update FormArray values
          this.setSentenceSubject(evaluation2Data.sentenceSubject);
          this.setMultiOption(evaluation2Data.multicomponent.multiOption);
  
          // Add more form arrays and nested groups as needed
          this.setFormArrayValues('sentenceOptions1', evaluation2Data.sentenceOptions1);
          this.setFormArrayValues('sentenceOptions2', evaluation2Data.sentenceOptions2);
          this.setFormArrayValues('sentenceOptions3', evaluation2Data.sentenceOptions3);
          this.setFormArrayValues('sentenceOptions4', evaluation2Data.sentenceOptions4);
          this.setFormArrayValues('sentenceOptions5', evaluation2Data.sentenceOptions5);
          this.setFormArrayValues('judgeAnalysis', evaluation2Data.judgeAnalysis);
          this.setFormArrayValues('reasonsNormative', evaluation2Data.reasonsNormative);
          this.checkLockStatus();
        }
      });
  }
  

  checkDocenteSaved() {
    this.firestore.collection('evaluacion2').doc(this.numero_proceso).valueChanges()
      .subscribe((data: any) => {
        if (data && data.saved) {
          this.docenteSaved = data.docenteSaved || false;
        }
      });
  }

  setFormArrayValues(controlName: string, values: any[]) {
    const formArray = this.evaluacion2Form.get(controlName) as FormArray;
    formArray.clear(); // Clear existing values
  
    if (values) {
      values.forEach(value => {
        formArray.push(this.fb.control(value));
      });
    }
  }
  

  setSentenceSubject(subjects: string[]) {
    const sentenceSubject = this.evaluacion2Form.get('sentenceSubject') as FormArray;
    subjects.forEach(subject => {
      sentenceSubject.push(this.fb.control(subject));
    });
  }

  setMultiOption(options: string[]) {
    const multiOption = this.evaluacion2Form.get('multicomponent.multiOption') as FormArray;
    options.forEach(option => {
      multiOption.push(this.fb.control(option));
    });
  }

  onCheckboxChange(event: any, controlName: string) {
    const formArray: FormArray = this.evaluacion2Form.get(controlName) as FormArray;

    if (event.target.checked) {
      formArray.push(this.fb.control(event.target.value));
    } else {
      let i: number = 0;
      formArray.controls.forEach((ctrl: any) => {
        if (ctrl.value == event.target.value) {
          formArray.removeAt(i);
          return;
        }
        i++;
      });
    }
  }

  toggleCalificar(section: string) {
    this.calificarState[section] = !this.calificarState[section];
  }

  isButtonSelected(section: string, controlName: string, value: string): boolean {
    this.calificaciones[section] = value;
    let controlPath = "";
    if (section === "motivationType") {
      controlPath = controlName
    } else {
      controlPath = `${section}.${controlName}`
      console.log(controlPath)
    }
  return this.buttonStates[controlPath] === value;
}
setCalificacion(controlPath: string, calificacion: string): any {
  console.log(controlPath, calificacion)
  const control = this.evaluacion2Form.get(controlPath);
  if (control) {
    control.setValue(calificacion);
    console.log(control)
    this.selectedButton = calificacion;
    return this.selectedButton
  }
}

  resetOtherCheckboxes(controlName: string) {
    Object.keys(this.evaluacion2Form.controls).forEach(key => {
      if (key !== controlName) {
        this.evaluacion2Form.get(key)?.setValue(null);
      }
    });
  }

  getCalificacionValue(controlName: string): string {
    const control = this.evaluacion2Form.get(controlName);
    if (control && control.value && control.value.calificacion) {
      return control.value.calificacion;
    }
    return 'No Calificado';
  }

  redirectToEvaluacion() {
    this.router.navigate(['/evaluacion'], {
      queryParams: {
        numero_proceso: this.numero_proceso,
        asunto: this.asunto,
        estudiante: this.estudiante,
        docente: this.docente
      }
    });
  }

  redirectToSiguiente() {
    // Implement the redirection to the next component/page if needed
  }
}
