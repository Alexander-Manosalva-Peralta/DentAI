# ACTA DE REUNIÓN N° 03 – VALIDACIÓN DE CAMPO CON STAKEHOLDERS CLÍNICOS
**Proyecto:** DentAI – Asistente Clínico Odontológico Manos Libres  
**Entidad:** Clínica Dental Docente UPCH  
**Curso:** Gestión de Proyectos

---

## 1. DATOS DE LA REUNIÓN

| Campo | Detalle |
| :--- | :--- |
| **Fecha:** | 18 de diciembre de 2026 |
| **Hora:** | 09:30 AM – 11:45 AM |
| **Lugar:** | Box Clínico N° 12 y Laboratorio de Simulación – Clínica Dental Docente UPCH (San Martín de Porres) |
| **Tipo de Reunión:** | Pruebas de Campo con Ruido Ambiental Dental y Evaluación de Usabilidad |
| **Convocante:** | Johan Alexander Manosalva Peralta (PM) |

---

## 2. ASISTENTES

| Nombre | Rol / Cargo | Estado |
| :--- | :--- | :---: |
| **Dr. [Nombre Docente Asesor]** | Docente Asesor de Investigación | Presente |
| **Dr. [Docente Instructor Clínico]** | Docente Supervisor de Turno en Clínica Integral | Presente |
| **Johan Alexander Manosalva Peralta** | Project Manager / Investigador Principal | Presente |
| **Estudiantes Clínicos (3 participantes)** | Operadores de Pregrado (Clínica Integral) | Presentes |

---

## 3. AGENDA DE LA REUNIÓN

1. Demostración en vivo de DentAI (v0.3.5) instalado en la estación de trabajo del box clínico N° 12.
2. Pruebas de dictado y captura de voz en condiciones de ruido dental real (turbinas odontológicas de 300,000 RPM y eyector de saliva quirúrgico en funcionamiento).
3. Prueba de navegación por voz entre pestañas de Smile (*Inicio*, *Preregistro*, *Servicio*, *Agenda*).
4. Prueba de scroll continuo manos libres (*"sube"*, *"baja"*).
5. Evaluación del diseño estético del panel lateral (Hero Orb con ondas de audio fluidas y ojos de asistente inteligente).

---

## 4. RESULTADOS DE LAS PRUEBAS Y OBSERVACIONES

* **Comportamiento ante Ruido de Turbinas (75 dB):**
  * La extensión demostró una alta precisión en el reconocimiento vocal cuando el operador utilizó micrófono direccional.
  * El filtro de charlas casuales evitó que conversaciones de fondo (*"doctor, pase la resina"*, *"alcánzame el espejo"*) contaminaran los campos de la ficha clínica.
* **Retroalimentación de los Estudiantes:**
  * Manifestaron una gran satisfacción al no tener que quitarse los guantes contaminados ni tocar el teclado para llenar la filiación de los pacientes.
  * Solicitaron que comandos como *"preregistro"* funcionen tanto si se pronuncia junto como si se dice separado (*"pre registro"*), para evitar tener que repetir palabras. *(Requisito implementado de inmediato).*
  * Reportaron un caso donde el nombre *"Alexander"* se cortaba a *"Lexander"* por una preposición mal procesada. *(Resuelto con la corrección `\ba\b` y auto-reparación fonética).*
* **Aprobación de la Interfaz Visual:**
  * El docente instructor y los alumnos elogiaron el diseño Apple Glassmorphism con el Hero Orb, señalando que la indicación visual de ondas en tiempo real les da la seguridad inmediata de que el sistema está escuchando activamente sin tener que mirar fijamente la pantalla.

---

## 5. ACUERDOS Y COMPROMISOS

| ID | Acuerdo / Mejora Acordada | Responsable | Fecha Límite |
| :---: | :--- | :--- | :---: |
| **AC-08** | Implementar soporte multi-palabra para comandos de navegación (*"preregistro"*, *"pre registro"*, *"busca"*). | Johan Manosalva (PM) | 22/Dic/2026 |
| **AC-09** | Blindar los nombres que inician con vocal 'A' contra truncamientos de preposiciones. | Johan Manosalva (PM) | 24/Dic/2026 |
| **AC-10** | Habilitar soporte completo para la pantalla de búsqueda de Preregistro (código, checkbox y botón Buscar). | Johan Manosalva (PM) | 28/Dic/2026 |

---

## 6. FIRMAS DE CONFORMIDAD

```
________________________________________            ________________________________________
      Dr. [Nombre Docente Instructor]                   Johan Alexander Manosalva Peralta
       Docente Supervisor Clínico                            Project Manager / Tesista
     Facultad de Estomatología UPCH                      Facultad de Estomatología UPCH
```
