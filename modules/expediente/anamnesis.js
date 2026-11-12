/* DentAI – Módulo Expediente: Anamnesis (modules/expediente/anamnesis.js)
   Rama de desarrollo asignada a: Frank Kevin Jauregui Bendezu
   Proyecto de Ingeniería UPCH / Clínica Smile
   
   Estructura de campos a mapear en este archivo:
   1. MOTIVO DE CONSULTA
      - Motivo principal dictado por el paciente (ej: "dolor de muela", "limpieza dental", "cambio de curación")
   2. HISTORIA DE LA ENFERMEDAD ACTUAL
      - Tiempo de enfermedad (días, semanas, meses)
      - Forma de inicio (insidioso / brusco)
      - Curso (progresivo / estacionario / intermitente)
      - Síntomas principales
      - Relato cronológico
   3. ANTECEDENTES PERSONALES
      - Enfermedades sistémicas (Diabetes, Hipertensión arterial, Asma, Cardiopatías, etc.)
      - Alergias (Penicilina, Anestésicos dentales, AINEs, Látex)
      - Medicación habitual
      - Hábitos nocivos (Fumador, Alcohol, Bruxismo)
   4. ANTECEDENTES FAMILIARES
      - Antecedentes médicos familiares de relevancia
*/

// Extraer Motivo de Consulta
function extractMotivoConsulta(text) {
  if (!text) return null;
  const m = text.match(/(?:motivo\s*(?:de)?\s*(?:la)?\s*consulta|viene\s*por|acude\s*por|refiere)\s*(?:\bes\b|:|\bde\b)?\s*(.+)/i);
  if (m) {
    let motivo = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    motivo = motivo.split(/\s+(?:confirmar|aplicar|tiempo\s+de\s+enfermedad|antecedentes)\b/i)[0].trim();
    if (motivo.length > 3) return motivo;
  }
  return null;
}

// Extraer Tiempo de Enfermedad
function extractTiempoEnfermedad(text) {
  if (!text) return null;
  const m = text.match(/(?:tiempo\s*(?:de)?\s*enfermedad|desde\s*hace|hace)\s*(?:\bes\b|:|\bde\b)?\s*(\d+\s*(?:d[ií]as?|semanas?|meses?|a[ñn]os?))/i);
  if (m) {
    return m[1].trim();
  }
  return null;
}

// Extraer Antecedentes Sistémicos y Alergias
function extractAntecedentes(text) {
  if (!text) return {};
  const norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const res = { alergias: [], enfermedades: [] };

  // Alergias
  if (/\bal[eé]rgico\s*(?:a)?\s*(?:la)?\s*penicilina|alergia\s*(?:a)?\s*(?:la)?\s*penicilina\b/i.test(norm)) res.alergias.push("PENICILINA");
  if (/\bal[eé]rgico\s*(?:a)?\s*(?:la)?\s*anestesia|alergia\s*(?:a)?\s*(?:la)?\s*anestesia\b/i.test(norm)) res.alergias.push("ANESTESIA LOCAL");
  if (/\bal[eé]rgico\s*(?:al)?\s*l[aá]tex|alergia\s*al\s*l[aá]tex\b/i.test(norm)) res.alergias.push("LATEX");
  if (/\bal[eé]rgico\s*(?:a)?\s*(?:los)?\s*(?:aines|antiinflamatorios|ibuprofeno|aspirina)\b/i.test(norm)) res.alergias.push("AINES");

  // Enfermedades
  if (/\b(?:hipertenso|hipertensi[oó]n|presi[oó]n\s+alta)\b/i.test(norm)) res.enfermedades.push("HIPERTENSIÓN ARTERIAL");
  if (/\b(?:diab[eé]tico|diabetes)\b/i.test(norm)) res.enfermedades.push("DIABETES");
  if (/\b(?:asm[aá]tico|asma)\b/i.test(norm)) res.enfermedades.push("ASMA");

  return res;
}
