/* DentAI – Módulo Expediente: Examen Clínico (modules/expediente/examen_clinico.js)
   Desarrollado para: Triaje y Evaluación Estomatológica Smile UPCH (Yojan Manosalva)
   Campos cubiertos:
   - A - GENERAL: Ectoscopia (ABEG/AREG/AMEG + observaciones, Nutrición + observaciones, Hidratación + observaciones,
     Lucidez y Orientación checkbox, Persona con necesidades especiales, Facies/Fascies, Grado de Colaboración)
   - PESO Y TALLA: Peso (Kg), Talla (M), IMC con cálculo automático
   - PIEL Y ANEXOS: Temperatura (Normal/Aumentada/Disminuida + observaciones), Lesiones Anterior/Posterior (Ausentes/Presentes, Editar modal interactivo), Anexos (Normal/Alterado)
   - FUNCIONES VITALES: Temperatura Corporal (°C), Frecuencia respiratoria (/min), Pulso (/min), Presión arterial (mm Hg), Observación con limpieza estricta
   - B - ESTOMATOLÓGICO EXTRAORAL: Respiración (Nasal/Bucal + Describa), Otros hábitos (Ausentes/Presentes + Describa), ATM, Simetría Facial, Apertura bucal
   - COMANDOS INTERACTIVOS: Imagen interactiva de lesiones (abrir, asignar lesión en región, eliminar tabla por región, cerrar modal)
*/

// Lista de tipos de lesiones reconocidas en el modal interactivo de Smile
const TIPOS_LESIONES_INTERACTIVAS = [
  "AMPOLLA", "AUMENTO DE VOLUMEN", "CORTICALIZADO", "MÁCULA", "MALFORMACIONES",
  "MIXTO", "NO CORTICALIZADO", "NÓDULO", "OTRO", "PÁPULA", "PLACA",
  "QUISTE APICAL", "QUISTE ÓSEO", "QUISTE TEJIDO BLANDO", "RADIOLÚCIDO",
  "RADIOPACO", "TUMOR INFILTRANTE", "TUMOR NO INFILTRANTE", "ÚLCERA PROFUNDA",
  "ÚLCERA SUPERFICIAL", "VESÍCULA"
];

// Normalizador fonético y de variantes de reconocimiento de voz para siglas clínicas (NLP Manos Libres)
function normalizeClinicalAcronyms(text) {
  if (!text) return "";
  let t = text;

  // 0. Limpiar muletillas de inicio en dictado continuo/corrido
  t = t.replace(/^(?:listo|ya|bueno|bien|ok|a\s+ver|ahora|siguiente|luego)[,\s]+/gi, "");

  // 1. ABEH / AREH / AMEH (tolerancia a 'hache', 'h' final, letras separadas, terminación en 'a')
  t = t.replace(/\b(?:a\s+meh\s+h(?:ache)?|ameh\s+h(?:ache)?|ame\s+hache|a\s+me\s+h|a\s+m\s+e\s+h|a\s+meh|ameh|am\s+eh|a\s+m\s+h|amh|ameha|dameh)\b/gi, "AMEH");
  t = t.replace(/\b(?:a\s+reh\s+h(?:ache)?|areh\s+h(?:ache)?|are\s+hache|a\s+re\s+h|a\s+r\s+e\s+h|a\s+reh|areh|ar\s+eh|a\s+r\s+h|arh|a\s+red\s+h|red\s+h(?:ache)?|areha|dareh)\b/gi, "AREH");
  t = t.replace(/\b(?:a\s+beh\s+h(?:ache)?|abeh\s+h(?:ache)?|abe\s+hache|a\s+be\s+h|a\s+b\s+e\s+h|a\s+beh|abeh|ab\s+eh|a\s+b\s+h|abh|abeha|dabeh)\b/gi, "ABEH");

  // 2. ABEG / AREG / AMEG (tolerancia a fonética con 'j', 'ja', 'g', letras separadas)
  // AMEG: amej, ameja, a meja, a meg, a mek, a med, amig, amec
  t = t.replace(/\b(?:ameg|amej|ameja|a\s+meja|a\s+meg|a\s+mek|a\s+m\s+e\s+g|am\s+eg|a\s+med|amec|amig|dameg)\b/gi, "AMEG");
  // AREG: arej, areja, a reja, arg, a reg, a rek, a red, a rec, a rex
  t = t.replace(/\b(?:areg|arej|areja|a\s+reja|arg|a\s+reg|a\s+r\s+e\s+g|ar\s+eg|a\s+rek|a\s+red|a\s+rec|a\s+rex|dared)\b/gi, "AREG");
  // ABEG: abej, abeja, aveja, abg, a beg, a veg, aveg, a b e g, ab eg
  t = t.replace(/\b(?:abeg|abej|abg|abeja|aveja|a\s+beg|a\s+veg|aveg|a\s+b\s+e\s+g|ab\s+eg|dabeg)\b/gi, "ABEG");

  // 3. ABEN / AREN / AMEN (tolerancia a 'a rem', 'amén', 'a ven', ARN, a reen, etc.)
  t = t.replace(/\b(?:aben|a\s+ben|a\s+ven|aven|a\s+b\s+e\s+n|ab\s+en|ab\s+n|daben)\b/gi, "ABEN");
  t = t.replace(/\b(?:aren|a\s+rem|arem|a\s+ren|a\s+reen|reen|arn|a\s+r\s+n|a\s+r\s+e\s+n|ar\s+en|ar\s+n|daren)\b/gi, "AREN");
  t = t.replace(/\b(?:amen|am[eé]n|a\s+men|a\s+m\s+e\s+n|am\s+en|am\s+n|damen)\b/gi, "AMEN");

  // 4. Casos donde 'red' o 'are' fue reconocido por 'AREG' o 'AREH'
  const isHydrationContext = /(?:deshidratad|hidrataci[oó]n|mucosas)/i.test(t);
  const targetSigla = isHydrationContext ? "AREH" : "AREG";

  t = t.replace(/\b((?:(?:escribir|escribe|cambiar|cambia|editar|edita|modificar|modifica|borrar|borra|vaciar|vacia|poner|anotar)(?:\s+(?:en|dentro\s+de))?|dentro\s+de|en)\s+)(?:red|are|a\s+re)\b/gi, `$1${targetSigla}`);

  // Casos aislados tras 'apreciación general'
  t = t.replace(/\b((?:apreciaci[oó]n\s+general|apreciaci[oó]n)\s+)(?:are|a\s+re|red)\b/gi, "$1AREG");
  t = t.replace(/\b((?:apreciaci[oó]n\s+general|apreciaci[oó]n)\s+)(?:ame|a\s+me)\b/gi, "$1AMEG");
  t = t.replace(/\b((?:apreciaci[oó]n\s+general|apreciaci[oó]n)\s+)(?:abe|a\s+be|ab)\b/gi, "$1ABEG");

  // 5. Casos truncados con contexto de Estado Nutricional
  t = t.replace(/\b((?:(?:apreciaci[oó]n\s+del\s+)?estado\s+nutricional|nutrici[oó]n)\s+)(?:ab|a\s+b|abe|a\s+be)\b/gi, "$1ABEN");
  t = t.replace(/\b((?:(?:apreciaci[oó]n\s+del\s+)?estado\s+nutricional|nutrici[oó]n)\s+)(?:are|a\s+re|arn|reen)\b/gi, "$1AREN");
  t = t.replace(/\b((?:(?:apreciaci[oó]n\s+del\s+)?estado\s+nutricional|nutrici[oó]n)\s+)(?:ame|a\s+me)\b/gi, "$1AMEN");

  // 6. Casos truncados con contexto de Estado de Hidratación
  t = t.replace(/\b((?:(?:apreciaci[oó]n\s+del\s+)?estado\s+de\s+hidrataci[oó]n|hidrataci[oó]n)\s+)(?:ab|a\s+b|abe|a\s+be)\b/gi, "$1ABEH");
  t = t.replace(/\b((?:(?:apreciaci[oó]n\s+del\s+)?estado\s+de\s+hidrataci[oó]n|hidrataci[oó]n)\s+)(?:are|a\s+re|red)\b/gi, "$1AREH");
  t = t.replace(/\b((?:(?:apreciaci[oó]n\s+del\s+)?estado\s+de\s+hidrataci[oó]n|hidrataci[oó]n)\s+)(?:ame|a\s+me)\b/gi, "$1AMEH");

  return t;
}

// Auxiliar para asegurar que los campos de observación y descripción comiencen siempre con mayúscula
function capitalizeFirstLetter(str) {
  if (!str || typeof str !== "string") return str;
  const trimmed = str.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

// 1. Extraer Ectoscopia
function extractEctoscopia(text) {
  if (!text) return {};
  const cleanedText = normalizeClinicalAcronyms(text);
  const norm = cleanedText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const res = {};

  // Cambios directos de selector (ej: "cambiar AREG a ABEG", "cambiar a AMEG")
  const mSelectGen = cleanedText.match(/\bcambiar\s+(?:AREG|AMEG|ABEG)\s+a\s+(ABEG|AREG|AMEG)\b|\bcambiar\s+a\s+(ABEG|AREG|AMEG)\b/i);
  if (mSelectGen) {
    res.apreciacionGeneral = (mSelectGen[1] || mSelectGen[2]).toUpperCase();
    return res;
  }
  const mSelectNut = cleanedText.match(/\bcambiar\s+(?:AREN|AMEN|ABEN)\s+a\s+(ABEN|AREN|AMEN)\b|\bcambiar\s+a\s+(ABEN|AREN|AMEN)\b/i);
  if (mSelectNut) {
    res.estadoNutricional = (mSelectNut[1] || mSelectNut[2]).toUpperCase();
    return res;
  }
  const mSelectHid = cleanedText.match(/\bcambiar\s+(?:AREH|AMEH|ABEH)\s+a\s+(ABEH|AREH|AMEH)\b|\bcambiar\s+a\s+(ABEH|AREH|AMEH)\b/i);
  if (mSelectHid) {
    res.estadoHidratacion = (mSelectHid[1] || mSelectHid[2]).toUpperCase();
    return res;
  }

  // Apreciación General + Observación condicional (AREG / AMEG)
  const isAregDelete = /\b(?:borrar|borra|limpiar|limpia|vaciar|vacia)\s+(?:la\s+)?(?:descripci[oó]n\s+(?:de\s+)?|observaci[oó]n\s+(?:de\s+)?)?areg\b/i.test(norm);
  const isAmegDelete = /\b(?:borrar|borra|limpiar|limpia|vaciar|vacia)\s+(?:la\s+)?(?:descripci[oó]n\s+(?:de\s+)?|observaci[oó]n\s+(?:de\s+)?)?ameg\b/i.test(norm);

  if (isAregDelete) {
    res.apreciacionGeneral = "AREG";
    res.obsApreciacionGeneral = "";
  } else if (isAmegDelete) {
    res.apreciacionGeneral = "AMEG";
    res.obsApreciacionGeneral = "";
  } else if (/\b(?:abeg|buen\s+estado\s+general|aparente\s+buen\s+estado)\b/i.test(norm) && !/\bareg|ameg\b/i.test(norm)) {
    res.apreciacionGeneral = "ABEG";
  } else if (/\bareg\b/i.test(norm) || /\bregular\s+estado\s+general\b/i.test(norm)) {
    res.apreciacionGeneral = "AREG";
    const mObs = cleanedText.match(/(?:(?:cambiar|cambia|editar|edita|modificar|modifica|escribir|escribe|poner|anotar|anota|redactar|redacta)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?areg|areg|regular\s+estado\s+general)(?:\s*[,;:]\s*|\s+(?:con\s+)?(?:observaci[oó]n:?|descripci[oó]n:?|(?:el\s+)?paciente\s+(?:refiere|presenta|est[aá]|con)|debido\s+a)?\s*)(.+?)(?=(?:,\s*)?(?:estado\s+nutricional|nutrici[oó]n|aren|amen|aben|hidrataci[oó]n|areh|ameh|abeh|lucidez|fa[sc]+ies|grado\s+de\s+colaboraci[oó]n|persona\s+con\s+necesidades|peso\s*(?:\(kg\)|es|de|:|\d)|talla\s*(?:\(m\)|es|de|:|\d)|temperatura\s+corporal|presi[oó]n|confirmar|$))/i);
    if (mObs && mObs[1].trim().length > 2) {
      let obs = mObs[1].trim()
        .replace(/^(?:(?:apreciaci[oó]n\s+general|regular\s+estado\s+general|mal\s+estado\s+general|areg|ameg)\s*[,;:]?\s*)+/i, "")
        .replace(/^(?:es|de|con|observaci[oó]n:?|descripci[oó]n:?)\s+/i, "");
      if (obs.length > 2) res.obsApreciacionGeneral = capitalizeFirstLetter(obs);
    } else if (/\b(?:cambiar|cambia|editar|edita|modificar|modifica|escribir|escribe)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?areg\b/i.test(norm)) {
      res.focusObservation = "AREG:";
    }
  } else if (/\bameg\b/i.test(norm) || /\bmal\s+estado\s+general\b/i.test(norm)) {
    res.apreciacionGeneral = "AMEG";
    const mObs = cleanedText.match(/(?:(?:cambiar|cambia|editar|edita|modificar|modifica|escribir|escribe|poner|anotar|anota|redactar|redacta)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?ameg|ameg|mal\s+estado\s+general)(?:\s*[,;:]\s*|\s+(?:con\s+)?(?:observaci[oó]n:?|descripci[oó]n:?|(?:el\s+)?paciente\s+(?:refiere|presenta|est[aá]|con)|debido\s+a)?\s*)(.+?)(?=(?:,\s*)?(?:estado\s+nutricional|nutrici[oó]n|aren|amen|aben|hidrataci[oó]n|areh|ameh|abeh|lucidez|fa[sc]+ies|grado\s+de\s+colaboraci[oó]n|persona\s+con\s+necesidades|peso\s*(?:\(kg\)|es|de|:|\d)|talla\s*(?:\(m\)|es|de|:|\d)|temperatura\s+corporal|presi[oó]n|confirmar|$))/i);
    if (mObs && mObs[1].trim().length > 2) {
      let obs = mObs[1].trim()
        .replace(/^(?:(?:apreciaci[oó]n\s+general|regular\s+estado\s+general|mal\s+estado\s+general|areg|ameg)\s*[,;:]?\s*)+/i, "")
        .replace(/^(?:es|de|con|observaci[oó]n:?|descripci[oó]n:?)\s+/i, "");
      if (obs.length > 2) res.obsApreciacionGeneral = capitalizeFirstLetter(obs);
    } else if (/\b(?:cambiar|cambia|editar|edita|modificar|modifica|escribir|escribe)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?ameg\b/i.test(norm)) {
      res.focusObservation = "AMEG:";
    }
  }

  // Estado Nutricional + Observación condicional (AREN / AMEN)
  const isArenDelete = /\b(?:borrar|borra|limpiar|limpia|vaciar|vacia)\s+(?:la\s+)?(?:descripci[oó]n\s+(?:de\s+)?|observaci[oó]n\s+(?:de\s+)?)?aren\b/i.test(norm);
  const isAmenDelete = /\b(?:borrar|borra|limpiar|limpia|vaciar|vacia)\s+(?:la\s+)?(?:descripci[oó]n\s+(?:de\s+)?|observaci[oó]n\s+(?:de\s+)?)?amen\b/i.test(norm);

  if (isArenDelete) {
    res.estadoNutricional = "AREN";
    res.obsEstadoNutricional = "";
  } else if (isAmenDelete) {
    res.estadoNutricional = "AMEN";
    res.obsEstadoNutricional = "";
  } else if (/\b(?:aben|buen\s+estado\s+nutricional|nutrici[oó]n\s+buena|buena\s+nutrici[oó]n)\b/i.test(norm) && !/\baren|amen\b/i.test(norm)) {
    res.estadoNutricional = "ABEN";
  } else if (/\baren\b/i.test(norm) || /\bregular\s+nutrici[oó]n|regular\s+estado\s+nutricional\b/i.test(norm)) {
    res.estadoNutricional = "AREN";
    const mObs = cleanedText.match(/(?:(?:cambiar|cambia|editar|edita|modificar|modifica|escribir|escribe|poner|anotar|anota|redactar|redacta)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?aren|aren|regular\s+nutrici[oó]n|regular\s+estado\s+nutricional)(?:\s*[,;:]\s*|\s+(?:con\s+)?(?:observaci[oó]n:?|descripci[oó]n:?|(?:el\s+)?paciente\s+(?:refiere|presenta|est[aá]|con)|debido\s+a)?\s*)(.+?)(?=(?:,\s*)?(?:hidrataci[oó]n|areh|ameh|abeh|lucidez|fa[sc]+ies|grado\s+de\s+colaboraci[oó]n|persona\s+con\s+necesidades|peso\s*(?:\(kg\)|es|de|:|\d)|talla\s*(?:\(m\)|es|de|:|\d)|temperatura\s+corporal|presi[oó]n|confirmar|$))/i);
    if (mObs && mObs[1].trim().length > 2) {
      let obs = mObs[1].trim()
        .replace(/^(?:(?:estado\s+nutricional|regular\s+nutrici[oó]n|regular\s+estado\s+nutricional|aren|amen)\s*[,;:]?\s*)+/i, "")
        .replace(/^(?:es|de|con|observaci[oó]n:?|descripci[oó]n:?)\s+/i, "");
      if (obs.length > 2) res.obsEstadoNutricional = capitalizeFirstLetter(obs);
    } else if (/\b(?:cambiar|cambia|editar|edita|modificar|modifica|escribir|escribe)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?aren\b/i.test(norm)) {
      res.focusObservation = "AREN:";
    }
  } else if (/\bamen\b/i.test(norm) || /\bmal\s+estado\s+nutricional|desnutrido|desnutrici[oó]n\b/i.test(norm)) {
    res.estadoNutricional = "AMEN";
    const mObs = cleanedText.match(/(?:(?:cambiar|cambia|editar|edita|modificar|modifica|escribir|escribe|poner|anotar|anota|redactar|redacta)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?amen|amen|mal\s+estado\s+nutricional|desnutrido|desnutrici[oó]n)(?:\s*[,;:]\s*|\s+(?:con\s+)?(?:observaci[oó]n:?|descripci[oó]n:?|(?:el\s+)?paciente\s+(?:refiere|presenta|est[aá]|con)|debido\s+a)?\s*)(.+?)(?=(?:,\s*)?(?:hidrataci[oó]n|areh|ameh|abeh|lucidez|fa[sc]+ies|grado\s+de\s+colaboraci[oó]n|persona\s+con\s+necesidades|peso\s*(?:\(kg\)|es|de|:|\d)|talla\s*(?:\(m\)|es|de|:|\d)|temperatura\s+corporal|presi[oó]n|confirmar|$))/i);
    if (mObs && mObs[1].trim().length > 2) {
      let obs = mObs[1].trim()
        .replace(/^(?:(?:estado\s+nutricional|mal\s+estado\s+nutricional|desnutrici[oó]n|aren|amen)\s*[,;:]?\s*)+/i, "")
        .replace(/^(?:es|de|con|observaci[oó]n:?|descripci[oó]n:?)\s+/i, "");
      if (obs.length > 2) res.obsEstadoNutricional = capitalizeFirstLetter(obs);
    } else if (/\b(?:cambiar|cambia|editar|edita|modificar|modifica|escribir|escribe)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?amen\b/i.test(norm)) {
      res.focusObservation = "AMEN:";
    }
  }

  // Estado de Hidratación + Observación condicional (AREH / AMEH)
  const isArehDelete = /\b(?:borrar|borra|limpiar|limpia|vaciar|vacia)\s+(?:la\s+)?(?:descripci[oó]n\s+(?:de\s+)?|observaci[oó]n\s+(?:de\s+)?)?areh\b/i.test(norm);
  const isAmehDelete = /\b(?:borrar|borra|limpiar|limpia|vaciar|vacia)\s+(?:la\s+)?(?:descripci[oó]n\s+(?:de\s+)?|observaci[oó]n\s+(?:de\s+)?)?ameh\b/i.test(norm);

  if (isArehDelete) {
    res.estadoHidratacion = "AREH";
    res.obsEstadoHidratacion = "";
  } else if (isAmehDelete) {
    res.estadoHidratacion = "AMEH";
    res.obsEstadoHidratacion = "";
  } else if (/\b(?:abeh|buena\s+hidrataci[oó]n|hidratado|bien\s+hidratado|buen\s+estado\s+de\s+hidrataci[oó]n)\b/i.test(norm) && !/\bareh|ameh\b/i.test(norm)) {
    res.estadoHidratacion = "ABEH";
  } else if (/\bareh\b/i.test(norm) || /\bregular\s+hidrataci[oó]n|regular\s+estado\s+de\s+hidrataci[oó]n\b/i.test(norm)) {
    res.estadoHidratacion = "AREH";
    const mObs = cleanedText.match(/(?:(?:cambiar|cambia|editar|edita|modificar|modifica|escribir|escribe|poner|anotar|anota|redactar|redacta)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?areh|areh|regular\s+hidrataci[oó]n|regular\s+estado\s+de\s+hidrataci[oó]n)(?:\s*[,;:]\s*|\s+(?:con\s+)?(?:observaci[oó]n:?|descripci[oó]n:?|(?:el\s+)?paciente\s+(?:refiere|presenta|est[aá]|con)|debido\s+a)?\s*)(.+?)(?=(?:,\s*)?(?:lucidez|fa[sc]+ies|grado\s+de\s+colaboraci[oó]n|persona\s+con\s+necesidades|peso\s*(?:\(kg\)|es|de|:|\d)|talla\s*(?:\(m\)|es|de|:|\d)|temperatura\s+corporal|presi[oó]n|confirmar|$))/i);
    if (mObs && mObs[1].trim().length > 2) {
      let obs = mObs[1].trim()
        .replace(/^(?:(?:estado\s+de\s+hidrataci[oó]n|regular\s+hidrataci[oó]n|areh|ameh)\s*[,;:]?\s*)+/i, "")
        .replace(/^(?:es|de|con|observaci[oó]n:?|descripci[oó]n:?)\s+/i, "");
      if (obs.length > 2) res.obsEstadoHidratacion = capitalizeFirstLetter(obs);
    } else if (/\b(?:cambiar|cambia|editar|edita|modificar|modifica|escribir|escribe)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?areh\b/i.test(norm)) {
      res.focusObservation = "AREH:";
    }
  } else if (/\bameh\b/i.test(norm) || /\bdeshidratado|mal\s+hidratado|mal\s+estado\s+de\s+hidrataci[oó]n\b/i.test(norm)) {
    res.estadoHidratacion = "AMEH";
    const mObs = cleanedText.match(/(?:(?:cambiar|cambia|editar|edita|modificar|modifica|escribir|escribe|poner|anotar|anota|redactar|redacta)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?ameh|ameh|deshidratado|mal\s+hidratado|mal\s+estado\s+de\s+hidrataci[oó]n)(?:\s*[,;:]\s*|\s+(?:con\s+)?(?:observaci[oó]n:?|descripci[oó]n:?|(?:el\s+)?paciente\s+(?:refiere|presenta|est[aá]|con)|debido\s+a)?\s*)(.+?)(?=(?:,\s*)?(?:lucidez|fa[sc]+ies|grado\s+de\s+colaboraci[oó]n|persona\s+con\s+necesidades|peso\s*(?:\(kg\)|es|de|:|\d)|talla\s*(?:\(m\)|es|de|:|\d)|temperatura\s+corporal|presi[oó]n|confirmar|$))/i);
    if (mObs && mObs[1].trim().length > 2) {
      let obs = mObs[1].trim()
        .replace(/^(?:(?:estado\s+de\s+hidrataci[oó]n|mal\s+estado\s+de\s+hidrataci[oó]n|deshidratado|areh|ameh)\s*[,;:]?\s*)+/i, "")
        .replace(/^(?:es|de|con|observaci[oó]n:?|descripci[oó]n:?)\s+/i, "");
      if (obs.length > 2) res.obsEstadoHidratacion = capitalizeFirstLetter(obs);
    } else if (/\b(?:cambiar|cambia|editar|edita|modificar|modifica|escribir|escribe)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?ameh\b/i.test(norm)) {
      res.focusObservation = "AMEH:";
    }
  }

  // Lucidez y Orientación (Checkbox: marcar, seleccionar, check / desmarcar, quitar check, no)
  const IS_LUCIDEZ_UNCHECK = /\b(?:(?:desmarca|desmarcar|deselecciona|deseleccionar|quita|quitar|qu[ií]tale)(?:\s+(?:el\s+)?check)?(?:\s+(?:a|en|de))?\s+(?:la\s+)?lucidez|sin\s+check(?:\s+(?:a|en|de))?\s+(?:la\s+)?lucidez|lucidez\s+y\s+orientaci[oó]n\s+(?:no|sin\s+check|desmarcad[ao]|inactivo)|lucidez\s+(?:no|sin\s+check|desmarcad[ao])|no\s+l[uú]cido|no\s+orientado)\b/i;
  const IS_LUCIDEZ_CHECK = /\b(?:(?:marca|marcar|selecciona|seleccionar|pon|poner|ponle|coloca|colocar|col[oó]cale)(?:\s+(?:el\s+)?check)?(?:\s+(?:a|en|de))?\s+(?:la\s+)?lucidez|lucidez\s+y\s+orientaci[oó]n(?:\s+(?:con\s+check|s[ií]|check|marcado|marcar|activo))?|lucidez\s+(?:s[ií]|check|marcada?|activa?)|lotep|l[uú]cido\s+y\s+orientado|l[uú]cido|orientado)\b/i;

  if (IS_LUCIDEZ_UNCHECK.test(norm)) {
    res.lucidez = "false";
  } else if (IS_LUCIDEZ_CHECK.test(norm)) {
    res.lucidez = "true";
  }

  // Persona con Necesidades Especiales (Si / No)
  if (/\b(?:persona\s+con\s+necesidades\s+especiales\s+s[ií]|s[ií]\s+es\s+persona\s+con\s+necesidades\s+especiales|necesidades\s+especiales\s+s[ií]|tiene\s+necesidades\s+especiales)\b/i.test(norm)) {
    res.necesidadesEspeciales = "Si";
  } else if (/\b(?:persona\s+con\s+necesidades\s+especiales\s+no|no\s+es\s+persona\s+con\s+necesidades\s+especiales|personas\s+con\s+necesidades\s+especiales\s+no|necesidades\s+especiales\s+no|sin\s+necesidades\s+especiales)\b/i.test(norm)) {
    res.necesidadesEspeciales = "No";
  }

  // Facies (y "fascies" con s intermedia)
  if (/\b(?:fa[sc]+ies?\s+caracter[ií]stica|fa[sc]+ie\s+caracter[ií]stica|facies\s+caracter[ií]stico|fascies\s+caracter[ií]stico)\b/i.test(norm) && !/no\s+caracter[ií]stica/i.test(norm)) {
    res.facies = "Característica";
  } else if (/\b(?:fa[sc]+ies?\s+no\s+caracter[ií]stica|fa[sc]+ie\s+no\s+caracter[ií]stica|no\s+caracter[ií]stica)\b/i.test(norm)) {
    res.facies = "No característica";
  }

  // Grado de Colaboración (Receptivo / No receptivo / Colaborador)
  if (/\b(?:receptivo|paciente\s+receptivo|colaboraci[oó]n\s+receptivo|colaborador|buena\s+colaboraci[oó]n)\b/i.test(norm) && !/no\s+receptivo|poco\s+receptivo/i.test(norm)) {
    res.colaboracion = "Receptivo";
  } else if (/\b(?:no\s+receptivo|paciente\s+no\s+receptivo|poco\s+receptivo|no\s+colaborador|poco\s+colaborador)\b/i.test(norm)) {
    res.colaboracion = "No receptivo";
  }

  return res;
}

// 2. Extraer Peso, Talla y Cálculo Automático de IMC
function extractPesoTalla(text) {
  if (!text) return {};
  const norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const res = {};

  // Peso (Kg)
  const mPeso = norm.match(/(?:peso|pesa)\s*(?:es|de|:)?\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|kilos|kilogramos)?/i) ||
                norm.match(/\b(\d{2,3})\s*(?:kg|kilos|kilogramos)\b/i);
  if (mPeso) {
    res.peso = mPeso[1].replace(",", ".");
  }

  // Talla (M) - ej: "talla 1.40 m", "talla 140 cm", "talla 1 metro 40", "1.40"
  const mTalla = norm.match(/(?:talla|estatura|mide)\s*(?:es|de|:)?\s*(\d{2,3}\s*cm|\d\s*(?:metro[s]?|m)\s*\d{1,2}|\d[.,]\d{1,2}|\d{3}|\d)/i);
  if (mTalla) {
    let tRaw = mTalla[1].trim();
    if (/\d{2,3}\s*cm/i.test(tRaw)) {
      const cm = parseInt(tRaw, 10);
      res.talla = (cm / 100).toFixed(2);
    } else {
      let tVal = tRaw.replace(/metro[s]?|m/i, ".").replace(/\s+/g, "").replace(",", ".");
      if (tVal.length === 3 && !tVal.includes(".")) {
        tVal = `${tVal[0]}.${tVal.slice(1)}`; // ej: "140" -> "1.40"
      }
      res.talla = tVal;
    }
  }

  // Cálculo de IMC si ambos están presentes
  if (res.peso && res.talla) {
    const p = parseFloat(res.peso);
    const t = parseFloat(res.talla);
    if (p > 20 && t > 0.5 && t < 2.5) {
      res.imc = (p / (t * t)).toFixed(1);
    }
  }

  return res;
}

// 3. Extraer Piel y Anexos
function extractPielAnexos(text) {
  if (!text) return {};
  const norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const res = {};

  // Temperatura de piel (Normal, Aumentada, Disminuida) + Observación condicional
  const isAumentadaDelete = /\b(?:borrar|borra|limpiar|limpia|vaciar|vacia)\s+(?:la\s+)?(?:descripci[oó]n\s+(?:de\s+)?|observaci[oó]n\s+(?:de\s+)?)?aumentada\b/i.test(norm);
  const isDisminuidaDelete = /\b(?:borrar|borra|limpiar|limpia|vaciar|vacia)\s+(?:la\s+)?(?:descripci[oó]n\s+(?:de\s+)?|observaci[oó]n\s+(?:de\s+)?)?disminuida\b/i.test(norm);

  if (isAumentadaDelete) {
    res.temperaturaPiel = "Aumentada";
    res.obsTemperaturaPiel = "";
  } else if (isDisminuidaDelete) {
    res.temperaturaPiel = "Disminuida";
    res.obsTemperaturaPiel = "";
  } else if (/\btemperatura\s+(?:de\s+piel\s+)?normal\b|\bpiel\s+normot[eé]rmica\b/i.test(norm)) {
    res.temperaturaPiel = "Normal";
  } else if (/\btemperatura\s+(?:de\s+piel\s+)?aumentada\b|\bpiel\s+caliente\b/i.test(norm)) {
    res.temperaturaPiel = "Aumentada";
    const mObs = text.match(/(?:(?:cambiar|cambia|editar|edita|modificar|modifica|escribir|escribe)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?aumentada|temperatura\s+(?:de\s+piel\s+)?aumentada|piel\s+caliente)(?:\s*[,;:]\s*|\s+(?:observaci[oó]n:?|descripci[oó]n:?|debido\s+a|presenta)?\s*)(.+?)(?=(?:,\s*)?(?:lesiones|anexos|temperatura\s+corporal|frecuencia|pulso|presi[oó]n|confirmar|$))/i);
    if (mObs && mObs[1].trim().length > 2) {
      res.obsTemperaturaPiel = capitalizeFirstLetter(mObs[1].trim().replace(/^observaci[oó]n:?\s*/i, ""));
    }
  } else if (/\btemperatura\s+(?:de\s+piel\s+)?disminuida\b|\bpiel\s+fr[ií]a\b|\bfrialdad\b/i.test(norm)) {
    res.temperaturaPiel = "Disminuida";
    const mObs = text.match(/(?:(?:cambiar|cambia|editar|edita|modificar|modifica|escribir|escribe)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?disminuida|temperatura\s+(?:de\s+piel\s+)?disminuida|piel\s+fr[ií]a|frialdad)(?:\s*[,;:]\s*|\s+(?:observaci[oó]n:?|descripci[oó]n:?|debido\s+a|presenta)?\s*)(.+?)(?=(?:,\s*)?(?:lesiones|anexos|temperatura\s+corporal|frecuencia|pulso|presi[oó]n|confirmar|$))/i);
    if (mObs && mObs[1].trim().length > 2) {
      res.obsTemperaturaPiel = capitalizeFirstLetter(mObs[1].trim().replace(/^observaci[oó]n:?\s*/i, ""));
    }
  }

  // Lesiones Anterior
  if (/\blesiones\s+anterior\s+ausentes?\b|\bsin\s+lesiones\s+anterior\b/i.test(norm)) {
    res.lesionesAnterior = "Ausentes";
  } else if (/\blesiones\s+anterior\s+presentes?\b|\bcon\s+lesiones\s+anterior\b/i.test(norm)) {
    res.lesionesAnterior = "Presentes";
  }

  // Lesiones Posterior
  if (/\blesiones\s+posterior\s+ausentes?\b|\bsin\s+lesiones\s+posterior\b/i.test(norm)) {
    res.lesionesPosterior = "Ausente";
  } else if (/\blesiones\s+posterior\s+presentes?\b|\bcon\s+lesiones\s+posterior\b/i.test(norm)) {
    res.lesionesPosterior = "Presentes";
  }

  // Anexos
  if (/\banexos?\s+normal\b|\banexo\s+normal\b/i.test(norm)) {
    res.anexos = "Normal";
  } else if (/\banexos?\s+alterados?\b|\banexo\s+alterado\b|\banexos?\s+anormal\b/i.test(norm)) {
    res.anexos = "Alterado";
  }

  return res;
}

// 4. Extraer Funciones Vitales
function extractFuncionesVitales(text) {
  if (!text) return {};
  const norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const res = {};

  // Temperatura Corporal (°C)
  const mTemp = norm.match(/(?:temperatura\s+corporal|temp\s+corporal)\s*(?:es|de|:)?\s*(\d{2}(?:[.,]\d+)?)\s*(?:grados|°c)?/i) ||
                norm.match(/(?:temperatura)\s*(?:es|de|:)?\s*(\d{2}(?:[.,]\d+)?)\s*(?:grados|°c)/i);
  if (mTemp) {
    res.temperatura = mTemp[1].replace(",", ".");
  }

  // Frecuencia Respiratoria (/min)
  const mResp = norm.match(/(?:frecuencia\s+respiratoria|respiraci[oó]n\s+por\s+minuto)\s*(?:es|de|:)?\s*(\d{1,2})\s*(?:por\s+minuto|\/min)?/i) ||
                norm.match(/(?:frecuencia\s+respiratoria|respiraci[oó]n)\s*(?:es|de|:)?\s*(\d{1,2})\s*(?:por\s+minuto|\/min)/i);
  if (mResp) {
    res.frecuenciaRespiratoria = mResp[1];
  }

  // Pulso (/min)
  const mPulso = norm.match(/(?:pulso|frecuencia\s+card[ií]aca)\s*(?:es|de|:)?\s*(\d{2,3})\s*(?:por\s+minuto|\/min)?/i);
  if (mPulso) {
    res.pulso = mPulso[1];
  }

  // Presión Arterial (mm Hg)
  const mPresion = norm.match(/(?:presi[oó]n|presi[oó]n\s+arterial)\s*(?:es|de|:)?\s*(\d{2,3})\s*(?:sobre|\/|con|-)\s*(\d{2,3})/i);
  if (mPresion) {
    res.presionArterial = `${mPresion[1]}/${mPresion[2]}`;
  }

  // Observación (limpieza estricta de prefijos como "la observación sería que...")
  const mObs = text.match(/(?:la\s+observaci[oó]n\s+(?:ser[ií]a|es|dice)?\s*(?:que)?|en\s+observaci[oó]n\s*(?:coloca|pon|escribe)?\s*(?:que)?|observaci[oó]n\s*[:=]\s*(?:que)?)\s*(.+?)(?=(?:,\s*)?(?:confirmar|$))/i);
  if (mObs && mObs[1].trim().length > 2) {
    res.observacion = capitalizeFirstLetter(mObs[1].trim().replace(/^(?:que|el\s+paciente\s+presenta\s+ser[ií]a\s+que)\s+/i, ""));
  }

  return res;
}

// 5. Extraer Estomatológico Extraoral
function extractEstomatologico(text) {
  if (!text) return {};
  const norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const res = {};

  // Respiración + Describa
  if (/\brespiraci[oó]n\s+nasal\b/i.test(norm)) {
    res.respiracion = "Nasal";
  } else if (/\brespiraci[oó]n\s+bucal\b/i.test(norm)) {
    res.respiracion = "Bucal";
    const mDesc = text.match(/(?:respiraci[oó]n\s+bucal|la\s+descripci[oó]n\s+de\s+respiraci[oó]n\s+es\s+(?:la\s+siguiente|que)?|describa\s+respiraci[oó]n)(?:\s*[,;:]\s*|\s+)(.+?)(?=(?:,\s*)?(?:otros\s+h[aá]bitos|simetr[ií]a|apertura|atm|confirmar|$))/i);
    if (mDesc && mDesc[1].trim().length > 2) {
      let desc = mDesc[1].trim()
        .replace(/^(?:(?:la\s+)?descripci[oó]n\s+(?:de\s+respiraci[oó]n\s+)?(?:es|ser[ií]a)?\s*)+/i, "")
        .replace(/^(?:la\s+siguiente|que|es|describa:?)\s+/i, "");
      if (desc.length > 2) res.describaRespiracion = capitalizeFirstLetter(desc);
    }
  } else if (/\bla\s+descripci[oó]n\s+de\s+respiraci[oó]n\s+es\s+(?:la\s+siguiente|que)?\s*(.+)/i.test(text)) {
    const mDesc = text.match(/\bla\s+descripci[oó]n\s+de\s+respiraci[oó]n\s+es\s+(?:la\s+siguiente|que)?\s*(.+)/i);
    if (mDesc) {
      let desc = mDesc[1].trim()
        .replace(/^(?:(?:la\s+)?descripci[oó]n\s+(?:de\s+respiraci[oó]n\s+)?(?:es|ser[ií]a)?\s*)+/i, "")
        .replace(/^(?:la\s+siguiente|que|es|describa:?)\s+/i, "");
      if (desc.length > 2) res.describaRespiracion = capitalizeFirstLetter(desc);
    }
  }

  // Otros hábitos + Describa
  if (/\botros\s+h[aá]bitos\s+ausentes?\b|\bsin\s+otros\s+h[aá]bitos\b/i.test(norm)) {
    res.otrosHabitos = "Ausentes";
  } else if (/\botros\s+h[aá]bitos\s+presentes?\b/i.test(norm)) {
    res.otrosHabitos = "Presentes";
    const mDesc = text.match(/(?:otros\s+h[aá]bitos\s+presentes|la\s+descripci[oó]n\s+de\s+otros\s+h[aá]bitos\s+es|describa\s+otros\s+h[aá]bitos)(?:\s*[,;:]\s*|\s+(?:describa\s+)?)(.+?)(?=(?:,\s*)?(?:simetr[ií]a|apertura|atm|confirmar|$))/i);
    if (mDesc && mDesc[1].trim().length > 2) {
      let desc = mDesc[1].trim()
        .replace(/^(?:(?:la\s+)?descripci[oó]n\s+(?:de\s+otros\s+h[aá]bitos\s+)?(?:es|ser[ií]a)?\s*)+/i, "")
        .replace(/^(?:la\s+siguiente|que|es|describa:?)\s+/i, "");
      if (desc.length > 2) res.describaOtrosHabitos = capitalizeFirstLetter(desc);
    }
  } else if (/\bla\s+descripci[oó]n\s+de\s+otros\s+h[aá]bitos\s+es\s*(.+)/i.test(text)) {
    const mDesc = text.match(/\bla\s+descripci[oó]n\s+de\s+otros\s+h[aá]bitos\s+es\s*(.+)/i);
    if (mDesc) {
      let desc = mDesc[1].trim()
        .replace(/^(?:(?:la\s+)?descripci[oó]n\s+(?:de\s+otros\s+h[aá]bitos\s+)?(?:es|ser[ií]a)?\s*)+/i, "")
        .replace(/^(?:la\s+siguiente|que|es|describa:?)\s+/i, "");
      if (desc.length > 2) res.describaOtrosHabitos = capitalizeFirstLetter(desc);
    }
  }

  // Simetría facial
  if (/\b(?:sim[eé]trico|simetr[ií]a\s+facial\s+conservada|cara\s+sim[eé]trica)\b/i.test(norm)) {
    res.simetriaFacial = "Simétrico";
  } else if (/\basim[eé]trico|asimetr[ií]a\b/i.test(norm)) {
    res.simetriaFacial = "Asimétrico";
  }

  // Apertura Bucal
  if (/\b(?:apertura\s+normal|apertura\s+bucal\s+normal)\b/i.test(norm)) {
    res.aperturaBucal = "Aparentemente normal";
  } else if (/\bapertura\s+con\s+limitaci[oó]n|limitaci[oó]n\s+de\s+apertura\b/i.test(norm)) {
    res.aperturaBucal = "Con limitación";
  } else if (/\bapertura\s+con\s+desviaci[oó]n\b/i.test(norm)) {
    res.aperturaBucal = "Con desviación";
  }

  // ATM
  if (/\batm\s+(?:normal|sin\s+ruidos|aparentemente\s+normal)\b/i.test(norm)) {
    res.atm = "Aparentemente normal";
  } else if (/\batm\s+(?:con\s+ruidos|chasquidos|crepitaci[oó]n)\b/i.test(norm)) {
    res.atm = "Con ruidos";
  } else if (/\batm\s+(?:con\s+dolor|dolorosa)\b/i.test(norm)) {
    res.atm = "Con dolor";
  }

  return res;
}

// 6. Comandos para imagen interactiva de lesiones
function extractInteractiveLesionCommand(text) {
  if (!text) return null;
  const norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Abrir modal interactivo (requiere mencionar lesiones o tipo de lesión)
  if (/(?:tipo\s+de\s+lesi[oó]n\s+editar|editar\s+tipo\s+de\s+lesi[oó]n|editar\s+(?:imagen\s+interactiva\s+)?lesiones?\s+anterior|abrir\s+lesiones?\s+anterior|ver\s+lesiones?\s+anterior|editar\s+(?:imagen\s+interactiva\s+)?lesiones?|abrir\s+(?:imagen\s+interactiva\s+)?lesiones?|abrir\s+imagen\s+interactiva)/i.test(norm)) {
    return { action: "abrir_modal_lesiones", target: "anterior" };
  }
  if (/(?:editar\s+lesiones?\s+posterior|abrir\s+lesiones?\s+posterior|ver\s+lesiones?\s+posterior)/i.test(norm)) {
    return { action: "abrir_modal_lesiones", target: "posterior" };
  }

  // Cerrar modal interactivo
  if (/^(?:cerrar|cierra|cerrar\s+imagen\s+interactiva|cerrar\s+modal|ok\s+cerrar)$/i.test(norm)) {
    return { action: "cerrar_modal_lesiones" };
  }

  // Eliminar tabla / tarjeta en imagen interactiva (requiere palabra tabla o lesión)
  const mDel = norm.match(/(?:eliminar|borrar|quitar)\s+(?:la\s+)?(?:tabla|lesi[oó]n)(?:\s+(?:de|en))?\s+([a-z\s]+)/i);
  if (mDel) {
    const reg = mDel[1].trim();
    if (reg.length > 2) {
      return { action: "eliminar_lesion", region: reg };
    }
  }

  // Asignar lesión en región (ej: "seleccionar orbital lesión pápula comentario sospecha de dermatitis")
  const mAssign = text.match(/(?:seleccionar|marcar|en)?\s*([a-záéíóúñ\s]+?)\s+lesi[oó]n\s+([a-záéíóúñ\s]+?)(?:\s+(?:comentario|nota|observaci[oó]n)\s+(.+))?$/i);
  if (mAssign) {
    const reg = mAssign[1].trim();
    const les = mAssign[2].trim().toUpperCase();
    const com = mAssign[3] ? mAssign[3].trim() : "";
    return { action: "asignar_lesion", region: reg, lesion: les, comentario: com };
  }

  return null;
}

// 7. Orquestador de propuesta clínica local para Examen Clínico
function proposeExamenClinico(text, fields) {
  if (!text || !fields || !fields.length) return { handled: false };
  const isExamen = fields.some((f) => f.contexto === "examen_clinico" || /apreciaci[oó]n\s+general/i.test(f.etiqueta || ""));
  if (!isExamen) return { handled: false };

  // Comandos de interacción en modal de lesiones
  const cmd = extractInteractiveLesionCommand(text);
  if (cmd) {
    return { handled: true, interactiveCommand: cmd, entries: [] };
  }

  const normalizedText = normalizeClinicalAcronyms(text);
  const ecto = extractEctoscopia(normalizedText);
  const pt = extractPesoTalla(normalizedText);
  const piel = extractPielAnexos(normalizedText);
  const vitales = extractFuncionesVitales(normalizedText);
  const estom = extractEstomatologico(normalizedText);

  const hasAnyData = Object.keys(ecto).length > 0 || Object.keys(pt).length > 0 ||
                     Object.keys(piel).length > 0 || Object.keys(vitales).length > 0 ||
                     Object.keys(estom).length > 0;
  if (!hasAnyData) return { handled: false };

  const entries = [];
  const findF = (regexLabel, regexSec) => {
    return fields.find((f) => {
      const matchLabel = regexLabel.test(f.etiqueta || "");
      const matchSec = regexSec ? regexSec.test(f.seccion || "") : true;
      return matchLabel && matchSec;
    });
  };

  // Ectoscopia
  if (ecto.apreciacionGeneral) {
    const f = findF(/apreciaci[oó]n\s+general/i);
    if (f) entries.push({ field: f, valor: ecto.apreciacionGeneral });
  }
  if (ecto.obsApreciacionGeneral !== undefined) {
    const targetLabel = (ecto.apreciacionGeneral === "AMEG" || /^ameg/i.test(normalizedText)) ? /^ameg:?$/i : /^areg:?$/i;
    const f = findF(targetLabel);
    if (f) entries.push({ field: f, valor: ecto.obsApreciacionGeneral });
  }
  if (ecto.estadoNutricional) {
    const f = findF(/nutricional/i);
    if (f) entries.push({ field: f, valor: ecto.estadoNutricional });
  }
  if (ecto.obsEstadoNutricional !== undefined) {
    const targetLabel = (ecto.estadoNutricional === "AMEN" || /^amen/i.test(normalizedText)) ? /^amen:?$/i : /^aren:?$/i;
    const f = findF(targetLabel);
    if (f) entries.push({ field: f, valor: ecto.obsEstadoNutricional });
  }
  if (ecto.estadoHidratacion) {
    const f = findF(/hidrataci[oó]n/i);
    if (f) entries.push({ field: f, valor: ecto.estadoHidratacion });
  }
  if (ecto.obsEstadoHidratacion !== undefined) {
    const targetLabel = (ecto.estadoHidratacion === "AMEH" || /^ameh/i.test(normalizedText)) ? /^ameh:?$/i : /^areh:?$/i;
    const f = findF(targetLabel);
    if (f) entries.push({ field: f, valor: ecto.obsEstadoHidratacion });
  }
  if (ecto.lucidez !== undefined) {
    const f = findF(/lucidez/i);
    if (f) entries.push({ field: f, valor: ecto.lucidez });
  }
  if (ecto.necesidadesEspeciales) {
    const f = findF(/necesidades\s+especiales/i);
    if (f) entries.push({ field: f, valor: ecto.necesidadesEspeciales });
  }
  if (ecto.facies) {
    const f = findF(/^facies?$|^fascies?$/i);
    if (f) entries.push({ field: f, valor: ecto.facies });
  }
  if (ecto.colaboracion) {
    const f = findF(/colaboraci[oó]n/i);
    if (f) entries.push({ field: f, valor: ecto.colaboracion });
  }

  // Peso, Talla e IMC
  if (pt.peso) {
    const f = findF(/^peso/i);
    if (f) entries.push({ field: f, valor: pt.peso });
  }
  if (pt.talla) {
    const f = findF(/^talla/i);
    if (f) entries.push({ field: f, valor: pt.talla });
  }
  if (pt.imc) {
    const f = findF(/^imc/i);
    if (f) entries.push({ field: f, valor: pt.imc });
  }

  // Piel y Anexos
  if (piel.temperaturaPiel) {
    const f = findF(/^temperatura$/i, /piel/i) || findF(/temperatura\s*\(piel/i);
    if (f) entries.push({ field: f, valor: piel.temperaturaPiel });
  }
  if (piel.obsTemperaturaPiel !== undefined) {
    const targetLabel = (piel.temperaturaPiel === "Disminuida" || /disminuida/i.test(normalizedText)) ? /^disminuida:?$/i : /^aumentada:?$/i;
    const f = findF(targetLabel);
    if (f) entries.push({ field: f, valor: piel.obsTemperaturaPiel });
  }
  if (piel.lesionesAnterior) {
    const f = findF(/lesiones\s+anterior/i);
    if (f) entries.push({ field: f, valor: piel.lesionesAnterior });
  }
  if (piel.lesionesPosterior) {
    const f = findF(/lesiones\s+posterior/i);
    if (f) entries.push({ field: f, valor: piel.lesionesPosterior });
  }
  if (piel.anexos) {
    const f = findF(/^anexos?:?$/i, /piel/i);
    if (f) entries.push({ field: f, valor: piel.anexos });
  }

  // Funciones Vitales
  if (vitales.temperatura) {
    const f = findF(/temperatura\s+corporal/i);
    if (f) entries.push({ field: f, valor: vitales.temperatura });
  }
  if (vitales.frecuenciaRespiratoria) {
    const f = findF(/frecuencia\s+respiratoria/i);
    if (f) entries.push({ field: f, valor: vitales.frecuenciaRespiratoria });
  }
  if (vitales.pulso) {
    const f = findF(/^pulso/i);
    if (f) entries.push({ field: f, valor: vitales.pulso });
  }
  if (vitales.presionArterial) {
    const f = findF(/presi[oó]n\s+arterial/i);
    if (f) entries.push({ field: f, valor: vitales.presionArterial });
  }
  if (vitales.observacion) {
    const f = findF(/^observaci[oó]n:?$/i, /funciones\s+vitales|general/i) || findF(/^observaci[oó]n:?$/i);
    if (f) entries.push({ field: f, valor: vitales.observacion });
  }

  // Estomatológico Extraoral
  if (estom.respiracion) {
    const f = findF(/^respiraci[oó]n/i, /estomatol[oó]gico|extraoral/i) || findF(/^respiraci[oó]n/i);
    if (f) entries.push({ field: f, valor: estom.respiracion });
  }
  if (estom.describaRespiracion) {
    const f = findF(/describa\s*\(respiraci[oó]n\)/i) || findF(/describa/i, /respiraci[oó]n/i);
    if (f) entries.push({ field: f, valor: estom.describaRespiracion });
  }
  if (estom.otrosHabitos) {
    const f = findF(/otros?\s+h[aá]bitos?/i);
    if (f) entries.push({ field: f, valor: estom.otrosHabitos });
  }
  if (estom.describaOtrosHabitos) {
    const f = findF(/describa\s*\(otros\s+h[aá]bitos\)/i) || findF(/describa/i, /otros/i);
    if (f) entries.push({ field: f, valor: estom.describaOtrosHabitos });
  }
  if (estom.simetriaFacial) {
    const f = findF(/simetr[ií]a/i);
    if (f) entries.push({ field: f, valor: estom.simetriaFacial });
  }
  if (estom.aperturaBucal) {
    const f = findF(/apertura/i);
    if (f) entries.push({ field: f, valor: estom.aperturaBucal });
  }
  if (estom.atm) {
    const f = findF(/a\.?t\.?m\.?/i);
    if (f) entries.push({ field: f, valor: estom.atm });
  }

  if (ecto.focusObservation) {
    const fObs = findF(new RegExp(`^${ecto.focusObservation}`, "i"));
    if (fObs && !entries.some((e) => e.field === fObs)) {
      entries.push({ field: fObs, valor: "" });
    }
  }

  return {
    handled: entries.length > 0 || Boolean(ecto.focusObservation),
    entries,
    focusObservation: ecto.focusObservation || null
  };
}

if (typeof window !== "undefined") {
  window.normalizeClinicalAcronyms = normalizeClinicalAcronyms;
  window.proposeExamenClinico = proposeExamenClinico;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    normalizeClinicalAcronyms,
    extractEctoscopia,
    extractPesoTalla,
    extractPielAnexos,
    extractFuncionesVitales,
    extractEstomatologico,
    extractInteractiveLesionCommand,
    proposeExamenClinico,
    TIPOS_LESIONES_INTERACTIVAS
  };
}
