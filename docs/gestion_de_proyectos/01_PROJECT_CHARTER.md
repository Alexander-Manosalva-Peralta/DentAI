# ACTA DE CONSTITUCIÓN DEL PROYECTO (PROJECT CHARTER)
**Proyecto:** DentAI – Asistente Clínico Odontológico Manos Libres con IA Neuro-Simbólica  
**Cliente / Beneficiario:** Clínica Dental Docente – Universidad Peruana Cayetano Heredia (UPCH)  
**Curso:** Gestión de Proyectos en Salud / Ingeniería Biomédica  
**Metodología:** PMI (PMBOK 7ma Edición) + Enfoque Ágil Híbrido

---

## 1. INFORMACIÓN GENERAL DEL PROYECTO

| Campo | Detalle |
| :--- | :--- |
| **Nombre del Proyecto:** | DentAI – Asistente Clínico Inteligente por Voz para el Software Smile |
| **Código del Proyecto:** | PRJ-DENTAI-2027 |
| **Líder del Proyecto (Project Manager):** | Johan Alexander Manosalva Peralta (Investigador Principal / Estudiante Estomatología UPCH) |
| **Sponsor / Patrocinador:** | Dirección de la Clínica Dental Docente / Decanato de la Facultad de Estomatología UPCH |
| **Docente Asesor Metodológico:** | Especialista en Odontología y Gestión de Servicios en Salud UPCH |
| **Fecha de Inicio:** | Noviembre 2026 |
| **Fecha de Finalización Estimada:** | Febrero 2028 (12 meses de ejecución oficial + piloto previo) |

---

## 2. PROPÓSITO Y JUSTIFICACIÓN DEL PROYECTO

### 2.1. Problema de Negocio y Sanitario
En la Clínica Dental Docente UPCH, la atención diaria a cientos de pacientes ambulatorios involucra el uso constante del software odontológico institucional **Smile**. Durante el acto odontológico, los operadores manipulan piezas de mano de alta velocidad que generan aerosoles contaminados con saliva y sangre. Para registrar la historia clínica o buscar pacientes, el odontólogo o estudiante interactúa físicamente con el teclado y el ratón portando guantes de examen contaminados. 

Esta práctica genera:
1. **Riesgo crítico de infección cruzada nosocomial** entre pacientes sucesivos.
2. **Pérdida de entre 15 y 20 minutos por paciente** solo en digitación y llenado de formularios.
3. **Errores de tipeo** en datos demográficos, DNI y facturación electrónica.
4. **Desgaste y gasto innecesario en fundas plásticas desechables** que generan residuos biocontaminados.

### 2.2. Solución Propuesta
Desarrollar, implementar y validar **DentAI**, una solución de software asistencial basada en una extensión web de Google Chrome (Manifest V3) que opera como una capa 100% manos libres sobre el software Smile. DentAI utiliza Inteligencia Artificial Neuro-Simbólica (combinando reconocimiento de voz ASR, modelos de lenguaje LLM Google Gemini para NLU y un motor determinista de reglas clínicas) para permitir el llenado de historias clínicas, búsqueda por DNI y navegación en Smile exclusivamente mediante comandos de voz.

---

## 3. OBJETIVOS SMART DEL PROYECTO

1. **Objetivo de Bioseguridad:** Reducir a **0% el contacto físico** de los operadores con teclados y mouses durante el acto clínico en los boxes equipados con DentAI para el mes 6 de ejecución.
2. **Objetivo de Eficiencia Temporal:** Disminuir en al menos un **70% el tiempo promedio de admisión y llenado de datos** en Smile (de ~15 minutos a menos de 3 minutos) durante las pruebas piloto.
3. **Objetivo de Precisión de Datos:** Alcanzar una **exactitud superior al 98%** en la captura de nombres, apellidos y documentos de identidad mediante la integración con padrones oficiales.
4. **Objetivo de Usabilidad:** Obtener un puntaje promedio superior a **80 puntos en la escala System Usability Scale (SUS)** por parte de los docentes y estudiantes de la Clínica Dental Docente.
5. **Objetivo de Costo:** Lograr una solución de **costo cero en infraestructura de servidores**, operando directamente sobre las terminales existentes de la universidad.

---

## 4. ALCANCE DEL PROYECTO

### 4.1. Entregables Principales (En el Alcance)
* **EDT 1.0 Gestión del Proyecto:** Project Charter, Plan de Gestión de Riesgos, Matriz de Stakeholders y Actas de Reunión.
* **EDT 2.0 Desarrollo Tecnológico (DentAI Extension):**
  * Interfaz de usuario SidePanel estilo Apple con Hero Orb interactivo y visualizador de voz en tiempo real.
  * Módulo de integración ASR (Web Speech API) con filtro de ruido dental de turbinas.
  * Módulo de Inteligencia Artificial NLU (Google Gemini 1.5 Flash) para estructuración de intenciones clínicas.
  * Motor Simbólico inyector DOM para Smile (módulos de Preregistro, Datos de Identificación, Contacto, Facturación y Otros Datos).
  * Soporte de navegación por voz entre pestañas y scroll manos libres.
* **EDT 3.0 Validación y Piloto Clínico:** Pruebas en simuladores y boxes clínicos de la Sede San Martín de Porres de la Clínica Dental Docente UPCH.
* **EDT 4.0 Documentación Académica y Fondo:** Expediente oficial de innovación (Anexo 3 FAI UPCH) y manual de usuario.

### 4.2. Fuera del Alcance (Exclusiones Explícitas)
* Modificaciones en el código fuente del backend propietario de Smile o su base de datos central.
* Diagnóstico automatizado o prescripción farmacológica sin supervisión del odontólogo tratante.
* Compra de unidades dentales o sillones odontológicos.

---

## 5. CRONOGRAMA DE HITOS PRINCIPALES

| Hito | Descripción | Fecha Estimada |
| :---: | :--- | :---: |
| **M1** | Aprobación del Project Charter por el Sponsor y Docente Asesor | Noviembre 2026 |
| **M2** | Finalización del MVP de la Extensión Chrome (Manifest V3 con Gemini) | Diciembre 2026 |
| **M3** | Pruebas de campo con ruido ambiental dental en la Clínica UPCH | Enero 2027 |
| **M4** | Presentación y postulación formal al Fondo FAI UPCH (Anexo 3) | Febrero 2027 |
| **M5** | Despliegue piloto controlado en boxes clínicos seleccionados | Mayo 2027 |
| **M6** | Cierre del proyecto, evaluación SUS y transferencia tecnológica | Febrero 2028 |

---

## 6. PRESUPUESTO PRELIMINAR RESUMIDO

* **Monto Total Estimado:** **S/. 30,000.00 PEN** (financiable vía fondos concursables de innovación en salud).
* **Distribución:**
  * Equipamiento de audio clínico (Headsets grado médico con cancelación de ruido): S/. 6,800.00
  * Servicios Cloud e inferencia de IA (Tokens Gemini Enterprise): S/. 5,200.00
  * Ensayos microbiológicos de superficies (Laboratorio UPCH): S/. 4,500.00
  * Ciberseguridad y auditoría ética de software: S/. 5,000.00
  * Difusión científica, publicación Scopus Q1/Q2 y papelería: S/. 8,500.00

---

## 7. RIESGOS INICIALES DE ALTO NIVEL

1. **Riesgo Acústico:** El ruido de turbinas dentales de alta velocidad (70-80 dB) puede degradar el reconocimiento de voz.  
   *Mitigación:* Implementación de headsets con cancelación activa de ruido (ANC) y filtros por software de charla de fondo.
2. **Riesgo de Confidencialidad de Datos:** Manejo de datos de salud bajo la Ley N° 29733.  
   *Mitigación:* Procesamiento efímero en memoria RAM sin persistencia de audios de pacientes en servidores externos.
3. **Resistencia al Cambio:** Odontólogos habituados al tipeo manual tradicional.  
   *Mitigación:* Diseño de interfaz ultra-minimalista, retroalimentación por voz y talleres prácticos de inducción.

---

## 8. AUTORIZACIONES Y APROBACIONES

```
________________________________________            ________________________________________
    Johan Alexander Manosalva Peralta                   Dr. [Nombre Docente Asesor UPCH]
          Project Manager / Tesista                          Docente Asesor Clínico
      Facultad de Estomatología UPCH                     Facultad de Estomatología UPCH

________________________________________
      Dirección de la Clínica Dental Docente
                Sponsor del Proyecto
         Universidad Peruana Cayetano Heredia
```
