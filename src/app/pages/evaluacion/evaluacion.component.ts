import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-evaluacion',
  templateUrl: './evaluacion.component.html',
  styleUrls: ['./evaluacion.component.css']
})
export class EvaluacionComponent implements OnInit {
  evaluacionForm: FormGroup;
  numero_proceso: string = '';
  asunto: string = '';
  estudiante: string = '';
  docente: string = '';
  saved = false;

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.evaluacionForm = this.fb.group({
      numero_proceso: ['', Validators.required],
      motivationType: ['', Validators.required],
      inexistencia: this.fb.group({
        faltaFundamentacionNormativa: ['', Validators.required],
        motivoFundamentacionNormativa: ['', Validators.required],
        faltaFundamentacionFactica: ['', Validators.required],
        motivoFundamentacionFactica: ['', Validators.required],
        deficitMotivacion: ['', Validators.required],
        motivoDeficitMotivacion: ['', Validators.required]
      }),
      insuficiencia: this.fb.group({
        faltaFundamentacionNormativa: ['', Validators.required],
        motivoFundamentacionNormativa: ['', Validators.required],
        faltaFundamentacionFactica: ['', Validators.required],
        motivoFundamentacionFactica: ['', Validators.required],
        deficitMotivacion: ['', Validators.required],
        motivoDeficitMotivacion: ['', Validators.required]
      }),
      apariencia: this.fb.group({
        motivoApariencia: ['', Validators.required],
        vicioMotivacional: ['', Validators.required],
        incoherenciaJuridica: this.fb.group({
          incoherenciaLogicaNormativa: ['', Validators.required],
          motivoLogicaNormativa: ['', Validators.required],
          incoherenciaDecisionalNormativa: ['', Validators.required],
          motivoDecisionalNormativa: ['', Validators.required],
          incoherenciaLogicaFactica: ['', Validators.required],
          motivoLogicaFactica: ['', Validators.required],
          incoherenciaDecisionalFactica: ['', Validators.required],
          motivoDecisionalFactica: ['', Validators.required],
          deficitMotivacion: ['', Validators.required],
          motivoDeficitMotivacion: ['', Validators.required]
        })
      })
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.numero_proceso = params['numero_proceso'] || '';
      this.asunto = params['asunto'] || '';
      this.estudiante = params['estudiante'] || '';
      this.docente = params['docente'] || '';

      this.evaluacionForm.patchValue({
        numero_proceso: this.numero_proceso
      });

      this.loadEvaluacionData();
    });
  }

  loadEvaluacionData() {
    this.firestore.collection('evaluacion', ref => ref.where('numero_proceso', '==', this.numero_proceso))
      .valueChanges()
      .subscribe(data => {
        if (data && data.length) {
          const evaluationData = data[0] as evaluacionData; // Cast to the correct type
          this.evaluacionForm.patchValue(evaluationData);
          this.saved = true;
        }
      });
  }

  submitForm() {
    const evaluacionData = this.evaluacionForm.value;
    this.firestore.collection('evaluacion').doc(this.numero_proceso).set(evaluacionData)
      .then(() => {
        this.saved = true;
      })
      .catch(error => {
        console.error("Error saving document: ", error);
      });
  }

  redirectToAnalisis2() {
    this.router.navigate(['/analisis2'], {
      queryParams: {
        numero_proceso: this.numero_proceso,
        asunto: this.asunto,
        estudiante: this.estudiante,
        docente: this.docente
      }
    });
  }
}


interface evaluacionData {
  numero_proceso: string;
  motivationType: string;
  inexistencia?: {
    faltaFundamentacionNormativa: string;
    motivoFundamentacionNormativa: string;
    faltaFundamentacionFactica: string;
    motivoFundamentacionFactica: string;
    deficitMotivacion: string;
    motivoDeficitMotivacion: string;
  };
  insuficiencia?: {
    faltaFundamentacionNormativa: string;
    motivoFundamentacionNormativa: string;
    faltaFundamentacionFactica: string;
    motivoFundamentacionFactica: string;
    deficitMotivacion: string;
    motivoDeficitMotivacion: string;
  };
  apariencia?: {
    motivoApariencia: string;
    vicioMotivacional: string;
    incoherenciaJuridica: {
      incoherenciaLogicaNormativa: string;
      motivoLogicaNormativa: string;
      incoherenciaDecisionalNormativa: string;
      motivoDecisionalNormativa: string;
      incoherenciaLogicaFactica: string;
      motivoLogicaFactica: string;
      incoherenciaDecisionalFactica: string;
      motivoDecisionalFactica: string;
      deficitMotivacion: string;
      motivoDeficitMotivacion: string;
    };
  };
}