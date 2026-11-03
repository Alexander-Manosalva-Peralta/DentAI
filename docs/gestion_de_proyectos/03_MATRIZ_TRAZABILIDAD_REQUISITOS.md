# MATRIZ DE TRAZABILIDAD DE REQUISITOS (RTM)
**Proyecto:** DentAI – Asistente Clínico Odontológico Manos Libres  
**Organización:** Clínica Dental Docente UPCH  
**Estándar:** Guía del PMBOK (Gestión del Alcance)

---

## MATRIZ DE TRAZABILIDAD (REQUIREMENTS TRACEABILITY MATRIX)

| ID Req. | Necesidad de Negocio / Objetivo | Requisito Funcional / Técnico | Módulo de Software Asociado | Criterio de Aceptación Verificable | Estado |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **REQ-01** | Eliminación de contaminación cruzada táctil. | El sistema debe activarse, procesar comandos y escribir datos en Smile sin tocar teclado ni mouse. | `sidepanel.js`<br>`inject.js` | El operador completa una admisión entera con guantes puestos sin tocar el hardware de la PC. | **Completado (v0.3.7)** |
| **REQ-02** | Reducción de tiempo en búsqueda de pacientes. | Consulta de padrón oficial (RENIEC/Base local) con solo dictar 8 dígitos de DNI. | `sidepanel.js` (`buscarPaciente`) | Dictar "DNI 72736289" puebla automáticamente nombres, apellidos paterno/materno y documento. | **Completado (v0.3.7)** |
| **REQ-03** | Compatibilidad nativa con Smile de la UPCH. | Inyección limpia en campos HTML (`input`, `select`, `select2`, `checkbox`, `radio`) sin alterar el backend de Smile. | `inject.js` (`dentaiScan`, `dentaiFill`) | Los eventos `input`, `change` e `iCheck` de jQuery/Bootstrap se disparan correctamente en Smile. | **Completado (v0.3.7)** |
| **REQ-04** | Aislamiento estricto de campos de facturación. | Diferenciación determinista entre la dirección domiciliaria del paciente y los campos fiscales de Factura. | `inject.js`<br>`sidepanel.js` (`findField`) | Dictar un cambio en la calle del paciente jamás modifica la calle ni la razón social en Factura. | **Completado (v0.3.7)** |
| **REQ-05** | Navegación y scroll manos libres. | Navegación entre pestañas de Smile (*Inicio*, *Preregistro*, *Servicio*, *Agenda*) y scroll vertical suave por voz. | `inject.js` (`dentaiNavigate`, `dentaiScroll`) | Al decir "ve a preregistro" o "baja", la pantalla se desplaza de forma fluida e inmediata. | **Completado (v0.3.7)** |
| **REQ-06** | Filtro de ruido ambiental de consultorio dental. | Discriminación de ruido de turbinas (70-80 dB), conversaciones casuales y palabras del entorno. | `sidepanel.js` (LLM Gemini + `CHATTER_WORDS`) | Ruidos de fondo y conversaciones como "pásame la gasa" o "hola doctor" no son escritas en los formularios. | **Completado (v0.3.7)** |
| **REQ-07** | Interfaz visual ergonómica y moderna. | SidePanel estilo Apple con Hero Orb interactivo y estados reactivos (escuchando, pensando, hablando, pausado). | `sidepanel.html`<br>`sidepanel.css`<br>`OrbVisualizer` | El Hero Orb responde visualmente a la voz con ondas fluidas de 60 FPS y ojos robóticos sutiles. | **Completado (v0.3.7)** |
| **REQ-08** | Soporte de pantalla de búsqueda en Preregistro. | Dictado de código, selección de checkbox "Mostrar pacientes registrados" y clic en botón Buscar. | `inject.js`<br>`sidepanel.js` | Dictar "código 1234" y "dale buscar" ejecuta la búsqueda de pacientes en Smile con éxito. | **Completado (v0.3.7)** |
