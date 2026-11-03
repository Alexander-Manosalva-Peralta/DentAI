# ACTA DE REUNIÓN N° 02 – ALINEAMIENTO DE REQUISITOS CLÍNICOS EN SMILE
**Proyecto:** DentAI – Asistente Clínico Odontológico Manos Libres  
**Entidad:** Clínica Dental Docente UPCH  
**Curso:** Gestión de Proyectos

---

## 1. DATOS DE LA REUNIÓN

| Campo | Detalle |
| :--- | :--- |
| **Fecha:** | 24 de noviembre de 2026 |
| **Hora:** | 03:00 PM – 04:30 PM |
| **Lugar:** | Departamento Académico de Odontología – Facultad de Estomatología UPCH |
| **Tipo de Reunión:** | Especificación de Requisitos Clínicos y Reglas de Negocio en Smile |
| **Convocante:** | Johan Alexander Manosalva Peralta (PM) |

---

## 2. ASISTENTES

| Nombre | Rol / Cargo | Estado |
| :--- | :--- | :---: |
| **Dr. [Nombre Docente Asesor]** | Docente Asesor de Investigación / Especialista en Odontología Integral | Presente |
| **Dra. [Jefa de Admisión y Triaje]** | Coordinadora de Admisión Clínica Dental Docente | Presente |
| **Johan Alexander Manosalva Peralta** | Project Manager / Investigador Principal | Presente |

---

## 3. AGENDA DE LA REUNIÓN

1. Revisión de los formularios clave de Smile: *Preregistro*, *Datos de Identificación*, *Contacto*, *Dirección*, *Factura* y *Otros Datos*.
2. Identificación de campos críticos donde ocurren errores frecuentes de digitación manual.
3. Reglas de negocio estrictas para evitar contaminación cruzada de datos (ej: separación de dirección del paciente y razón social de factura).
4. Definición de la estrategia de consulta automática por DNI (padrones oficiales vs. base de datos simulada).

---

## 4. TEMAS TRATADOS Y DISCUSIÓN

* **Problema de Confusión en Facturación:** La Jefa de Admisión alertó que frecuentemente los estudiantes cometen el error de cambiar la dirección del paciente creyendo que están editando la factura, lo que genera rechazos en SUNAT y reclamos de pacientes.
  * *Solución técnica acordada:* DentAI debe implementar un blindaje determinista: comandos como *"calle"* o *"dirección"* solo afectarán el domicilio del paciente; para facturación, el usuario debe decir explícitamente *"calle de factura"* o *"razón social"*.
* **Llenado Automático de DNI:** Se acordó que con solo dictar los 8 dígitos del DNI, el sistema debe poblar de forma inmediata: Tipo de Identificación (DNI), Número de Documento, Nombres de pila, Apellido Paterno y Apellido Materno, con confirmación verbal previa a escribir en Smile.
* **Manejo de Nombres con Fonética Compleja:** El docente asesor resaltó que existen nombres que se pronuncian igual pero se escriben distinto (*"Johan"* vs *"Yojan"*, *"Alexander"* vs truncamientos orales de Chrome). Se acordó que DentAI debe incluir un algoritmo fonético de reconciliación contra el padrón oficial para garantizar grafías correctas.

---

## 5. ACUERDOS Y COMPROMISOS

| ID | Acuerdo / Requisito Clínico | Responsable | Fecha Límite |
| :---: | :--- | :--- | :---: |
| **AC-05** | Implementar regla de aislamiento estricto entre sección Dirección y sección Factura en Smile. | Johan Manosalva (PM) | 05/Dic/2026 |
| **AC-06** | Incorporar validación de número exterior (con soporte para "S/N" y números). | Johan Manosalva (PM) | 08/Dic/2026 |
| **AC-07** | Diseñar pruebas en el módulo de búsqueda y filtro de Preregistro (botón Buscar, código y checkbox). | Johan Manosalva (PM) | 12/Dic/2026 |

---

## 6. FIRMAS DE CONFORMIDAD

```
________________________________________            ________________________________________
      Dr. [Nombre Docente Asesor]                       Johan Alexander Manosalva Peralta
         Docente Asesor Clínico                              Project Manager / Tesista
     Facultad de Estomatología UPCH                      Facultad de Estomatología UPCH
```
