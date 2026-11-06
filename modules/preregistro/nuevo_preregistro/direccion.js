/* DentAI – Submódulo Nuevo Preregistro: Dirección (modules/preregistro/nuevo_preregistro/direccion.js)
   Mapeo clínico para:
   - Calle / Dirección general (Avenida, Jirón, Calle, Pasaje)
   - Número Exterior / Vivienda / Casa (Soporta números, "sin número", "SN", "S/N")
   - Referencia (Punto de referencia del domicilio)
   - Aislamiento estricto: evita contaminación cruzada con Factura o No. Exterior */

// Extraer Calle / Dirección (Dirección general del paciente)
function extractCalle(text) {
  if (!text) return null;
  if (/\b(?:de\s+factura|en\s+factura|para\s+factura)\b/i.test(text)) return null;

  // GUARDIA ESTRICTA: Si es número exterior, vivienda o casa, NUNCA es calle
  if (/(?:n[uú]mero\s+(?:exterior|de\s+vivienda|de\s+casa|de\s+direcci[oó]n|vivienda|casa)|no\.?\s*exterior|num\.?\s*ext|vivienda|sin\s+n[uú]mero|sin\s+numero|\bsn\b)/i.test(text)) {
    return null;
  }

  const m = text.match(/(?:calle|direcci[oó]n|avenida|av\.?|jir[oó]n|jr\.?|pasaje|pje\.?)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*(.+)/i);
  if (m) {
    let val = m[0].trim();
    val = val.replace(/^(?:calle|direcci[oó]n)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*/i, "").trim();
    val = val.split(/\s+(?:n[uú]mero\s+exterior|no\.?\s*exterior|n[uú]mero\s+de\s+vivienda|n[uú]mero\s+de\s+casa|vivienda|referencia|distrito|provincia|departamento|confirmar|aplicar|descartar)\b/i)[0].trim();
    if (val && val.length > 3) return val;
  }
  return null;
}

// Extraer Número Exterior / Número de vivienda / casa (Soporta "sin número", "SN", "S/N" o dígitos)
function extractNumeroExterior(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Si el texto habla explícitamente de DNI o celular o fecha sin mencionar exterior/vivienda/casa, ignorar
  if (/(?:fecha|nacimiento|celular|telefono|dni|documento)/i.test(normT) && 
      !/(?:exterior|vivienda|casa|predio|inmueble|sin\s+numero)/i.test(normT)) {
    return null;
  }

  // A. Coincidencia con "sin número", "SN" o "S/N"
  if (/(?:(?:n[uú]mero\s+(?:exterior(?:\s+de\s+vivienda)?|de\s+vivienda|de\s+casa|de\s+direcci[oó]n|vivienda|casa)|no\.?\s*exterior|num\.?\s*ext|vivienda)\s*)?(?:sin\s+n[uú]mero|sin\s+numero|s\s*\/\s*n|\bsn\b)/i.test(normT)) {
    return "S/N";
  }

  // B. Coincidencia con frase de número exterior / vivienda / casa
  const PAT = /(?:n[uú]mero\s+(?:exterior(?:\s+de\s+vivienda)?|de\s+vivienda|de\s+casa|de\s+direcci[oó]n|vivienda|casa)|no\.?\s*exterior|num\.?\s*ext|vivienda)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*([a-z0-9\s\/-]+)/i;
  const m = text.match(PAT);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    val = val.replace(/^(?:vivienda|casa|predio|exterior)\s+/i, "").trim();
    val = val.split(/\s+(?:calle|direcci[oó]n|referencia|distrito|confirmar|aplicar|descartar)\b/i)[0].trim();
    if (/^(?:sin\s+n[uú]mero|sin\s+numero|s\s*\/\s*n|sn)$/i.test(val)) return "S/N";
    if (val) return val.toUpperCase();
  }

  return null;
}

// Extraer Referencia
function extractReferencia(text) {
  if (!text) return null;
  const m = text.match(/(?:como\s+referencia|referencia|de\s+referencia)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*(.+)/i);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    val = val.split(/\s+(?:calle|n[uú]mero|distrito|confirmar|aplicar|descartar)\b/i)[0].trim();
    if (val && val.length > 2) return val;
  }
  return null;
}
