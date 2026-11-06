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
