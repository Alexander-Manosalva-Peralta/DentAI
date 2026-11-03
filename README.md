# DentAI 🦷 – Asistente Clínico Odontológico por Voz (100% Manos Libres)
### Inteligencia Artificial Neuro-Simbólica y LLMs para la Mitigación de la Infección Cruzada en el Software Smile

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Versión](https://img.shields.io/badge/Versi%C3%B3n-0.3.7-emerald.svg)](manifest.json)
[![Institución](https://img.shields.io/badge/UPCH-Facultad_de_Estomatolog%C3%ADa-9B1B30.svg)](https://estomatologia.cayetano.edu.pe/)
[![Sede](https://img.shields.io/badge/Cl%C3%ADnica_Dental_Docente-Cayetano_Heredia-0F2C59.svg)](https://estomatologia.cayetano.edu.pe/)
[![IA](https://img.shields.io/badge/Inteligencia_Artificial-Neuro--Simb%C3%B3lica_%2F_Gemini_LLM-orange.svg)](docs/arquitectura/ARQUITECTURA_NEURO_SIMBOLICA.md)
[![Gestión de Proyectos](https://img.shields.io/badge/Gesti%C3%B3n_de_Proyectos-PMBOK_7ma_Edici%C3%B3n-purple.svg)](docs/gestion_de_proyectos/01_PROJECT_CHARTER.md)

---

## 📌 1. Visión General del Proyecto

**DentAI** es una extensión médica asistencial para **Google Chrome (Manifest V3)** diseñada específicamente para los consultorios y boxes de la **Clínica Dental Docente de la Universidad Peruana Cayetano Heredia (UPCH)** (Sede Central San Martín de Porres y Sede Asistencial Miraflores).

Opera de forma no invasiva sobre el software oficial de gestión clínica odontológica **Smile** (Cibermundo / Cayetano), permitiendo a los odontólogos docentes y estudiantes de pregrado **navegar, buscar pacientes, consultar padrones por DNI y llenar historias clínicas completas utilizando únicamente comandos de voz en lenguaje natural libre**, eliminando en un **100% el contacto físico con el teclado y el ratón** durante el tratamiento del paciente.

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 DentAI en Smile UPCH                   │
                  │   100% Manos Libres · Cero Contaminación Cruzada       │
                  └──────────────────────────┬─────────────────────────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
       ┌─────────────────────────────┐               ┌─────────────────────────────┐
       │   Inteligencia Artificial   │               │       Bioseguridad &        │
       │       Neuro-Simbólica       │               │      Eficiencia Clínica     │
       │  • Google Gemini 1.5 (LLM)  │               │  • Cero contacto con hardware│
       │  • ASR & NLP Fonético       │               │  • -70% tiempo de registro  │
       │  • Guardias Simbólicas DOM  │               │  • Asepsia quirúrgica real  │
       └─────────────────────────────┘               └─────────────────────────────┘
```

---

## 🦠 2. El Problema Sanitario en la Clínica Dental Docente

En la práctica odontológica diaria, los procedimientos con turbinas de alta velocidad, jeringas triples y ultrasonidos generan una dispersión continua de **bioaerosoles contaminados con saliva, sangre y microorganismos patógenos** (*Streptococcus mutans*, *Staphylococcus aureus*, *Porphyromonas gingivalis*, virus respiratorios).

1. **Infección Cruzada por Fómites:** Durante la consulta, el operador o alumno se ve forzado a tocar el teclado y el mouse con los guantes de examen contaminados para buscar al paciente o ingresar datos en Smile, convirtiendo a los periféricos informáticos en peligrosos reservorios bacterianos.
2. **Ineficiencia Temporal y Sobrecarga Administrativa:** El llenado manual de antecedentes, odontograma y datos demográficos consume entre **15 y 20 minutos por paciente**, restándole tiempo valioso al diagnóstico y a la formación clínica tutelada.
3. **Errores de Tipografía y Auditoría:** Discrepancias en números de DNI, nombres mal escritos y errores fiscales por confundir el domicilio del paciente con los datos de facturación.
4. **Residuos Biocontaminados:** Gasto constante e ineficaz en fundas plásticas descartables que sufren microperforaciones frecuentes.

---

## 💡 3. La Solución: ¿Cómo Funciona DentAI?

DentAI implementa una **Arquitectura Neuro-Simbólica** que combina la flexibilidad del lenguaje natural con el rigor determinista de la medicina:

1. **Capa Perceptual & LLM (Google Gemini 1.5 Flash + Web Speech API):** Transcribe la voz oral en tiempo real y comprende semánticamente la intención clínica, **discriminando inteligentemente las charlas casuales y el ruido de turbinas dentales (75 dB)**.
2. **Motor Simbólico Determinista (Reglas Clínicas en JavaScript):** Valida tipos de datos, impide la inyección de números en nombres, reconcilia grafías fonéticas complejas (*"Johan"* vs *"Yojan"*) y mantiene un **blindaje absoluto entre los datos de domicilio del paciente y los campos fiscales de Facturación**.
3. **Inyección DOM en Smile:** Interactúa con campos de texto, selectores estándar, componentes `Select2` y checkboxes `iCheck` nativos de Smile sin requerir ninguna modificación en los servidores centrales de la UPCH.
4. **Respuesta Auditiva y Visual (Apple-style SidePanel):** Notifica al odontólogo mediante síntesis de voz natural (TTS) y un **Hero Orb interactivo** en el panel lateral que reacciona a 60 FPS con ondas fluidas y ojos de asistente inteligente.

---

## ⚡ 4. Características Principales

* 🪪 **Consulta Inmediata por DNI:** Dictando *"DNI 72736289"* puebla simultáneamente: Tipo de Identificación (DNI), Documento, Nombre de pila, Primer Apellido y Segundo Apellido.
* 🛡️ **Aislamiento Domicilio vs. Facturación:** Dictar cambios en la dirección jamás altera la razón social o la calle de factura, evitando errores en auditorías de SUNAT.
* 🔎 **Soporte de Búsqueda en Preregistro:** Permite dictar código de paciente, alternar el checkbox *"Mostrar pacientes registrados"* y ejecutar la búsqueda diciendo *"dale buscar"*.
* 📜 **Scroll y Navegación Manos Libres:** Navegación instantánea entre módulos (*"ve a preregistro"*, *"ve a agenda"*, *"abre servicio"*) y desplazamiento vertical suave diciendo *"baja"* o *"sube"*.
* 🔇 **Filtro Anti-Ruido y Modo Wake Word:** Ignora conversaciones entre asistentes o pedidos de instrumental (*"pásame la gasa"*, *"¿cuánto cuesta?"*), procesando únicamente las instrucciones clínicas válidas.
* 🔄 **Motor Dual de Alta Disponibilidad:** Si la conexión a Internet falla temporalmente, el **Motor 2 Local** continúa funcionando 100% offline dentro de la clínica.

---

## 🚀 5. Guía de Instalación Rápida (Listo para Clonar y Usar)

Cualquier docente, evaluador o estudiante puede clonar y ejecutar DentAI en Google Chrome en **menos de 1 minuto sin instalar herramientas complejas**:

### Paso 1: Clonar el repositorio
Abre tu terminal o consola y ejecuta:
```bash
git clone https://github.com/Alexander-Manosalva-Peralta/DentAI.git
```

### Paso 2: Cargar la extensión en Google Chrome
1. Abre Google Chrome y escribe en la barra de direcciones:
   ```text
   chrome://extensions
   ```
2. En la esquina superior derecha, activa el interruptor **Modo de desarrollador**.
3. Haz clic en el botón **Cargar descomprimida** (Load unpacked).
4. Selecciona la carpeta **`DentAI`** que acabas de clonar.

### Paso 3: Abrir Smile y Probar
1. Abre el sistema **Smile** en la pestaña de **Preregistro - Pacientes**.
2. Presiona la combinación de teclas:
   $$\text{Alt} + \text{Shift} + \text{D}$$
   *(o haz clic en el icono de DentAI en la barra de extensiones de Chrome para abrir el panel lateral)*.
3. ¡Listo! Puedes comenzar a dictar comandos como:
   * *"DNI 72736289"*
   * *"nombre Alexander"*
   * *"ve a preregistro"*
   * *"dale buscar"*
   * *"confirmar"*

---

## 📂 6. Estructura del Repositorio

El repositorio está estructurado siguiendo las mejores prácticas para extensiones Web y gestión de proyectos académicos:

```text
DentAI/
│
├── manifest.json              # Manifiesto oficial de la extensión (Chrome MV3)
├── background.js              # Service Worker en segundo plano
├── inject.js                  # Motor inyector y manipulador del DOM de Smile
├── sidepanel.html             # Interfaz visual SidePanel estilo Apple Intelligence
├── sidepanel.css              # Estilos Apple HIG, glassmorphism y animaciones del Orb
├── sidepanel.js               # Lógica de voz, integración con LLM Gemini y NLP
├── options.html               # Panel de configuración de API keys y parámetros
├── options.js                 # Lógica de almacenamiento seguro en chrome.storage
├── common.js                  # Utilidades comunes y constantes clínicas
├── mic.html / mic.js          # Asistente de permisos de micrófono
├── pcm-worklet.js             # Worklet de procesamiento de audio digital
├── icons/                     # Iconografía oficial (16x16, 48x48, 128x128)
├── .gitignore                 # Configuración de exclusiones de Git
├── README.md                  # Documentación central del proyecto
│
└── docs/                      # Documentación del Proyecto
    │
    ├── anexo3_innovacion/     # Expediente Oficial de Innovación en Salud (FAI UPCH)
    │   ├── ANEXO_3_PROYECTO_INNOVACION_EN_SALUD.md
    │   └── Anexo3_Innovacion_Salud_DentAI.html   (Versión imprimible / PDF)
    │
    ├── gestion_de_proyectos/  # Artefactos del Curso de Gestión de Proyectos (PMBOK)
    │   ├── 01_PROJECT_CHARTER.md                 (Acta de Constitución del Proyecto)
    │   ├── 02_MATRIZ_STAKEHOLDERS.md             (Registro e Interesados con Matriz RACI)
    │   ├── 03_MATRIZ_TRAZABILIDAD_REQUISITOS.md  (Matriz RTM de Requisitos Clínicos)
    │   ├── 04_PLAN_GESTION_RIESGOS.md            (Gestión de Riesgos y Mitigación)
    │   └── actas_reuniones/                      (Actas de Reunión con Sponsor y Stakeholders)
    │       ├── ACTA_01_KICKOFF_SPONSOR.md        (Reunión de Inicio con Dirección de Clínica)
    │       ├── ACTA_02_ALINEAMIENTO_DOCENTE.md   (Alineamiento de Requisitos Smile con Asesor)
    │       ├── ACTA_03_VALIDACION_CLINICA.md     (Pruebas de Campo con Ruido de Turbinas)
    │       └── ACTA_04_ENTREGA_PILOTO.md         (Aprobación de Fase Piloto y Anexo 3)
    │
    └── arquitectura/          # Especificación Técnica de Inteligencia Artificial
        └── ARQUITECTURA_NEURO_SIMBOLICA.md       (Fundamento de IA Neuronal + Simbólica)
```

---

## 📑 7. Documentación Académica y Gestión de Proyectos

Para fines de evaluación académica y postulación a fondos de innovación:

* 📄 **[Anexo 3: Proyecto de Innovación en Salud](docs/anexo3_innovacion/ANEXO_3_PROYECTO_INNOVACION_EN_SALUD.md):** Documento oficial requerido por el Fondo de Apoyo a la Investigación (FAI) de la UPCH.
* 📋 **[Acta de Constitución (Project Charter)](docs/gestion_de_proyectos/01_PROJECT_CHARTER.md):** Justificación de negocio, objetivos SMART, alcance, presupuesto (S/. 30,000 PEN) y cronograma de hitos.
* 👥 **[Registro de Stakeholders y Matriz RACI](docs/gestion_de_proyectos/02_MATRIZ_STAKEHOLDERS.md):** Análisis de interesados (Dirección de Clínica, Docentes, Estudiantes, Admisión y Pacientes).
* 📝 **[Actas de Reunión Oficiales](docs/gestion_de_proyectos/actas_reuniones/):** Registro formal de las reuniones de Kick-off, levantamiento de requisitos, validación en boxes dentales y entrega de fase piloto.
* 🧠 **[Arquitectura Neuro-Simbólica](docs/arquitectura/ARQUITECTURA_NEURO_SIMBOLICA.md):** Justificación técnica de por qué DentAI sí es Inteligencia Artificial y cómo mitiga alucinaciones médicas.

---

## 👥 8. Equipo de Desarrollo e Investigación

* **Johan Alexander Manosalva Peralta**  
  *Investigador Principal / Project Manager / Desarrollador*  
  Estudiante regular de pregrado, Facultad de Estomatología  
  Universidad Peruana Cayetano Heredia (UPCH)  
  📧 `johan.manosalva@upch.pe` | DNI: `72736289`

* **Dr. [Nombre Docente Asesor UPCH]**  
  *Docente Asesor Metodológico y Clínico*  
  Facultad de Estomatología – Universidad Peruana Cayetano Heredia

* **Clínica Dental Docente – UPCH**  
  *Sede San Martín de Porres & Sede Miraflores*  
  Patrocinador institucional del proyecto piloto y entorno de validación clínica.

---

## 📜 9. Licencia y Cumplimiento Normativo

Este proyecto se desarrolla en estricto cumplimiento de la **Ley N° 29733 (Ley de Protección de Datos Personales del Perú)** y las **Normas Técnicas de Salud para la Gestión de Historias Clínicas (NTS N° 139-MINSA)**. Las transcripciones y el procesamiento de audio se realizan de forma efímera en memoria local sin almacenamiento permanente de grabaciones de pacientes en servidores externos.
