/* DentAI – Submódulo Nuevo Preregistro: Otros Datos (modules/preregistro/nuevo_preregistro/otros_datos.js)
   Mapeo clínico para:
   - Cómo se enteró (FACEBOOK, INSTAGRAM, TIKTOK, RECOMENDACION, PAGINA WEB, RADIO, TELEVISION)
   - Estado Civil (SOLTERO, CASADO, VIUDO, DIVORCIADO, CONVIVIENTE)
   - Ocupación / Profesión (ESTUDIANTE, EMPLEADO, INDEPENDIENTE, JUBILADO, PROFESIONAL, COMERCIANTE)
   - Escolaridad / Grado de instrucción (SUPERIOR UNIVERSITARIA, TECNICO, SECUNDARIA COMPLETA, etc.)
   - Agenda varias citas ("Si" / "No")
   - Observaciones / Notas clínicas */

// Extraer Cómo se enteró (Dropdown RECOMENDADOR)
function extractComoSeEntero(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const isMatch = /(?:se\s+enter[oó]\s*(?:mediante|por|en|a\s+trav[eé]s\s+de)?|supo\s*(?:mediante|por|en)?|c[oó]mo\s+se\s+enter[oó]|medio\s+(?:de\s+publicidad|recomendador)|recomendador)/i.test(normT);
  if (!isMatch) return null;

  if (/\bfacebook\b/i.test(normT)) return "FACEBOOK";
  if (/\binstagram\b/i.test(normT)) return "INSTAGRAM";
  if (/\btiktok\b/i.test(normT)) return "TIKTOK";
  if (/\brecomendaci[oó]n|recomendado|amigo|familiar\b/i.test(normT)) return "RECOMENDACION";
  if (/\bp[aá]gina\s*web|web|internet\b/i.test(normT)) return "PAGINA WEB";
  if (/\bradio\b/i.test(normT)) return "RADIO";
  if (/\btelevisi[oó]n|tele|tv\b/i.test(normT)) return "TELEVISION";

  const m = text.match(/(?:se\s+enter[oó]\s*(?:mediante|por|en|a\s+trav[eé]s\s+de)?|supo\s*(?:mediante|por|en)?|c[oó]mo\s+se\s+enter[oó])\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*(.+)/i);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    val = val.split(/\s+(?:confirmar|aplicar|estado|ocupacion|descartar)\b/i)[0].trim().toUpperCase();
    if (val) return val;
  }
  return null;
}

// Extraer Estado Civil
function extractEstadoCivil(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const isMatch = /(?:el\s+paciente\s+est[aá]|estado\s+civil|est[aá]\s+(?:soltero|casado|viudo|divorciado|conviviente)|es\s+(?:soltero|casado|viudo|divorciado|conviviente)|(?:el\s+paciente\s+)?(?:est[aá]|es)\s+(?:casad|solter|viud|divorciad|conviviente))/i.test(normT);
  if (!isMatch) return null;

  if (/\bsolter[oa]\b/i.test(normT)) return "SOLTERO";
  if (/\bcasad[oa]\b/i.test(normT)) return "CASADO";
  if (/\bviud[oa]\b/i.test(normT)) return "VIUDO";
  if (/\bdivorciad[oa]\b/i.test(normT)) return "DIVORCIADO";
  if (/\bconviviente\b/i.test(normT)) return "CONVIVIENTE";
  return null;
}

// Extraer Ocupación / Profesión
function extractOcupacion(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const isMatch = /(?:ocupaci[oó]n|profesi[oó]n|trabaja\s*(?:como|en)?|es\s+(?:estudiante|emplead[oa]|ingenier[oa]|m[eé]dic[oa]|abogad[oa]|profesor[a]?|comerciante|jubilad[oa]|contador[a]?|enfermer[oa]|arquitect[oa])|ha\s+estudiado\s+.*y\s+es\s+|es\s+abogad[oa]|es\s+ingenier[oa]|es\s+m[eé]dic[oa]|es\s+profesor[a]?)/i.test(normT);
  if (!isMatch) return null;

  if (/\babogad[oa]\b/i.test(normT)) return "ABOGADO";
  if (/\bingenier[oa]\b/i.test(normT)) return "INGENIERO";
  if (/\bm[eé]dic[oa]\b/i.test(normT)) return "MEDICO";
  if (/\bprofesor[a]?|docente\b/i.test(normT)) return "PROFESOR";
  if (/\bcontador[a]?\b/i.test(normT)) return "CONTADOR";
  if (/\benfermer[oa]\b/i.test(normT)) return "ENFERMERO";
  if (/\barquitect[oa]\b/i.test(normT)) return "ARQUITECTO";
  if (/\bpolic[ií]a\b/i.test(normT)) return "POLICIA";
  if (/\bestudiante\b/i.test(normT)) return "ESTUDIANTE";
  if (/\bemplead[oa]\b/i.test(normT)) return "EMPLEADO";
  if (/\bindependiente\b/i.test(normT)) return "INDEPENDIENTE";
  if (/\bjubilad[oa]\b/i.test(normT)) return "JUBILADO";
  if (/\bama\s+de\s+casa\b/i.test(normT)) return "AMA DE CASA";
  if (/\bcomerciante\b/i.test(normT)) return "COMERCIANTE";
  if (/\bprofesional\b/i.test(normT)) return "PROFESIONAL";

  const m = text.match(/(?:ocupaci[oó]n|profesi[oó]n|trabaja\s*(?:como|en)?|es)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*([a-záéíóúñ\s]+)/i);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    val = val.split(/\s+(?:confirmar|aplicar|escolaridad|descartar|estado)\b/i)[0].trim().toUpperCase();
    if (val && !/^(?:el|la|un|una|paciente)$/i.test(val)) return val;
  }
  return null;
}

// Extraer Escolaridad / Estudios
function extractEscolaridad(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const isMatch = /(?:escolaridad|estudios|grado\s+(?:de\s+)?instrucci[oó]n|nivel\s+(?:de\s+)?estudios|ha\s+estudiado|estudi[oó])/i.test(normT);
  if (!isMatch) return null;

  if (/\b(?:superior\s+universitaria|universitaria|universidad|derecho|medicina|ingenier[ií]a|carrera\s+universitaria|licenciatura)\b/i.test(normT)) return "SUPERIOR UNIVERSITARIA";
  if (/\bsuperior\s+no\s+universitaria\b/i.test(normT)) return "SUPERIOR NO UNIVERSITARIA";
  if (/\b(?:t[eé]cnic[oa]|instituto)\b/i.test(normT)) return "TECNICO";
  if (/\bsecundaria\b/i.test(normT)) return "SECUNDARIA COMPLETA";
  if (/\bprimaria\b/i.test(normT)) return "PRIMARIA COMPLETA";

  const m = text.match(/(?:escolaridad|estudios|grado\s+(?:de\s+)?instrucci[oó]n)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*([a-záéíóúñ\s]+)/i);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    val = val.split(/\s+(?:confirmar|aplicar|descartar)\b/i)[0].trim().toUpperCase();
    if (val) return val;
  }
  return null;
}

// Extraer Agenda varias citas ("Si" / "No")
function extractAgendaVariasCitas(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const isMatch = /(?:agenda(?:r)?\s+varias\s+citas|varias\s+citas)/i.test(normT);
  if (!isMatch) return null;

  if (/\bno\b/i.test(normT) && !/\bs[ií]\b/i.test(normT)) {
    return "No";
  }
  return "Si";
}

// Extraer Observaciones
function extractObservaciones(text) {
  if (!text) return null;
  const m = text.match(/(?:observaciones|observaci[oó]n|nota\s*cl[ií]nica|nota)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*(.+)/i);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    val = val.split(/\s+(?:confirmar|aplicar|descartar)\b/i)[0].trim();
    if (val && val.length > 2) return val;
  }
  return null;
}
