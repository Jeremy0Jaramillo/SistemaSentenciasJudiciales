import { Component, type OnInit } from "@angular/core"
import { FormBuilder, FormGroup, FormArray, Validators } from "@angular/forms"
import { AngularFirestore } from "@angular/fire/compat/firestore"
import { Router, ActivatedRoute } from "@angular/router"
import { AngularFireAuth } from "@angular/fire/compat/auth"
import { type Observable, of } from "rxjs"

interface User {
  uid: string
  role: string
  [key: string]: any
}

@Component({
  selector: "app-analisis",
  templateUrl: "./analisis.component.html",
  styleUrls: ["./analisis.component.css"],
})
export class AnalisisComponent implements OnInit {
  analisisForm: FormGroup
  numero_proceso = ""
  asunto = ""
  estudiante = ""
  docente = ""
  saved = false
  dataLoaded = false
  isDocente = false
  currentUser: Observable<User | null | undefined> = of(null)
  selectedButtons: { [key: string]: string } = {}
  cargando = false
  mensajeExito = ""
  mostrarMensaje = false
  mensajeError = ""
  mostrarRetroalimentacion: boolean[] = []
  private isSubmitting = false
  private isLoadingData = false // Nueva bandera para controlar la carga de datos
  problem_question: any
  problem_decision: any
  calificarState: { [key: string]: boolean } = {}
  mostrarRetroalimentacionPregunta = false
  mostrarRetroalimentacionDecision = false
  private hasUnsavedChanges = false // Nueva propiedad para rastrear cambios no guardados

  constructor(
    private fb: FormBuilder,
    private firestore: AngularFirestore,
    private router: Router,
    private route: ActivatedRoute,
    private afAuth: AngularFireAuth,
  ) {
    this.analisisForm = this.fb.group({
      numero_proceso: ["", Validators.required],
      normativas: this.fb.array(
        [
          this.fb.group({
            pregunta: ["", Validators.required],
            respuesta: ["", Validators.required],
            calificacion: ["No Calificado"],
            retroalimentacion: [""],
            showCalificar: [false],
          }),
        ],
        Validators.required,
      ),
      facticas: this.fb.array(
        [
          this.fb.group({
            pregunta: ["", Validators.required],
            respuesta: ["", Validators.required],
            calificacion: ["No Calificado"],
            retroalimentacion: [""],
            showCalificar: [false],
          }),
        ],
        Validators.required,
      ),
      saved: [false],
      docenteSaved: [false],
      problem_question: this.fb.group({
        pregunta: ["", Validators.required],
        calificacion: ["No Calificado"],
        retroalimentacion: [""],
        showCalificar: [false],
      }),
      problem_decision: this.fb.group({
        decision: ["", Validators.required],
        calificacion: ["No Calificado"],
        retroalimentacion: [""],
        showCalificar: [false],
      }),
    })

    this.mostrarRetroalimentacion = []
  }

  toggleRetroalimentacion(event: Event, index: number) {
    event.preventDefault()
    event.stopPropagation()
    this.mostrarRetroalimentacion[index] = !this.mostrarRetroalimentacion[index]
  }

  toggleRetroalimentacion2(event: Event) {
    event.preventDefault()
    event.stopPropagation()
    const showCalificarControl = this.analisisForm.get("problem_question.showCalificar")

    if (showCalificarControl) {
      const currentValue = showCalificarControl.value
      showCalificarControl.setValue(!currentValue)
    }
  }

  ngOnInit() {
    this.calificarState = {
      problem_question: false,
      problem_decision: false,
    }

    // MEJORADO: Mejor control de cambios del formulario
    this.analisisForm.valueChanges.subscribe(() => {
      if (this.dataLoaded && !this.isSubmitting && !this.isLoadingData) {
        this.hasUnsavedChanges = true
        this.saved = false
        this.analisisForm.patchValue({ saved: false }, { emitEvent: false })
      }
    })

    this.route.queryParamMap.subscribe((params) => {
      this.numero_proceso = params.get("numero_proceso") || ""
      this.asunto = params.get("asunto") || ""
      this.estudiante = params.get("estudiante") || ""
      this.docente = params.get("docente") || ""
      this.analisisForm.patchValue({
        numero_proceso: this.numero_proceso,
      })
      this.inicializarMostrarRetroalimentacion()
      this.loadUserData()
      setTimeout(() => {
        this.checkLockStatus()
      }, 1000)
    })
  }

  inicializarMostrarRetroalimentacion() {
    const normativasArray = this.analisisForm.get("normativas") as FormArray
    this.mostrarRetroalimentacion = new Array(normativasArray.length).fill(false)
  }

  checkLockStatus() {
    this.firestore
      .collection("locks")
      .doc(this.numero_proceso)
      .valueChanges()
      .subscribe((data: any) => {
        if (data && data.locked) {
          this.disableFormControls(this.analisisForm)
        } else {
          this.enableFormControls(this.analisisForm)
        }
      })
  }

  lockForm() {
    this.firestore
      .collection("locks")
      .doc(this.numero_proceso)
      .set({ locked: true })
      .then(() => {
        this.disableFormControls(this.analisisForm)
        this.mostrarMensajeExito("Formulario bloqueado con éxito.")
      })
      .catch((error) => {
        console.error("Error al bloquear el formulario: ", error)
        this.mostrarMensajeError("Error al bloquear el formulario. Por favor, intente de nuevo.")
      })
  }

  disableFormControls(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key)
      control?.disable()
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.disableFormControls(control)
      }
    })
  }

  enableFormControls(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key)
      control?.enable()
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.enableFormControls(control)
      }
    })
  }

  loadUserData() {
    this.afAuth.user.subscribe((user) => {
      if (user) {
        this.currentUser = this.firestore.collection("users").doc<User>(user.uid).valueChanges()
        this.currentUser.subscribe((userData) => {
          if (userData && userData.role === "docente") {
            this.isDocente = true
          } else {
            this.isDocente = false
          }
        })
        this.loadAnalisisData()
      } else {
        this.mostrarMensajeError("No hay usuario autenticado. Algunas funcionalidades podrían no estar disponibles.")
      }
    })
  }

  onFormChange() {
    if (!this.isSubmitting && this.dataLoaded && !this.isLoadingData) {
      this.hasUnsavedChanges = true
      this.saved = false
      this.analisisForm.patchValue({ saved: false }, { emitEvent: false })
    }
  }

  get normativas() {
    return this.analisisForm.get("normativas") as FormArray
  }

  get facticas() {
    return this.analisisForm.get("facticas") as FormArray
  }

  addNormativa() {
    this.normativas.push(
      this.fb.group({
        pregunta: ["", Validators.required],
        respuesta: ["", Validators.required],
        calificacion: ["No Calificado"],
        retroalimentacion: [""],
        showCalificar: [false],
      }),
    )
    this.mostrarRetroalimentacion.push(false)
    this.onFormChange()
  }

  removeNormativa(index: number) {
    this.normativas.removeAt(index)
    this.mostrarRetroalimentacion.splice(index, 1)
    this.onFormChange()
  }

  addFactica() {
    this.facticas.push(
      this.fb.group({
        pregunta: ["", Validators.required],
        respuesta: ["", Validators.required],
        calificacion: ["No Calificado"],
        retroalimentacion: [""],
        showCalificar: [false],
      }),
    )
    this.onFormChange()
    this.mostrarRetroalimentacion.push(false)
  }

  removeFactica(index: number) {
    this.facticas.removeAt(index)
    this.mostrarRetroalimentacion.splice(index, 1)
    this.onFormChange()
  }

  toggleRetroalimentacionPregunta(event: Event) {
    event.preventDefault()
    event.stopPropagation()
    this.mostrarRetroalimentacionPregunta = !this.mostrarRetroalimentacionPregunta
  }

  toggleRetroalimentacionDecision(event: Event) {
    event.preventDefault()
    event.stopPropagation()
    this.mostrarRetroalimentacionDecision = !this.mostrarRetroalimentacionDecision
  }

  getRetroalimentacionValue(controlPath: string): string {
    const control = this.analisisForm.get(controlPath)
    return control && control.value ? control.value : ""
  }

  hasRetroalimentacion(controlPath: string): boolean {
    const retroalimentacion = this.getRetroalimentacionValue(controlPath)
    return retroalimentacion !== "" && retroalimentacion !== null && retroalimentacion !== undefined
  }

  loadAnalisisData() {
    this.isLoadingData = true // NUEVO: Marcar que estamos cargando datos

    this.firestore
      .collection("analisis")
      .doc(this.numero_proceso)
      .valueChanges()
      .subscribe(
        (analisis: any) => {
          if (analisis) {
            // CORREGIDO: Actualizar el estado saved local inmediatamente
            this.saved = analisis.saved || false

            this.analisisForm.patchValue(
              {
                numero_proceso: analisis.numero_proceso,
                saved: analisis.saved || false,
                docenteSaved: analisis.docenteSaved || false,
              },
              { emitEvent: false },
            )

            // Limpiar arrays existentes
            while (this.normativas.length !== 0) {
              this.normativas.removeAt(0)
            }
            while (this.facticas.length !== 0) {
              this.facticas.removeAt(0)
            }

            // Cargar problema
            if (analisis.problem_question) {
              const problemQuestion = {
                pregunta: analisis.problem_question.pregunta || "",
                calificacion: analisis.problem_question.calificacion || "No Calificado",
                retroalimentacion: analisis.problem_question.retroalimentacion || "",
                showCalificar: analisis.problem_question.showCalificar || false,
              }
              this.analisisForm.get("problem_question")?.patchValue(problemQuestion, { emitEvent: false })
            } else {
              this.analisisForm.get("problem_question")?.patchValue(
                {
                  pregunta: "",
                  calificacion: "No Calificado",
                  retroalimentacion: "",
                  showCalificar: false,
                },
                { emitEvent: false },
              )
            }

            // Cargar decision
            if (analisis.problem_decision) {
              const problemDecision = {
                decision: analisis.problem_decision.decision || "",
                calificacion: analisis.problem_decision.calificacion || "No Calificado",
                retroalimentacion: analisis.problem_decision.retroalimentacion || "",
                showCalificar: analisis.problem_decision.showCalificar || false,
              }
              this.analisisForm.get("problem_decision")?.patchValue(problemDecision, { emitEvent: false })
            } else {
              this.analisisForm.get("problem_decision")?.patchValue(
                {
                  decision: "",
                  calificacion: "No Calificado",
                  retroalimentacion: "",
                  showCalificar: false,
                },
                { emitEvent: false },
              )
            }

            // Cargar preguntas normativas
            if (analisis.normativas && Array.isArray(analisis.normativas)) {
              analisis.normativas.forEach((normativa: any) => {
                this.normativas.push(
                  this.fb.group({
                    pregunta: [normativa.pregunta || ""],
                    respuesta: [normativa.respuesta || ""],
                    calificacion: [normativa.calificacion || "No Calificado"],
                    retroalimentacion: [normativa.retroalimentacion || ""],
                    showCalificar: [normativa.showCalificar || false],
                  }),
                )
              })
            } else {
              if (this.normativas.length === 0) {
                this.addNormativa()
              }
            }

            // Cargar preguntas fácticas
            if (analisis.facticas && Array.isArray(analisis.facticas)) {
              analisis.facticas.forEach((factica: any) => {
                this.facticas.push(
                  this.fb.group({
                    pregunta: [factica.pregunta || ""],
                    respuesta: [factica.respuesta || ""],
                    calificacion: [factica.calificacion || "No Calificado"],
                    retroalimentacion: [factica.retroalimentacion || ""],
                    showCalificar: [factica.showCalificar || false],
                  }),
                )
              })
            } else {
              if (this.facticas.length === 0) {
                this.addFactica()
              }
            }

            this.inicializarMostrarRetroalimentacion()
            this.dataLoaded = true
            this.isLoadingData = false // NUEVO: Terminar la carga de datos
            this.hasUnsavedChanges = false // NUEVO: Resetear cambios no guardados al cargar datos
            this.checkLockStatus()
          } else {
            // Si no hay datos, inicializar
            if (this.normativas.length === 0) {
              this.addNormativa()
            }
            if (this.facticas.length === 0) {
              this.addFactica()
            }

            this.analisisForm.get("problem_decision")?.patchValue(
              {
                decision: "",
                calificacion: "No Calificado",
                retroalimentacion: "",
                showCalificar: false,
              },
              { emitEvent: false },
            )

            this.analisisForm.get("problem_question")?.patchValue(
              {
                pregunta: "",
                calificacion: "No Calificado",
                retroalimentacion: "",
                showCalificar: false,
              },
              { emitEvent: false },
            )

            this.dataLoaded = true
            this.isLoadingData = false // NUEVO: Terminar la carga de datos
            this.saved = false // NUEVO: Asegurar que saved sea false para datos nuevos
            this.hasUnsavedChanges = false // NUEVO: Resetear para datos nuevos
            this.mostrarRetroalimentacionPregunta = false
            this.mostrarRetroalimentacionDecision = false
          }
        },
        (error) => {
          console.error("Error al cargar los datos:", error)
          this.mostrarMensajeError("Error al cargar los datos. Por favor, intente de nuevo.")
          this.dataLoaded = true
          this.isLoadingData = false // NUEVO: Terminar la carga de datos incluso con error
        },
      )
  }

  onRetroalimentacionChange() {
    if (!this.isSubmitting && this.dataLoaded && !this.isLoadingData) {
      this.hasUnsavedChanges = true
      this.saved = false
      this.analisisForm.patchValue({ saved: false }, { emitEvent: false })
    }
  }

  submitForm() {
    if (this.analisisForm.valid) {
      this.isSubmitting = true
      this.cargando = true

      const analisisData = {
        ...this.analisisForm.value,
        normativas: this.normativas.value,
        facticas: this.facticas.value,
        problem_question: {
          ...this.analisisForm.get("problem_question")?.value,
        },
        problem_decision: {
          ...this.analisisForm.get("problem_decision")?.value,
        },
        saved: true,
        timestamp: new Date(),
      }

      this.firestore
        .collection("analisis")
        .doc(this.numero_proceso)
        .set(analisisData)
        .then(() => {
          // MEJORADO: Resetear todas las banderas de estado
          this.saved = true
          this.hasUnsavedChanges = false
          this.analisisForm.patchValue({ saved: true }, { emitEvent: false })
          this.cargando = false
          this.mostrarMensajeExito("Guardado con éxito.")
          this.isSubmitting = false

          setTimeout(() => {
            this.saved = true
            this.hasUnsavedChanges = false
          }, 500)
        })
        .catch((error) => {
          console.error("Error al guardar el documento: ", error)
          this.cargando = false
          this.mostrarMensajeError("Error al guardar. Por favor, intente de nuevo.")
          this.isSubmitting = false
        })
    } else {
      this.isSubmitting = false
      this.mostrarMensajeError("Por favor, complete todos los campos requeridos antes de guardar.")
      this.analisisForm.markAllAsTouched()
    }
  }

  mostrarMensajeExito(mensaje: string) {
    this.mensajeExito = mensaje
    this.mostrarMensaje = true
    setTimeout(() => {
      this.mostrarMensaje = false
      this.mensajeExito = ""
    }, 3000)
  }

  mostrarMensajeError(mensaje: string) {
    this.mensajeError = mensaje
    this.mostrarMensaje = true
    setTimeout(() => {
      this.mostrarMensaje = false
      this.mensajeError = ""
    }, 5000)
  }

  getCalificacionValue(controlName: string): string {
    const control = this.analisisForm.get(controlName)
    return control && control.value ? control.value : "No Calificado"
  }

  redirectToAnalisis2(event: Event) {
    event.preventDefault()

    // Verificar primero si el formulario es válido
    if (!this.analisisForm.valid) {
      this.mostrarMensajeError("Por favor, complete todos los campos obligatorios antes de continuar.")
      this.analisisForm.markAllAsTouched()
      return
    }

    // NUEVO: Verificar si hay cambios no guardados
    if (this.hasUnsavedChanges || !this.saved) {
      this.mostrarMensajeError("Tienes cambios sin guardar. Por favor, guarda los cambios antes de continuar.")
      return
    }

    // Verificar el estado saved tanto local como del formulario
    const formSavedValue = this.analisisForm.get("saved")?.value

    console.log("Estado saved local:", this.saved)
    console.log("Estado saved del formulario:", formSavedValue)
    console.log("Cambios no guardados:", this.hasUnsavedChanges)

    if (this.saved && formSavedValue && !this.hasUnsavedChanges) {
      this.router.navigate(["/analisis2"], {
        queryParams: {
          numero_proceso: this.numero_proceso,
          asunto: this.asunto,
          estudiante: this.estudiante,
          docente: this.docente,
        },
      })
    } else {
      // Verificar en Firestore como última opción
      this.firestore
        .collection("analisis")
        .doc(this.numero_proceso)
        .get()
        .toPromise()
        .then((doc) => {
          if (doc && doc.exists) {
            const data = doc.data() as any
            if (data && data.saved && !this.hasUnsavedChanges) {
              // Si está guardado en Firestore y no hay cambios pendientes, actualizar estado local y continuar
              this.saved = true
              this.hasUnsavedChanges = false
              this.analisisForm.patchValue({ saved: true }, { emitEvent: false })

              this.router.navigate(["/analisis2"], {
                queryParams: {
                  numero_proceso: this.numero_proceso,
                  asunto: this.asunto,
                  estudiante: this.estudiante,
                  docente: this.docente,
                },
              })
            } else {
              this.mostrarMensajeError("Por favor, guarda los cambios antes de continuar.")
            }
          } else {
            this.mostrarMensajeError("Por favor, guarda los cambios antes de continuar.")
          }
        })
        .catch((error) => {
          console.error("Error al verificar estado guardado:", error)
          this.mostrarMensajeError("Por favor, guarda los cambios antes de continuar.")
        })
    }
  }

  toggleCalificar(index: number, type: string) {
    const formArray = type === "normativa" ? this.normativas : this.facticas
    const control = formArray.at(index)
    if (control) {
      const newShowCalificar = !control.value.showCalificar
      control.patchValue({ showCalificar: newShowCalificar }, { emitEvent: false })

      if (!newShowCalificar) {
        const key = `${type}_${index}`
        delete this.selectedButtons[key]
        control.patchValue({ calificacion: "No Calificado" }, { emitEvent: false })
        control.patchValue({ retroalimentacion: "" }, { emitEvent: false })
      }
    }
  }

  toggleCalificar2(section: string) {
    this.calificarState[section] = !this.calificarState[section]
  }

  setCalificacion(index: number, type: string, calificacion: string) {
    const control = type === "normativa" ? this.normativas.at(index) : this.facticas.at(index)
    control.patchValue({ calificacion })
    this.selectedButtons[`${type}_${index}`] = calificacion
    this.onFormChange()
  }

  isCalificacionCorrecta(type: string, index: number): boolean {
    const formArray = type === "normativa" ? this.normativas : this.facticas
    const control = formArray.at(index)
    return control?.get("calificacion")?.value === "Correcto" || false
  }

  isCalificacionIncorrecta(type: string, index: number): boolean {
    const formArray = type === "normativa" ? this.normativas : this.facticas
    const control = formArray.at(index)
    return control?.get("calificacion")?.value === "Incorrecto" || false
  }

  isCalificacionCorrecta2(type: string): boolean {
    if (type === "problem_question") {
      return this.analisisForm.get("problem_question.calificacion")?.value === "Correcto"
    } else if (type === "problem_decision") {
      return this.analisisForm.get("problem_decision.calificacion")?.value === "Correcto"
    }
    return false
  }

  isCalificacionIncorrecta2(type: string): boolean {
    if (type === "problem_question") {
      return this.analisisForm.get("problem_question.calificacion")?.value === "Incorrecto"
    } else if (type === "problem_decision") {
      return this.analisisForm.get("problem_decision.calificacion")?.value === "Incorrecto"
    }
    return false
  }

  setCalificacion2(type: string, calificacion: string) {
    if (type === "problem_question") {
      this.analisisForm.get("problem_question")?.patchValue({ calificacion: calificacion })
      this.onFormChange()
    }
    if (type === "problem_decision") {
      this.analisisForm.get("problem_decision")?.patchValue({ calificacion: calificacion })
      this.onFormChange()
    }
  }

  setRetroalimentacion(section: string, event: any) {
    const retroalimentacion = event && event.target ? event.target.value : event
    let controlGroup: FormGroup | null = null

    if (section === "problem_question") {
      controlGroup = this.analisisForm.get("problem_question") as FormGroup
    } else if (section === "problem_decision") {
      controlGroup = this.analisisForm.get("problem_decision") as FormGroup
    }

    if (controlGroup) {
      controlGroup.patchValue(
        {
          retroalimentacion: retroalimentacion,
        },
        { emitEvent: false },
      )

      if (this.dataLoaded && !this.isSubmitting && !this.isLoadingData) {
        this.submitForm()
      }
    }
  }
}
