# REGISTRO Y MATRIZ DE STAKEHOLDERS (INTERESADOS)
**Proyecto:** DentAI – Asistente Clínico Odontológico Manos Libres  
**Organización:** Clínica Dental Docente – Universidad Peruana Cayetano Heredia (UPCH)  
**Curso:** Gestión de Proyectos

---

## 1. IDENTIFICACIÓN Y ANÁLISIS DE STAKEHOLDERS

| ID | Stakeholder / Interesado | Rol / Cargo | Tipo | Poder (1-5) | Interés (1-5) | Expectativas Principales | Estrategia de Gestión |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **STK-01** | **Dirección de la Clínica Dental Docente** | Sponsor Principal del Proyecto | Interno | **5 (Muy Alto)** | **5 (Muy Alto)** | Cumplimiento estricto de normas de bioseguridad, disminución de quejas por demoras en admisión y cero costo en cambios de servidores Smile. | **Gestionar de cerca:** Reuniones quincenales, entrega de actas formales y reportes ejecutivos de avance. |
| **STK-02** | **Docente Asesor Metodológico / Clínico** | Asesor de Tesis y Co-Investigador | Interno | **4 (Alto)** | **5 (Muy Alto)** | Rigor científico, alineamiento con las líneas de investigación UPCH y aprobación del protocolo ante el Comité de Ética (CIEI). | **Gestionar de cerca:** Sesiones semanales de mentoría, revisión de entregables técnicos y validación de hipótesis. |
| **STK-03** | **Odontólogos Docentes de Clínica Integral** | Supervisores clínicos en boxes dentales | Interno | **4 (Alto)** | **4 (Alto)** | Que el sistema no interfiera con su labor pedagógica, rapidez en la aprobación de tratamientos y veracidad en los datos de Smile. | **Mantener satisfecho:** Talleres de calibración, demostraciones en vivo y canal abierto de retroalimentación. |
| **STK-04** | **Estudiantes de Pregrado (Operadores Clínicos)** | Usuarios finales primarios de DentAI | Interno | **2 (Bajo)** | **5 (Muy Alto)** | Reducir el tiempo de llenado administrativo para enfocarse en la atención del paciente y no ensuciar el hardware con guantes. | **Mantener informado y capacitado:** Guías de usuario visuales, soporte técnico y pruebas de usabilidad guiadas. |
| **STK-05** | **Pacientes de la Clínica Dental Docente** | Beneficiarios indirectos del servicio | Externo | **1 (Muy Bajo)** | **4 (Alto)** | Tiempos de espera menores en sala de espera, mayor tiempo de atención directa con el odontólogo y estricta privacidad de datos. | **Monitorear:** Resguardo estricto de datos bajo la Ley N° 29733 y consentimiento informado. |
| **STK-06** | **Personal Administrativo de Admisión y Caja** | Operadores del módulo de recepción y facturación | Interno | **3 (Medio)** | **4 (Alto)** | Reducción de discrepancias en datos de facturación (DNI, RUC, Razón Social) y nombres exactos validados contra padrón oficial. | **Mantener informado:** Pruebas conjuntas de integración en la pantalla de preregistro y facturación. |
| **STK-07** | **Comité Institucional de Ética en Investigación (CIEI-UPCH)** | Ente regulador bioético | Interno | **5 (Muy Alto)** | **3 (Medio)** | Cumplimiento de la Declaración de Helsinki, confidencialidad de historias clínicas y no persistencia de audios clínicos. | **Mantener informado y satisfecho:** Presentación oportuna del expediente y cumplimiento ético. |
| **STK-08** | **Área de Tecnologías de Información (TI) / Smile** | Soporte de sistemas institucionales | Interno | **4 (Alto)** | **3 (Medio)** | Cero impacto negativo o sobrecarga en el ancho de banda y bases de datos centrales de la universidad. | **Mantener satisfecho:** Demostrar que DentAI funciona como extensión desacoplada en el navegador del cliente. |

---

## 2. MATRIZ DE PODER E INTERÉS (MENDELOW)

```
        PODER
          ▲
          │
  ALTO    │   [STK-08: Área TI Smile]          │   [STK-01: Dirección Clínica (Sponsor)]
          │   [STK-07: Comité Ética CIEI]      │   [STK-02: Docente Asesor Clínico]
          │                                    │   [STK-03: Odontólogos Docentes]
          │   (MANTENER SATISFECHO)            │   (GESTIONAR DE CERCA)
          ├────────────────────────────────────┼──────────────────────────────────────
  BAJO    │                                    │   [STK-04: Estudiantes de Clínica]
          │                                    │   [STK-06: Personal Admisión/Caja]
          │                                    │   [STK-05: Pacientes de la Clínica]
          │   (MONITOREAR)                     │   (MANTENER INFORMADOS)
          │
          └────────────────────────────────────────────────────────────────────────► INTERÉS
                      BAJO                                 ALTO
```

---

## 3. MATRIZ RACI DEL PROYECTO

* **R (Responsible):** Quien realiza la actividad.
* **A (Accountable):** Quien aprueba y responde en última instancia.
* **C (Consulted):** Quien brinda insumos y retroalimentación técnica.
* **I (Informed):** Quien debe ser notificado del resultado.

| Entregable / Fase del Proyecto | Project Manager (Johan) | Docente Asesor | Sponsor (Clínica) | Estudiantes Clínicos | TI / Smile |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Acta de Constitución (Charter)** | **R** | **C** | **A** | **I** | **I** |
| **Levantamiento de Requisitos Smile** | **R** | **C** | **I** | **C** | **C** |
| **Desarrollo de Extensión Chrome (Manifest V3)**| **R** | **I** | **I** | **I** | **I** |
| **Integración con Gemini LLM y Web Speech** | **R** | **C** | **I** | **I** | **I** |
| **Pruebas de Campo con Ruido Dental** | **R** | **C** | **I** | **C** | **I** |
| **Expediente de Innovación (Anexo 3 FAI)** | **R** | **A** | **A** | **I** | **I** |
| **Aprobación de Fase Piloto** | **R** | **C** | **A** | **I** | **I** |
| **Cierre y Transferencia Tecnológica** | **R** | **C** | **A** | **I** | **C** |
