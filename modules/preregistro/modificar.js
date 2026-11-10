/* DentAI – Submódulo Preregistro: Modificar Paciente (modules/preregistro/modificar.js)
   Mapeo, detección y gestión del flujo de edición y actualización de pacientes en Smile:
   - Detección de pantalla de modificación (formulario precargado)
   - Extractor de comando de acción "Modificar"
   - Coordinación de apertura y rectificación de datos clínicos existentes */

// Detecta si la pantalla activa es la vista de Modificar Paciente
function isModificarScreen() {
  if (typeof state === "undefined" || !state.fields) return false;

  // 1. Verificar si hay un encabezado o texto en pantalla que indique modificación
  const isSearch = typeof isSearchScreen === "function" ? isSearchScreen() : false;
  if (isSearch) return false;

  // 2. Si hay campos de formulario y el estado o la URL indican modificación
  const url = (state.tab && state.tab.url) || "";
  if (/modificar|editar|actualizar/i.test(url)) return true;

  // 3. Si hay un paciente previamente seleccionado o cargado
  return Boolean(state.currentPatient && state.fields.length > 5);
}

// Extrae el comando directo para presionar el botón "Modificar" en Smile
// Ejemplos: "modificar", "ve a modificar", "dale a modificar", "clic en modificar", "presiona modificar", "editar"
function extractComandoModificar(text) {
  if (!text) return false;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // No confundir con "modificar código 62" o "modificar DNI..." (que son comandos de apertura con criterio)
  if (/(?:c[oó]digo|dni|documento|fila|paciente)\s+([0-9a-z]+)/i.test(normT)) {
    return false;
  }

  const MOD_REGEX = /^(?:(?:ve\s+a|ir\s+a|voy\s+a|dale\s+(?:a\s+)?|dar\s+|haz\s+|presiona|presionar|toca|clic(?:k)?\s+(?:en\s+)?)\s*)?(?:modificar|editar|modifica|edita)$/i;
  return MOD_REGEX.test(normT);
}
