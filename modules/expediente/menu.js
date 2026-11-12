/* DentAI – Submódulo Menú de Expediente y Registros Clínicos (modules/expediente/menu.js)
   Soporte de navegación para las 22 secciones del Expediente de Smile UPCH
   y apertura por voz de filas en la tabla de Registros Clínicos. */

// Diccionario de las 22 secciones del menú lateral izquierdo de Smile
const EXPEDIENTE_MENU_SECTIONS = [
  // NOTA: Eliminamos "general" para evitar colisión con el campo clínico "Apreciación General" de Examen Clínico
  { id: "datos_generales", label: "Datos generales", aliases: ["datos generales", "ir a datos generales", "ver datos generales", "datos del paciente", "expediente datos generales", "seccion datos generales"] },
  { id: "registros_clinicos", label: "Registros clínicos", aliases: ["registros clinicos", "registros clínicos", "registro clinico", "registro clínico", "historia clinica", "historia clínica"] },
  { id: "odontograma_hallazgos", label: "Odontograma hallazgos", aliases: ["odontograma hallazgos", "hallazgos", "odontograma inicial"] },
  { id: "periodontograma", label: "Periodontograma", aliases: ["periodontograma", "periodonto", "sondaje"] },
  { id: "indice_placa", label: "Índice de placa", aliases: ["indice de placa", "índice de placa", "placa bacteriana", "placa"] },
  { id: "indice_sangrado", label: "Índice de sangrado", aliases: ["indice de sangrado", "índice de sangrado", "sangrado"] },
  { id: "indice_retencion", label: "Índice de retención", aliases: ["indice de retencion", "índice de retención", "retencion", "retención"] },
  { id: "indice_higiene_iohs", label: "Índice de higiene iohs", aliases: ["indice de higiene", "índice de higiene", "iohs", "higiene oral"] },
  { id: "examenes_auxiliares", label: "Exámenes auxiliares", aliases: ["examenes auxiliares", "exámenes auxiliares", "auxiliares", "examenes"] },
  { id: "plan_tratamiento", label: "Plan de tratamiento", aliases: ["plan de tratamiento", "tratamiento", "plan de trabajo"] },
  { id: "presupuesto", label: "Presupuesto", aliases: ["presupuesto", "costos", "cotizacion", "cotización"] },
  { id: "odontograma_tratamientos", label: "Odontograma tratamientos", aliases: ["odontograma tratamientos", "tratamientos odontograma"] },
  { id: "interconsulta", label: "Interconsulta", aliases: ["interconsulta", "consulta medica", "especialista"] },
  { id: "solicitud_materiales", label: "Solicitud de materiales", aliases: ["solicitud de materiales", "materiales", "pedir materiales"] },
  { id: "solicitud_laboratorio", label: "Solicitud de laboratorio", aliases: ["solicitud de laboratorio", "laboratorio", "orden de laboratorio"] },
  { id: "solicitud_radiologia", label: "Solicitud de radiología", aliases: ["solicitud de radiologia", "solicitud de radiología", "radiologia", "radiología", "rayos x"] },
  { id: "solicitud_patologia", label: "Solicitud de patología", aliases: ["solicitud de patologia", "solicitud de patología", "patologia", "patología", "biopsia"] },
  { id: "solicitud_cirugia", label: "Solicitud cirugía", aliases: ["solicitud cirugia", "solicitud cirugía", "cirugia", "cirugía"] },
  { id: "estado_cuenta", label: "Estado de cuenta", aliases: ["estado de cuenta", "pagos", "saldos", "deuda"] },
  { id: "imagenes", label: "Imágenes", aliases: ["imagenes", "imágenes", "fotos", "fotografias", "radiografias"] },
  { id: "evolucion", label: "Evolución", aliases: ["evolucion", "evolución", "notas de evolucion", "seguimiento"] },
  { id: "documentos_paciente", label: "Documentos paciente", aliases: ["documentos paciente", "documentos", "archivos", "consentimiento"] }
];

// Tipos de registros clínicos frecuentes dentro de la tabla de Registros Clínicos
const REGISTROS_CLINICOS_TIPOS = [
  { id: "anamnesis", label: "1 ANAMNESIS", aliases: ["anamnesis", "1 anamnesis", "diag anamnesis", "primera anamnesis"] },
  { id: "examen_clinico", label: "2 EXAMEN CLÍNICO", aliases: ["examen clinico", "examen clínico", "2 examen clinico", "2 examen clínico", "segundo examen clinico", "triaje clinico"] },
  { id: "diag_presuntivo", label: "3 DIAGNÓSTICO PRESUNTIVO", aliases: ["diagnostico presuntivo", "diagnóstico presuntivo", "3 diagnostico presuntivo", "presuntivo"] },
  { id: "diag_definitivo", label: "4 DIAGNÓSTICO DEFINITIVO", aliases: ["diagnostico definitivo", "diagnóstico definitivo", "4 diagnostico definitivo", "definitivo"] },
  { id: "eval_diagnostico", label: "DIAG EVALUACIÓN DIAGNÓSTICO", aliases: ["evaluacion diagnostico", "evaluación diagnóstico", "evaluacion", "evaluación"] },
  { id: "protesis", label: "PRÓTESIS PARCIAL REMOVIBLE Y TOTALES", aliases: ["protesis", "prótesis", "protesis parcial", "prótesis parcial", "removible y totales"] }
];

// Normaliza texto para comparación flexible
function normExpText(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Extrae comando de navegación para el menú lateral del Expediente
// Ejemplos: "abre registros clínicos", "ve a odontograma hallazgos", "plan de tratamiento"
function extractExpedienteNav(text) {
  if (!text) return null;
  const clean = normExpText(text);

  // GUARDA CRÍTICA: Si el usuario está dictando términos clínicos de Examen Clínico,
  // como "Apreciación General", "Estado Nutricional", "ABEG", "AREG", etc.,
  // NUNCA interpretarlo como navegación a Datos Generales.
  if (/(?:apreciaci[oó]n|nutrici[oó]n|hidrataci[oó]n|aspectos?\s+generales?|examen\s+general|abeg|areg|ameg|aben|aren|amen|abeh|areh|ameh|lotep|facies|colaborador)/i.test(clean)) {
    return null;
  }

  // Quitar verbos de navegación iniciales
  const trimmed = clean.replace(/^(?:ve\s+a|ir\s+a|abre|abrir|entra\s+(?:a|en)?|entrar\s+(?:a|en)?|mostrar|ver|pasa\s+a|selecciona)\s+(?:el\s+|la\s+|los\s+|las\s+)?(?:menu\s+|pestaña\s+|seccion\s+)?/i, "").trim();

  for (const sec of EXPEDIENTE_MENU_SECTIONS) {
    for (const alias of sec.aliases) {
      const aliasClean = normExpText(alias);
      if (trimmed === aliasClean || clean === aliasClean) {
        return { action: "navegar_expediente", target: sec.label, id: sec.id };
      }
      const regex = new RegExp(`(^|\\s)${aliasClean}(\\s|$)`, "i");
      if (regex.test(clean)) {
        return { action: "navegar_expediente", target: sec.label, id: sec.id };
      }
    }
  }

  return null;
}

// Extrae comando para abrir una fila específica de la tabla de Registros Clínicos
// Ejemplos: "abre examen clínico", "abre 2 examen clínico", "abre anamnesis", "abre registro 26", "abre número 25"
function extractOpenRegistroClinico(text) {
  if (!text) return null;
  const clean = normExpText(text);

  // 1. Apertura por número o código de registro (ej: "abre registro 26", "abre número 25", "registro 36")
  const mNum = clean.match(/(?:registro|numero|número|fila|codigo|código)\s*(?:numero|número)?\s*(\d{1,4})/i);
  if (mNum) {
    return { action: "abrir_registro_clinico", target: mNum[1], tipo: "numero" };
  }

  // 2. Apertura por tipo de registro clínico (ej: "abre examen clínico", "abre anamnesis", "abre diagnóstico definitivo")
  for (const reg of REGISTROS_CLINICOS_TIPOS) {
    for (const alias of reg.aliases) {
      const aliasClean = normExpText(alias);
      if (clean.includes(aliasClean)) {
        return { action: "abrir_registro_clinico", target: reg.label, tipo: "nombre", id: reg.id };
      }
    }
  }

  return null;
}
