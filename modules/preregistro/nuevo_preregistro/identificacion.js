/* DentAI – Submódulo Nuevo Preregistro: Datos de Identificación
   (modules/preregistro/nuevo_preregistro/identificacion.js)
   Mapeo clínico para:
   - Nombre, Primer Apellido, Segundo Apellido
   - DNI (8 dígitos), Tipo de Identificación (DNI, Pasaporte, Carnet de Extranjería, RUC), Documento general
   - Fecha de Nacimiento (con validación de calendario y formatos orales)
   - Género (Masculino / Femenino)
   - Reconciliación fonética con Base de Datos oficial (ej: "Johan" -> "Yojan", "Lexander" -> "Alexander")
   - Filtro estricto contra palabras de charla de fondo y conectores */

// Lista exhaustiva de palabras del español que JAMÁS pueden ser nombres ni apellidos (conectores, pronombres, verbos, charlas)
const INVALID_NAME_WORDS = new Set([
  // Conjunciones y conectores
  "y", "e", "o", "u", "ni", "que", "pero", "mas", "sino", "aunque", "porque", "pues", "como", "cuando", "donde", "mientras",
  // Preposiciones
  "a", "ante", "bajo", "cabe", "con", "contra", "de", "del", "desde", "durante", "en", "entre", "hacia", "hasta", "mediante", "para", "por", "segun", "según", "sin", "so", "sobre", "tras", "versus", "via", "vía",
  // Pronombres y determinantes
  "yo", "tu", "tú", "el", "él", "ella", "ello", "nosotros", "nosotras", "vosotros", "ellos", "ellas", "usted", "ustedes",
  "me", "te", "se", "nos", "os", "le", "les", "lo", "la", "los", "las", "mi", "mis", "mío", "mia", "mía", "tuyo", "tuya", "suyo", "suya",
  "este", "esta", "esto", "estos", "estas", "ese", "esa", "eso", "esos", "esas", "aquel", "aquella", "aquello",
  "quien", "quién", "quienes", "quiénes", "cual", "cuál", "cuales", "cuáles", "cuyo", "cuya", "que", "qué",
  // Verbos auxiliares y comunes
  "es", "son", "era", "eran", "fue", "fueron", "sea", "sean", "sido", "ser", "soy", "eres", "somos", "erais",
  "esta", "está", "estan", "están", "estaba", "estaban", "estuvo", "estuvieron", "estar", "estoy", "estas", "estás",
  "hay", "haber", "habia", "había", "habian", "habían", "hubo", "haya", "he", "has", "ha", "hemos", "han",
  "tiene", "tienen", "tenia", "tenía", "tenian", "tenían", "tuvo", "tuvieron", "tener", "tengo",
  "dice", "dicen", "dijo", "dijeron", "dijiste", "decia", "decía", "decir", "digo", "dices",
  "hace", "hacen", "hizo", "hicieron", "hacia", "hacía", "hacer", "hago",
  "va", "van", "iba", "iban", "ira", "irá", "iran", "irán", "ir", "voy", "vas", "vamos",
  "ve", "veo", "ves", "vemos", "ven", "vio", "vieron", "veia", "veía", "ver", "mira", "mire", "miren", "mirar",
  "creo", "crees", "cree", "creen", "crei", "creí", "creer",
  "viene", "vienen", "vino", "vinieron", "venir", "vengo",
  "pone", "ponen", "puso", "pusieron", "poner", "pon",
  "toma", "toman", "tomo", "tomó", "tomar",
  "deja", "dejan", "dejo", "dejó", "dejar",
  "queda", "quedan", "quedo", "quedó", "quedar",
  "sabe", "saben", "sabia", "sabía", "supo", "saber",
  "puede", "pueden", "podia", "podía", "pudo", "poder",
  "quiere", "quieren", "queria", "quería", "quiso", "querer",
  // Adverbios, muletillas y ruidos comunes (ej: "o sea sí y tú", "para el fin de máquinas")
  "si", "sí", "no", "ya", "osea", "bien", "mal", "bueno", "claro", "hola", "chau", "adios", "adiós",
  "tambien", "también", "tampoco", "nada", "todo", "algo", "poco", "mucho", "tanto", "demasiado",
  "siempre", "nunca", "jamas", "jamás", "aqui", "aquí", "aca", "acá", "ahi", "ahí", "alli", "allí", "alla", "allá",
  "cerca", "lejos", "arriba", "abajo", "delante", "detras", "detrás", "dentro", "fuera",
  "antes", "despues", "después", "luego", "ahora", "hoy", "ayer", "manana", "mañana", "pronto", "tarde",
  "tipo", "cosa", "cosas", "caso", "forma", "modo", "manera", "parte", "vez", "veces", "fin", "maquina", "maquinas",
  // Vocabulario de consultorio, oficina y controles de interfaz
  "clinica", "clínica", "creu", "upch", "cayetano", "smile", "consultorio", "diente", "dientes", "muela", "muelas",
  "caries", "equipo", "sistema", "plataforma", "tarjeta", "pago", "pagos", "credito", "crédito", "creditos", "créditos",
  "cobranza", "cobranzas", "perito", "peritos", "recepcion", "recepción", "triaje",
  "doctor", "doctora", "asistente", "paciente", "secretaria", "senor", "señor", "senora", "señora",
  "pantalla", "ventana", "boton", "botón", "pestana", "pestaña", "menu", "menú", "modulo", "módulo",
  "registro", "preregistro", "servicio", "agenda", "cita", "citas", "reporte", "fallas",
  "confirmar", "confirmado", "descartar", "cancelar", "borrar", "limpiar", "guardar", "aplicar", "abrir", "navegar",
  "nombre", "nombres", "apellido", "apellidos", "paterno", "materno", "dni", "documento", "celular", "telefono", "teléfono",
  "correo", "email", "arroba", "punto", "calle", "direccion", "dirección", "distrito", "provincia", "departamento",
    "fecha", "nacimiento", "genero", "género", "sexo", "masculino", "femenino",
  // Estados civiles y variantes fonéticas/truncadas
  "ta", "casado", "casada", "soltero", "soltera", "divorciado", "divorciada", "viudo", "viuda", "conviviente",
  // Ocupaciones, profesiones y disciplinas académicas
  "abogado", "abogada", "medico", "médico", "medica", "médica", "ingeniero", "ingeniera", "profesor", "profesora",
  "docente", "contador", "contadora", "enfermero", "enfermera", "arquitecto", "arquitecta", "policia", "policía",
  "militar", "chofer", "conductor", "conductora", "estudiante", "empleado", "empleada", "independiente",
  "jubilado", "jubilada", "comerciante", "obrero", "obrera", "tecnico", "técnica", "profesional", "ama", "casa",
  "derecho", "medicina", "odontologia", "odontología", "enfermeria", "enfermería", "contabilidad", "administracion", "administración",
  // Niveles de escolaridad y antecedentes
  "superior", "universitaria", "universitario", "secundaria", "primaria", "instituto", "estudios", "escolaridad",
  "alergico", "alérgica", "hipertenso", "hipertensa", "diabetico", "diabética", "paciente", "nuevo", "nueva"
]);

const CHATTER_WORDS = /\b(equipo|sistema|aplicacion|configuracion|extension|creditos|cobranzas?|clinica|creu|pantalla|pestana|pestaña|campus|completados?|foto|imagen|perito|tarjeta|pago|plataforma|smile|audio|microfono|ruido|exterior|interior|dieron|dice|dice\s+que|estan?|viendo|enseñar|tres|ambos|rondando|quedo|quedan|hablando)\b/i;

// Filtra palabras válidas para nombres propios de personas (descarta ruidos, muletillas y charlas como "o sea sí y tú")
function filterValidNameWords(rawText, maxWords = 3) {
  if (!rawText) return [];
  const cut = rawText.split(/\s+(?:y\s+luego|luego|despu[eé]s|y\s+despu[eé]s|que|para|con|rectifica|edita|cambia|corrige|confirmar|aplicar|descartar|cancelar|baja|sube|estado\s+civil|ocupaci[oó]n|profesi[oó]n|estudi[oó])\b/i)[0].trim();
  const words = cut.split(/\s+/).filter(Boolean);
  const valid = [];

  for (const w of words) {
    const cleanW = w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
    // Si alguna palabra aislada es un estado, ocupación o verbo prohibido (ej: "ta", "casado", "abogado"), se anula de inmediato
    if (INVALID_NAME_WORDS.has(cleanW) || cleanW === "ta" || cleanW.length < 2 || /\d/.test(w)) {
      return [];
    }
    let cap = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    // Reparación de truncamiento común por fonética o preposición (ej: "Lexander" o "Alexande" -> "Alexander")
    if (/^(?:alexande|lexander|lexande)$/i.test(cap)) cap = "Alexander";
    if (/^(?:lejandro|leandro)$/i.test(cap) && /^alej/i.test(w)) cap = "Alejandro";
    valid.push(cap);
  }

  return valid.slice(0, maxWords);
}

// Reconcilia el nombre dictado con la grafía oficial de la Base de Datos
// Preserva la grafía de la BD cuando coincide fonéticamente (ej: "Johan" -> "Yojan"),
// y permite rectificar libremente si el usuario dicta un nombre completamente distinto (ej: "Juan", "Alexander").
function reconcileNameWithDb(dictWords, dbName) {
  if (!dictWords || dictWords.length === 0) return "";
  if (!dbName) {
    return dictWords.join(" ");
  }

  const dbWords = dbName.trim().split(/\s+/).filter(Boolean);

  // Normalización fonética profunda en español:
  // Hace que "Johan", "Yojan", "Yohan" coincidan fonéticamente para respetar la grafía de la BD
  const phon = (w) => (w || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/y/g, "j")
    .replace(/h/g, "j")
    .replace(/ll/g, "j")
    .replace(/v/g, "b")
    .replace(/c(?=[ie])/g, "s")
    .replace(/z/g, "s")
    .replace(/k/g, "c")
    .replace(/w/g, "u")
    .replace(/x/g, "j")
    .replace(/j+/g, "j");

  const resultWords = [];

  for (let i = 0; i < dictWords.length; i++) {
    const dw = dictWords[i];
    const dwPhon = phon(dw);

    // Buscar si coincide fonéticamente con alguna palabra del nombre oficial de la BD
    const matchingDbWord = dbWords.find((dbw) => {
      const dbPhon = phon(dbw);
      return dbPhon === dwPhon ||
             dw.toLowerCase() === dbw.toLowerCase() ||
             (dwPhon.length >= 4 && (dbPhon.includes(dwPhon) || dwPhon.includes(dbPhon)));
    });

    if (matchingDbWord) {
      // Usar la grafía exacta oficial de la Base de Datos (ej: "Yojan" con Y)
      resultWords.push(matchingDbWord.charAt(0).toUpperCase() + matchingDbWord.slice(1).toLowerCase());
    } else {
      // Nombre nuevo, rectificado o adicional (ej: "Juan", "Alexander")
      resultWords.push(dw);
    }
  }

  return resultWords.slice(0, 3).join(" ");
}

// 1. Extraer Fecha de Nacimiento (Soporta "22 02 2006", "22 del 02 2006", "22 de febrero de 2006", etc.)
function extractFechaNacimiento(text) {
  const isDateContext = /(?:fecha|nacimiento|nacido|fec)/i.test(text);
  if (!isDateContext) return null;

  // Formato verbal: "22 de febrero de 2006", "22 de febrero del 2006"
  const meses = {
    enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
    julio: "07", agosto: "08", setiembre: "09", septiembre: "09", octubre: "10",
    noviembre: "11", diciembre: "12",
  };
  const mWord = text.match(/(?:fecha\s*(?:de)?\s*nacimiento|nacimiento|nacido\s*el)?\s*(\b\d{1,2}\b)\s+(?:de\s+)?([a-z]+)\s+(?:del?\s+)?(\b\d{4}\b)/i);
  if (mWord) {
    const d = parseInt(mWord[1], 10);
    const mesNom = mWord[2].toLowerCase();
    const y = parseInt(mWord[3], 10);
    const moStr = meses[mesNom];
    if (moStr && d >= 1 && d <= 31 && y >= 1900 && y <= 2030) {
      return {
        val: `${String(d).padStart(2, "0")}/${moStr}/${y}`,
        raw: mWord[0],
      };
    }
  }

  // Formato numérico con separadores: "22 02 2006", "22 del 02 2006", "22/02/2006", "22-02-2006", "22 del 02 del 2006"
  const mNum = text.match(/(?:fecha\s*(?:de)?\s*nacimiento|nacimiento|nacido\s*el)?\s*(\b\d{1,2}\b)(?:\s*(?:del?|\/|-|\s)\s*)(\b\d{1,2}\b)(?:\s*(?:del?|\/|-|\s)\s*)(\b\d{4}\b)/i);
  if (mNum) {
    const d = parseInt(mNum[1], 10);
    const mo = parseInt(mNum[2], 10);
    const y = parseInt(mNum[3], 10);
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y >= 1900 && y <= 2030) {
      return {
        val: `${String(d).padStart(2, "0")}/${String(mo).padStart(2, "0")}/${y}`,
        raw: mNum[0],
      };
    }
  }

  return null;
}

// 2. Extraer Tipo de Identificación (DNI, CARNET EXTRANJERIA, PASAPORTE, RUC)
function extractTipoIdentificacion(text) {
  const normT = (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // 1. Carnet de Extranjería
  if (/\b(?:carnet|carne)\s*(?:de\s*)?extranjer[ií]a\b/i.test(normT) || /\bextranjer[ií]a\b/i.test(normT)) {
    return { val: "CARNET EXTRANJERIA", label: "Carnet de Extranjería" };
  }

  // 2. Pasaporte
  if (/\bpasaporte\b/i.test(normT)) {
    return { val: "PASAPORTE", label: "Pasaporte" };
  }

  // 3. RUC
  if (/\bruc\b/i.test(normT)) {
    return { val: "RUC", label: "RUC" };
  }

  // 4. DNI
  if (/(?:tipo\s*(?:de\s*)?(?:identificacion|documento)|dito\s*de|cambia[ra]?\s*(?:a|el)?\s*tipo)?\s*(?:es\s*)?dni\b/i.test(normT) ||
      /\b(?:dito\s*de\s*dni|tipo\s*dni)\b/i.test(normT) ||
      /\bdni\b/i.test(normT)) {
    return { val: "DNI", label: "DNI" };
  }

  return null;
}

// 2b. Extraer DNI (8 dígitos con o sin espacios: "72 73 62 89" -> "72736289")
function extractDni(text) {
  if (/(?:fecha|nacimiento|nacido|fec)/i.test(text)) return null;
  if (/(?:celular|movil|whatsapp|telefono|fijo|casa|oficina)/i.test(text)) return null;

  // A. Si dice "dni" o "documento"
  const m = text.match(/(?:dni|documento|cedula|identificaci[oó]n)\s*[:=]?\s*([0-9\s]{8,24})/i);
  if (m) {
    const digits = m[1].replace(/\D/g, "");
    if (digits.length === 8) return digits;
  }

  // B. Si el texto contiene la palabra DNI en cualquier parte y hay 8 dígitos
  if (/(?:^|\s)(?:dni|documento)\b/i.test(text)) {
    const digits = text.replace(/\D/g, "");
    if (digits.length === 8) return digits;
  }

  // C. Si son exactamente 8 dígitos puros aislados en el texto
  const allDigits = text.replace(/\D/g, "");
  if (allDigits.length === 8 && !/(?:nombre|apellido|calle|numero)/i.test(text)) {
    return allDigits;
  }

  return null;
}

// 2c. Extraer número de documento general (para Pasaporte, Carnet Extranjería, etc.)
function extractDocNum(text) {
  if (/(?:fecha|nacimiento|celular|telefono|casa|oficina)/i.test(text)) return null;
  const m = text.match(/(?:documento|n[uú]mero\s*(?:de\s*)?documento|num\s*doc)\s*[:=]?\s*([a-z0-9\s]{6,15})/i);
  if (m) {
    const val = m[1].replace(/\s+/g, "").toUpperCase();
    if (val.length >= 6 && val.length <= 15) return val;
  }
  return null;
}

// 3. Extraer Nombres (Protegido contra preposiciones "a", charlas de fondo, reconciliado con BD)
function extractName(text) {
  if (CHATTER_WORDS.test(text)) return null;

  // AISLAMIENTO TOTAL: Si el dictado describe estado civil, profesión, residencia, etc., y NO contiene
  // la palabra clave explícita de nombre ("nombre ..."), NUNCA extraerlo como nombre de paciente.
  const mentionsOtherFields = /(?:estado\s+civil|est[aá]\s+(?:casad|solter|viud|divorciad|conviviente)|ocupaci[oó]n|profesi[oó]n|trabaja|estudi[oó]|abogad|m[eé]dic|ingenier|estudiante|emplead|escolaridad|direcci[oó]n|calle|avenida|distrito|departamento|provincia|factura|dni|documento|edad|a[ñn]os)/i.test(text);
  const hasExplicitNameKeyword = /\bnombres?(?:\s+(?:del\s+paciente|completo))?\s*(?:es|:|\bde\b|\ba\b)?\s*[a-záéíóúñ]+/i.test(text) || /\bse\s+llama\s+[a-záéíóúñ]+/i.test(text);

  if (mentionsOtherFields && !hasExplicitNameKeyword) {
    return null;
  }

  // Solo extraer si hay indicador explícito de nombre ("nombre [es] ...", "nombre del paciente ...", "se llama ...")
  // Eliminamos completamente "paciente es..." que causaba colisión con "paciente está..." -> "Tá Casado"
  const m = text.match(/(?:^|\s)(?:nombres?(?:\s+(?:del\s+paciente|completo))?|(?:el\s+paciente\s+)?se\s+llama)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*([a-záéíóúñ\s]+)/i);
  if (m) {
    let name = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    name = name.replace(/\b(?:registrado|di\s*confirmar|confirmar|listo|por\s*favor)\b/gi, "").trim();
    name = name.split(/\s+(?:y\s+luego|luego|despu[eé]s|estado\s+civil|ocupaci[oó]n|profesi[oó]n|est[aá]\s+|vive\s+en|con|baja|sube)\b/i)[0].trim();
    const validWords = filterValidNameWords(name, 3);
    if (validWords.length > 0) {
      const dbName = state.currentPatient?.nombres || "";
      return reconcileNameWithDb(validWords, dbName);
    }
  }
  return null;
}

// 4. Extraer Primer Apellido (Libre de preposición "a", números y charla, máximo 2 palabras)
function extractPrimerApellido(text) {
  if (CHATTER_WORDS.test(text)) return null;
  const m = text.match(/(?:primer\s+apellido|apellido\s+paterno|paterno)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*([a-záéíóúñ\s]+)/i);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    val = val.replace(/\b(?:registrado|di\s*confirmar|confirmar|listo)\b/gi, "").trim();
    const validWords = filterValidNameWords(val, 2);
    if (validWords.length > 0) {
      const dbApe = state.currentPatient?.apellidoPaterno || "";
      return reconcileNameWithDb(validWords, dbApe);
    }
  }
  return null;
}

// 5. Extraer Segundo Apellido (Libre de preposición "a", números y charla, máximo 2 palabras)
function extractSegundoApellido(text) {
  if (CHATTER_WORDS.test(text)) return null;
  const m = text.match(/(?:segundo\s+apellido|apellido\s+materno|materno)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*([a-záéíóúñ\s]+)/i);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    val = val.replace(/\b(?:registrado|di\s*confirmar|confirmar|listo)\b/gi, "").trim();
    const validWords = filterValidNameWords(val, 2);
    if (validWords.length > 0) {
      const dbApe = state.currentPatient?.apellidoMaterno || "";
      return reconcileNameWithDb(validWords, dbApe);
    }
  }
  return null;
}

// 9. Extraer Género
function extractGenero(text) {
  if (/(?:g[eé]nero|sexo)?\s*(?:es|:)?\s*\b(masculino|hombre|var[oó]n)\b/i.test(text)) return "MASCULINO";
  if (/(?:g[eé]nero|sexo)?\s*(?:es|:)?\s*\b(femenino|mujer)\b/i.test(text)) return "FEMENINO";
  return null;
}
