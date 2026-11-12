/* DentAI – Módulo Expediente: Examen Clínico (modules/expediente/examen_clinico.js)
   Desarrollado para: Triaje y Evaluación Estomatológica Smile UPCH (Yojan Manosalva)
   Campos cubiertos:
   - A - GENERAL: Ectoscopia (ABEG/AREG/AMEG, Nutrición, Hidratación, Lucidez LOTEP, Facies, Colaboración)
   - PESO Y TALLA: Peso (Kg), Talla (M), IMC con cálculo automático
   - FUNCIONES VITALES: Temperatura (°C), Frecuencia respiratoria (/min), Pulso (/min), Presión arterial (mm Hg)
   - B - ESTOMATOLÓGICO EXTRAORAL: Respiración, Piel, Musculatura, ATM, Simetría, Forma de cara, Ganglios, Apertura bucal
   - C - INTRAORAL ASP. GENERALES: Halitosis, Saliva (consistencia/flujo), Reflejo nauseoso
   - D - TEJIDOS BLANDOS: Carrillos, Encía, Labios, Lengua, Paladar, etc.
   - H - OCLUSIÓN: Mordida abierta, cruzada, en tijera, overjet, overbite */

// 1. Extraer Ectoscopia (Apreciación general, nutrición, hidratación, etc.)
function extractEctoscopia(text) {
  if (!text) return {};
  const norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const res = {};

  // Apreciación General
  if (/\b(?:abeg|buen\s+estado\s+general|aparente\s+buen\s+estado)\b/i.test(norm)) res.apreciacionGeneral = "ABEG";
  else if (/\b(?:areg|regular\s+estado\s+general)\b/i.test(norm)) res.apreciacionGeneral = "AREG";
  else if (/\b(?:ameg|mal\s+estado\s+general)\b/i.test(norm)) res.apreciacionGeneral = "AMEG";

  // Estado Nutricional
  if (/\b(?:aben|buen\s+estado\s+nutricional|nutrici[oó]n\s+buena|buena\s+nutrici[oó]n)\b/i.test(norm)) res.estadoNutricional = "ABEN";
  else if (/\b(?:aren|regular\s+nutrici[oó]n|nutrici[oó]n\s+regular)\b/i.test(norm)) res.estadoNutricional = "AREN";
  else if (/\b(?:amen|mal\s+estado\s+nutricional|desnutrido)\b/i.test(norm)) res.estadoNutricional = "AMEN";

  // Estado de Hidratación
  if (/\b(?:abeh|buena\s+hidrataci[oó]n|hidratado|bien\s+hidratado)\b/i.test(norm)) res.estadoHidratacion = "ABEH";
  else if (/\b(?:areh|regular\s+hidrataci[oó]n)\b/i.test(norm)) res.estadoHidratacion = "AREH";
  else if (/\b(?:ameh|deshidratado|mal\s+hidratado)\b/i.test(norm)) res.estadoHidratacion = "AMEH";

  // Lucidez y Orientación (LOTEP)
  if (/\b(?:lotep|l[uú]cido|orientado|l[uú]cido\s+orientado|lucidez)\b/i.test(norm)) res.lucidez = "Si";

  // Grado de Colaboración
  if (/\b(?:colaborador|buena\s+colaboraci[oó]n|colabora)\b/i.test(norm)) res.colaboracion = "COLABORADOR";
  else if (/\b(?:poco\s+colaborador|colaboraci[oó]n\s+regular)\b/i.test(norm)) res.colaboracion = "POCO COLABORADOR";
  else if (/\b(?:no\s+colaborador|no\s+colabora|negativo)\b/i.test(norm)) res.colaboracion = "NO COLABORADOR";

  return res;
}

// 2. Extraer Peso, Talla y Cálculo Automático de IMC
function extractPesoTalla(text) {
  if (!text) return {};
  const norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const res = {};

  // Peso (Kg)
  const mPeso = norm.match(/(?:peso|pesa)\s*(?:es|de|:)?\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|kilos|kilogramos)?/i);
  if (mPeso) {
    res.peso = mPeso[1].replace(",", ".");
  }

  // Talla (M) - ej: "talla 1.70", "talla 1 metro 70", "talla 1 punto 65", "mide 1.68"
  const mTalla = norm.match(/(?:talla|estatura|mide)\s*(?:es|de|:)?\s*(\d(?:[.,]\d{1,2})?|\d\s*(?:metro|m)\s*\d{1,2})/i);
  if (mTalla) {
    let tVal = mTalla[1].replace(/metro[s]?|m/i, ".").replace(/\s+/g, "").replace(",", ".");
    if (tVal.length === 3 && !tVal.includes(".")) {
      tVal = `${tVal[0]}.${tVal.slice(1)}`; // ej: "165" -> "1.65"
    }
    res.talla = tVal;
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

// 3. Extraer Funciones Vitales (Temperatura, Respiración, Pulso, Presión Arterial)
function extractFuncionesVitales(text) {
  if (!text) return {};
  const norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const res = {};

  // Temperatura Corporal (°C)
  const mTemp = norm.match(/(?:temperatura|temp)\s*(?:corporal)?\s*(?:es|de|:)?\s*(\d{2}(?:[.,]\d+)?)\s*(?:grados|°c)?/i);
  if (mTemp) {
    res.temperatura = mTemp[1].replace(",", ".");
  }

  // Frecuencia Respiratoria (/min)
  const mResp = norm.match(/(?:frecuencia\s+respiratoria|respiraci[oó]n)\s*(?:es|de|:)?\s*(\d{1,2})\s*(?:por\s+minuto|\/min)?/i);
  if (mResp) {
    res.frecuenciaRespiratoria = mResp[1];
  }

  // Pulso (/min)
  const mPulso = norm.match(/(?:pulso|frecuencia\s+card[ií]aca)\s*(?:es|de|:)?\s*(\d{2,3})\s*(?:por\s+minuto|\/min)?/i);
  if (mPulso) {
    res.pulso = mPulso[1];
  }

  // Presión Arterial (mm Hg) - ej: "presion 120 sobre 80", "120/80", "120 con 80"
  const mPresion = norm.match(/(?:presi[oó]n|presi[oó]n\s+arterial)\s*(?:es|de|:)?\s*(\d{2,3})\s*(?:sobre|\/|con|-)\s*(\d{2,3})/i);
  if (mPresion) {
    res.presionArterial = `${mPresion[1]}/${mPresion[2]}`;
  }

  return res;
}

// 4. Extraer Estomatológico Extraoral y Oclusión
function extractEstomatologico(text) {
  if (!text) return {};
  const norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const res = {};

  // Respiración
  if (/\brespiraci[oó]n\s+nasal\b/i.test(norm)) res.respiracion = "NASAL";
  else if (/\brespiraci[oó]n\s+bucal\b/i.test(norm)) res.respiracion = "BUCAL";
  else if (/\brespiraci[oó]n\s+mixta\b/i.test(norm)) res.respiracion = "MIXTA";

  // Simetría facial
  if (/\b(?:sim[eé]trico|simetr[ií]a\s+facial\s+conservada|cara\s+sim[eé]trica)\b/i.test(norm)) res.simetriaFacial = "SIMÉTRICO";
  else if (/\basim[eé]trico|asimetr[ií]a\b/i.test(norm)) res.simetriaFacial = "ASIMÉTRICO";

  // Apertura Bucal
  if (/\b(?:apertura\s+normal|apertura\s+bucal\s+normal)\b/i.test(norm)) res.aperturaBucal = "Aparentemente normal";
  else if (/\bapertura\s+con\s+limitaci[oó]n|limitaci[oó]n\s+de\s+apertura\b/i.test(norm)) res.aperturaBucal = "Con limitación";
  else if (/\bapertura\s+con\s+desviaci[oó]n\b/i.test(norm)) res.aperturaBucal = "Con desviación";

  // ATM (Articulación Temporomandibular)
  if (/\batm\s+(?:normal|sin\s+ruidos|aparentemente\s+normal)\b/i.test(norm)) res.atm = "APARENTEMENTE NORMAL";
  else if (/\batm\s+(?:con\s+ruidos|chasquidos|crepitaci[oó]n)\b/i.test(norm)) res.atm = "CON RUIDOS";
  else if (/\batm\s+(?:con\s+dolor|dolorosa)\b/i.test(norm)) res.atm = "CON DOLOR";

  // Mordida (Oclusión)
  if (/\bmordida\s+abierta\b/i.test(norm)) res.mordidaAbierta = "Si";
  if (/\bmordida\s+cruzada\b/i.test(norm)) res.mordidaCruzada = "Si";
  if (/\bmordida\s+(?:en\s+tijera|tijera)\b/i.test(norm)) res.mordidaTijera = "Si";

  return res;
}
