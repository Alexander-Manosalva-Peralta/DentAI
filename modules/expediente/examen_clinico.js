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

// 1. Extraer Ectoscopia
function extractEctoscopia(text) {
  if (!text) return {};
  const norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const res = {};

  // Apreciación General + Observación condicional (AREG / AMEG)
  if (/\b(?:abeg|buen\s+estado\s+general|aparente\s+buen\s+estado)\b/i.test(norm)) {
    res.apreciacionGeneral = "ABEG";
  } else if (/\b(?:areg|regular\s+estado\s+general)\b/i.test(norm)) {
    res.apreciacionGeneral = "AREG";
    const mObs = text.match(/(?:areg|regular\s+estado\s+general)(?:\s*[,;:]\s*|\s+(?:con\s+)?(?:observaci[oó]n|(?:el\s+)?paciente|refiere|presenta|debido\s+a)?\s*)(.+?)(?=(?:,\s*)?(?:estado\s+nutricional|nutrici[oó]n|hidrataci[oó]n|lucidez|fa[sc]+ies|grado\s+de\s+colaboraci[oó]n|persona\s+con\s+necesidades|peso\s*(?:\(kg\)|es|de|:|\d)|talla\s*(?:\(m\)|es|de|:|\d)|temperatura\s+corporal|presi[oó]n|confirmar|$))/i);
    if (mObs && mObs[1].trim().length > 2) {
      let obs = mObs[1].trim()
        .replace(/^(?:(?:apreciaci[oó]n\s+general|regular\s+estado\s+general|mal\s+estado\s+general|areg|ameg)\s*[,;:]?\s*)+/i, "");
      if (!/^paciente\s+con\b/i.test(obs)) {
        obs = obs.replace(/^(?:es|de|con|(?:el\s+)?paciente|observaci[oó]n:?)\s+/i, "");
      }
      if (obs.length > 2) res.obsApreciacionGeneral = obs;
    }
  } else if (/\b(?:ameg|mal\s+estado\s+general)\b/i.test(norm)) {
    res.apreciacionGeneral = "AMEG";
    const mObs = text.match(/(?:ameg|mal\s+estado\s+general)(?:\s*[,;:]\s*|\s+(?:con\s+)?(?:observaci[oó]n|(?:el\s+)?paciente|refiere|presenta|debido\s+a)?\s*)(.+?)(?=(?:,\s*)?(?:estado\s+nutricional|nutrici[oó]n|hidrataci[oó]n|lucidez|fa[sc]+ies|grado\s+de\s+colaboraci[oó]n|persona\s+con\s+necesidades|peso\s*(?:\(kg\)|es|de|:|\d)|talla\s*(?:\(m\)|es|de|:|\d)|temperatura\s+corporal|presi[oó]n|confirmar|$))/i);
    if (mObs && mObs[1].trim().length > 2) {
      let obs = mObs[1].trim()
        .replace(/^(?:(?:apreciaci[oó]n\s+general|regular\s+estado\s+general|mal\s+estado\s+general|areg|ameg)\s*[,;:]?\s*)+/i, "");
      if (!/^paciente\s+con\b/i.test(obs)) {
        obs = obs.replace(/^(?:es|de|con|(?:el\s+)?paciente|observaci[oó]n:?)\s+/i, "");
      }
      if (obs.length > 2) res.obsApreciacionGeneral = obs;
    }
  }

  // Estado Nutricional + Observación condicional (AREN / AMEN)
  if (/\b(?:aben|buen\s+estado\s+nutricional|nutrici[oó]n\s+buena|buena\s+nutrici[oó]n)\b/i.test(norm)) {
    res.estadoNutricional = "ABEN";
  } else if (/\b(?:aren|regular\s+nutrici[oó]n|nutrici[oó]n\s+regular|regular\s+estado\s+nutricional)\b/i.test(norm)) {
    res.estadoNutricional = "AREN";
    const mObs = text.match(/(?:aren|regular\s+nutrici[oó]n|regular\s+estado\s+nutricional)(?:\s*[,;:]\s*|\s+(?:con\s+)?(?:observaci[oó]n|(?:el\s+)?paciente|refiere|presenta|debido\s+a)?\s*)(.+?)(?=(?:,\s*)?(?:hidrataci[oó]n|lucidez|fa[sc]+ies|grado\s+de\s+colaboraci[oó]n|persona\s+con\s+necesidades|peso\s*(?:\(kg\)|es|de|:|\d)|talla\s*(?:\(m\)|es|de|:|\d)|temperatura\s+corporal|presi[oó]n|confirmar|$))/i);
    if (mObs && mObs[1].trim().length > 2) {
      let obs = mObs[1].trim().replace(/^(?:es|de|con|(?:el\s+)?paciente|observaci[oó]n:?)\s+/i, "");
      if (obs.length > 2) res.obsEstadoNutricional = obs;
    }
  } else if (/\b(?:amen|mal\s+estado\s+nutricional|desnutrido|desnutrici[oó]n)\b/i.test(norm)) {
    res.estadoNutricional = "AMEN";
    const mObs = text.match(/(?:amen|mal\s+estado\s+nutricional|desnutrido|desnutrici[oó]n)(?:\s*[,;:]\s*|\s+(?:con\s+)?(?:observaci[oó]n|(?:el\s+)?paciente|refiere|presenta|debido\s+a)?\s*)(.+?)(?=(?:,\s*)?(?:hidrataci[oó]n|lucidez|fa[sc]+ies|grado\s+de\s+colaboraci[oó]n|persona\s+con\s+necesidades|peso\s*(?:\(kg\)|es|de|:|\d)|talla\s*(?:\(m\)|es|de|:|\d)|temperatura\s+corporal|presi[oó]n|confirmar|$))/i);
    if (mObs && mObs[1].trim().length > 2) {
      let obs = mObs[1].trim().replace(/^(?:es|de|con|(?:el\s+)?paciente|observaci[oó]n:?)\s+/i, "");
      if (obs.length > 2) res.obsEstadoNutricional = obs;
    }
  }

  // Estado de Hidratación + Observación condicional (AREH / AMEH)
  if (/\b(?:abeh|buena\s+hidrataci[oó]n|hidratado|bien\s+hidratado|buen\s+estado\s+de\s+hidrataci[oó]n)\b/i.test(norm)) {
    res.estadoHidratacion = "ABEH";
  } else if (/\b(?:areh|regular\s+hidrataci[oó]n|regular\s+estado\s+de\s+hidrataci[oó]n)\b/i.test(norm)) {
    res.estadoHidratacion = "AREH";
    const mObs = text.match(/(?:areh|regular\s+hidrataci[oó]n|regular\s+estado\s+de\s+hidrataci[oó]n)(?:\s*[,;:]\s*|\s+(?:con\s+)?(?:observaci[oó]n|(?:el\s+)?paciente|refiere|presenta|debido\s+a)?\s*)(.+?)(?=(?:,\s*)?(?:lucidez|fa[sc]+ies|grado\s+de\s+colaboraci[oó]n|persona\s+con\s+necesidades|peso\s*(?:\(kg\)|es|de|:|\d)|talla\s*(?:\(m\)|es|de|:|\d)|temperatura\s+corporal|presi[oó]n|confirmar|$))/i);
    if (mObs && mObs[1].trim().length > 2) {
      let obs = mObs[1].trim().replace(/^(?:es|de|con|(?:el\s+)?paciente|observaci[oó]n:?)\s+/i, "");
      if (obs.length > 2) res.obsEstadoHidratacion = obs;
    }
  } else if (/\b(?:ameh|deshidratado|mal\s+hidratado|mal\s+estado\s+de\s+hidrataci[oó]n)\b/i.test(norm)) {
    res.estadoHidratacion = "AMEH";
    const mObs = text.match(/(?:ameh|deshidratado|mal\s+hidratado|mal\s+estado\s+de\s+hidrataci[oó]n)(?:\s*[,;:]\s*|\s+(?:con\s+)?(?:observaci[oó]n|(?:el\s+)?paciente|refiere|presenta|debido\s+a)?\s*)(.+?)(?=(?:,\s*)?(?:lucidez|fa[sc]+ies|grado\s+de\s+colaboraci[oó]n|persona\s+con\s+necesidades|peso\s*(?:\(kg\)|es|de|:|\d)|talla\s*(?:\(m\)|es|de|:|\d)|temperatura\s+corporal|presi[oó]n|confirmar|$))/i);
    if (mObs && mObs[1].trim().length > 2) {
      let obs = mObs[1].trim().replace(/^(?:es|de|con|(?:el\s+)?paciente|observaci[oó]n:?)\s+/i, "");
      if (obs.length > 2) res.obsEstadoHidratacion = obs;
    }
  }

  // Lucidez y Orientación (Checkbox)
  if (/\b(?:marcar\s+lucidez|lucidez\s+y\s+orientaci[oó]n\s+(?:s[ií]|check)|lucidez\s+s[ií]|lotep|l[uú]cido\s+y\s+orientado|l[uú]cido|orientado)\b/i.test(norm)) {
    res.lucidez = "true";
  } else if (/\b(?:desmarcar\s+lucidez|lucidez\s+y\s+orientaci[oó]n\s+no|lucidez\s+no|no\s+l[uú]cido|no\s+orientado)\b/i.test(norm)) {
    res.lucidez = "false";
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
  if (/\btemperatura\s+(?:de\s+piel\s+)?normal\b|\bpiel\s+normot[eé]rmica\b/i.test(norm)) {
    res.temperaturaPiel = "Normal";
  } else if (/\btemperatura\s+(?:de\s+piel\s+)?aumentada\b|\bpiel\s+caliente\b/i.test(norm)) {
    res.temperaturaPiel = "Aumentada";
    const mObs = text.match(/(?:temperatura\s+(?:de\s+piel\s+)?aumentada|piel\s+caliente)(?:\s*[,;:]\s*|\s+(?:observaci[oó]n:?|debido\s+a|presenta)?\s*)(.+?)(?=(?:,\s*)?(?:lesiones|anexos|temperatura\s+corporal|frecuencia|pulso|presi[oó]n|confirmar|$))/i);
    if (mObs && mObs[1].trim().length > 2) {
      res.obsTemperaturaPiel = mObs[1].trim().replace(/^observaci[oó]n:?\s*/i, "");
    }
  } else if (/\btemperatura\s+(?:de\s+piel\s+)?disminuida\b|\bpiel\s+fr[ií]a\b|\bfrialdad\b/i.test(norm)) {
    res.temperaturaPiel = "Disminuida";
    const mObs = text.match(/(?:temperatura\s+(?:de\s+piel\s+)?disminuida|piel\s+fr[ií]a|frialdad)(?:\s*[,;:]\s*|\s+(?:observaci[oó]n:?|debido\s+a|presenta)?\s*)(.+?)(?=(?:,\s*)?(?:lesiones|anexos|temperatura\s+corporal|frecuencia|pulso|presi[oó]n|confirmar|$))/i);
    if (mObs && mObs[1].trim().length > 2) {
      res.obsTemperaturaPiel = mObs[1].trim().replace(/^observaci[oó]n:?\s*/i, "");
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
    res.observacion = mObs[1].trim().replace(/^(?:que|el\s+paciente\s+presenta\s+ser[ií]a\s+que)\s+/i, "");
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
      if (desc.length > 2) res.describaRespiracion = desc;
    }
  } else if (/\bla\s+descripci[oó]n\s+de\s+respiraci[oó]n\s+es\s+(?:la\s+siguiente|que)?\s*(.+)/i.test(text)) {
    const mDesc = text.match(/\bla\s+descripci[oó]n\s+de\s+respiraci[oó]n\s+es\s+(?:la\s+siguiente|que)?\s*(.+)/i);
    if (mDesc) {
      let desc = mDesc[1].trim()
        .replace(/^(?:(?:la\s+)?descripci[oó]n\s+(?:de\s+respiraci[oó]n\s+)?(?:es|ser[ií]a)?\s*)+/i, "")
        .replace(/^(?:la\s+siguiente|que|es|describa:?)\s+/i, "");
      if (desc.length > 2) res.describaRespiracion = desc;
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
      if (desc.length > 2) res.describaOtrosHabitos = desc;
    }
  } else if (/\bla\s+descripci[oó]n\s+de\s+otros\s+h[aá]bitos\s+es\s*(.+)/i.test(text)) {
    const mDesc = text.match(/\bla\s+descripci[oó]n\s+de\s+otros\s+h[aá]bitos\s+es\s*(.+)/i);
    if (mDesc) {
      let desc = mDesc[1].trim()
        .replace(/^(?:(?:la\s+)?descripci[oó]n\s+(?:de\s+otros\s+h[aá]bitos\s+)?(?:es|ser[ií]a)?\s*)+/i, "")
        .replace(/^(?:la\s+siguiente|que|es|describa:?)\s+/i, "");
      if (desc.length > 2) res.describaOtrosHabitos = desc;
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

  // Abrir modal interactivo
  if (/(?:abrir|editar|ver)\s+(?:imagen\s+interactiva\s+)?lesiones?\s+anterior/i.test(norm)) {
    return { action: "abrir_modal_lesiones", target: "anterior" };
  }
  if (/(?:abrir|editar|ver)\s+(?:imagen\s+interactiva\s+)?lesiones?\s+posterior/i.test(norm)) {
    return { action: "abrir_modal_lesiones", target: "posterior" };
  }

  // Cerrar modal interactivo
  if (/^(?:cerrar|cierra|cerrar\s+imagen\s+interactiva|cerrar\s+modal|ok\s+cerrar)$/i.test(norm)) {
    return { action: "cerrar_modal_lesiones" };
  }

  // Eliminar tabla / tarjeta
  const mDel = norm.match(/(?:eliminar|borrar|quitar)\s+(?:tabla|lesi[oó]n)?\s*(.+)/i);
  if (mDel) {
    const reg = mDel[1].replace(/^(?:de|en|la)?\s*/i, "").trim();
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

  const ecto = extractEctoscopia(text);
  const pt = extractPesoTalla(text);
  const piel = extractPielAnexos(text);
  const vitales = extractFuncionesVitales(text);
  const estom = extractEstomatologico(text);

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
  if (ecto.obsApreciacionGeneral) {
    const targetLabel = ecto.apreciacionGeneral === "AMEG" ? /^ameg:?$/i : /^areg:?$/i;
    const f = findF(targetLabel);
    if (f) entries.push({ field: f, valor: ecto.obsApreciacionGeneral });
  }
  if (ecto.estadoNutricional) {
    const f = findF(/nutricional/i);
    if (f) entries.push({ field: f, valor: ecto.estadoNutricional });
  }
  if (ecto.obsEstadoNutricional) {
    const targetLabel = ecto.estadoNutricional === "AMEN" ? /^amen:?$/i : /^aren:?$/i;
    const f = findF(targetLabel);
    if (f) entries.push({ field: f, valor: ecto.obsEstadoNutricional });
  }
  if (ecto.estadoHidratacion) {
    const f = findF(/hidrataci[oó]n/i);
    if (f) entries.push({ field: f, valor: ecto.estadoHidratacion });
  }
  if (ecto.obsEstadoHidratacion) {
    const targetLabel = ecto.estadoHidratacion === "AMEH" ? /^ameh:?$/i : /^areh:?$/i;
    const f = findF(targetLabel);
    if (f) entries.push({ field: f, valor: ecto.obsEstadoHidratacion });
  }
  if (ecto.lucidez) {
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
  if (piel.obsTemperaturaPiel) {
    const targetLabel = piel.temperaturaPiel === "Disminuida" ? /^disminuida:?$/i : /^aumentada:?$/i;
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

  return { handled: entries.length > 0, entries };
}
