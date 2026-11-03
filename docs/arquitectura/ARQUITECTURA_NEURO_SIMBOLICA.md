# ARQUITECTURA TÉCNICA NEURO-SIMBÓLICA DE DENTAI
**Proyecto:** DentAI – Asistente Clínico Odontológico Manos Libres  
**Entidad:** Clínica Dental Docente – Universidad Peruana Cayetano Heredia (UPCH)

---

## 1. INTRODUCCIÓN Y FUNDAMENTO TEÓRICO

En la informática médica contemporánea, el uso de Inteligencia Artificial generativa pura (modelos LLM sin restricciones) conlleva el grave riesgo de **alucinaciones** (invención de datos clínicos, transposición de campos o alteración de cifras sensibles). En un entorno hospitalario u odontológico, esto es inaceptable.

Por otro lado, la programación clásica basada únicamente en reglas fijas (*if/else* o expresiones regulares simples) es incapaz de procesar la variabilidad, ambigüedad y ruido del lenguaje oral humano en una clínica real.

Para resolver este dilema, **DentAI implementa una Arquitectura Neuro-Simbólica (*Neuro-Symbolic AI*)**, combinando lo mejor de dos mundos:
1. **El Componente Neuronal (Perceptual & NLU):** Modelos de Aprendizaje Profundo (*Deep Learning*) para el reconocimiento de voz (ASR) y modelos de lenguaje masivos (**Google Gemini 1.5 Flash**) para comprender el significado semántico del lenguaje oral médico.
2. **El Componente Simbólico (Determinista & Control):** Un motor de reglas de inferencia lógica, guardias de tipo, reconciliación fonética estricta y manipulación DOM que garantiza que la información se verifique, filtre y escriba en el software Smile de la UPCH con 100% de consistencia.

---

## 2. DIAGRAMA DE FLUJO ARQUITECTURAL

```
   ┌──────────────────────────────────────────────────────────────┐
   │                  ENTRADA ACÚSTICA ORAL                       │
   │  Micrófono en box clínico (con ruidos de turbinas y charla)  │
   └──────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │             CAPA NEURONAL 1: PERCEPCIÓN & ASR                │
   │  - Web Speech API (Modelos acústicos de Deep Learning)       │
   │  - Transcripción fonética en tiempo real a 60 FPS            │
   └──────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │             CAPA NEURONAL 2: NLU CON LLM GEMINI              │
   │  - Intent Recognition (Diferencia dictado clínico de charla) │
   │  - Named Entity Recognition (DNI, nombres, calles, montos)   │
   │  - Estructuración JSON contextualizada al DOM de Smile       │
   └──────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │           CAPA SIMBÓLICA: MOTOR DETERMINISTA DENTAI          │
   │  - Guardia de tipos (Números sólo a números, texto a texto)  │
   │  - Aislamiento estricto (Domicilio Paciente ≠ Facturación)   │
   │  - Algoritmo fonético de nombres con Base de Datos           │
   │  - Motor 2 Offline de respaldo inmediato en caso de corte    │
   └──────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
   ┌──────────────────────────────────────────────────────────────┐
   │          INYECCIÓN Y SINCRONIZACIÓN DOM EN SMILE             │
   │  - Selección Select2 / iCheck nativo de Smile                │
   │  - Desplazamiento visual suave (Smooth Scroll)                │
   │  - Confirmación auditiva por voz (Text-To-Speech)            │
   └──────────────────────────────────────────────────────────────┘
```

---

## 3. COMPONENTES DEL SISTEMA

### 3.1. Capa Neuronal (Percepción y NLU)
* **ASR (Automatic Speech Recognition):** Convierte la señal de audio en texto fonético con procesamiento continuo.
* **LLM Google Gemini 1.5 Flash:** Se ejecuta mediante llamadas seguras a la API con una directiva de sistema (*System Instruction*) médica altamente especializada que:
  * Identifica conversaciones de fondo (secretarias, asistentes, pacientes) y las marca como `"es_charla_irrelevante": true`.
  * Extrae entidades estructuradas y mapea IDs numéricos de los campos de Smile detectados en tiempo real.

### 3.2. Capa Simbólica (Validación y Seguridad Clínica)
* **Aislamiento Domicilio vs. Factura:** La función `findField` inspecciona la sección padre en el DOM. Si el odontólogo dice *"cambia la calle a Av. Honorio Delgado"*, el motor simbólico bloquea cualquier modificación sobre la sección de Facturación, protegiendo los datos fiscales.
* **Algoritmo de Reconciliación Fonética:** Mediante normalización de grafías orales peruanas (`phon(w)`), reconcilia nombres con la base de datos oficial (ej: *"Johan"* vs *"Yojan"*, preservando la grafía registrada).
* **Motor 2 de Respaldo Local (100% Offline):** Si la clínica pierde temporalmente la conexión a Internet, un motor simbólico completo implementado en JavaScript puro asume la tarea de captura, parsing y llenado en Smile sin detener la consulta.
