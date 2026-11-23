# Dictado de Anamnesis: secciones B a E

Trabaja en el entorno QA y abre **1 ANAMNESIS**. Después de recargar DentAI en `chrome://extensions`, abre su panel y actualiza los campos.

Puedes decir el campo y su valor juntos, o nombrarlo, esperar a que termine «Dicta el valor» y responder. Los valores aparecen en **Propuesta clínica**. Di **confirmar** para escribirlos en Smile, o **descartar** para retirar la propuesta. Confirmar llena los controles; el guardado del registro es una acción aparte.

## B — Funciones bio

Se reconocen apetito, sed, sudoración, deposición y orina. Las opciones reales de Smile son **Aparentemente normal**, **Disminuido** y **Aumentado**. Se acepta «normal», y las variantes «disminuida» y «aumentada».

Ejemplos de intervenciones sucesivas:

```text
Apetito
Disminuido
Descripción
Solo tolera alimentos blandos.
Confirmar
```

También puedes decir «sed aumentada descripción toma agua con mucha frecuencia», revisar y confirmar. La descripción corresponde al estado seleccionado. Aparentemente normal no tiene cuadro de descripción.

## C — Cuestionario

Puedes decir **pregunta uno**, **número uno** o simplemente **uno / 1**. Hay preguntas del 1 al 16. Después puedes decir **marcar**, **desmarcar** y **descripción**. La descripción es independiente de la casilla: dictar texto no marca automáticamente una respuesta positiva.

```text
1
Marcar
Descripción
Sangra al cepillarse.
Confirmar
```

También se acepta «pregunta dos marcar descripción refiere una reacción previa». Para la pregunta 13, puedes decir «pregunta trece», «descripción», «3», «confirmar». Ese 3 se escribe como descripción de la pregunta 13.

Para el cuadro final: «evaluación del cuestionario» y luego el texto, o todo junto en una intervención.

## D — Antecedentes personales

| Campo | Ejemplos |
| --- | --- |
| RRSS | «RRSS sí», «RRSS parejas dos», «RRSS comentario …» |
| RHS | «RHS no», «RHS parejas uno», «RHS comentario …» |
| Tabaco | «consume tabaco sí», «tabaco cantidad cinco por día», «tabaco tiempo diez años» |
| Alcohol | «alcohol sí», «alcohol cantidad dos por semana», «alcohol tiempo tres años» |
| Drogas | «drogas no», «drogas cantidad uno por semana», «drogas tiempo dos meses», «drogas tipo …» |

RRSS también se puede pronunciar «erre erre ese ese», y RHS, «erre hache ese». Tras nombrar el hábito puedes continuar con «cantidad», «periodicidad», «tiempo», «parejas», «comentario» o «tipo», según los controles que ese hábito tenga.

Los detalles de RRSS y RHS se habilitan con **Si**. Los detalles de consumo también se habilitan con **Si**. Dictar un detalle específico activa su selector correspondiente en la misma propuesta. Los selectores de cantidad y tiempo de consumo admiten del 1 al 31, con día, semana, mes o año como unidad. Los números de parejas usan el campo numérico del formulario.

## E — Antecedentes familiares

Se seleccionan por separado **padre**, **madre**, **hermano uno**, **hermano dos**, **hermano tres**, **hijos** y **otros**.

```text
Familiar padre
Marcar
Comentario
Texto dictado para el padre.
Madre marcar
Confirmar
```

«Desmarcar» retira únicamente la opción del familiar elegido. El comentario de cada familiar se escribe en su cuadro propio. Dictar «familiar madre comentario …» propone marcar a la madre para habilitar su comentario.

## Patológicos y catálogo de diagnósticos CIE

1. Di **añadir diagnóstico personal** para el bloque de antecedentes personales. Para un familiar ya marcado y confirmado, usa **añadir diagnóstico padre**, **añadir diagnóstico madre**, etc.
2. Di **tipo de diagnóstico CIE10** (u otra opción real: UPCH, CIEOE u OTROS), revisa y **confirma**.
3. Espera a que Smile cargue su catálogo y di **actualizar campos**. Dicta **clasificación** seguida del texto exacto de una opción disponible y confirma.
4. Espera la carga de diagnósticos y actualiza los campos. Dicta **diagnóstico** seguido de una opción disponible o de su código, si aparece al inicio de una única opción del catálogo. Confirma.
5. Opcionalmente dicta **comentario del diagnóstico** y el texto; confirma.
6. Di **guardar diagnóstico** para pulsar Guardar dentro de ese cuadro. Verifica la nueva fila en el bloque adecuado. **Cerrar diagnóstico** cierra el cuadro.

El catálogo se obtiene de las opciones que Smile realmente haya cargado. DentAI no inventa códigos ni transforma un comentario clínico en un diagnóstico. Si falta una opción, solicita actualizar los campos. «Guardar diagnóstico» pide confirmar primero cualquier propuesta pendiente del cuadro.

## Contexto y pruebas

La espera del valor dura un minuto. La selección para continuar con «descripción», «comentario», etc. dura dos minutos y se renueva al dictar un dato reconocido. Nombrar otra pregunta o campo cambia el contexto. Si haces una pausa larga, vuelve a decir su nombre o número. Navegar o descartar termina la selección.

Las pruebas automatizadas usan una copia del formulario sin respuestas, datos personales ni scripts de Smile. Comprueban las 16 casillas, los siete familiares, las dependencias, los campos repetidos, el dictado con pausas y la selección del catálogo con datos simulados. El micrófono, las cargas AJAX y el guardado real requieren una pasada manual en Smile QA.
