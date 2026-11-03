# ANEXO 3: PROYECTO DE INNOVACIÓN EN SALUD
**Fondo de Apoyo a la Investigación (FAI) – Universidad Peruana Cayetano Heredia (UPCH)**  
**Facultad de Estomatología | Clínica Dental Docente**

---

## FORMATO OFICIAL DE PRESENTACIÓN

| Campo Oficial | Especificación de la Innovación |
| :--- | :--- |
| **Nombre del proyecto de innovación:** | **DentAI: Asistente Clínico Inteligente Manos Libres con Inteligencia Artificial Neuro-Simbólica y Modelos de Lenguaje (LLM) para el Registro Clínico Seguro en el Software Smile de la Clínica Dental Docente UPCH** |
| **Entidad de Aplicación / Sede:** | Clínica Dental Docente – Universidad Peruana Cayetano Heredia (Sede Central San Martín de Porres y Sede Asistencial Miraflores) |
| **Línea de Innovación:** | Tecnologías de la Información y Comunicación (TICs) aplicadas a la Bioseguridad y Salud Bucal |
| **Número de integrantes:** | **3 integrantes multidisciplinarios:**<br>1. **Investigador Principal (Tesista):** Johan Alexander Manosalva Peralta (Estudiante regular de pregrado, Facultad de Estomatología UPCH).<br>2. **Docente Asesor Clínico:** Profesor de la Facultad de Estomatología UPCH especialista en Odontología Integral y Bioseguridad.<br>3. **Co-Investigador Tecnológico:** Especialista en Informática Biomédica e Inteligencia Artificial. |

---

## 1. DESCRIPCIÓN DE LA INNOVACIÓN

**DentAI** es una solución médica y tecnológica pionera que fusiona **Modelos de Lenguaje de Gran Escala (LLM - Large Language Models como Google Gemini 1.5)** y tecnologías de **Procesamiento de Lenguaje Natural (NLP/ASR)** con un **motor determinista de validación simbólica y manipulación DOM en tiempo real**, materializado como una extensión de navegador para **Google Chrome (Manifest V3)**.

### Innovación de "Cero Fricción" e Integración No Invasiva:
A diferencia de los sistemas tradicionales que demandan costosas reestructuraciones de servidores o APIs propietarias inaccesibles, DentAI opera como una **capa asistencial inteligente desacoplada** directamente sobre la interfaz web del software oficial de historia clínica de la UPCH (**Smile**).

```
                      ┌────────────────────────────────────────┐
                      │       Voz del Odontólogo Clínico       │
                      │ (Dictado libre en box dental con ruido)│
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    Capa Perceptual & LLM (Gemini)      │
                      │  - Reconocimiento Automático de Voz    │
                      │  - NLU: Filtro de charla y ruido       │
                      │  - Extracción de Entidades Clínicas    │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │     Motor Simbólico & Guardias         │
                      │  - Validación estricta de tipos        │
                      │  - Aislamiento Domicilio vs Factura    │
                      │  - Reconciliación fonética de nombres  │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │        Inyección DOM en Smile          │
                      │   (Llenado 100% Manos Libres en UPCH)   │
                      └────────────────────────────────────────┘
```

1. **Comprensión Semántica:** El operador dicta con lenguaje coloquial continuo (*"Paciente Alexander Manosalva, DNI 72736289, vive en Honorio Delgado 430 pero no requiere factura"*).
2. **Discriminación Inteligente de Ruido:** El LLM diferencia charlas del entorno (asistentes, instrumental, turbinas dentales) del dictado clínico verídico.
3. **Consulta y Poblado Automático:** Con solo dictar el DNI, consulta los padrones demográficos correspondientes y completa de forma simultánea nombre, apellidos, documento y tipo de identificación.
4. **Motor de Reglas Clínicas Inviolables:** Garantiza que ningún dato sea mezclado erróneamente (por ejemplo, blindaje total entre la dirección del paciente y los datos de facturación electrónica).
5. **Retroalimentación Auditiva y Visual:** El asistente responde mediante síntesis de voz (TTS) y un Hero Orb interactivo estilo Apple Intelligence en el panel lateral, permitiendo al operador trabajar sin desviar la mirada del campo quirúrgico.

---

## 2. PROBLEMA QUE SOLUCIONA EL PROYECTO

### A. Contaminación Cruzada y Fómites de Alta Peligrosidad en la Clínica Dental
La atención estomatológica genera continuamente bioaerosoles cargados de sangre, saliva y patógenos oportunistas (*Streptococcus mutans*, *Staphylococcus aureus*, *Porphyromonas gingivalis*, virus respiratorios). Al manipular el teclado y el mouse con guantes de examen para ingresar datos en Smile, dichos periféricos se convierten en reservorios microbiológicos infecciosos. Las fundas plásticas descartables sufren microperforaciones frecuentes, generan cientos de kilogramos de desechos contaminados al año y no eliminan el contacto táctil.

### B. Ineficiencia Temporal y Sobrecarga Administrativa en Docentes y Alumnos
El llenado manual del formulario de admisión, anamnesis y antecedentes en Smile toma entre **12 y 18 minutos por paciente**. En una clínica universitaria con alta rotación asistencial, esto reduce el tiempo efectivo disponible para el diagnóstico, la planificación de tratamiento y la docencia clínica tutelada.

### C. Errores Críticos de Filiación e Identificación
La digitación manual apresurada provoca errores en números de DNI, nombres con grafías complejas y confusión recurrente entre la dirección del paciente y la razón social/domicilio fiscal en pacientes que solicitan factura o boleta, derivando en rechazos de auditoría administrativa y fiscal.

---

## 3. VENTAJAS DE LA INNOVACIÓN PRESENTADA

| Dimensión | Enfoque Convencional en Clínica Dental | Innovación DentAI (UPCH) |
| :--- | :--- | :--- |
| **Bioseguridad** | Contacto físico permanente con teclado/mouse usando guantes contaminados con saliva y sangre. | **100% Manos Libres (Voice-First).** Cero contacto físico con periféricos durante el acto clínico. |
| **Tiempo de Registro** | 12 a 18 minutos dedicados a la digitación manual de la ficha clínica. | **Reducción >70% del tiempo de llenado** (completado en menos de 2 a 3 minutos por voz). |
| **Costo de Adopción** | Requiere costosos cambios de servidores, hardware propietario o licencias de software privativo. | **Cero costo de infraestructura:** Funciona sobre las computadoras existentes en los boxes clínicos de la UPCH mediante Google Chrome. |
| **Confiabilidad** | Errores de tipeo manual y riesgo de alucinación si se usara IA generativa pura. | **Arquitectura Neuro-Simbólica:** Combina la flexibilidad del LLM con guardias deterministas que evitan alucinaciones. |
| **Impacto Ecológico** | Desperdicio continuo de protectores plásticos descartables para teclados. | **Reducción de residuos plásticos biocontaminados** en los consultorios de la universidad. |

---

## 4. IMPACTO POTENCIAL Y ESCALABILIDAD

1. **Impacto Local Inmediato:** Más de **10,000 atenciones odontológicas anuales** en las clínicas docentes de la Facultad de Estomatología UPCH (Sedes San Martín de Porres y Miraflores), protegiendo la salud de cientos de estudiantes, docentes y pacientes.
2. **Impacto Académico:** Los estudiantes de pregrado y posgrado incrementan su tiempo de dedicación al aprendizaje clínico y la relación médico-paciente en lugar de tareas mecánicas de digitación.
3. **Escalabilidad Nacional:** El modelo no invasivo de extensión de navegador permite replicar la tecnología en cualquier centro hospitalario público o privado que utilice sistemas web de historias clínicas.
