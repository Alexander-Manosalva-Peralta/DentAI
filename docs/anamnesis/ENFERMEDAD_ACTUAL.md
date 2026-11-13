# Anamnesis: A - Enfermedad actual

Primera etapa en `feat/anamnesis-voz-nlp`, basada en el HTML de Smile QA compartido el 12/11/2026. Las secciones B (Funciones bio), C (Cuestionario) y D (Antecedentes personales) se trabajarán después.

## Campos reales

| Campo | Atributo `name` | Tipo / opciones |
| --- | --- | --- |
| Motivo de consulta | `respuestas[10_1_0_1]` | Texto |
| Última visita: cantidad | `respuestas[20_1_10_1]` | 1 a 31 |
| Última visita: unidad | `respuestas[20_1_20_1]` | AÑO, DÍA, MES, SEMANA, NUNCA ANTES |
| Última visita: observación | `respuestas[20_1_30_1]` | Texto |
| Tiempo de enfermedad: cantidad | `respuestas[20_1_40_1]` | 1 a 31 |
| Tiempo de enfermedad: unidad | `respuestas[20_1_50_1]` | AÑO, DÍA, MES, SEMANA, NUNCA ANTES |
| Tiempo de enfermedad: observación | `respuestas[20_1_60_1]` | Texto |
| Inicio | `respuestas[30_1_0_1]` | Brusco, Incidioso, No aplica |
| Curso | `respuestas[40_1_0_1]` | Estacionario, Progresivo, Regresivo, Intermitente, No aplica |
| Signos y síntomas: aplica | `respuestas[50_1_0_1]` | Aplica, No aplica |
| Signos y síntomas: detalle | `respuestas[60_1_0_1]` | Texto, activado por Aplica |
| Relato: aplica | `respuestas[70_1_0_1]` | Aplica, No aplica |
| Relato: detalle | `respuestas[80_1_0_1]` | Texto, activado por Aplica |
| Informe de vacuna covid-2019 | `respuestas[90_1_0_1]` | Texto |

Smile muestra **Incidioso**. Se reconoce también el dictado «insidioso» y se selecciona el valor disponible. Las opciones sin atributo `value` conservan el valor nativo de Smile, incluidos sus espacios.

## Prueba manual en QA

1. En `chrome://extensions`, verifica que DentAI corresponda a la carpeta `C:\Users\USER\DentAI` y pulsa Recargar. Si aún no está cargada desde esa carpeta, usa Cargar descomprimida y selecciónala.
2. Abre el registro de Anamnesis de un paciente de capacitación. Abre el panel DentAI con `Alt+Shift+D` y actualiza los campos.
3. Dicta el campo y su valor juntos, o nombra el campo, espera a que DentAI diga **Dicta el valor** y después dicta el contenido. Revisa la propuesta y di **confirmar** para escribirla en el formulario.
4. Comprueba los controles en Smile. El guardado del registro se revisa por separado.

| Dictado | Resultado esperado |
| --- | --- |
| Motivo de consulta dolor al masticar | Texto del motivo |
| Motivo de consulta → pausa → el valor dolor de muelas | Selecciona el campo, espera el valor y propone «dolor de muelas» |
| Última visita odontológica hace seis meses | Cantidad 6 y unidad MES |
| Última visita nunca antes | Cantidad vacía y unidad NUNCA ANTES |
| Tiempo de enfermedad hace tres días | Cantidad 3 y unidad DÍA |
| Tiempo de enfermedad dos semanas, observación dolor intermitente | Cantidad 2, SEMANA y observación indicada |
| Observación de la última visita control preventivo | Solo la observación de última visita |
| Inicio insidioso | Incidioso |
| Corrige el curso a regresivo | Regresivo |
| Signos y síntomas principales hinchazón del lado derecho | Aplica y texto del detalle |
| Signos y síntomas no aplica | No aplica; retira el detalle de la propuesta |
| Relato el paciente refiere dolor constante desde hace tres días | Aplica y relato completo |
| Informe de vacuna covid-2019 refiere tres dosis | Texto del informe |

No se asignan duraciones a partir de frases internas del relato. Una duración fuera de 1 a 31 o una unidad ausente pide corrección y no modifica la propuesta. Los comandos de estos campos se resuelven localmente antes de llamar a Gemini. Al confirmar, se activan primero los selectores y después se escriben los detalles; los campos que fallen permanecen pendientes.

Al nombrar un campo sin valor, la selección dura un minuto y está asociada a la página y al frame escaneados. La siguiente intervención puede ser el contenido directo o empezar por «el valor», «el texto» o «la respuesta». Una acción como confirmar, descartar o navegar termina esa selección; no se utiliza como texto clínico. Nombrar otro campo cambia la selección.

## Verificación local

```text
npm ci --ignore-scripts
npm test
```

Las pruebas usan `tests/fixtures/anamnesis-actual.html`, extraído del HTML compartido conservando nombres, opciones y dependencias. No contiene respuestas, identificadores del paciente, credenciales ni scripts de Smile. jsdom simula la activación de las filas dependientes; el micrófono, Select2 real y el comportamiento de guardado necesitan validación manual en QA.
