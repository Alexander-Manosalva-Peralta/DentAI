/* Anamnesis de Smile QA: A - Enfermedad actual.
   Los nombres y opciones proceden del formulario compartido, no de etiquetas aproximadas. */
const ANAMNESIS_ACTUAL_FIELDS = [
  { name: "respuestas[10_1_0_1]", label: "Motivo de consulta" },
  { name: "respuestas[20_1_10_1]", label: "Última visita odontológica · cantidad" },
  { name: "respuestas[20_1_20_1]", label: "Última visita odontológica · unidad" },
  { name: "respuestas[20_1_30_1]", label: "Última visita odontológica · observación" },
  { name: "respuestas[20_1_40_1]", label: "Tiempo de enfermedad · cantidad" },
  { name: "respuestas[20_1_50_1]", label: "Tiempo de enfermedad · unidad" },
  { name: "respuestas[20_1_60_1]", label: "Tiempo de enfermedad · observación" },
  { name: "respuestas[30_1_0_1]", label: "Inicio" },
  { name: "respuestas[40_1_0_1]", label: "Curso" },
  { name: "respuestas[50_1_0_1]", label: "Signos y síntomas principales · aplica" },
  { name: "respuestas[60_1_0_1]", label: "Signos y síntomas principales · detalle", dependsOn: "respuestas[50_1_0_1]" },
  { name: "respuestas[70_1_0_1]", label: "Relato · aplica" },
  { name: "respuestas[80_1_0_1]", label: "Relato · detalle", dependsOn: "respuestas[70_1_0_1]" },
  { name: "respuestas[90_1_0_1]", label: "Informe de vacuna covid-2019" },
];

function normalizeAnamnesis(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function anamnesisQuantity(value) {
  const words = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciseis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidos", "veintitres", "veinticuatro", "veinticinco", "veintiseis", "veintisiete", "veintiocho", "veintinueve", "treinta", "treinta y uno"];
  const norm = normalizeAnamnesis(value).replace(/^(?:un|una)$/, "uno").replace(/^veintiun$/, "veintiuno");
  const number = /^\d+$/.test(norm) ? Number(norm) : words.indexOf(norm);
  return number >= 1 && number <= 31 ? String(number) : null;
}

// Los textos libres se conservan completos, incluso si contienen otros nombres de campo.
function parseAnamnesisActual(text) {
  let command = String(text || "").normalize("NFC").replace(/\s+/g, " ").trim();
  const correction = /^(?:cambia|cambiar|corrige|corregir|modifica|modificar|selecciona|seleccionar|pon|poner|anota|escribe|registra|dicta)\s+(?:(?:el|la|los|las)\s+)?/i;
  const correcting = correction.test(command);
  command = command.replace(correction, "");
  const norm = normalizeAnamnesis(command);
  const visit = "(?:ultima\\s+(?:visita|consulta)(?:\\s+(?:odontologica|dental|al\\s+dentista))?)";
  const duration = "(?:tiempo\\s+(?:de\\s+)?(?:enfermedad|evolucion)|duracion\\s+(?:de\\s+)?(?:la\\s+)?enfermedad)";
  const patterns = [
    ["visitNote", new RegExp(`^observacion(?:es)?\\s+(?:de\\s+)?(?:la\\s+)?${visit}\\b\\s*[:=]?\\s*`)],
    ["durationNote", new RegExp(`^observacion(?:es)?\\s+(?:de[l]?\\s+)?${duration}\\b\\s*[:=]?\\s*`)],
    ["motivo", /^motivo\s+(?:de\s+)?(?:la\s+)?consulta\b\s*[:=]?\s*/],
    ["visit", new RegExp(`^${visit}\\b\\s*[:=]?\\s*`)],
    ["duration", new RegExp(`^${duration}\\b\\s*[:=]?\\s*`)],
    ["inicio", /^(?:forma\s+(?:de\s+)?)?inicio\b\s*[:=]?\s*/],
    ["curso", /^curso(?:\s+de\s+(?:la\s+)?enfermedad)?\b\s*[:=]?\s*/],
    ["sintomas", /^(?:signos(?:\s+y\s+sintomas)?|sintomas)(?:\s+principales)?\b\s*[:=]?\s*/],
    ["relato", /^relato(?:\s+cronologico)?\b\s*[:=]?\s*/],
    ["vacuna", /^(?:informe\s+(?:de\s+)?(?:la\s+)?vacuna(?:cion)?|vacunacion)(?:\s+(?:contra\s+(?:el\s+)?)?covid(?:[-\s]?(?:2019|19))?)?\b\s*[:=]?\s*/],
  ];
  const result = { handled: false, fields: [], errors: [], remove: [] };
  const hit = patterns.map(([kind, pattern]) => ({ kind, match: norm.match(pattern) })).find((x) => x.match);
  if (!hit) return result;
  result.handled = true;
  let body = command.slice(hit.match[0].length).trim().replace(/^es(?:\s+|$)/i, "");
  if (correcting) body = body.replace(/^(?:a|por|en)\s+/i, "");
  const value = normalizeAnamnesis(body).replace(/[.!]+$/, "").trim();
  const add = (name, valor) => result.fields.push({ name: `respuestas[${name}]`, valor });
  result.target = {
    prefix: command.slice(0, hit.match[0].length).trim().replace(/[:=]$/, "").trim(),
    label: { motivo: "Motivo de consulta", vacuna: "Informe de vacuna", visitNote: "Observación de última visita", durationNote: "Observación del tiempo de enfermedad", visit: "Última visita odontológica", duration: "Tiempo de enfermedad", inicio: "Inicio", curso: "Curso", sintomas: "Signos y síntomas principales", relato: "Relato" }[hit.kind],
  };
  if (!value) { result.awaiting = result.target; return result; }

  if (hit.kind === "motivo" || hit.kind === "vacuna" || hit.kind.endsWith("Note")) {
    add({ motivo: "10_1_0_1", vacuna: "90_1_0_1", visitNote: "20_1_30_1", durationNote: "20_1_60_1" }[hit.kind], body);
  } else if (hit.kind === "visit" || hit.kind === "duration") {
    const visitField = hit.kind === "visit";
    const names = visitField ? ["20_1_10_1", "20_1_20_1", "20_1_30_1"] : ["20_1_40_1", "20_1_50_1", "20_1_60_1"];
    if (/^(?:nunca(?: antes)?|primera (?:vez|visita))$/.test(value)) {
      add(names[0], "");
      add(names[1], "NUNCA ANTES");
    } else {
      const match = body.match(/^(?:(?:es|de)\s+)?(?:(?:desde\s+)?hace\s+)?(.+?)\s+(d[ií]as?|semanas?|mes(?:es)?|a[ñn]os?)(?:\s*[,;]?\s*(?:con\s+)?observaci[oó]n(?:es)?\s*[:=]?\s*(.+?))?[.!]?$/i);
      const quantity = match && anamnesisQuantity(match[1]);
      if (!quantity) {
        result.errors.push("Indica una cantidad de 1 a 31 y la unidad: días, semanas, meses o años. Usa observación para otros detalles.");
      } else {
        const unit = normalizeAnamnesis(match[2]);
        add(names[0], quantity);
        add(names[1], /^dia/.test(unit) ? "DÍA" : /^semana/.test(unit) ? "SEMANA" : /^mes/.test(unit) ? "MES" : "AÑO");
        if (match[3]) add(names[2], match[3].trim());
      }
    }
  } else if (hit.kind === "inicio" || hit.kind === "curso") {
    const aliases = hit.kind === "inicio"
      ? { brusco: "Brusco", subito: "Brusco", repentino: "Brusco", insidioso: "Incidioso", incidioso: "Incidioso", "no aplica": "No aplica" }
      : { estacionario: "Estacionario", progresivo: "Progresivo", regresivo: "Regresivo", intermitente: "Intermitente", "no aplica": "No aplica" };
    if (aliases[value]) add(hit.kind === "inicio" ? "30_1_0_1" : "40_1_0_1", aliases[value]);
    else result.errors.push(`Opción de ${hit.kind} no reconocida. Opciones: ${[...new Set(Object.values(aliases))].join(", ")}.`);
  } else {
    const symptoms = hit.kind === "sintomas";
    const selector = symptoms ? "50_1_0_1" : "70_1_0_1";
    const detail = symptoms ? "60_1_0_1" : "80_1_0_1";
    if (/^(?:no aplica|no aplicable)$/.test(value)) {
      add(selector, "No aplica");
      result.remove.push(`respuestas[${detail}]`);
    } else {
      add(selector, "Aplica");
      if (value !== "aplica") add(detail, body.replace(/^aplica\s*[:,]?\s+/i, ""));
    }
  }
  return result;
}

function proposeAnamnesisActual(text, fields, awaiting = null) {
  const active = fields.filter((f) => f.contexto === "anamnesis");
  if (!active.length) return { handled: false };
  let result = parseAnamnesisActual(text);
  if (!result.handled && awaiting && awaiting.expiresAt > Date.now() &&
      active.some((f) => f.pagina === awaiting.pagina && f.frameId === awaiting.frameId)) {
    // Los comandos siguen siendo acciones; nunca se convierten en el contenido del campo seleccionado.
    const control = /^(?:confirmar|confirmado|aplicar|aplicalo|descartar|descartalo|cancelar|cancelalo|guardar|grabar|limpiar|buscar|busca|actualiza|actualizar|refresca|refrescar|escanear|escanea|modo|pausa|pausar|detener|continuar|sube|subir|baja|bajar|arriba|abajo|inicio|agenda|servicio|preregistro|ve\s+a|ir\s+a|abre|abrir|cambia|cambiar|corrige|modifica|selecciona|dni|documento|nombre|apellido|apetito|sed|sudoracion|deposicion|orina)\b/;
    if (control.test(normalizeAnamnesis(text))) return { handled: false };
    const body = String(text || "").trim().replace(/^(?:el\s+|la\s+)?(?:valor|texto|contenido|respuesta)(?:\s+es)?\s*[:=]?\s*/i, "");
    result = parseAnamnesisActual(`${awaiting.prefix}: ${body}`);
  }
  result.entries = [];
  for (const data of result.fields) {
    const field = active.find((f) => f.name === data.name);
    if (!field) result.errors.push("El campo no está disponible. Actualiza los campos y verifica que Anamnesis esté abierta y editable.");
    else if (field.tipo === "select" && data.valor !== "" && !(field.opciones || []).some((o) => normalizeAnamnesis(o) === normalizeAnamnesis(data.valor))) {
      result.errors.push(`La opción no está disponible en ${field.etiqueta}. Actualiza los campos.`);
    } else result.entries.push({ field, valor: data.valor });
  }
  return result;
}
