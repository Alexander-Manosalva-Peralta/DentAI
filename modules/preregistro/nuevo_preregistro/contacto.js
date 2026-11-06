/* DentAI – Submódulo Nuevo Preregistro: Contacto (modules/preregistro/nuevo_preregistro/contacto.js)
   Mapeo clínico para:
   - Celular (9 dígitos peruano, inicia en 9)
   - Teléfono Casa (fijo residencial)
   - Teléfono Oficina (laboral)
   - Email / Correo Electrónico (fonética de dominios: @upch.pe, @cayetano.edu.pe, .com.pe, gmail, hotmail, etc.) */

// Extraer Celular (Estricto: No captura si menciona casa u oficina)
function extractCelular(text) {
  if (/(?:casa|fijo|oficina|trabajo)/i.test(text)) return null;

  // A. Si dice celular / móvil / whatsapp explícito
  const m = text.match(/(?:celular|m[oó]vil|whatsapp)\s*[:=]?\s*([9][0-9\s]{8,15})/i);
  if (m) {
    const digits = m[1].replace(/\D/g, "");
    if (digits.length === 9) return digits;
  }

  // B. Si es un número peruano de 9 dígitos que empieza con 9
  const allDigits = text.replace(/\D/g, "");
  if (allDigits.length === 9 && allDigits.startsWith("9")) {
    if (!/(?:dni|documento|fecha|nacimiento|paterno|materno|nombre|calle)/i.test(text)) {
      return allDigits;
    }
  }

  return null;
}

// Extraer Teléfono Casa (Estricto: Requiere casa o fijo)
function extractTelCasa(text) {
  const isCasa = /(?:tel[eé]fono\s*(?:de\s*)?casa|tel\s*casa|\bcasa\b|tel[eé]fono\s*fijo|\bfijo\b)/i.test(text);
  if (!isCasa) return null;
  if (/(?:oficina|trabajo)/i.test(text)) return null;

  const m = text.match(/(?:tel[eé]fono\s*(?:de\s*)?casa|tel\s*casa|\bcasa\b|tel[eé]fono\s*fijo|\bfijo\b)\s*[:=]?\s*([0-9\s]{6,14})/i);
  if (m) {
    const digits = m[1].replace(/\D/g, "");
    if (digits.length >= 6 && digits.length <= 11) return digits;
  }
  return null;
}

// Extraer Teléfono Oficina (Estricto: Requiere oficina o trabajo)
function extractTelOficina(text) {
  const isOfi = /(?:tel[eé]fono\s*(?:de\s*)?oficina|tel\s*oficina|\boficina\b|\btrabajo\b)/i.test(text);
  if (!isOfi) return null;

  const m = text.match(/(?:tel[eé]fono\s*(?:de\s*)?oficina|tel\s*oficina|\boficina\b|\btrabajo\b)\s*[:=]?\s*([0-9\s]{6,14})/i);
  if (m) {
    const digits = m[1].replace(/\D/g, "");
    if (digits.length >= 6 && digits.length <= 11) return digits;
  }
  return null;
}

// Extraer Email con normalización fonética y de dominios ultra-robusta
function extractEmail(text) {
  if (!text) return null;

  // Si el doctor dice "correo institucional", "correo upch" o "correo cayetano":
  if (/(?:correo|email)\s*(?:institucional|upch|cayetano|universitario)/i.test(text) && state.currentPatient) {
    const pNom = (state.currentPatient.nombres || "").split(/\s+/)[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const pApe = (state.currentPatient.apellidoPaterno || "").split(/\s+/)[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (pNom && pApe) {
      return `${pNom}.${pApe}@upch.pe`;
    }
  }

  // 1. Verificar si hay mención explícita o implícita de correo
  const hasEmailKeyword = /(?:email|correo(?:\s*electr[oó]nico)?|mail|arroba|@|gmail|hotmail|yahoo|outlook|cayetano|upch|ph\b)/i.test(text);
  if (!hasEmailKeyword) return null;

  // 2. Extraer solo la porción del correo, cortando antes de otros campos dictados
  let raw = text;
  const trigger = text.match(/(?:email|correo(?:\s*electr[oó]nico)?|mail)\s*(?:es|:|del paciente|en)?\s*(.+)/i);
  if (trigger) {
    raw = trigger[1];
  }

  // Cortar si el dictado continúa con otro campo clínico (para que no se pegue al correo)
  raw = raw.split(/\s+(?:celular|tel[eé]fono|tel\b|casa|oficina|dni|documento|fecha|nacimiento|g[eé]nero|sexo|nombre|apellido|calle|direcci[oó]n|confirmar|aplicar|descartar)\b/i)[0];

  raw = raw.replace(/\b(?:por favor|registrado|confirmar|listo|gracias)\b/gi, "").trim();
  if (!raw) return null;

  // 3. Quitar tildes
  let clean = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 4. Normalizar "arroba", "aroba", "at" -> @
  clean = clean.replace(/\s*(?:arroba|arrova|aroba|@|\bat\b)\s*/gi, "@");

  // Si no tiene @, pero menciona proveedores conocidos (ej: "juan perez en gmail", "juan perez hotmail")
  if (!clean.includes("@")) {
    clean = clean.replace(/\b(?:en\s+)?(gmail|hotmail|outlook|yahoo)\b/gi, "@$1.com");
  }

  // Normalizar variaciones orales peruanas para UPCH y Cayetano
  clean = clean
    .replace(/@\s*(?:u\s*p\s*c\s*h|upch|upchh|ph|u\s*p\s*c)\s*(?:\.|\s*(?:punto|dot)\s*)?p(?:e)?\b/gi, "@upch.pe")
    .replace(/@\s*cayetano(?:\.|\s*(?:punto|dot)\s*)?(?:edu)?(?:\.|\s*(?:punto|dot)\s*)?p(?:e)?\b/gi, "@cayetano.edu.pe");

  // Normalizar frases verbales de dominios
  clean = clean
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?edu(?:\.|\s*(?:punto|dot)\s*)?p(?:e)?\b/gi, ".edu.pe")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?com(?:\.|\s*(?:punto|dot)\s*)?p(?:e)?\b/gi, ".com.pe")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?gob(?:\.|\s*(?:punto|dot)\s*)?p(?:e)?\b/gi, ".gob.pe")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?org(?:\.|\s*(?:punto|dot)\s*)?p(?:e)?\b/gi, ".org.pe")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?edu\b/gi, ".edu")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?com\b/gi, ".com")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?net\b/gi, ".net")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?org\b/gi, ".org")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?gob\b/gi, ".gob")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?es\b/gi, ".es")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?pe\b/gi, ".pe")
    .replace(/(?:\.|\s*(?:punto|dot)\s*)?p\b/gi, ".pe");

  clean = clean
    .replace(/\s*(?:gui[oó]n\s*bajo|subgui[oó]n|sub\s*gui[oó]n|raya\s*al\s*piso)\s*/gi, "_")
    .replace(/\s*(?:gui[oó]n|raya|menos)\s*/gi, "-")
    .replace(/\s*(?:punto|dot)\s*/gi, ".");

  clean = clean.replace(/\s+/g, "").toLowerCase();
  clean = clean.replace(/[.,;:]+$/, "");
  clean = clean.replace(/\.p$/, ".pe");

  // 7. Corrección fonética con respecto al nombre registrado del paciente
  if (state.currentPatient && clean.includes("@")) {
    const [local, domain] = clean.split("@");
    let correctedLocal = local;

    const pNom = (state.currentPatient.nombres || "").split(/\s+/)[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const pApe = (state.currentPatient.apellidoPaterno || "").split(/\s+/)[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Normalizar fonéticamente el nombre en el correo al nombre actual del paciente
    if (pNom && pNom.length >= 3) {
      if (pNom === "yojan" || pNom === "johan") {
        correctedLocal = correctedLocal.replace(/\b(?:johan|joan|yohan|yojhan|llogan|iojan|yojan)\b/gi, pNom);
      } else if (pNom === "michael" || pNom === "michel" || pNom === "maicol") {
        correctedLocal = correctedLocal.replace(/\b(?:michael|michel|maicol|michele|mike)\b/gi, pNom);
      } else {
        const nomJ = pNom.replace(/y/g, "j");
        const nomY = pNom.replace(/j/g, "y");
        if (nomJ !== pNom) correctedLocal = correctedLocal.replace(new RegExp(nomJ, "gi"), pNom);
        if (nomY !== pNom) correctedLocal = correctedLocal.replace(new RegExp(nomY, "gi"), pNom);
      }
    }

    // Normalizar fonéticamente el apellido en el correo al apellido actual del paciente
    if (pApe && pApe.length >= 3) {
      if (pApe === "manosalva" || pApe === "manosalba") {
        correctedLocal = correctedLocal.replace(/\b(?:manosalba|manusalva|manosalba|manos-alva|manos_alva|manosalva)\b/gi, pApe);
      } else {
        const apeB = pApe.replace(/v/g, "b");
        const apeV = pApe.replace(/b/g, "v");
        if (apeB !== pApe) correctedLocal = correctedLocal.replace(new RegExp(apeB, "gi"), pApe);
        if (apeV !== pApe) correctedLocal = correctedLocal.replace(new RegExp(apeV, "gi"), pApe);
      }
    }

    clean = correctedLocal + "@" + domain;
  }

  // Si después del @ no hay ningún punto
  if (clean.includes("@")) {
    const parts = clean.split("@");
    if (!parts[1].includes(".")) {
      if (/upch|cayetano/i.test(parts[1])) {
        clean = parts[0] + "@" + (parts[1].includes("upch") ? "upch.pe" : "cayetano.edu.pe");
      } else {
        clean = parts[0] + "@" + parts[1] + ".com";
      }
    }
  }

  // Extraer el email con regex estándar y terminar en dominios válidos
  const match = clean.match(/([a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:edu\.pe|com\.pe|gob\.pe|org\.pe|edu|com|pe|org|net|gob|io|es|co|mx|ar|cl))/i)
    || clean.match(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);

  return match ? match[1] : null;
}
