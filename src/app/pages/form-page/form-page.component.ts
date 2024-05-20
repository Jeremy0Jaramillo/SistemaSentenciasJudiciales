import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Component({
  selector: 'app-form-page',
  templateUrl: './form-page.component.html',
  styleUrls: ['./form-page.component.css']
})
export class FormPageComponent implements OnInit {
  activeTab: string = 'analysis'; // Default active tab is 'analysis'
  numero_proceso: string = '';
  asunto: string = '';
  estudiante: string = '';
  docente: string = '';
  analysisQuestion: string = '';
  analysisReasons: string = '';
  validQuestion: string = '';
  motivationType: string = '';
  lackFoundation: string = '';
  evaluationReasons: string = '';
  lackMotivation: string = '';

  constructor(
    private route: ActivatedRoute,
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.numero_proceso = params.get('numero_proceso') || '';
      this.asunto = params.get('asunto') || '';
      this.estudiante = params.get('estudiante') || '';
      this.docente = params.get('docente') || '';
      if (this.numero_proceso) {
        this.prefillForm();
      }
    });
  }

  prefillForm() {
    this.firestore.collection('analisis', ref => 
      ref.where('numero_proceso', '==', this.numero_proceso).where('pagina', '==', '1')
    ).valueChanges().subscribe((data: any[]) => {
      if (data.length > 0) {
        const analysisData = data[0];
        this.analysisQuestion = analysisData.analysisQuestion;
        this.analysisReasons = analysisData.analysisReasons;
        this.validQuestion = analysisData.validQuestion;
        // Disable fields if data exists
        // Add additional logic to disable fields if necessary
      }
    });
  }

  submitForm() {
    const analysisData = {
      numero_proceso: this.numero_proceso,
      pagina: '1',
      analysisQuestion: this.analysisQuestion,
      analysisReasons: this.analysisReasons,
      validQuestion: this.validQuestion
    };

    this.firestore.collection('analisis').add(analysisData)
      .then(() => {
        console.log('Analysis data submitted successfully');
      })
      .catch(error => {
        console.error('Error submitting analysis data: ', error);
      });

    const evaluationData = {
      numero_proceso: this.numero_proceso,
      pagina: '1',
      motivationType: this.motivationType,
      lackFoundation: this.lackFoundation,
      evaluationReasons: this.evaluationReasons,
      lackMotivation: this.lackMotivation
    };

    this.firestore.collection('evaluaciones').add(evaluationData)
      .then(() => {
        console.log('Evaluation data submitted successfully');
      })
      .catch(error => {
        console.error('Error submitting evaluation data: ', error);
      });
  }

  formsNormativas = [{ analysisQuestion: '', analysisReasons: '', validQuestion: '' }];
  formsFacticas = [{ factualQuestion: '', factualReasons: '', validQuestion: '' }];

  agregarMasNormativa() {
    this.formsNormativas.push({ analysisQuestion: '', analysisReasons: '', validQuestion: '' });
  }

  agregarMasFactica() {
    this.formsFacticas.push({ factualQuestion: '', factualReasons: '', validQuestion: '' });
  }

  submitAllForms() {
    // Lógica para manejar el envío de todas las formas
    console.log('Normativas:', this.formsNormativas);
    console.log('Fácticas:', this.formsFacticas);
    // Aquí puedes agregar la lógica para enviar los datos al backend o procesarlos como necesites
  }
}
