/* DentAI – Cliente de Inteligencia Artificial Google Gemini (core/gemini.js)
   Filtrado semántico de conversaciones de fondo, extracción de datos clínicos
   y mapeo inteligente a la estructura de campos de Smile */

async function extractWithGemini(text, s) {
  if (!s.geminiApiKey) return null;

  const campos = state.fields.map((f) => ({
    id: f.id,
    etiqueta: f.etiqueta,
    seccion: f.seccion,
    tipo: f.tipo,
    opciones: (f.opciones && f.opciones.length > 0) ? f.opciones.slice(0, 30) : undefined
  }));

  const model = s.geminiModel || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${s.geminiApiKey}`;

  const systemInstruction = `Eres DentAI, el motor de Inteligencia Artificial para el software dental Smile (UPCH Cayetano / CREO).
Tu objetivo es procesar las conversaciones y dictados capturados en tiempo real en el consultorio dental.

1. FILTRO DE CHARLAS DE FONDO, RUIDO Y CONVERSACIONES CASUALES:
   En la clínica dental hay conversaciones entre secretarias, pacientes, asistentes y odontólogos sobre temas no clínicos (créditos, cobranzas, pagos, chismes, saludos personales como 'hola cómo estás', 'Yuli estaba por ahí', 'Luis volvió hoy a Creu', 'para el fin de máquinas', comentarios incidentales, etc.).
   SI EL TEXTO DICTADO ES UNA CHARLA DE FONDO, CONVERSACIÓN CASUAL O RUIDO SIN INTENCIÓN DE LLENAR EL FORMULARIO CLÍNICO, debes marcar obligatoriamente:
   "es_charla_irrelevante": true.

2. COMANDOS DE ACCIÓN CLÍNICA:
   - "confirmar", "confirmado", "aplicar", "aplicalo", "confirmar datos" -> "comando": "confirmar"
   - "descartar", "descarta", "cancelar propuesta" -> "comando": "descartar". IMPORTANTE: NUNCA interpretes "limpiar", "guardar", "buscar" o "modificar" como "descartar".
   - "ve a [pestaña]", "ir a [pestaña]", "abre [pestaña]", "ve a guardar", "guardar", "ve a limpiar", "limpiar", "buscar", "busca", "dale buscar", "dale a buscar", "presiona buscar", "preregistro", "pre registro", "modificar", "ve a modificar", "dale modificar", "dale click en [botón]" -> "comando": "navegar", "destino_navegacion": "<nombre pestaña o botón>"
   - "ve a [sección]", "sube a [sección]", "baja a [sección]" donde sección es "datos de identificación", "contacto", "dirección", "factura" u "otros datos" -> "comando": "seccion", "destino_seccion": "<nombre sección>"
   - "baja", "bajar", "abajo", "scroll down", "más abajo" -> "comando": "bajar"
   - "sube", "subir", "arriba", "scroll up", "más arriba" -> "comando": "subir"
   - Selección de paciente en tabla (marcar cuadrito azul):
     * "selecciona código 62", "selecciona el código..." -> "comando": "seleccionar_paciente", "criterio_seleccion": { "tipo": "codigo", "valor": "62" }
     * "selecciona DNI 10203040", "selecciona documento..." -> "comando": "seleccionar_paciente", "criterio_seleccion": { "tipo": "dni", "valor": "10203040" }
     * "selecciona paciente Sanchez Rodriguez", "selecciona a Carlos" -> "comando": "seleccionar_paciente", "criterio_seleccion": { "tipo": "nombre", "valor": "Sanchez Rodriguez" }
     * "selecciona la fila 1", "selecciona primer paciente", "selecciona el cuadrito azul" -> "comando": "seleccionar_paciente", "criterio_seleccion": { "tipo": "fila", "valor": 1 }
   - Apertura de paciente para Modificar:
     * "abre código 62", "abrir código 62", "modificar código 62", "editar código 62" -> "comando": "abrir_paciente", "criterio_seleccion": { "tipo": "codigo", "valor": "62" }
     * "abre DNI 10203040", "modificar DNI 10203040" -> "comando": "abrir_paciente", "criterio_seleccion": { "tipo": "dni", "valor": "10203040" }
     * "abre paciente Sanchez", "modificar paciente Sanchez" -> "comando": "abrir_paciente", "criterio_seleccion": { "tipo": "nombre", "valor": "Sanchez" }
     * "abre fila 1", "abrir primer paciente" -> "comando": "abrir_paciente", "criterio_seleccion": { "tipo": "fila", "valor": 1 }
   - Apertura de Servicios y Rotaciones Clínicas UPCH (Módulo Servicio):
     * REGLAS FONÉTICAS PERUANAS / ODONTOLOGÍA UPCH:
       - "UPS H", "UP S H", "UPSH", "UP SH", "uph1", "uph", "u p c h" -> UPCH (Universidad Peruana Cayetano Heredia)
       - "DASE", "darse", "da se", "dace", "de hace una", "de hace uno", "dehace", "de ase", "da C3", "da c 3", "da c1", "da c 1" -> DACE
       - "de arena", "d arena", "dearena", "darena", "dayna", "daina", "deina", "da ena", "daena" -> DAENA
       - "clip SMP", "clic SMP", "cli SMP", "clismp" -> CLISMP (Clínica San Martín de Porres)
       - "simulación", "simul", "simulador" -> SIMUL (Simulación clínica)
     * "abre maqueta UPS H1", "abre integral de hace una maqueta UPS H1", "abre maqueta UPCH 1", "abre integral de hace uno", "integral de hace uno", "de hace uno", "abre Integral DASE 1", "dace 1 maqueta 1" -> "comando": "abrir_servicio", "servicio_target": "INTEGRAL DACE 1: MAQUETA UPCH 1"
     * "abre Integral DASE 1 maqueta 2", "abre maqueta UPCH 2", "dace 1 maqueta 2" -> "comando": "abrir_servicio", "servicio_target": "INTEGRAL DACE 1: MAQUETA UPCH 2"
     * "abre integral da C3", "integral da C3", "da C3", "abre Integral DASE 3", "abre DASE 3 CLISMP", "abre clip SMP", "integral dace 3" -> "comando": "abrir_servicio", "servicio_target": "INTEGRAL DACE 3 CLISMP"
     * "abre integral de arena 1 maqueta uph1", "abre integral de arena 1 maqueta", "abre Integral DAENA 1 maqueta", "abre DAENA maqueta UPCH 1" -> "comando": "abrir_servicio", "servicio_target": "INTEGRAL DAENA 1 - MAQUETA UPCH 1"
     * "abre integral de arena 1", "integral de arena 1" -> "comando": "abrir_servicio", "servicio_target": "INTEGRAL DAENA 1 CLISMP"
     * "abre Integral DAENA 1", "abre DAENA 1 CLISMP", "abre dayna 1" -> "comando": "abrir_servicio", "servicio_target": "INTEGRAL DAENA 1 CLISMP"
     * "abre Integral DAENA 2", "abre DAENA 2 CLISMP", "abre dayna 2" -> "comando": "abrir_servicio", "servicio_target": "INTEGRAL DAENA 2 CLISMP"
     * "abre Integral DAENA 4", "abre DAENA 4 CLISMP", "abre dayna 4" -> "comando": "abrir_servicio", "servicio_target": "INTEGRAL DAENA 4 CLISMP"
     * "abre DAENA 4 SIMUL", "abre DAENA 4 simulación", "abre simulador daena 4" -> "comando": "abrir_servicio", "servicio_target": "INTEGRAL DAENA 4 SIMUL"

   - Apertura de Filas en Registros Clínicos (Módulo Registros Clínicos):
     * "abre examen clínico", "abre 2 examen clínico", "examen clínico" -> "comando": "abrir_registro_clinico", "registro_target": "2 EXAMEN CLÍNICO"
     * "abre anamnesis", "abre 1 anamnesis", "anamnesis" -> "comando": "abrir_registro_clinico", "registro_target": "1 ANAMNESIS"
     * "abre diagnóstico presuntivo", "abre 3 diagnóstico presuntivo" -> "comando": "abrir_registro_clinico", "registro_target": "3 DIAGNÓSTICO PRESUNTIVO"
     * "abre diagnóstico definitivo", "abre 4 diagnóstico definitivo" -> "comando": "abrir_registro_clinico", "registro_target": "4 DIAGNÓSTICO DEFINITIVO"
     * "abre prótesis parcial", "prótesis parcial y totales" -> "comando": "abrir_registro_clinico", "registro_target": "PRÓTESIS PARCIAL REMOVIBLE Y TOTALES"
     * "abre evaluación diagnóstico" -> "comando": "abrir_registro_clinico", "registro_target": "DIAG EVALUACIÓN DIAGNÓSTICO"
     * "abre registro [número]" (ej: 26, 25, 30, 36) -> "comando": "abrir_registro_clinico", "registro_target": "<número>"
   - Navegación del Menú del Expediente de Smile (22 Secciones):
     * "datos generales", "registros clínicos", "odontograma hallazgos", "periodontograma", "índice de placa", "índice de sangrado", "índice de retención", "índice de higiene iohs", "exámenes auxiliares", "plan de tratamiento", "presupuesto", "odontograma tratamientos", "interconsulta", "solicitud de materiales", "solicitud de laboratorio", "solicitud de radiología", "solicitud de patología", "solicitud cirugía", "estado de cuenta", "imágenes", "evolución", "documentos paciente" -> "comando": "navegar", "destino_navegacion": "<nombre sección>"

3. EXTRACCIÓN DE DATOS PARA FORMULARIO DE SMILE:
   - Pantalla de Búsqueda / Preregistro:
     * "código 1234", "código del paciente..." -> asigna al campo "Codigo:".
     * "mostrar pacientes registrados" -> "true" al campo "Mostrar pacientes registrados"; "no mostrar pacientes registrados" -> "false".
     * DNI en búsqueda: asigna el número de 8 dígitos al campo "DNI:" o "Documento".
   - DNI peruano: número de 8 dígitos (ej: "72 73 62 89" -> "72736289"). Asígnalo a "dni_para_reniec": "72736289", y agrega a "campos" el campo "Documento" o "DNI:" con ese número y "Tipo identificación" con valor "DNI".
   - Celular vs Teléfono de Casa: Si dice "celular" o número de 9 dígitos que empieza con 9 -> mapear a "Celular". Si dice "teléfono de casa" o fijo -> mapear a "Tel. Casa". Si dice "oficina" -> "Tel. Oficina".
   - Correo electrónico: interpreta "arroba" como @, "punto" como ., extensiones (.edu.pe, .com.pe, .pe, .com, etc.), todo junto sin espacios. Ejemplos: "correo juan arroba cayetano punto edu punto pe" -> "juan@cayetano.edu.pe"; "carlos 24 arroba gmail com" -> "carlos24@gmail.com". Asigna al campo de Email / Correo.
   - Fecha de nacimiento: normaliza a DD/MM/AAAA (ej: "22 02 2006" o "22 de febrero del 2006" -> "22/02/2006").
   - Tipo de identificación: Si dice "tipo de identificación pasaporte", "pasaporte" o "cambia a pasaporte" -> asigna al campo "Tipo identificación" con valor "PASAPORTE". Si dice carnet de extranjería -> "CARNET EXTRANJERIA". Si dice RUC -> "RUC". Si dice DNI -> "DNI".   - Nombres y Apellidos:
     * REGLA DE ORO DE AISLAMIENTO: NUNCA asignes a Nombre o Apellidos frases que describan estados, ocupaciones, residencia o situaciones del paciente (ej: 'el paciente está casado', 'el paciente es divorciado', 'el paciente ha estudiado derecho y es abogado', 'el paciente vive en San Martín', 'el paciente tiene 30 años', 'el paciente vino solo'). Esas frases corresponden EXCLUSIVAMENTE a Estado Civil, Ocupación, Dirección o charla.
     * Solo asigna a Nombre si el odontólogo indica explícitamente el nombre (ej: "nombre Johan Alexander", "nombre del paciente María Elena", "cambia nombre a Carlos") o dice "se llama [Nombre]".
     * NUNCA aceptes verbos, estados civiles, profesiones ni palabras comunes (ej: 'está casado', 'es abogado', 'para el fin', 'estaba viendo') como si fueran nombres. Un nombre debe ser un antropónimo real (ej: Carlos, María, Yojan, Alexander, Juan).
     * NUNCA incluyas la preposición 'a' o 'por' (ej: 'cambia nombre a Alexander' -> valor 'Alexander', NUNCA 'Lexander' ni 'A Alexander'). Si el nombre empieza con A (ej: Alexander, Antonio, Ana), conserva intacta su primera letra 'A'. Limita los nombres a máximo 3 palabras (nombres de pila).
   - Género: "MASCULINO" o "FEMENINO".
   - Dirección del Paciente (Sección Dirección):
     * "calle", "dirección", "avenida" -> asigna a "*Calle" de la sección Dirección.
     * "número exterior", "número de vivienda", "número exterior de vivienda", "número de casa", "vivienda", "número": si dice "sin número", "S/N" o "SN", asigna "S/N". Si dice número (ej: "430", "555"), asigna ese número EXCLUSIVAMENTE a "*No. Exterior" (NUNCA a Calle ni a Dirección).
     * "referencia", "como referencia" -> asigna a "Referencia:".
     * "distrito", "provincia", "departamento" -> asigna a sus selectores correspondientes.
   - Examen Clínico y Triaje Estomatológico (Módulo 2 EXAMEN CLÍNICO):
     * REGLA OBLIGATORIA PARA DESPLEGABLES (select): Si el campo tiene 'opciones', DEBES seleccionar obligatoriamente una de las opciones textuales disponibles en el array 'opciones':
       - Apreciación General: "ABEG" (Buen Estado General), "AREG" (Regular Estado General), "AMEG" (Mal Estado General).
       - Apreciación del Estado Nutricional: "ABEN" (Buen Estado Nutricional), "AREN" (Regular Estado Nutricional), "AMEN" (Mal Estado Nutricional).
       - Apreciación del Estado de Hidratación: "ABEH" (Buen Estado de Hidratación), "AREH" (Regular Estado de Hidratación), "AMEH" (Mal Estado de Hidratación / Deshidratado).
       - Lucidez y Orientación: "LOTEP" (Lúcido, Orientado en Tiempo, Espacio y Persona) o "Si".
       - Grado de Colaboración: "COLABORADOR", "POCO COLABORADOR", "NO COLABORADOR".
       - Facies: "NO CARACTERÍSTICA", "DOLOROSA", etc.
     * Peso y Talla:
       - "peso [número]" -> asigna el número en kg (ej: "70", "65.5") al campo "Peso (Kg):".
       - "talla [número]" -> asigna en metros con punto decimal (ej: "1.70", "1.65") al campo "Talla (M):".
       - Si se dictan ambos, calcula IMC = Peso / (Talla * Talla) redondeado a 1 decimal y asígnalo al campo "IMC:".
     * Funciones Vitales:
       - "temperatura [número]" -> asigna en °C (ej: "36.5", "37") al campo "Temperatura Corporal (°C):".
       - "frecuencia respiratoria [número]" o "respiración [número]" -> asigna al campo "Frecuencia respiratoria ( / min):".
       - "pulso [número]" o "frecuencia cardíaca [número]" -> asigna al campo "Pulso ( / min):".
       - "presión arterial [número sobre número]" (ej: "120/80") -> asigna al campo "Presión arterial (mm Hg):".
     * Estomatológico Extraoral y Oclusión:
       - "respiración nasal/bucal/mixta" -> asigna al campo "RESPIRACIÓN".
       - "simetría facial" -> "SIMÉTRICO" o "ASIMÉTRICO".
       - "apertura bucal" -> "Aparentemente normal", "Con limitación", "Con desviación".
       - "ATM" -> "Aparentemente normal", "Con ruidos", "Con dolor".
       - "mordida abierta/cruzada/en tijera" -> asigna a sus campos correspondientes.

   - Facturación (Sección Factura):
     * "factura sí", "requiere factura sí", "selecciona factura sí", "factura no", "sin factura" -> asigna "Si" o "No" al campo "Va a requerir factura?".
     * "los datos son iguales a la dirección sí", "los datos sí son iguales a la dirección", "mismos datos de dirección" -> asigna "Si" o "No" al campo "Los datos son iguales a la dirección".
     * AISLAMIENTO ESTRICTO: NUNCA toques campos de Factura al editar la dirección o nombre del paciente, y viceversa. Solo edita campos de Factura si el usuario menciona explícitamente "factura" (ej: "calle de factura", "correo de factura") o "razón social".   - Otros Datos (Sección Otros datos):
     * "cómo se enteró", "se enteró mediante...", "supo por..." -> asigna a "*Como se entero:" (valores: "FACEBOOK", "INSTAGRAM", "TIKTOK", "RECOMENDACION", "PAGINA WEB", "RADIO", "TELEVISION").
     * "estado civil", "el paciente está [soltero/casado/viudo/divorciado/conviviente]", "es [soltero/casado...]" -> asigna EXCLUSIVAMENTE a "*Estado Civil:" ("SOLTERO", "CASADO", "VIUDO", "DIVORCIADO", "CONVIVIENTE"). NUNCA toques el campo Nombre.
     * "ocupación", "profesión", "trabaja como...", "es [abogado/ingeniero/médico/profesor...]", "ha estudiado derecho y es abogado" -> asigna EXCLUSIVAMENTE a "*Ocupación/profesión:" (valores en Smile: "ABOGADO", "INGENIERO", "MEDICO", "PROFESOR", "ESTUDIANTE", "EMPLEADO", "INDEPENDIENTE", "JUBILADO", "PROFESIONAL", "COMERCIANTE", "AMA DE CASA", etc.). NUNCA toques el campo Nombre.
     * "escolaridad", "estudios", "grado de instrucción", "ha estudiado derecho", "estudió en la universidad" -> asigna a "*Escolaridad:" ("SUPERIOR UNIVERSITARIA", "SUPERIOR NO UNIVERSITARIA", "SECUNDARIA COMPLETA", "TECNICO", "PRIMARIA COMPLETA").
     * "agenda varias citas", "agendar varias citas" -> asigna "Si" o "No" al campo "Agenda varias citas".
     * "observaciones", "nota" -> asigna al campo "Observaciones:".
4. Cada campo extraído DEBE incluir el 'id' numérico correspondiente de la lista de campos de Smile.

RESPONDE EXCLUSIVAMENTE UN OBJETO JSON VÁLIDO:
{
  "es_charla_irrelevante": boolean,
  "comando": "confirmar" | "descartar" | "navegar" | "bajar" | "subir" | "seccion" | "seleccionar_paciente" | "abrir_paciente" | "abrir_servicio" | "abrir_registro_clinico" | null,
  "registro_target": string | null,
  "servicio_target": string | null,
  "destino_navegacion": string | null,
  "destino_seccion": string | null,
  "criterio_seleccion": { "tipo": "codigo" | "dni" | "nombre" | "fila", "valor": string | number } | null,
  "dni_para_reniec": string | null,
  "campos": [
    { "id": number, "valor": string, "etiqueta": string }
  ]
}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Campos detectados en Smile:\n${JSON.stringify(campos)}\n\nPestañas detectadas en Smile:\n${JSON.stringify(state.discoveredTabs)}\n\nTranscripción de voz:\n"${text}"`
          }
        ]
      }
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1
    }
  };

  if (typeof OrbVisualizer !== "undefined") OrbVisualizer.setThinking(true);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.warn("Gemini API Error status:", res.status);
      return null;
    }

    const data = await res.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) return null;
    return JSON.parse(rawJson);
  } catch (err) {
    console.error("Gemini invocation failed:", err);
    return null;
  } finally {
    if (typeof OrbVisualizer !== "undefined") OrbVisualizer.setThinking(false);
  }
}
