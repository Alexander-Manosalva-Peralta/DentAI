# PLAN DE GESTIÓN DE RIESGOS DEL PROYECTO
**Proyecto:** DentAI – Asistente Clínico Odontológico Manos Libres  
**Organización:** Clínica Dental Docente UPCH  
**Curso:** Gestión de Proyectos en Salud (Estándar PMI / PMBOK)

---

## 1. MATRIZ DE EVALUACIÓN DE RIESGOS (PROBABILIDAD E IMPACTO)

| ID | Descripción del Riesgo | Categoría | Probabilidad (1-5) | Impacto (1-5) | Severidad (P x I) | Estrategia de Respuesta | Plan de Acción / Mitigación Específica |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **RSK-01** | **Degradación acústica por turbinas de alta velocidad:** El ruido de turbinas dentales (70 a 80 dB) interfiere con el reconocimiento del habla en el box. | Técnico | 4 (Alta) | 4 (Alto) | **16 (Crítico)** | **Mitigar** | Implementación de headsets inalámbricos grado médico con cancelación activa de ruido (ANC) y filtros por software de charla de fondo y umbral de silencio. |
| **RSK-02** | **Alucinación o error de asignación en datos clínicos:** Un modelo generativo puro podría inventar o transponer campos de la historia clínica. | Clínico / Calidad | 2 (Baja) | 5 (Muy Alto) | **10 (Moderado)** | **Evitar** | Adopción de la **Arquitectura Neuro-Simbólica**: el LLM solo estructura el texto, mientras que un motor simbólico determinista valida tipos, longitudes y bloquea campos sensibles. |
| **RSK-03** | **Violación de privacidad o Ley N° 29733 de Datos Personales:** Vulnerabilidad o fuga de datos de salud de los pacientes de la UPCH. | Legal / Ético | 1 (Muy Baja) | 5 (Muy Alto) | **5 (Bajo)** | **Evitar** | Procesamiento de voz efímero en memoria RAM; no se almacenan grabaciones de audio en servidores externos; las consultas DNI usan conexiones HTTPS encriptadas. |
| **RSK-04** | **Actualizaciones o cambios en el DOM HTML de Smile:** Modificaciones en los nombres o IDs de los campos de Smile que rompan la inyección. | Técnico | 3 (Media) | 3 (Medio) | **9 (Moderado)** | **Mitigar** | Algoritmo heurístico multi-nivel en `inject.js`: búsqueda por `data-dentai-key`, selector por etiquetas adyacentes, `placeholder`, `aria-label` y fallback semántico. |
| **RSK-05** | **Resistencia al cambio por parte de operadores clínicos:** Docentes y alumnos que prefieran seguir usando el método manual tradicional. | Organizacional | 3 (Media) | 3 (Medio) | **9 (Moderado)** | **Aceptar / Mitigar** | Diseño ergonómico de "Cero Configuración" estilo Apple, retroalimentación auditiva inmediata con voz natural (TTS) y talleres cortos de demostración. |
| **RSK-06** | **Cortes de conectividad a Internet durante la consulta:** Pérdida de acceso a APIs externas de Inteligencia Artificial en el box. | Técnico | 2 (Baja) | 4 (Alto) | **8 (Moderado)** | **Mitigar** | **Arquitectura de Respaldo Dual:** DentAI cuenta con el Motor 1 (Gemini Cloud) y el Motor 2 (Reglas clínicas locales en JavaScript) que funciona 100% offline. |

---

## 2. PLAN DE CONTINGENCIA PARA RIESGOS CRÍTICOS

### Protocolo ante Fallo de Red (Motor Dual Offline)
Si la conexión a la API de Google Gemini experimenta latencia o caída de red en la Clínica Dental Docente, DentAI conmuta automáticamente al **Motor 2 de Reglas Clínicas Locales**, procesando fechas de nacimiento, DNI, nombres, celulares, correos electrónicos y navegación directamente en el navegador del usuario sin interrumpir la consulta dental.
