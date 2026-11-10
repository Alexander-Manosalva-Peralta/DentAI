/* DentAI – Módulo Servicio: Clínicas Integrales y Rotaciones UPCH (modules/servicio/servicios.js)
   Reconciliación fonética para nombres clínicos odontológicos de Cayetano Heredia:
   - DACE (pronunciado oralmente como "DASE", "darse", "dace")
   - DAENA (pronunciado oralmente como "dayna", "daina", "daena", "deina")
   - CLISMP (Clínica San Martín de Porres, pronunciado "clip SMP", "clic SMP", "clismp")
   - MAQUETA UPCH (Simulación en maqueta)
   - SIMUL (Laboratorio de simulación clínica) */

const SERVICIOS_CLINICOS_UPCH = [
  {
    id: "dace_1_maqueta_1",
    nombreOficial: "INTEGRAL DACE 1: MAQUETA UPCH 1",
    subcadena: "DACE 1: MAQUETA UPCH 1",
    aliases: [
      "integral dace 1 maqueta upch 1", "integral dase 1 maqueta upch 1",
      "integral dace 1 maqueta 1", "integral dase 1 maqueta 1",
      "dace 1 maqueta upch 1", "dase 1 maqueta upch 1",
      "dace 1 maqueta 1", "dase 1 maqueta 1",
      "maqueta upch 1", "maqueta 1", "dace 1", "dase 1"
    ]
  },
  {
    id: "dace_1_maqueta_2",
    nombreOficial: "INTEGRAL DACE 1: MAQUETA UPCH 2",
    subcadena: "DACE 1: MAQUETA UPCH 2",
    aliases: [
      "integral dace 1 maqueta upch 2", "integral dase 1 maqueta upch 2",
      "integral dace 1 maqueta 2", "integral dase 1 maqueta 2",
      "dace 1 maqueta upch 2", "dase 1 maqueta upch 2",
      "dace 1 maqueta 2", "dase 1 maqueta 2",
      "maqueta upch 2", "maqueta 2"
    ]
  },
  {
    id: "dace_3_clismp",
    nombreOficial: "INTEGRAL DACE 3 CLISMP",
    subcadena: "DACE 3 CLISMP",
    aliases: [
      "integral dace 3 clismp", "integral dase 3 clismp",
      "integral dace 3 clip smp", "integral dase 3 clip smp",
      "integral dace 3", "integral dase 3",
      "dace 3 clismp", "dase 3 clismp",
      "dace 3 clip smp", "dase 3 clip smp",
      "dace 3", "dase 3",
      "clip smp dace 3", "clismp dace 3",
      "clip smp", "clic smp", "clismp"
    ]
  },
  {
    id: "daena_1_maqueta_1",
    nombreOficial: "INTEGRAL DAENA 1 - MAQUETA UPCH 1",
    subcadena: "DAENA 1 - MAQUETA UPCH 1",
    aliases: [
      "integral daena 1 maqueta upch 1", "integral dayna 1 maqueta upch 1",
      "integral daina 1 maqueta upch 1", "integral daena 1 maqueta 1",
      "integral daena 1 maqueta", "integral dayna 1 maqueta", "integral daina 1 maqueta",
      "daena 1 maqueta upch 1", "dayna 1 maqueta upch 1",
      "daena 1 maqueta 1", "dayna 1 maqueta 1", "daina 1 maqueta 1",
      "daena 1 maqueta", "dayna 1 maqueta", "daena maqueta upch 1", "daena maqueta"
    ]
  },
  {
    id: "daena_1_clismp",
    nombreOficial: "INTEGRAL DAENA 1 CLISMP",
    subcadena: "DAENA 1 CLISMP",
    aliases: [
      "integral daena 1 clismp", "integral dayna 1 clismp", "integral daina 1 clismp",
      "integral daena 1 clip smp", "integral dayna 1 clip smp",
      "integral daena 1", "integral dayna 1", "integral daina 1",
      "daena 1 clismp", "dayna 1 clismp", "daina 1 clismp",
      "daena 1 clip smp", "dayna 1 clip smp",
      "integral daena", "integral dayna",
      "daena 1", "dayna 1", "daina 1",
      "daena", "dayna"
    ]
  },
  {
    id: "daena_2_clismp",
    nombreOficial: "INTEGRAL DAENA 2 CLISMP",
    subcadena: "DAENA 2 CLISMP",
    aliases: [
      "integral daena 2 clismp", "integral dayna 2 clismp", "integral daina 2 clismp",
      "integral daena 2 clip smp", "integral dayna 2 clip smp",
      "integral daena 2", "integral dayna 2", "integral daina 2",
      "daena 2 clismp", "dayna 2 clismp", "daina 2 clismp",
      "daena 2 clip smp", "dayna 2 clip smp",
      "daena 2", "dayna 2", "daina 2"
    ]
  },
  {
    id: "daena_4_clismp",
    nombreOficial: "INTEGRAL DAENA 4 CLISMP",
    subcadena: "DAENA 4 CLISMP",
    aliases: [
      "integral daena 4 clismp", "integral dayna 4 clismp", "integral daina 4 clismp",
      "integral daena 4 clip smp", "integral dayna 4 clip smp",
      "integral daena 4", "integral dayna 4", "integral daina 4",
      "daena 4 clismp", "dayna 4 clismp", "daina 4 clismp",
      "daena 4 clip smp", "dayna 4 clip smp",
      "daena 4", "dayna 4", "daina 4"
    ]
  },
  {
    id: "daena_4_simul",
    nombreOficial: "INTEGRAL DAENA 4 SIMUL",
    subcadena: "DAENA 4 SIMUL",
    aliases: [
      "integral daena 4 simul", "integral dayna 4 simul", "integral daina 4 simul",
      "integral daena 4 simulacion", "integral dayna 4 simulacion",
      "integral daena 4 simulador", "integral dayna 4 simulador",
      "daena 4 simul", "dayna 4 simul", "daina 4 simul",
      "daena 4 simulacion", "dayna 4 simulacion",
      "daena 4 simulador", "dayna 4 simulador",
      "simul daena 4", "simulacion daena 4", "simulador daena 4",
      "daena simul", "simul", "simulador", "simulacion"
    ]
  }
];

// Normalización fonética profunda para rotaciones de Servicio en Smile
function normalizeServicioFonetic(text) {
  if (!text) return "";
  let s = text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 1. Reconciliación de números en palabras (uno, una, un, dos, tres, cuatro)
  s = s.replace(/\b(?:uno|una|un)\b/gi, "1")
       .replace(/\bdos\b/gi, "2")
       .replace(/\btres\b/gi, "3")
       .replace(/\bcuatro\b/gi, "4");

  // 2. Reconciliación de UPCH fonético:
  // Casos reales detectados al dictar: "UPS H", "UPS H1", "UP S H", "UPSH", "UP SH", "uph1", "uph", "U P C H"
  s = s.replace(/\b(?:u\s*p\s*c\s*h|ups\s*h|up\s*s\s*h|upsh|up\s*sh|u\s*p\s*s\s*h|u\s*p\s*h|uph)(\d*)\b/gi, (match, p1) => {
    return p1 ? "upch " + p1 : "upch";
  });

  // 3. Reconciliación de DAENA (de arena, d arena, dearena, darena, dayna, daina, deina, da ena, dae na, etc.)
  s = s.replace(/\b(?:de\s*arena|d\s*arena|dearena|darena|de\s*aena|da\s*ena|dae\s*na|da\s+en\s+a|dayna|daina|deina|dayena|deyna|dayan|dayana)\b/gi, "daena");

  // 4. Reconciliación de DACE fonético:
  // Casos reales detectados por Web Speech API al dictar en español peruano:
  // - "de hace una", "de hace uno", "de hace tres", "de hace 1", "de hace 3"
  // - "da C3", "da c 3", "da c1", "da c 1", "da c2", "da c 2"
  // - "de hace", "de ase", "dehace", "dease", "d hace"
  // - "da c", "da ce", "da se", "dase", "darse", "daze", "dahe", "dasi"
  // - "integral hace 1", "integral hace 3"
  s = s.replace(/\bda\s*c\s*(\d+)\b/gi, "dace $1");
  s = s.replace(/\b(?:de\s*hace|de\s*ase|dehace|dease|d\s*hace|d\s*ace)\b/gi, "dace");
  s = s.replace(/\b(?:da\s*se|da\s*ce|da\s*c|dase|darse|daze|dahe|dasi)\b/gi, "dace");
  s = s.replace(/\bintegral\s+hace\s+(\d+)\b/gi, "integral dace $1");

  // 5. Reconciliación de CLISMP (clip smp, clic smp, clis smp, cli smp, clism, clismepe -> clismp)
  s = s.replace(/\b(?:clip\s*smp|clic\s*smp|clis\s*smp|cli\s*smp|clism\b|clismepe|clip\s*ese\s*eme\s*pe)\b/gi, "clismp");

  // 6. Reconciliación de SIMUL (simulacion, simulador -> simul)
  s = s.replace(/\b(?:simulaci[oó]n|simulador|simulaciones)\b/gi, "simul");

  return s.replace(/\s+/g, " ").trim();
}

// Reconcilia el texto dictado con el nombre oficial del Servicio en Smile
function reconcileServicioNombre(rawText) {
  if (!rawText) return null;
  const clean = normalizeServicioFonetic(rawText);

  // 1. Prioridad absoluta: SIMUL (Laboratorio de Simulación)
  if (/\bsimul\b/i.test(clean)) {
    return SERVICIOS_CLINICOS_UPCH[7]; // INTEGRAL DAENA 4 SIMUL
  }

  // 2. Búsqueda ordenada por longitud descendente de alias (los más específicos primero)
  const allAliases = [];
  for (const srv of SERVICIOS_CLINICOS_UPCH) {
    for (const alias of srv.aliases) {
      allAliases.push({ aliasClean: normalizeServicioFonetic(alias), srv });
    }
  }
  allAliases.sort((a, b) => b.aliasClean.length - a.aliasClean.length);

  for (const item of allAliases) {
    if (clean === item.aliasClean) {
      return item.srv;
    }
    const regex = new RegExp(`(^|\\s)${item.aliasClean}(\\s|$)`, "i");
    if (regex.test(clean)) {
      return item.srv;
    }
  }

  // 3. Búsqueda por combinación de palabras clave (DACE/DAENA + número + maqueta/clismp/simul)
  const isDace = /\bdace\b/i.test(clean);
  const isDaena = /\bdaena\b/i.test(clean);
  const has1 = /\b1\b/.test(clean);
  const has2 = /\b2\b/.test(clean);
  const has3 = /\b3\b/.test(clean);
  const has4 = /\b4\b/.test(clean);
  const isMaqueta1 = /\bmaqueta\b/i.test(clean) && has1;
  const isMaqueta2 = /\bmaqueta\b/i.test(clean) && has2;
  const isClismp = /\bclismp\b/i.test(clean) || /\bsmp\b/i.test(clean);

  if (isDace) {
    if (has1) {
      if (isMaqueta2 || clean.includes("2")) return SERVICIOS_CLINICOS_UPCH[1]; // DACE 1 MAQUETA 2
      return SERVICIOS_CLINICOS_UPCH[0]; // DACE 1 MAQUETA 1 (predeterminado para DACE 1)
    }
    if (has3 || isClismp) return SERVICIOS_CLINICOS_UPCH[2]; // DACE 3 CLISMP
  }

  if (isDaena) {
    if (has1) {
      if (isMaqueta1 || clean.includes("maqueta")) return SERVICIOS_CLINICOS_UPCH[3]; // DAENA 1 MAQUETA
      return SERVICIOS_CLINICOS_UPCH[4]; // DAENA 1 CLISMP
    }
    if (has2) return SERVICIOS_CLINICOS_UPCH[5]; // DAENA 2 CLISMP
    if (has4) {
      return SERVICIOS_CLINICOS_UPCH[6]; // DAENA 4 CLISMP
    }
    return SERVICIOS_CLINICOS_UPCH[4]; // DAENA default: DAENA 1 CLISMP
  }

  // Casos específicos sin DACE ni DAENA explícitos:
  if (isMaqueta1) return SERVICIOS_CLINICOS_UPCH[0];
  if (isMaqueta2) return SERVICIOS_CLINICOS_UPCH[1];
  if (isClismp) return SERVICIOS_CLINICOS_UPCH[2]; // Default CLISMP: DACE 3 CLISMP

  return null;
}

// Extrae el comando de voz para abrir / seleccionar un servicio de la lista
// Ejemplos: "abre Integral DASE 1", "abre Integral DACE 1", "abre maqueta UPCH 1", "abre clip SMP", "abre DAENA 4"
function extractSeleccionServicio(text) {
  if (!text) return null;
  const clean = normalizeServicioFonetic(text);

  // Verbos de apertura / selección
  const ACTION_VERBS = /(?:abre|abrir|entra\s+(?:a|en)?|entrar\s+(?:a|en)?|selecciona|seleccionar|ir\s+a|ve\s+a|ver|elegir|elige)/i;

  // Si incluye palabras clave del módulo servicio
  const hasServicioKeyword = /(?:integral|dace|daena|maqueta|clismp|simul)/i.test(clean);
  if (!hasServicioKeyword) return null;

  // Extraer el nombre del servicio tras el verbo o frase completa
  let targetQuery = clean;
  const mAction = clean.match(new RegExp(`^(?:\\s*${ACTION_VERBS.source})\\s+(?:el\\s+)?(?:servicio\\s+)?(.+)`, "i"));
  if (mAction) {
    targetQuery = mAction[1].trim();
  }

  const srv = reconcileServicioNombre(targetQuery) || reconcileServicioNombre(clean);
  if (srv) {
    return {
      action: "abrir_servicio",
      target: srv.nombreOficial,
      serviceId: srv.id,
      nombreOficial: srv.nombreOficial
    };
  }

  return null;
}

// Detecta si la pantalla activa es la vista del Módulo Servicio
function isServicioScreen() {
  if (typeof state === "undefined") return false;
  const url = (state.tab && state.tab.url) || "";
  if (/panel\/inicio|servicio/i.test(url)) return true;
  return false;
}
