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

// Lista de regiones y puntos anatómicos del modal interactivo
const REGIONES_ANATOMICAS_INTERACTIVAS = [
  "cefalica", "cefalico", "otica", "optica", "occipital", "acromial", "vertebral",
  "escapular", "braquial", "dorsal", "olecranal", "lumbar", "sacral",
  "manus", "mano", "extremidad superior", "gluteal", "gluteo",
  "perinal", "perineal", "extremidad inferior", "femoral", "popliteal",
  "sural", "calcaneal", "calcaneo", "orbital", "ocular", "nasal", "labial", "menton", "mejilla"
];

// Normalizador fonético y de variantes de reconocimiento de voz para siglas clínicas (NLP Manos Libres)
function normalizeClinicalAcronyms(text) {
  if (!text) return "";
  let t = text;

  // 0. Limpiar tartamudeo o repeticiones acústicas de Web Speech (ej. "ta ta ta ta ta talla metro 70")
  t = t.replace(/\b([a-záéíóúñ]{1,4})\b(?:\s+\1\b){2,}/gi, "");
  t = t.replace(/^(?:\s*(?:ta|te|ti|to|tu|pa|pe|eh|em|um|uh|ah)\b)+/gi, "").trim();

  // Limpiar muletillas de inicio en dictado continuo/corrido
  t = t.replace(/^(?:listo|ya|bueno|bien|ok|a\s+ver|ahora|siguiente|luego)[,\s]+/gi, "");

  // Diccionario fonético para Facies (fácil es, fáciles, facile, faciles, faciales, facial, faz, fases, fase, faces, fascies, facie, fascie, face)
  t = t.replace(/\b(?:f[aá]cil\s+es|f[aá]ciles?|facil(?:es)?|faciales?|facial|fa[sc]+ies?|fa[sc]+ie|faces?|fases?|faz)\b/gi, "facies");

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

  // 3. ABEN / AREN / AMEN (tolerancia a 'a rem', 'amén', 'a ven', 'avent', 'a vent', ARN, a reen, etc.)
  t = t.replace(/\b(?:aben|a\s+ben|a\s+ven|aven|avent|a\s+vent|abent|a\s+bent|a\s+b\s+e\s+n|ab\s+en|ab\s+n|daben)\b/gi, "ABEN");
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
  t = t.replace(/\b((?:(?:apreciaci[oó]n\s+del\s+)?estado\s+nutricional|nutrici[oó]n)\s+)(?:ab|a\s+b|abe|a\s+be|avent|a\s+vent|abent)\b/gi, "$1ABEN");
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
  const isNoNec = /\b(?:(?:no\s+(?:es\s+)?(?:una\s+)?(?:persona|paciente)\s+con\s+necesidades\s+especiales)|(?:persona|paciente|personas)\s+con\s+necesidades\s+especiales\s+(?:es\s+)?no|necesidades\s+especiales\s+(?:es\s+)?no|no\s+tiene\s+necesidades\s+especiales|sin\s+necesidades\s+especiales)\b/i.test(norm);
  const isSiNec = /\b(?:(?:s[ií]\s+(?:es\s+)?(?:una\s+)?(?:persona|paciente)\s+con\s+necesidades\s+especiales)|(?:persona|paciente|personas)\s+con\s+necesidades\s+especiales\s+(?:es\s+)?s[ií]|necesidades\s+especiales\s+(?:es\s+)?s[ií]|(?:s[ií]\s+)?tiene\s+necesidades\s+especiales|con\s+necesidades\s+especiales)\b/i.test(norm);

  if (isNoNec) {
    res.necesidadesEspeciales = "No";
  } else if (isSiNec) {
    res.necesidadesEspeciales = "Si";
  }

  // Facies (y variaciones: fascies, faz, fases, faces, facie)
  const isBorrarNoCaract = /\b(?:borrar|borra|limpiar|limpia|vaciar|vacia)\s+(?:la\s+)?(?:descripci[oó]n\s+(?:de\s+)?|observaci[oó]n\s+(?:de\s+)?)?no\s+caracter[ií]stica\b/i.test(norm);
  const isBorrarCaract = /\b(?:borrar|borra|limpiar|limpia|vaciar|vacia)\s+(?:la\s+)?(?:descripci[oó]n\s+(?:de\s+)?|observaci[oó]n\s+(?:de\s+)?)?caracter[ií]stica\b/i.test(norm) && !isBorrarNoCaract;

  if (isBorrarNoCaract) {
    res.facies = "No característica";
    res.obsFaciesNoCaracteristica = "";
  } else if (isBorrarCaract) {
    res.facies = "Característica";
    res.obsFaciesCaracteristica = "";
  }

  // "escribir dentro de no característica [texto]" o "facies no característica [texto]"
  const mFaciesNo = cleanedText.match(/(?:(?:escribir|escribe|cambiar|cambia|editar|edita|modificar|modifica|poner|anotar)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?no\s+caracter[ií]stica|facies(?:\s+es)?\s+no\s+caracter[ií]stica|no\s+caracter[ií]stica)(?:\s*[,;:]\s*|\s+(?:con\s+)?(?:observaci[oó]n:?|descripci[oó]n:?|(?:el\s+)?paciente\s+(?:refiere|presenta|est[aá]|con)|debido\s+a)?\s*)(.+?)(?=(?:,\s*)?(?:grado\s+de\s+colaboraci[oó]n|receptivo|no\s+receptivo|peso|talla|temperatura|confirmar|$))/i);
  if (!isBorrarNoCaract && mFaciesNo && mFaciesNo[1].trim().length > 2) {
    res.facies = "No característica";
    let obs = mFaciesNo[1].trim().replace(/^(?:(?:facies(?:\s+es)?\s+)?no\s+caracter[ií]stica\s*[,;:]?\s*)+/i, "")
      .replace(/^(?:es|de|con|observaci[oó]n:?|descripci[oó]n:?)\s+/i, "");
    if (obs.length > 2) res.obsFaciesNoCaracteristica = capitalizeFirstLetter(obs);
  } else if (!isBorrarNoCaract && !res.facies && /\b(?:facies(?:\s+es)?\s+no\s+caracter[ií]stica|no\s+caracter[ií]stica)\b/i.test(norm)) {
    res.facies = "No característica";
  }

  // "escribir dentro de característica [texto]" o "facies característica [texto]"
  const mFaciesSi = cleanedText.match(/(?:(?:escribir|escribe|cambiar|cambia|editar|edita|modificar|modifica|poner|anotar)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?caracter[ií]stica|facies(?:\s+es)?\s+caracter[ií]stica)(?:\s*[,;:]\s*|\s+(?:con\s+)?(?:observaci[oó]n:?|descripci[oó]n:?|(?:el\s+)?paciente\s+(?:refiere|presenta|est[aá]|con)|debido\s+a)?\s*)(.+?)(?=(?:,\s*)?(?:grado\s+de\s+colaboraci[oó]n|receptivo|no\s+receptivo|peso|talla|temperatura|confirmar|$))/i);
  if (!isBorrarCaract && !res.facies && mFaciesSi && mFaciesSi[1].trim().length > 2 && !/\bno\s+caracter[ií]stica\b/i.test(norm)) {
    res.facies = "Característica";
    let obs = mFaciesSi[1].trim().replace(/^(?:(?:facies(?:\s+es)?\s+)?caracter[ií]stica\s*[,;:]?\s*)+/i, "")
      .replace(/^(?:es|de|con|observaci[oó]n:?|descripci[oó]n:?)\s+/i, "");
    if (obs.length > 2) res.obsFaciesCaracteristica = capitalizeFirstLetter(obs);
  } else if (!isBorrarCaract && !res.facies && /\b(?:facies(?:\s+es)?\s+caracter[ií]stica|facies(?:\s+es)?\s+caracter[ií]stico|caracter[ií]stica)\b/i.test(norm) && !/\bno\s+caracter[ií]stica\b/i.test(norm)) {
    res.facies = "Característica";
  }

  // Grado de Colaboración (Receptivo / No receptivo)
  const isBorrarNoReceptivo = /\b(?:borrar|borra|limpiar|limpia|vaciar|vacia)\s+(?:la\s+)?(?:descripci[oó]n\s+(?:de\s+)?|observaci[oó]n\s+(?:de\s+)?)?no\s+receptivo\b/i.test(norm);
  const isBorrarReceptivo = /\b(?:borrar|borra|limpiar|limpia|vaciar|vacia)\s+(?:la\s+)?(?:descripci[oó]n\s+(?:de\s+)?|observaci[oó]n\s+(?:de\s+)?)?receptivo\b/i.test(norm) && !isBorrarNoReceptivo;

  if (isBorrarNoReceptivo) {
    res.colaboracion = "No receptivo";
    res.obsColaboracionNoReceptivo = "";
  } else if (isBorrarReceptivo) {
    res.colaboracion = "Receptivo";
    res.obsColaboracionReceptivo = "";
  }

  // "escribir dentro de no receptivo [texto]" o "grado de colaboración no receptivo [texto]"
  const mColabNo = cleanedText.match(/(?:(?:escribir|escribe|cambiar|cambia|editar|edita|modificar|modifica|poner|anotar)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?no\s+receptivo|colaboraci[oó]n\s+no\s+receptivo|no\s+receptivo)(?:\s*[,;:]\s*|\s+(?:con\s+)?(?:observaci[oó]n:?|descripci[oó]n:?|(?:el\s+)?paciente\s+(?:refiere|presenta|est[aá]|con)|debido\s+a)?\s*)(.+?)(?=(?:,\s*)?(?:peso|talla|temperatura|confirmar|$))/i);
  if (!isBorrarNoReceptivo && mColabNo && mColabNo[1].trim().length > 2) {
    res.colaboracion = "No receptivo";
    let obs = mColabNo[1].trim().replace(/^(?:(?:grado\s+de\s+colaboraci[oó]n|colaboraci[oó]n|paciente)\s+no\s+receptivo\s*[,;:]?\s*)+/i, "")
      .replace(/^(?:es|de|con|observaci[oó]n:?|descripci[oó]n:?)\s+/i, "");
    if (obs.length > 2) res.obsColaboracionNoReceptivo = capitalizeFirstLetter(obs);
  } else if (!isBorrarNoReceptivo && !res.colaboracion && /\b(?:no\s+receptivo|poco\s+receptivo|no\s+colaborador)\b/i.test(norm)) {
    res.colaboracion = "No receptivo";
  }

  // "escribir dentro de receptivo [texto]" o "grado de colaboración receptivo [texto]"
  const mColabSi = cleanedText.match(/(?:(?:escribir|escribe|cambiar|cambia|editar|edita|modificar|modifica|poner|anotar)(?:\s+(?:en|dentro\s+de))?\s+(?:observaci[oó]n\s+|descripci[oó]n\s+)?receptivo|colaboraci[oó]n\s+receptivo|paciente\s+receptivo|receptivo)(?:\s*[,;:]\s*|\s+(?:con\s+)?(?:observaci[oó]n:?|descripci[oó]n:?|(?:el\s+)?paciente\s+(?:refiere|presenta|est[aá]|con)|debido\s+a)?\s*)(.+?)(?=(?:,\s*)?(?:peso|talla|temperatura|confirmar|$))/i);
  if (!isBorrarReceptivo && !res.colaboracion && mColabSi && mColabSi[1].trim().length > 2) {
    res.colaboracion = "Receptivo";
    let obs = mColabSi[1].trim().replace(/^(?:(?:grado\s+de\s+colaboraci[oó]n|colaboraci[oó]n|paciente)\s+receptivo\s*[,;:]?\s*)+/i, "")
      .replace(/^(?:es|de|con|observaci[oó]n:?|descripci[oó]n:?)\s+/i, "");
    if (obs.length > 2) res.obsColaboracionReceptivo = capitalizeFirstLetter(obs);
  } else if (!isBorrarReceptivo && !res.colaboracion && /\b(?:receptivo|colaborador|buena\s+colaboraci[oó]n)\b/i.test(norm)) {
    res.colaboracion = "Receptivo";
  }

  return res;
}

// 2. Extraer Peso, Talla y Cálculo Automático de IMC
function extractPesoTalla(text) {
  if (!text) return {};
  let norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Limpiar tartamudeo o repeticiones si quedaron
  norm = norm.replace(/\b([a-z]{1,4})\b(?:\s+\1\b){2,}/gi, "");
  norm = norm.replace(/^(?:\s*(?:ta|te|ti|to|tu|pa|pe|eh|em|um|uh|ah)\b)+/gi, "").trim();

  const res = {};

  // Peso (Kg)
  const mPeso = norm.match(/(?:peso|pesa)\s*(?:es|de|:)?\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|kilos|kilogramos)?/i) ||
                norm.match(/\b(\d{2,3})\s*(?:kg|kilos|kilogramos)\b/i);
  if (mPeso) {
    res.peso = mPeso[1].replace(",", ".");
  }

  // Talla (M) - Conversión de palabras numéricas comunes
  const wordMap = {
    "cero": 0, "un": 1, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5,
    "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10, "once": 11,
    "doce": 12, "trece": 13, "catorce": 14, "quince": 15, "dieciseis": 16,
    "diecisiete": 17, "dieciocho": 18, "diecinueve": 19, "veinte": 20,
    "veintiuno": 21, "veintidos": 22, "veintitres": 23, "veinticuatro": 24,
    "veinticinco": 25, "veintiseis": 26, "veintisiete": 27, "veintiocho": 28, "veintinueve": 29,
    "treinta": 30, "cuarenta": 40, "cincuenta": 50, "sesenta": 60, "setenta": 70,
    "ochenta": 80, "noventa": 90, "medio": 50
  };

  let normTalla = norm
    .replace(/\b(treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)\s+y\s+(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b/gi, (m, d, u) => {
      return String(wordMap[d] + wordMap[u]);
    })
    .replace(/\b(treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|medio)\b/gi, (m, d) => {
      return String(wordMap[d]);
    });

  // Caso: "talla metro 70", "talla metro con 70", "talla metro y 70", "talla un metro 70", "talla 1 metro 70"
  const mTallaMetro = normTalla.match(/(?:talla|estatura|mide)\s*(?:es|de|:)?\s*(?:(?:1|un)\s*)?metro[s]?\s*(?:con|y)?\s*(\d{1,2})\b/i);
  if (mTallaMetro) {
    let decimals = mTallaMetro[1];
    if (decimals.length === 1) decimals += "0";
    res.talla = `1.${decimals}`;
  } else {
    // Talla estándar: "talla 1.70 m", "talla 140 cm", "talla 170"
    const mTalla = normTalla.match(/(?:talla|estatura|mide)\s*(?:es|de|:)?\s*(\d{2,3}\s*cm|\d\s*(?:metro[s]?|m)\s*\d{1,2}|\d[.,]\d{1,2}|\d{3})/i);
    if (mTalla) {
      let tRaw = mTalla[1].trim();
      if (/\d{2,3}\s*cm/i.test(tRaw)) {
        const cm = parseInt(tRaw, 10);
        res.talla = (cm / 100).toFixed(2);
      } else {
        let tVal = tRaw.replace(/metro[s]?|m/i, ".").replace(/\s+/g, "").replace(",", ".");
        if (tVal.length === 3 && !tVal.includes(".")) {
          tVal = `${tVal[0]}.${tVal.slice(1)}`; // "170" -> "1.70"
        }
        res.talla = tVal;
      }
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

  // Lesiones Anterior (singular o plural, presentes / ausentes)
  if (/\blesi[oó]n(?:es)?\s+anterior(?:es)?\s+ausentes?\b|\bsin\s+lesi[oó]n(?:es)?\s+anterior(?:es)?\b/i.test(norm)) {
    res.lesionesAnterior = "Ausentes";
  } else if (/\blesi[oó]n(?:es)?\s+anterior(?:es)?\s+presentes?\b|\bcon\s+lesi[oó]n(?:es)?\s+anterior(?:es)?\b/i.test(norm)) {
    res.lesionesAnterior = "Presentes";
  }

  // Lesiones Posterior (singular o plural, presentes / ausente / ausentes)
  if (/\blesi[oó]n(?:es)?\s+posterior(?:es)?\s+ausentes?\b|\bsin\s+lesi[oó]n(?:es)?\s+posterior(?:es)?\b/i.test(norm)) {
    res.lesionesPosterior = "Ausente";
  } else if (/\blesi[oó]n(?:es)?\s+posterior(?:es)?\s+presentes?\b|\bcon\s+lesi[oó]n(?:es)?\s+posterior(?:es)?\b/i.test(norm)) {
    res.lesionesPosterior = "Presentes";
  }

  // Anexos (Normal / Alterado / Anormal)
  if (/\b(?:piel\s+y\s+)?anexos?\s+(?:normal(?:es)?|sin\s+alteraciones?|conservad[oa]s?)\b/i.test(norm)) {
    res.anexos = "Normal";
  } else if (/\b(?:piel\s+y\s+)?anexos?\s+(?:alterad[oa]s?|anormal(?:es)?|con\s+alteraciones?)\b/i.test(norm)) {
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

  // Presión Arterial (mm Hg) - Acepta número único (ej: "presión arterial 90") o compuesto (ej: "120/80", "120 sobre 80", "120 80")
  const mPresion = norm.match(/(?:presi[oó]n\s+arterial|presi[oó]n|\bpa\b)\s*(?:es|de|:)?\s*(\d{2,3})(?:\s*(?:sobre|\/|con|-|\s+)\s*(\d{2,3}))?/i);
  if (mPresion) {
    res.presionArterial = mPresion[2] ? `${mPresion[1]}/${mPresion[2]}` : mPresion[1];
  }

  // Observación de Conclusión / Final
  const mObsConc = text.match(/(?:(?:la\s+)?observaci[oó]n\s+(?:de\s+)?conclusi[oó]n|(?:la\s+)?observaci[oó]n\s+final|en\s+conclusi[oó]n\s+observaci[oó]n)(?:\s*(?:es|ser[ií]a|dice|coloca|pon|escribe)?\s*(?:que)?|[:=]\s*(?:que)?)\s*(.+?)(?=(?:,\s*)?(?:confirmar|$))/i);
  if (mObsConc && mObsConc[1].trim().length > 2) {
    res.observacionConclusion = capitalizeFirstLetter(mObsConc[1].trim().replace(/^(?:que|es|ser[ií]a)\s+/i, ""));
  }

  // Observación General (o genérica si no es conclusión)
  const mObsGen = text.match(/(?:(?:la\s+)?observaci[oó]n\s+general|en\s+observaci[oó]n\s+general)(?:\s*(?:es|ser[ií]a|dice|coloca|pon|escribe)?\s*(?:que)?|[:=]\s*(?:que)?)\s*(.+?)(?=(?:,\s*)?(?:observaci[oó]n\s+(?:de\s+)?conclusi[oó]n|observaci[oó]n\s+final|confirmar|$))/i) ||
                  (!mObsConc ? text.match(/(?:la\s+observaci[oó]n\s+(?:ser[ií]a|es|dice)?\s*(?:que)?|en\s+observaci[oó]n\s*(?:coloca|pon|escribe)?\s*(?:que)?|observaci[oó]n\s*[:=]\s*(?:que)?)\s*(.+?)(?=(?:,\s*)?(?:confirmar|$))/i) : null);
  if (mObsGen && mObsGen[1].trim().length > 2) {
    const cleanObs = capitalizeFirstLetter(mObsGen[1].trim().replace(/^(?:que|el\s+paciente\s+presenta\s+ser[ií]a\s+que|es|ser[ií]a)\s+/i, ""));
    res.observacionGeneral = cleanObs;
    res.observacion = cleanObs; // compatibilidad
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
  if (/^(?:cerrar|cierra|cerrar\s+imagen\s+interactiva|cerrar\s+modal|cerrar\s+lesiones|ok\s+cerrar|listo\s+cerrar)$/i.test(norm)) {
    return { action: "cerrar_modal_lesiones" };
  }

  // Eliminar tabla / tarjeta en imagen interactiva
  const mDel = norm.match(/^(?:eliminar|borrar|quitar)\s+(?:la\s+)?(?:tabla|tarjeta|lesi[oó]n)?(?:\s+(?:de|en))?\s+([a-z\s]+)$/i);
  if (mDel) {
    const reg = mDel[1].trim();
    if (reg.length > 2 && (REGIONES_ANATOMICAS_INTERACTIVAS.includes(reg) || /tabla|tarjeta|lesi/i.test(text))) {
      return { action: "eliminar_lesion", region: reg };
    }
  }

  // Dictar comentario solo:
  // A) Con índice ordinal ("comentario del primero...", "comentario de la primera...")
  const mComIdx1 = text.match(/^(?:(?:podemos|quiero|poner|escribir|anotar)\s+)?(?:el\s+)?(?:comentario|nota|observaci[oó]n)\s+(?:del\s+|de\s+la\s+)?(?:primer[oa]|1|uno)\s*(?:es|ser[ií]a|dice|:)?\s*(.+)$/i);
  if (mComIdx1 && mComIdx1[1].trim().length > 1) {
    return { action: "dictar_comentario", cardIndex: 0, comentario: capitalizeFirstLetter(mComIdx1[1].trim()) };
  }
  const mComIdx2 = text.match(/^(?:(?:podemos|quiero|poner|escribir|anotar)\s+)?(?:el\s+)?(?:comentario|nota|observaci[oó]n)\s+(?:del\s+|de\s+la\s+)?(?:segund[oa]|2|dos)\s*(?:es|ser[ií]a|dice|:)?\s*(.+)$/i);
  if (mComIdx2 && mComIdx2[1].trim().length > 1) {
    return { action: "dictar_comentario", cardIndex: 1, comentario: capitalizeFirstLetter(mComIdx2[1].trim()) };
  }

  // B) Con región específica ("comentario de dorsal...", "comentario en dorsal...")
  const mComReg = text.match(/^(?:(?:podemos|quiero|poner|escribir|anotar)\s+)?(?:el\s+)?(?:comentario|nota|observaci[oó]n)(?:\s+(?:en|de|del))?\s+([a-zñáéíóú\s]+?)\s*(?:es|ser[ií]a|dice|:)\s*(.+)$/i);
  if (mComReg) {
    const rCandidate = norm.replace(/[\u0300-\u036f]/g, "").match(/(?:comentario|nota|observacion)\s+(?:en\s+|de\s+|del\s+)?([a-z]+)/i);
    const regCandidate = rCandidate ? rCandidate[1].trim() : "";
    if (REGIONES_ANATOMICAS_INTERACTIVAS.includes(regCandidate)) {
      return { action: "dictar_comentario", region: regCandidate, comentario: capitalizeFirstLetter(mComReg[2].trim()) };
    }
  }

  // C) Comentario genérico para la tarjeta activa / última ("comentario presenta fuerte lesión", "podemos comentario...")
  const mComGen = text.match(/^(?:(?:podemos|quiero|poner|escribir|anotar)\s+)?(?:el\s+)?(?:comentario|nota|observaci[oó]n)\s*(?:es|ser[ií]a|dice|:)?\s*(.+)$/i);
  if (mComGen && !/(?:general|conclusi[oó]n|funciones\s+vitales)/i.test(mComGen[1])) {
    return { action: "dictar_comentario", comentario: capitalizeFirstLetter(mComGen[1].trim().replace(/^(?:que|es|ser[ií]a)\s+/i, "")) };
  }

  // Asignar lesión:
  // Formato A: [region] lesión [tipo_lesion] [comentario] (ej: "seleccionar orbital lesión pápula comentario sospecha de dermatitis")
  const mAssignMid = text.match(/(?:seleccionar|marcar|en)?\s*([a-záéíóúñ\s]+?)\s+lesi[oó]n\s+([a-záéíóúñ\s]+?)(?:\s+(?:comentario|nota|observaci[oó]n)\s+(.+))?$/i);
  if (mAssignMid && mAssignMid[1].trim().length > 1) {
    const reg = mAssignMid[1].trim();
    const les = mAssignMid[2].trim().toUpperCase();
    const com = mAssignMid[3] ? mAssignMid[3].trim() : "";
    return { action: "asignar_lesion", region: reg, lesion: les, comentario: com };
  }

  // Formato B: lesión [region] [tipo_lesion] (ej: "lesión dorsal ampolla") o lesión [tipo_lesion] (ej: "lesión ampolla")
  const sortedLesiones = [...TIPOS_LESIONES_INTERACTIVAS].sort((a, b) => b.length - a.length);
  let matchedLesion = null;
  for (const les of sortedLesiones) {
    const lesNorm = les.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const re = new RegExp(`\\b${lesNorm}\\b`, "i");
    if (re.test(norm)) {
      matchedLesion = les;
      break;
    }
  }

  if (matchedLesion) {
    let matchedRegion = null;
    for (const reg of REGIONES_ANATOMICAS_INTERACTIVAS) {
      const re = new RegExp(`\\b${reg}\\b`, "i");
      if (re.test(norm)) {
        matchedRegion = reg;
        break;
      }
    }
    if (!matchedRegion) {
      const mRegIn = norm.match(/(?:tipo\s+de\s+)?lesi[oó]n(?:\s+(?:en|de))?\s+([a-zñáéíóú]+)\s+/i);
      if (mRegIn && mRegIn[1] !== "de" && mRegIn[1] !== "en") {
        matchedRegion = mRegIn[1];
      }
    }

    let matchedComment = "";
    const mComInAssign = text.match(/(?:comentario|nota|observaci[oó]n)\s*(?:es|ser[ií]a|dice|:)?\s*(.+)$/i);
    if (mComInAssign) {
      matchedComment = mComInAssign[1].trim().replace(/^(?:que|es|ser[ií]a)\s+/i, "");
    }

    return {
      action: "asignar_lesion",
      lesion: matchedLesion,
      region: matchedRegion || null,
      comentario: matchedComment
    };
  }

  // Seleccionar punto / región anatómica en el gráfico ("seleccionar dorsal", "marcar perinal", "punto occipital")
  const mSelectReg = norm.match(/^(?:seleccionar|marcar|elegir|tocar|click\s+en|abrir\s+punto|punto)\s+(?:punto\s+|regi[oó]n\s+)?([a-z\s]+)$/i);
  if (mSelectReg) {
    const reg = mSelectReg[1].trim();
    if (REGIONES_ANATOMICAS_INTERACTIVAS.includes(reg)) {
      return { action: "seleccionar_region", region: reg };
    }
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
  if (ecto.obsFaciesNoCaracteristica !== undefined) {
    const f = findF(/^no\s+caracter[ií]stica:?$/i);
    if (f) entries.push({ field: f, valor: ecto.obsFaciesNoCaracteristica });
  }
  if (ecto.obsFaciesCaracteristica !== undefined) {
    const f = findF(/^caracter[ií]stica:?$/i);
    if (f) entries.push({ field: f, valor: ecto.obsFaciesCaracteristica });
  }
  if (ecto.colaboracion) {
    const f = findF(/colaboraci[oó]n/i);
    if (f) entries.push({ field: f, valor: ecto.colaboracion });
  }
  if (ecto.obsColaboracionReceptivo !== undefined) {
    const f = findF(/^receptivo:?$/i);
    if (f) entries.push({ field: f, valor: ecto.obsColaboracionReceptivo });
  }
  if (ecto.obsColaboracionNoReceptivo !== undefined) {
    const f = findF(/^no\s+receptivo:?$/i);
    if (f) entries.push({ field: f, valor: ecto.obsColaboracionNoReceptivo });
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
    const f = findF(/^anexos?:?$/i, /piel/i) || findF(/^anexos?:?$/i);
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
  if (vitales.observacionGeneral) {
    const f = findF(/observaci[oó]n\s+general/i) || findF(/^observaci[oó]n:?$/i, /funciones\s+vitales|general/i) || findF(/^observaci[oó]n:?$/i);
    if (f) entries.push({ field: f, valor: vitales.observacionGeneral });
  } else if (vitales.observacion) {
    const f = findF(/^observaci[oó]n:?$/i, /funciones\s+vitales|general/i) || findF(/^observaci[oó]n:?$/i);
    if (f) entries.push({ field: f, valor: vitales.observacion });
  }
  if (vitales.observacionConclusion) {
    const f = findF(/observaci[oó]n\s*\(conclusi[oó]n\)/i) || findF(/conclusi[oó]n/i, /conclusi[oó]n|observaci[oó]n/i) || findF(/observaci[oó]n/i, /conclusi[oó]n/i);
    if (f) entries.push({ field: f, valor: vitales.observacionConclusion });
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
