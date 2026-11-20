/* DentAI – Submódulo Nuevo Preregistro: Factura (modules/preregistro/nuevo_preregistro/factura.js)
   Mapeo clínico para la sección de facturación:
   - ¿Va a requerir factura? ("Si" / "No")
   - ¿Los datos son iguales a la dirección? ("Si" / "No")
   - Aislamiento estricto de campos de facturación respecto a los datos del paciente */

// Extraer Requerimiento de Factura ("Si" / "No")
function extractFactura(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  if (/\bsin\s+factura\b/i.test(normT) || /\bno\s+(?:va\s+a\s+requerir\s+)?factura\b/i.test(normT)) {
    return "No";
  }
  if (/(?:factura|requerir\s+factura)\s*(?:a|es)?\s*no\b/i.test(normT)) {
    return "No";
  }
  if (/(?:con\s+factura|(?:va\s+a\s+)?requerir\s+factura|factura)\s*(?:a|es)?\s*s[ií]\b/i.test(normT) ||
      /\bs[ií]\s+(?:va\s+a\s+requerir\s+)?factura\b/i.test(normT) ||
      /\bcon\s+factura\b/i.test(normT)) {
    return "Si";
  }
  return null;
}

// Extraer "Los datos son iguales a la dirección" ("Si" / "No")
function extractDatosIgualesDireccion(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

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
  const normT = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Si es toggle de checkbox (factura si/no, datos iguales si/no), delegar a extractFactura / extractDatosIguales
  if (/\b(?:va\s+a\s+requerir\s+factura|con\s+factura|sin\s+factura)\b/i.test(normT) ||
      /\b(?:datos\s+(?:si\s+)?son\s+iguales|mismos\s+datos|datos\s+iguales)\b/i.test(normT)) {
    return null;
  }
  if (/^(?:factura\s+(?:si|no)|no\s+factura|factura)$/i.test(normT)) {
    return null;
  }

  const FIELD_PATTERNS = [
    { type: "calle", regex: /^(?:la\s+)?(?:calle|direcci[oó]n|avenida|jir[oó]n|pasaje)\b/i },
    { type: "exterior", regex: /^(?:el\s+)?(?:n[uú]mero\s+exterior|no\.?\s*exterior|num\.?\s*ext|n[uú]mero\s+de\s+vivienda|n[uú]mero\s+de\s+casa|n[uú]mero|exterior|vivienda)\b/i },
    { type: "pais", regex: /^(?:el\s+)?pa[ií]s\b/i },
    { type: "departamento", regex: /^(?:el\s+)?(?:departamento|depa)\b/i },
    { type: "provincia", regex: /^(?:la\s+)?provincia\b/i },
    { type: "distrito", regex: /^(?:el\s+)?distrito\b/i },
    { type: "correo", regex: /^(?:el\s+)?(?:correo(?:\s+electr[oó]nico)?|email)\b/i },
    { type: "documento", regex: /^(?:el\s+)?(?:documento|ruc|dni)\b/i },
    { type: "tipo_documento", regex: /^(?:el\s+)?(?:tipo(?:\s+de)?\s+identificaci[oó]n|tipo(?:\s+de)?\s+documento)\b/i },
    { type: "razon_social", regex: /^(?:la\s+)?raz[oó]n\s+social\b/i }
  ];

  const VERBS = "(?:edita|editar|cambia|cambiar|corrige|corregir|modifica|modificar|pon|poner|rectifica|rectificar)";

  // Caso 1: Razón Social (directo o con prefijo)
  const rsMatch = raw.match(new RegExp(`^(?:${VERBS}\\s+)?(?:(?:dentro\\s+de\\s+|en\\s+|de\\s+|datos\\s+de\\s+)factura\\s+)?(?:la\\s+)?raz[oó]n\\s+social\\s*[:=]?\\s*(.+)`, "i"));
  if (rsMatch) {
    let val = cleanFacturaValue(rsMatch[1]);
    if (val) return { type: "razon_social", field: "Razón Social", value: val.toUpperCase() };
  }

  // Caso 2: Prefijos de Factura ("dentro de factura...", "en factura...", "datos de factura...", "edita dentro de factura...", etc.)
  const prefixRegex = new RegExp(`^(?:(?:${VERBS}\\s+)?(?:dentro\\s+de\\s+|en\\s+|datos\\s+de\\s+)factura|(?:${VERBS}\\s+)?factura)\\s+(?:${VERBS}\\s+)?(.+)`, "i");
  const pMatch = raw.match(prefixRegex);
  if (pMatch) {
    const remainder = pMatch[1].trim();
    for (const f of FIELD_PATTERNS) {
      const fMatch = remainder.match(f.regex);
      if (fMatch) {
        let val = remainder.slice(fMatch[0].length).trim();
        val = cleanFacturaValue(val);
        if (val) return formatFacturaResult(f.type, val);
      }
    }
  }

  // Caso 3: Suffix / Infix de Factura ("edita calle de factura...", "edita calle en factura...", "cambia país de factura...", "calle de factura...")
  const suffixRegex = new RegExp(`^(?:${VERBS}\\s+)?(?:el\s+|la\s+)?([a-z0-9\\s]+?)\\s+(?:de\\s+factura|en\\s+factura|dentro\\s+de\\s+factura|para\s+factura)\\s*[:=]?\\s*(.+)`, "i");
  const sMatch = raw.match(suffixRegex);
  if (sMatch) {
    const fieldCandidate = sMatch[1].trim();
    const valCandidate = cleanFacturaValue(sMatch[2]);
    for (const f of FIELD_PATTERNS) {
      if (f.regex.test(fieldCandidate)) {
        if (valCandidate) return formatFacturaResult(f.type, valCandidate);
      }
    }
  }

  return null;
}

