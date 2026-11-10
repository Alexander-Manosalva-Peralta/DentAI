/* DentAI – Módulo Preregistro: Pantalla de Búsqueda y Tabla de Pacientes (modules/preregistro/busqueda.js)
   Mapeo, extractores y detección para la vista de consulta previa en Smile:
   - Filtros: Código, Nombre, DNI, Mostrar pacientes registrados (Checkbox)
   - Acciones de tabla: Selección de paciente por Código, DNI, Nombre o Fila (cuadrito azul)
   - Apertura directa para Modificar
   - Detección de pantalla de búsqueda vs formulario */

// Extraer Código de Paciente (Filtro de búsqueda)
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

// Detecta si la pantalla activa es la búsqueda de Preregistro (sin campos de apellidos ni formulario abierto)
function isSearchScreen() {
  if (typeof state === "undefined" || !state.fields) return true;
  const hasFormFields = state.fields.some((f) => {
    const et = (f.etiqueta || "").toLowerCase();
    const nm = (f.name || "").toLowerCase();
    return /primer\s+apellido|segundo\s+apellido|nacimiento|celular|calle/i.test(et) ||
           /paterno|materno|fec.*nac/i.test(nm);
  });
  return !hasFormFields;
}

// Extraer comando de SELECCIÓN de paciente en la tabla de Smile (Marcar el cuadrito azul)
// Ejemplos: "selecciona código 62", "selecciona DNI 10203040", "selecciona paciente Sánchez", "selecciona fila 1"
function extractSeleccionPaciente(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Verbos de selección
  const SEL_VERBS = "(?:selecciona|seleccionar|marca|marcar|elige|elegir|escoge|escoger|pon|poner)";
  
  // 1. Seleccionar por Código: "selecciona código 62", "selecciona el código 62", "marca código 62"
  const mCod = normT.match(new RegExp(`^${SEL_VERBS}\\s+(?:el\\s+)?c[oó]digo\\s*[:=]?\\s*([0-9a-z-]+)`, "i"));
  if (mCod) {
    return { action: "select", criterion: { type: "codigo", value: mCod[1].trim() } };
  }

  // 2. Seleccionar por DNI / Documento: "selecciona DNI 10203040", "marca documento 10203040"
  const mDni = normT.match(new RegExp(`^${SEL_VERBS}\\s+(?:el\\s+)?(?:dni|documento)\\s*[:=]?\\s*([0-9\\s]{8,12})`, "i"));
  if (mDni) {
    const digits = mDni[1].replace(/\D/g, "");
    if (digits.length >= 7) {
      return { action: "select", criterion: { type: "dni", value: digits } };
    }
  }

  // 3. Seleccionar por Fila o Posición: "selecciona fila 1", "selecciona primer paciente", "selecciona el cuadrito azul"
  const mFila = normT.match(new RegExp(`^${SEL_VERBS}\\s+(?:la\\s+)?fila\\s*[:=]?\\s*(\\d+)`, "i"));
  if (mFila) {
    return { action: "select", criterion: { type: "fila", value: parseInt(mFila[1], 10) } };
  }
  if (new RegExp(`^${SEL_VERBS}\\s+(?:el\\s+)?primer(?:o|a)?\\s*(?:paciente|fila|resultado)?$`, "i").test(normT) ||
      new RegExp(`^${SEL_VERBS}\\s+(?:el\\s+)?cuadrito\\s*(?:azul)?$`, "i").test(normT)) {
    return { action: "select", criterion: { type: "fila", value: 1 } };
  }
  if (new RegExp(`^${SEL_VERBS}\\s+(?:el\\s+)?segund[oa]\\s*(?:paciente|fila|resultado)?$`, "i").test(normT)) {
    return { action: "select", criterion: { type: "fila", value: 2 } };
  }
  if (new RegExp(`^${SEL_VERBS}\\s+(?:el\\s+)?tercer[oa]?\\s*(?:paciente|fila|resultado)?$`, "i").test(normT)) {
    return { action: "select", criterion: { type: "fila", value: 3 } };
  }

  // 4. Seleccionar por Nombre o Apellido: "selecciona paciente Sánchez Rodríguez", "selecciona a Carlos Andrés"
  const mNom = normT.match(new RegExp(`^${SEL_VERBS}\\s+(?:al?\\s+)?(?:paciente\\s+)?([a-z\\s]{3,40})$`, "i"));
  if (mNom) {
    const val = mNom[1].trim();
    // Descartar si el valor es una palabra reservada o comando
    if (!/^(?:guardar|limpiar|buscar|nuevo|preregistro|servicio|agenda|reporte|factura|direccion|contacto)$/i.test(val)) {
      return { action: "select", criterion: { type: "nombre", value: val } };
    }
  }

  return null;
}

// Extraer comando de APERTURA DIRECTA / MODIFICACIÓN de paciente en la tabla de Smile
// Ejemplos: "abre código 62", "abrir código 62", "modificar código 62", "abre DNI 10203040", "abre paciente Sánchez"
function extractAperturaPaciente(text) {
  if (!text) return null;
  const normT = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Verbos de apertura y modificación
  const OPEN_VERBS = "(?:abre|abrir|entra\\s+(?:a|en)?|entrar\\s+(?:a|en)?|modifica|modificar|edita|editar)";

  // 1. Abrir por Código: "abre código 62", "modificar código 62", "abrir paciente 62"
  const mCod = normT.match(new RegExp(`^${OPEN_VERBS}\\s+(?:el\\s+)?(?:c[oó]digo|paciente)?\\s*[:=]?\\s*(\\d{1,6})$`, "i"));
  if (mCod) {
    return { action: "modificar", criterion: { type: "codigo", value: mCod[1].trim() } };
  }

  // 2. Abrir por DNI: "abre DNI 10203040", "modificar DNI 10203040"
  const mDni = normT.match(new RegExp(`^${OPEN_VERBS}\\s+(?:el\\s+)?(?:dni|documento)\\s*[:=]?\\s*([0-9\\s]{8,12})$`, "i"));
  if (mDni) {
    const digits = mDni[1].replace(/\D/g, "");
    if (digits.length >= 7) {
      return { action: "modificar", criterion: { type: "dni", value: digits } };
    }
  }

  // 3. Abrir por Fila: "abre fila 1", "abrir primer paciente", "modificar fila 1"
  const mFila = normT.match(new RegExp(`^${OPEN_VERBS}\\s+(?:la\\s+)?fila\\s*[:=]?\\s*(\\d+)`, "i"));
  if (mFila) {
    return { action: "modificar", criterion: { type: "fila", value: parseInt(mFila[1], 10) } };
  }
  if (new RegExp(`^${OPEN_VERBS}\\s+(?:el\\s+)?primer(?:o|a)?\\s*(?:paciente|fila|resultado)?$`, "i").test(normT)) {
    return { action: "modificar", criterion: { type: "fila", value: 1 } };
  }

  // 4. Abrir por Nombre: "abre paciente Sánchez Rodríguez", "modificar paciente Carlos"
  const mNom = normT.match(new RegExp(`^${OPEN_VERBS}\\s+(?:al?\\s+)?(?:paciente\\s+)?([a-z\\s]{3,40})$`, "i"));
  if (mNom) {
    const val = mNom[1].trim();
    if (!/^(?:guardar|limpiar|buscar|nuevo|preregistro|servicio|agenda|reporte|factura|direccion|contacto)$/i.test(val)) {
      return { action: "modificar", criterion: { type: "nombre", value: val } };
    }
  }

  return null;
}
