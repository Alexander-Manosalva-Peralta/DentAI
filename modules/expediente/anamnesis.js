/* Anamnesis de Smile QA: secciones A a E y selector de diagnósticos.
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

const ANAMNESIS_BIO = [
  { key: "apetito", row: 10 }, { key: "sed", row: 40 },
  { key: "sudoración", row: 70 }, { key: "deposición", row: 100 }, { key: "orina", row: 130 },
];
const ANAMNESIS_QUESTIONS = [
  "¿Le sangran las encías?", "¿Ha tenido reacciones anormales a la anestesia dental?",
  "¿Algún medicamento le produce alergia?", "¿Ha tenido hemorragias anormales post-extracción?",
  "¿Ha sufrido de fiebre reumática?", "¿Sufre de presión arterial alta?",
  "¿Ha tenido algún trastorno en el corazón?", "¿Usted o algún familiar sufre de diabetes?",
  "¿Padece de alguna enfermedad?", "¿Ha tenido una operación grande en los últimos años?",
  "¿Toma actualmente algún medicamento?", "¿Está usted embarazada?",
  "¿Cuántas veces al día se cepilla los dientes?", "¿Con quiénes vive en casa?",
  "¿Tiene algún hábito oral?", "¿Aprieta o rechina los dientes?",
];
const ANAMNESIS_HABITS = [
  { key: "RRSS", row: 1010, partners: 1020, comment: 1030 },
  { key: "RHS", row: 1040, partners: 1050, comment: 1060 },
  { key: "tabaco", row: 1070, quantity: 1080, period: 1090, duration: 1100, unit: 1110 },
  { key: "alcohol", row: 1120, quantity: 1130, period: 1140, duration: 1150, unit: 1160 },
  { key: "drogas", row: 1170, quantity: 1180, period: 1190, duration: 1200, unit: 1210, type: 1220 },
];
const ANAMNESIS_RELATIVES = ["PADRE", "MADRE", "HERMANO 1", "HERMANO 2", "HERMANO 3", "HIJOS", "OTROS"];
const anamnesisName = (row, section, required = 1) => `respuestas[${row}_${section}_0_${required}]`;
const ANAMNESIS_FIELDS = [
  ...ANAMNESIS_ACTUAL_FIELDS,
  ...ANAMNESIS_BIO.flatMap(({ key, row }) => [
    { name: anamnesisName(row, 2), label: key },
    { name: anamnesisName(row + 10, 2, 0), label: `${key} · disminuido · descripción`, dependsOn: anamnesisName(row, 2), dependsValue: "Disminuido" },
    { name: anamnesisName(row + 20, 2, 0), label: `${key} · aumentado · descripción`, dependsOn: anamnesisName(row, 2), dependsValue: "Aumentado" },
  ]),
  ...ANAMNESIS_QUESTIONS.flatMap((label, i) => [
    { name: `respuestas[10_3_${i * 20 + 10}_1]`, domId: `id10_3_${i * 20 + 10}_1`, label: `Pregunta ${i + 1} · opción · ${label}` },
    { name: `respuestas[10_3_${i * 20 + 20}_1]`, label: `Pregunta ${i + 1} · descripción` },
  ]),
  { name: anamnesisName(20, 3), label: "Evaluación del cuestionario" },
  ...ANAMNESIS_HABITS.flatMap((habit) => [
    { name: anamnesisName(habit.row, 4), label: habit.key },
    ...["partners", "comment", "quantity", "period", "duration", "unit", "type"].filter((key) => habit[key]).map((key) => ({
      name: anamnesisName(habit[key], 4, 0),
      label: `${habit.key} · ${{ partners: "número de parejas", comment: "comentario", quantity: "cantidad", period: "periodicidad", duration: "tiempo · cantidad", unit: "tiempo · unidad", type: "tipo" }[key]}`,
      dependsOn: anamnesisName(habit.row, 4), dependsValue: "Si",
    })),
  ]),
  ...ANAMNESIS_RELATIVES.flatMap((relative, i) => [
    { name: "respuestas[10_5_0_1][]", domId: `id10_5_0_1_${i}`, optionValue: relative, label: `Familiar · ${relative}` },
    { name: anamnesisName(i * 10 + 21, 5, 0), label: `Familiar · ${relative} · comentario`, dependsOn: "respuestas[10_5_0_1][]", dependsOnId: `id10_5_0_1_${i}`, dependsChecked: true },
  ]),
  ...[
    ["typeCie10", "Tipo de diagnóstico"], ["classification", "Clasificación del diagnóstico"],
    ["diagnostic", "Diagnóstico CIE"], ["comment", "Comentario del diagnóstico"],
  ].map(([name, label]) => ({ name, domId: name, label, scope: "diagnostico" })),
];

function normalizeAnamnesis(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function anamnesisValueText(text) {
  return String(text || "").trim().replace(/^(?:(?:el|la)\s+(?:valor|texto|contenido|respuesta)(?:\s+es)?|(?:valor|texto|contenido|respuesta)\s+es)\s*[:=]?\s*/i, "");
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
    literal: ["motivo", "vacuna", "visitNote", "durationNote", "sintomas", "relato"].includes(hit.kind),
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
    const body = anamnesisValueText(text);
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

function anamnesisBoolean(text) {
  const value = normalizeAnamnesis(text).replace(/[.!]+$/, "");
  if (/^(?:si|marcar|marca|marcado|seleccionar|activar|true)$/.test(value)) return "true";
  if (/^(?:no|desmarcar|desmarca|desmarcado|quitar|desactivar|false)$/.test(value)) return "false";
  return null;
}

function anamnesisContextValue(name, fields, pending) {
  const proposed = Array.from(pending?.values() || []).reverse().find((v) => v.field?.contexto === "anamnesis" && v.field.name === name);
  return proposed ? proposed.valor : fields.find((f) => f.name === name)?.valorActual || "";
}

function parseAnamnesisSections(text, selection, fields, pending, allowNumber = true) {
  let command = String(text || "").normalize("NFC").replace(/\s+/g, " ").trim();
  command = command.replace(/^(?:cambia|cambiar|corrige|modifica|selecciona|anota|registra|dicta)\s+(?:(?:el|la|los|las)\s+)?/i, "");
  command = command.replace(/^(marcar|marca|desmarcar|desmarca)\s+(.+)$/i, "$2 $1");
  const norm = normalizeAnamnesis(command);
  const cleanBody = (value) => anamnesisValueText(value.trim().replace(/^\s*[:=]\s*/, "")).replace(/^(?:es|a)\s+/i, "");
  const resultFor = (target) => ({ handled: true, fields: [], errors: [], remove: [], target, selection: target });
  const add = (result, name, valor, domId) => result.fields.push({ name, valor, ...(domId ? { domId } : {}) });
  const wait = (result, target = result.target) => { result.target = target; result.awaiting = target; return result; };

  // Acciones limitadas al catálogo nativo de Smile; nunca se deduce un código clínico.
  const action = norm.match(/^(?:anadir|agregar|abrir)\s+(?:un\s+)?(?:diagnostico|enfermedad|antecedente)(?:\s+(?:cie|personal|patologico|familiar))?(?:\s+(padre|madre|hermano\s*[123]|hijos|otros))?$/);
  if (action) {
    const relative = action[1] ? normalizeAnamnesis(action[1]).replace(/hermano\s*([123])/, "hermano $1").toUpperCase()
      : /personal|patologico/.test(norm) ? null : selection?.kind === "family" ? selection.relative : null;
    const index = relative ? ANAMNESIS_RELATIVES.indexOf(relative) : -1;
    const result = resultFor({ kind: "diagnosis", label: "Añadir diagnóstico", prefix: "diagnóstico" });
    result.action = { type: "open", rowId: index < 0 ? "renglon_4_1240" : `renglon_5_${index * 10 + 20}` };
    return result;
  }
  if (/^(?:guardar|aceptar|cerrar|cancelar)\s+(?:el\s+)?diagnostico$/.test(norm)) {
    const result = resultFor({ kind: "diagnosis", label: "Diagnóstico", prefix: "diagnóstico" });
    result.action = { type: /^(?:guardar|aceptar)/.test(norm) ? "save" : "close" };
    return result;
  }
  const modal = command.match(/^(tipo\s+(?:de\s+)?diagn[oó]stico|clasificaci[oó]n(?:\s+(?:del?\s+)?diagn[oó]stico)?|diagn[oó]stico(?:\s+cie)?|comentario\s+(?:del?\s+)?diagn[oó]stico)\b\s*[:=]?\s*(.*)$/i);
  if (modal) {
    const label = normalizeAnamnesis(modal[1]);
    const name = label.startsWith("tipo") ? "typeCie10" : label.startsWith("clasificacion") ? "classification" : label.startsWith("comentario") ? "comment" : "diagnostic";
    const result = resultFor({ kind: "diagnosis", prefix: modal[1], label: modal[1], literal: name === "comment" });
    const value = cleanBody(modal[2]);
    if (!value) return wait(result);
    add(result, name, name === "typeCie10" ? value.replace(/^cie\s+(10|oe)$/i, "CIE$1") : value, name);
    return result;
  }

  const bioMatch = norm.match(/^(apetito|apetido|sed|sudoracion|deposicion(?:es)?|orina)\b\s*[:=]?\s*/);
  if (bioMatch) {
    const key = bioMatch[1].replace("apetido", "apetito").replace("deposiciones", "deposicion");
    const bio = ANAMNESIS_BIO.find((b) => normalizeAnamnesis(b.key) === key);
    const body = cleanBody(command.slice(bioMatch[0].length));
    const target = { kind: "bio", key: bio.key, prefix: bio.key, label: bio.key, prompt: "Di normal, disminuido o aumentado; después puedes dictar descripción." };
    const result = resultFor(target);
    if (!body || /^[.!]+$/.test(body)) return wait(result);
    const description = body.match(/^(?:descripci[oó]n|comentario)\b\s*[:=]?\s*(.*)$/i);
    let state, detail, awaitingDetail = false;
    if (description) {
      state = anamnesisContextValue(anamnesisName(bio.row, 2), fields, pending).trim();
      detail = description[1];
      if (!detail) return wait(result, { ...target, prefix: `${bio.key} descripción`, label: `${bio.key} · descripción`, literal: true });
    } else {
      const match = body.match(/^(aparentemente\s+normal|normal|disminuid[oa]|aumentad[oa])\b\s*[,;:]?\s*(.*)$/i);
      if (!match) { result.errors.push("Opciones disponibles: aparentemente normal, disminuido o aumentado."); return result; }
      state = /^normal|^aparentemente/i.test(match[1]) ? "Aparentemente normal" : /^disminuid/i.test(match[1]) ? "Disminuido" : "Aumentado";
      detail = match[2].replace(/^(?:descripci[oó]n|comentario)\b\s*[:=]?\s*/i, "");
      awaitingDetail = /^(?:descripci[oó]n|comentario)\s*[:=]?\s*$/i.test(match[2]);
      add(result, anamnesisName(bio.row, 2), state);
    }
    if (detail) {
      if (!/^(?:Disminuido|Aumentado)$/i.test(state)) result.errors.push("La descripción requiere indicar primero disminuido o aumentado.");
      else {
        add(result, anamnesisName(bio.row, 2), /^disminuido$/i.test(state) ? "Disminuido" : "Aumentado");
        add(result, anamnesisName(bio.row + (/^disminuido$/i.test(state) ? 10 : 20), 2, 0), detail);
      }
    }
    for (const offset of [10, 20]) if (state !== (offset === 10 ? "Disminuido" : "Aumentado")) result.remove.push(anamnesisName(bio.row + offset, 2, 0));
    if (awaitingDetail) {
      if (state === "Aparentemente normal") result.errors.push("La opción aparentemente normal no tiene un campo de descripción.");
      else return wait(result, { ...target, prefix: `${bio.key} descripción`, label: `${bio.key} · descripción`, literal: true });
    }
    return result;
  }

  const numberWord = "(?:\\d+|uno|una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis)";
  const questionMatch = norm.match(new RegExp(`^(?:(?:pregunta|numero|cuestionario)(?:\\s+numero)?\\s+)?(${numberWord})\\b\\s*[.:=]?\\s*(.*)$`));
  const explicitQuestion = /^(?:pregunta|numero|cuestionario)\b/.test(norm);
  if (questionMatch && (allowNumber || explicitQuestion)) {
    const number = Number(anamnesisQuantity(questionMatch[1]));
    const target = { kind: "question", number, prefix: `pregunta ${number}`, label: `Pregunta ${number}`, prompt: "Di marcar, desmarcar o descripción y su texto." };
    const result = resultFor(target);
    if (number < 1 || number > 16) { result.errors.push("El cuestionario contiene preguntas del 1 al 16."); return result; }
    let body = cleanBody(command.slice(questionMatch[0].length - questionMatch[2].length));
    if (/^opci[oó]n\s*[:=]?\s*$/i.test(body)) return wait(result, { ...target, prefix: `${target.prefix} opción`, label: `${target.label} · opción` });
    body = body.replace(/^opci[oó]n\b\s*[:=]?\s*/i, "");
    if (!body) return wait(result);
    const description = body.match(/^(?:descripci[oó]n|comentario)\b\s*[:=]?\s*(.*)$/i);
    if (description) {
      if (!description[1]) return wait(result, { ...target, prefix: `${target.prefix} descripción`, label: `${target.label} · descripción`, literal: true });
      add(result, `respuestas[10_3_${number * 20}_1]`, description[1]);
      return result;
    }
    const parts = body.split(/\s*[,;]?\s*(?:descripci[oó]n|comentario)\b\s*[:=]?\s*/i);
    const bool = anamnesisBoolean(parts[0]);
    if (bool === null) result.errors.push("Di marcar o desmarcar para la opción, o descripción seguida del texto.");
    else {
      add(result, `respuestas[10_3_${number * 20 - 10}_1]`, bool === "true" ? "Sí" : "No", `id10_3_${number * 20 - 10}_1`);
      if (parts[1]) add(result, `respuestas[10_3_${number * 20}_1]`, parts.slice(1).join(" descripción "));
      else if (parts.length > 1) return wait(result, { ...target, prefix: `${target.prefix} descripción`, label: `${target.label} · descripción`, literal: true });
    }
    return result;
  }
  const evaluation = command.match(/^evaluaci[oó]n(?:\s+del?\s+cuestionario)?\b\s*[:=]?\s*(.*)$/i);
  if (evaluation) {
    const result = resultFor({ kind: "evaluation", prefix: "evaluación del cuestionario", label: "Evaluación del cuestionario", literal: true });
    const body = cleanBody(evaluation[1]);
    if (!body) return wait(result);
    add(result, anamnesisName(20, 3), body);
    return result;
  }

  const habitMatch = norm.match(/^(?:consume\s+|consumo\s+(?:de\s+)?)?(rrss|r\s+r\s+s\s+s|erre\s+erre\s+ese\s+ese|rhs|r\s+h\s+s|erre\s+hache\s+ese|tabaco|alcohol|drogas)\b\s*[:=]?\s*/);
  if (habitMatch) {
    let key = habitMatch[1].replace(/\s/g, "");
    if (/^erreerre/.test(key)) key = "rrss";
    if (/^errehache/.test(key)) key = "rhs";
    const habit = ANAMNESIS_HABITS.find((h) => normalizeAnamnesis(h.key) === key);
    const target = { kind: "habit", key: habit.key, prefix: habit.key, label: habit.key, prompt: "Di sí o no, o nombra el dato adicional y su valor." };
    const result = resultFor(target);
    const body = cleanBody(command.slice(habitMatch[0].length));
    if (!body) return wait(result);
    const bool = anamnesisBoolean(body);
    if (bool !== null) {
      add(result, anamnesisName(habit.row, 4), bool === "true" ? "Si" : "No");
      if (bool === "false") for (const child of ["partners", "comment", "quantity", "period", "duration", "unit", "type"]) if (habit[child]) result.remove.push(anamnesisName(habit[child], 4, 0));
      return result;
    }
    const child = body.match(/^(n[uú]mero\s+(?:de\s+)?parejas|nro\s+parejas|parejas|comentario|descripci[oó]n|cantidad(?:\s+(?:de\s+)?(?:cigarrillos|vasos))?|frecuencia|periodicidad|tiempo|cu[aá]nto\s+tiempo|tipo)\b\s*[:=]?\s*(.*)$/i);
    if (!child) { result.errors.push("Indica sí o no, o un dato como cantidad, tiempo, parejas, comentario o tipo."); return result; }
    const childLabel = normalizeAnamnesis(child[1]);
    const role = /parejas/.test(childLabel) ? "partners" : /comentario|descripcion/.test(childLabel) ? "comment" : /^(?:tiempo|cuanto)/.test(childLabel) ? "duration" : /^(?:frecuencia|periodicidad)/.test(childLabel) ? "period" : childLabel === "tipo" ? "type" : "quantity";
    result.target = { ...target, prefix: `${habit.key} ${child[1]}`, label: `${habit.key} · ${child[1]}`, literal: role === "comment" || role === "type" };
    if (!habit[role]) { result.errors.push(`Ese dato no está disponible para ${habit.key}.`); return result; }
    const value = cleanBody(child[2]);
    if (!value) return wait(result, { ...target, prefix: `${habit.key} ${child[1]}`, label: `${habit.key} · ${child[1]}`, literal: role === "comment" || role === "type" });
    add(result, anamnesisName(habit.row, 4), "Si");
    if (role === "comment" || role === "type") add(result, anamnesisName(habit[role], 4, 0), value);
    else if (role === "partners") {
      const number = /^\d+$/.test(value) ? value : normalizeAnamnesis(value) === "cero" ? "0" : anamnesisQuantity(value);
      if (number === null) result.errors.push("Indica un número entero de parejas.");
      else add(result, anamnesisName(habit.partners, 4, 0), number);
    } else if (role === "period") {
      const unit = normalizeAnamnesis(value).replace(/^(?:por|al|a\s+la|cada)\s+/, "");
      const canonical = /^(?:dia|diario)$/.test(unit) ? "DIA" : /^(?:semana|semanal)$/.test(unit) ? "SEMANA" : /^(?:mes|mensual)$/.test(unit) ? "MES" : /^(?:ano|anual)$/.test(unit) ? "AÑO" : unit === "nunca antes" ? "NUNCA ANTES" : null;
      if (canonical) add(result, anamnesisName(habit.period, 4, 0), canonical);
      else result.errors.push("Periodicidad disponible: día, semana, mes o año.");
    } else {
      const match = value.match(/^(.+?)(?:\s+(?:(?:por|cada|al|a\s+la)\s+)?(d[ií]as?|semanas?|mes(?:es)?|a[ñn]os?))?[.!]?$/i);
      const quantity = match && anamnesisQuantity(match[1]);
      if (!quantity || (role === "duration" && !match[2])) result.errors.push("Indica una cantidad de 1 a 31; para tiempo añade días, semanas, meses o años.");
      else {
        add(result, anamnesisName(habit[role], 4, 0), quantity);
        if (match[2]) {
          const unit = normalizeAnamnesis(match[2]);
          add(result, anamnesisName(habit[role === "duration" ? "unit" : "period"], 4, 0), /^dia/.test(unit) ? "DIA" : /^semana/.test(unit) ? "SEMANA" : /^mes/.test(unit) ? "MES" : "AÑO");
        }
      }
    }
    return result;
  }

  const familyMatch = norm.match(/^(?:(?:antecedente(?:s)?\s+)?familiar(?:es)?\s+)?(padre|madre|hermano\s*(?:[123]|uno|dos|tres)|hijos|otros)\b\s*[:=]?\s*/);
  if (familyMatch) {
    const relative = familyMatch[1].replace(/hermano\s*(1|uno)/, "hermano 1").replace(/hermano\s*(2|dos)/, "hermano 2").replace(/hermano\s*(3|tres)/, "hermano 3").toUpperCase();
    const index = ANAMNESIS_RELATIVES.indexOf(relative);
    const target = { kind: "family", relative, prefix: `familiar ${relative}`, label: `Familiar · ${relative}`, prompt: "Di marcar, desmarcar, comentario o añadir diagnóstico." };
    const result = resultFor(target);
    const body = cleanBody(command.slice(familyMatch[0].length));
    if (!body) return wait(result);
    const bool = anamnesisBoolean(body);
    if (bool !== null) {
      add(result, "respuestas[10_5_0_1][]", bool === "true" ? "Sí" : "No", `id10_5_0_1_${index}`);
      if (bool === "false") result.remove.push(anamnesisName(index * 10 + 21, 5, 0));
      return result;
    }
    const comment = body.match(/^(?:comentario|descripci[oó]n)\b\s*[:=]?\s*(.*)$/i);
    if (comment) {
      if (!comment[1]) return wait(result, { ...target, prefix: `${target.prefix} comentario`, label: `${relative} · comentario`, literal: true });
      add(result, "respuestas[10_5_0_1][]", "Sí", `id10_5_0_1_${index}`);
      add(result, anamnesisName(index * 10 + 21, 5, 0), comment[1]);
    } else result.errors.push("Di marcar, desmarcar o comentario seguido del texto; usa añadir diagnóstico para el catálogo CIE.");
    return result;
  }

  // Referencias cortas a la última pregunta o campo seleccionado.
  if (selection?.kind === "question" && /^(?:opci[oó]n|marcar|marca|desmarcar|desmarca|si|no|descripci[oó]n|comentario)\b/i.test(command)) {
    return parseAnamnesisSections(`${selection.prefix}: ${command}`, null, fields, pending);
  }
  if (selection && ["bio", "habit", "family"].includes(selection.kind) && /^(?:descripci[oó]n|comentario|parejas|n[uú]mero\s+de\s+parejas|cantidad|tiempo|tipo|periodicidad|frecuencia|marcar|desmarcar)\b/i.test(command)) {
    return parseAnamnesisSections(`${selection.prefix}: ${command}`, null, fields, pending);
  }
  if (/^(?:descripci[oó]n|comentario)\b/i.test(command)) {
    const result = resultFor({ kind: "none", prefix: "descripción", label: "Descripción" });
    result.errors.push("Nombra primero la pregunta, función biológica, hábito o familiar de esa descripción.");
    return result;
  }
  return { handled: false };
}

function proposeAnamnesis(text, fields, awaiting = null, selection = null, pending = new Map()) {
  const active = fields.filter((f) => f.contexto === "anamnesis");
  if (!active.length) return { handled: false };
  const valid = (context) => context && context.expiresAt > Date.now() && active.some((f) => f.pagina === context.pagina && f.frameId === context.frameId);
  if (!valid(awaiting)) awaiting = null;
  if (!valid(selection)) selection = null;
  const parse = (input, allowNumber = true, useSelection = true) => {
    const actual = parseAnamnesisActual(input);
    if (actual.handled) { actual.selection = { ...actual.target, kind: "actual" }; return actual; }
    return parseAnamnesisSections(input, useSelection ? selection : null, active, pending, allowNumber);
  };
  let result = parse(text, !awaiting || (awaiting.kind === "question" && !awaiting.literal), !awaiting?.literal);
  if (awaiting?.literal && result.target?.kind === "none") result = { handled: false };
  if (!result.handled && awaiting) {
    const control = /^(?:confirmar|confirmado|aplicar|aplicalo|descartar|descartalo|cancelar|cancelalo|guardar|grabar|limpiar|buscar|busca|actualiza|actualizar|refresca|refrescar|escanear|escanea|modo|pausa|pausar|detener|continuar|sube|subir|baja|bajar|arriba|abajo|agenda|servicio|preregistro|ve\s+a|ir\s+a|abre|abrir|cambia|cambiar|corrige|modifica|selecciona|dni|documento|nombre|apellido)\b/;
    if (control.test(normalizeAnamnesis(text))) return { handled: false };
    const body = anamnesisValueText(text);
    result = parse(`${awaiting.prefix}: ${body}`);
  }
  if (!result.handled) return result;
  result.entries = [];
  for (const data of result.fields) {
    const field = active.find((f) => f.name === data.name && (!data.domId || data.domId === f.domId));
    if (!field) { result.errors.push("El campo no está disponible. Actualiza los campos y verifica que la sección o el cuadro de diagnóstico estén abiertos y editables."); continue; }
    let valor = data.valor;
    if (field.tipo === "select" && valor !== "") {
      const exact = (field.opcionesValores || []).filter((o) => [o.text, o.value].some((v) => normalizeAnamnesis(v) === normalizeAnamnesis(valor)));
      const code = field.scope === "diagnostico" && field.name === "diagnostic" && /^[a-z]\d{2}(?:\.\d+)?$/i.test(valor)
        ? (field.opcionesValores || []).filter((o) => normalizeAnamnesis(o.text).startsWith(`${normalizeAnamnesis(valor)} `) || normalizeAnamnesis(o.text).startsWith(`${normalizeAnamnesis(valor)}-`)) : [];
      if (exact.length > 1 || (exact.length === 0 && code.length > 1)) {
        result.errors.push(`Hay más de una opción con ese texto o código en ${field.etiqueta}. Selecciona una opción inequívoca del catálogo.`);
        continue;
      }
      if (exact.length === 1) valor = exact[0].value;
      else if (code.length === 1) valor = code[0].value;
      else if (!(field.opciones || []).some((o) => normalizeAnamnesis(o) === normalizeAnamnesis(valor))) {
        result.errors.push(`La opción no está disponible en ${field.etiqueta}. Actualiza los campos después de cargar sus opciones.`);
        continue;
      }
    }
    // Una sola entrada por control, también cuando se activa una dependencia.
    const index = result.entries.findIndex((e) => e.field.name === field.name && e.field.domId === field.domId);
    if (index >= 0) result.entries[index] = { field, valor };
    else result.entries.push({ field, valor });
  }
  return result;
}
