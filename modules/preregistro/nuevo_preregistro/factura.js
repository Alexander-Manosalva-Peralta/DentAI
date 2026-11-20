/* DentAI – Submódulo Nuevo Preregistro: Factura (modules/preregistro/nuevo_preregistro/factura.js)
   Mapeo clínico para la sección de facturación:
   - ¿Va a requerir factura? ("Si" / "No")
   - ¿Los datos son iguales a la dirección? ("Si" / "No")
   - Aislamiento estricto de campos de facturación respecto a los datos del paciente */

const normFacturaText = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Extraer Requerimiento de Factura ("Si" / "No")
function extractFactura(text) {
  if (!text) return null;
  const normT = normFacturaText(text);

  // Si el texto es una orden para editar un campo específico dentro de factura, NO es un toggle de factura
  if (/(?:calle|direcci|exterior|vivienda|numero|num|pais|depa|provincia|distrito|correo|email|ruc|dni|identificaci|documento|razon\s+social)/i.test(normT)) {
    return null;
  }

  // CASO NO: "sin factura", "no va a requerir/querer factura", "no quiere/requiere factura", "factura no"
  if (/\b(?:sin\s+factura|no\s+(?:va\s+a\s+)?(?:requerir|querer|desear)\s+factura|no\s+(?:quiere|requiere|desea)\s+factura)\b/i.test(normT) ||
      /(?:factura|(?:re)?querer\s+factura|(?:re)?querir\s+factura)\s*(?:a|es)?\s*no\b/i.test(normT) ||
      /^(?:no\s+factura|factura\s+no|quitar\s+factura|desactivar\s+factura)$/i.test(normT)) {
    return "No";
  }

  // CASO SÍ: "con factura", "si va a requerir/querer factura", "va a querer/requerir factura", "quiere/requiere factura", "factura si"
  if (/\b(?:con\s+factura|s[ií]\s+(?:va\s+a\s+)?(?:requerir|querer|desear)\s+factura|(?:va\s+a\s+)?(?:requerir|querer|desear)\s+factura|(?:quiere|requiere|desea)\s+factura)\b/i.test(normT) ||
      /(?:factura|(?:re)?querer\s+factura|(?:re)?querir\s+factura)\s*(?:a|es)?\s*s[ií]\b/i.test(normT) ||
      /^(?:s[ií]\s+factura|factura\s+s[ií]|activar\s+factura|poner\s+factura)$/i.test(normT)) {
    return "Si";
  }

  return null;
}

// Extraer "Los datos son iguales a la dirección" ("Si" / "No")
function extractDatosIgualesDireccion(text) {
  if (!text) return null;
  const normT = normFacturaText(text);

  // Si es orden de editar un campo de factura, NO es toggle de datos iguales
  if (/(?:calle|exterior|vivienda|numero|num|pais|depa|provincia|distrito|correo|email|ruc|dni|identificaci|documento|razon\s+social)/i.test(normT)) {
    return null;
  }

  const isAboutDatosIguales = /(?:datos\s+(?:si\s+)?son\s+iguales|mismos\s+datos\s+(?:que\s+|de\s+)?(?:la\s+)?direcci[oó]n|datos\s+iguales(?:\s+a\s+la\s+direcci[oó]n)?|iguales\s+a\s+la\s+direcci[oó]n)/i.test(normT);
  if (!isAboutDatosIguales) return null;

  if (/\bno\b/i.test(normT) && !/\bs[ií]\b/i.test(normT)) {
    return "No";
  }
  return "Si";
}

// Limpiar conectores iniciales y cortes de dictado
function cleanFacturaValue(raw) {
  if (!raw) return "";
  let val = raw.trim();
  val = val.replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b|\bsea\b)[\s:]*|[\s:]+)+/i, "").trim();
  val = val.split(/\s+(?:y\s+luego|luego|despu[eé]s|y\s+despu[eé]s|para|con|rectifica|edita|cambia|corrige|confirmar|aplicar|descartar|cancelar|baja|sube)\b/i)[0].trim();
  return val;
}

function formatFacturaResult(type, val) {
  switch (type) {
    case "calle":
      return { type: "calle", field: "Calle (Factura)", value: val };
    case "exterior":
      const extVal = /^(?:sin\s+n[uú]mero|sin\s+numero|sn|s\/n)$/i.test(val) ? "S/N" : val.toUpperCase();
      return { type: "exterior", field: "No. Exterior (Factura)", value: extVal };
    case "pais":
      return { type: "pais", field: "País (Factura)", value: val.toUpperCase() };
    case "departamento":
      return { type: "departamento", field: "Departamento (Factura)", value: val.toUpperCase() };
    case "provincia":
      return { type: "provincia", field: "Provincia (Factura)", value: val.toUpperCase() };
    case "distrito":
      return { type: "distrito", field: "Distrito (Factura)", value: val.toUpperCase() };
    case "correo":
      const em = (typeof extractEmail === "function" ? extractEmail(val) : null) || val.replace(/\s+/g, "").toLowerCase();
      return { type: "correo", field: "Correo (Factura)", value: em };
    case "documento":
      const dig = val.replace(/\D/g, "") || val;
      return { type: "documento", field: "Documento (Factura)", value: dig };
    case "tipo_documento":
      const tipoObj = (typeof extractTipoIdentificacion === "function" ? extractTipoIdentificacion(val) : null);
      return { type: "tipo_documento", field: "Tipo identificación (Factura)", value: tipoObj ? tipoObj.val : val.toUpperCase() };
    case "razon_social":
      return { type: "razon_social", field: "Razón Social", value: val.toUpperCase() };
    default:
      return null;
  }
}

// Extraer comandos específicos dirigidos a campos dentro de la sección Factura
function extractFacturaFieldCommand(text) {
  if (!text) return null;
  const raw = text.trim();
  const normT = normFacturaText(raw);

  const FIELD_DEFS = [
    { type: 'tipo_documento', regex: /^(?:el\s+)?(?:tipo(?:\s+de)?\s+identificacion|tipo(?:\s+de)?\s+documento)\b/i },
    { type: 'documento', regex: /^(?:el\s+)?(?:documento|ruc|dni)\b/i },
    { type: 'calle', regex: /^(?:la\s+)?(?:calle|direccion|avenida|jiron|pasaje)\b/i },
    { type: 'exterior', regex: /^(?:el\s+)?(?:numero\s+exterior|no\.?\s*exterior|num\.?\s*ext|numero\s+de\s+vivienda|numero\s+de\s+casa|numero|exterior|vivienda)\b/i },
    { type: 'pais', regex: /^(?:el\s+)?pais\b/i },
    { type: 'departamento', regex: /^(?:el\s+)?(?:departamento|depa)\b/i },
    { type: 'provincia', regex: /^(?:la\s+)?provincia\b/i },
    { type: 'distrito', regex: /^(?:el\s+)?distrito\b/i },
    { type: 'correo', regex: /^(?:el\s+)?(?:correo(?:\s+electronico)?|email)\b/i },
    { type: 'razon_social', regex: /^(?:la\s+)?razon\s+social\b/i }
  ];

  const VERBS = "(?:aedita|aeditar|edita|editar|cambia|cambiar|corrige|corregir|modifica|modificar|pon|poner|rectifica|rectificar)";

  // 1. Razón Social (directo o con prefijo)
  const rs = raw.match(new RegExp(`^(?:${VERBS}\\s+)?(?:(?:dentro\\s+de\\s+|en\\s+|de\\s+|datos\\s+de\\s+)factura\\s+)?(?:la\\s+)?raz[oó]n\\s+social\\s*[:=]?\\s*(.+)`, 'i'));
  if (rs) {
    const val = cleanFacturaValue(rs[1]);
    if (val) return formatFacturaResult('razon_social', val);
  }

  // 2. Factura al FINAL (ej: 'aedita tipo de identificación RUC dentro de factura', 'edita calle Honorio Delgado en factura', 'edita número exterior 552 de factura')
  const endFactura = raw.match(new RegExp(`^(?:${VERBS}\\s+)?(.+?)\\s+(?:dentro\\s+de\\s+factura|en\\s+factura|de\\s+factura)\\s*$`, 'i'));
  if (endFactura) {
    const fieldAndVal = endFactura[1].trim();
    const fieldAndValNorm = normFacturaText(fieldAndVal);
    for (const f of FIELD_DEFS) {
      const m = fieldAndValNorm.match(f.regex);
      if (m) {
        const val = cleanFacturaValue(fieldAndVal.slice(m[0].length));
        if (val) return formatFacturaResult(f.type, val);
      }
    }
  }

  // 3. Factura al INICIO (ej: 'dentro de factura edita tipo de identificación RUC', 'en factura cambia país Perú', 'datos de factura calle...')
  const startFactura = raw.match(new RegExp(`^(?:(?:${VERBS}\\s+)?(?:dentro\\s+de\\s+|en\\s+|datos\\s+de\\s+)factura|(?:${VERBS}\\s+)?factura)\\s+(?:${VERBS}\\s+)?(.+)`, 'i'));
  if (startFactura) {
    const remainder = startFactura[1].trim();
    const remNorm = normFacturaText(remainder);
    for (const f of FIELD_DEFS) {
      const m = remNorm.match(f.regex);
      if (m) {
        const val = cleanFacturaValue(remainder.slice(m[0].length));
        if (val) return formatFacturaResult(f.type, val);
      }
    }
  }

  // 4. Factura al MEDIO (ej: 'edita calle de factura Girón Honorio Delgado', 'edita número exterior de factura 552', 'edita país en factura Perú')
  const midFactura = raw.match(new RegExp(`^(?:${VERBS}\\s+)?(.+?)\\s+(?:de\\s+factura|en\\s+factura|dentro\\s+de\\s+factura|para\\s+factura)\\s*[:=]?\\s*(.+)`, 'i'));
  if (midFactura) {
    const fieldCandidateNorm = normFacturaText(midFactura[1]);
    const val = cleanFacturaValue(midFactura[2]);
    for (const f of FIELD_DEFS) {
      if (f.regex.test(fieldCandidateNorm)) {
        if (val) return formatFacturaResult(f.type, val);
      }
    }
  }

  return null;
}
