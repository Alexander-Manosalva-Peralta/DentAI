/* DentAI – Módulo Preregistro: Pantalla de Búsqueda de Pacientes (modules/preregistro/busqueda.js)
   Mapeo y extractores para la vista de consulta previa en Smile:
   - Código de paciente
   - Mostrar pacientes registrados (Checkbox)
   - Detección de pantalla de búsqueda vs formulario completo */

// Extraer Código de Paciente (Pantalla de búsqueda / Preregistro)
function extractCodigo(text) {
  if (!text) return null;
  const m = text.match(/(?:c[oó]digo(?:\s*(?:del\s+paciente))?)\s*(?:\bes\b|:|\bde\b|\ba\b)?\s*([a-z0-9-]+)/i);
  if (m) {
    let val = m[1].trim().replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
    if (val && !/^(?:del|paciente|es)$/i.test(val)) return val;
  }
  return null;
}

// Extraer "Mostrar pacientes registrados" (Checkbox de Preregistro)
function extractMostrarPacientesRegistrados(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const isMatch = /(?:mostrar\s+pacientes\s+registrados|pacientes\s+registrados)/i.test(normT);
  if (!isMatch) return null;

  if (/\b(?:no|desmarcar|desactivar|quitar)\b/i.test(normT) && !/\b(?:si|marcar|activar)\b/i.test(normT)) {
    return "false";
  }
  return "true";
}

// Detecta si la pantalla activa es la búsqueda de Preregistro (sin campos de apellidos ni nacimiento)
function isSearchScreen() {
  const hasFormFields = state.fields.some((f) => {
    const et = (f.etiqueta || "").toLowerCase();
    const nm = (f.name || "").toLowerCase();
    return /primer\s+apellido|segundo\s+apellido|nacimiento|celular|calle/i.test(et) ||
           /paterno|materno|fec.*nac/i.test(nm);
  });
  return !hasFormFields;
}
