const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");
const root = path.join(__dirname, "..");
const source = (name) => fs.readFileSync(path.join(root, name), "utf8");

function setup() {
  const dom = new JSDOM(source("tests/fixtures/anamnesis-actual.html"), {
    url: "https://smile.example.test/paciente/prueba", runScripts: "outside-only",
  });
  const w = dom.window;
  w.eval = (code) => vm.runInContext(code, dom.getInternalVMContext());
  w.CSS = { escape: (text) => String(text).replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`) };
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    let visible = true;
    for (let node = this; node; node = node.parentElement) {
      if (node.style.display === "none") visible = false;
    }
    return { width: visible ? 300 : 0, height: visible ? 30 : 0 };
  };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.setTimeout = () => 0;
  w.eval(source("modules/expediente/anamnesis.js"));
  w.eval(source("inject.js"));
  w.document.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", () => {
      const activates = select.selectedOptions[0]?.dataset.activar;
      if (/respuestas\[(?:50|70)_/.test(select.name)) {
        const row = w.document.getElementById(select.name.includes("[50_") ? "renglon_1_60" : "renglon_1_80");
        row.style.display = activates ? "" : "none";
      }
    });
  });
  w.eval('window.fields = dentaiScan(ANAMNESIS_ACTUAL_FIELDS).map((f, id) => ({ ...f, id, frameId: 0 }));');
  const propose = (text) => w.proposeAnamnesisActual(text, w.fields);
  const items = (text) => propose(text).entries.map(({ field, valor }) => ({ ...field, valor }));
  return { w, propose, items, close: () => w.close() };
}

test("detecta los 14 controles y etiqueta los detalles aunque estén ocultos", (t) => {
  const s = setup(); t.after(s.close);
  assert.equal(s.w.fields.length, 14);
  assert.equal(s.w.fields.filter((f) => f.contexto === "anamnesis").length, 14);
  assert.equal(s.w.fields.find((f) => f.name === "respuestas[60_1_0_1]").etiqueta, "Signos y síntomas principales · detalle");
});

for (const [text, count, unit] of [
  ["Tiempo de enfermedad hace tres días", "3", "DÍA"],
  ["tiempo de evolución veintidós meses", "22", "MES"],
  ["Última visita odontológica hace un año", "1", "AÑO"],
  ["corrige la última visita dental a 2 semanas", "2", "SEMANA"],
  ["tiempo de enfermedad treinta y uno días", "31", "DÍA"],
  ["última visita nunca antes", "", "NUNCA ANTES"],
]) test(`duración: ${text}`, (t) => {
  const s = setup(); t.after(s.close);
  const proposal = s.propose(text);
  assert.equal(proposal.errors.length, 0);
  assert.deepEqual(Array.from(proposal.entries, (entry) => entry.valor), [count, unit]);
  assert.ok(s.w.dentaiFill(s.items(text)).every((r) => r.ok));
});

test("observación conserva el texto y no se mezcla con cantidad ni unidad", (t) => {
  const s = setup(); t.after(s.close);
  const proposal = s.propose("Tiempo de enfermedad 3 días, observación dolor al masticar.");
  assert.deepEqual(Array.from(proposal.entries, (e) => e.valor), ["3", "DÍA", "dolor al masticar"]);
  const note = s.propose("observación de la última visita control preventivo");
  assert.equal(note.entries[0].field.name, "respuestas[20_1_30_1]");
  assert.equal(note.entries[0].valor, "control preventivo");
});

test("última visita y tiempo de enfermedad no comparten controles", (t) => {
  const s = setup(); t.after(s.close);
  s.w.dentaiFill(s.items("última visita odontológica 6 meses"));
  s.w.dentaiFill(s.items("tiempo de enfermedad 3 días"));
  const value = (name) => s.w.document.querySelector(`[name="respuestas[${name}]"]`).value.trim();
  assert.equal(value("20_1_10_1"), "6");
  assert.equal(value("20_1_20_1"), "MES");
  assert.equal(value("20_1_40_1"), "3");
  assert.equal(value("20_1_50_1"), "DÍA");
});

for (const text of ["tiempo de enfermedad 32 días", "tiempo de enfermedad cero meses", "tiempo de enfermedad 2", "tiempo de enfermedad dos horas", "inicio progresivo", "curso brusco"]) {
  test(`rechaza valores incompatibles: ${text}`, (t) => {
    const s = setup(); t.after(s.close);
    assert.ok(s.propose(text).errors.length > 0);
  });
}

test("insidioso selecciona la opción real Incidioso y respeta No aplica", (t) => {
  const s = setup(); t.after(s.close);
  assert.equal(s.propose("inicio insidioso").entries[0].valor, "Incidioso");
  assert.ok(s.w.dentaiFill(s.items("inicio insidioso"))[0].ok);
  assert.equal(s.w.document.querySelector('[name="respuestas[30_1_0_1]"]').value.trim(), "Incidioso");
  assert.equal(s.propose("curso no aplica").entries[0].valor, "No aplica");
});

for (const [field, name] of [["Signos y síntomas principales", "60_1_0_1"], ["Relato", "80_1_0_1"]]) {
  test(`activa Aplica antes del detalle de ${field}`, (t) => {
    const s = setup(); t.after(s.close);
    const text = "El paciente refiere dolor desde hace 3 días y pide confirmar el inicio.";
    const entries = s.items(`${field}: ${text}`);
    assert.equal(entries.length, 2);
    assert.equal(entries[1].valor, text);
    assert.ok(s.w.dentaiFill(entries).every((r) => r.ok));
    assert.equal(s.w.document.querySelector(`[name="respuestas[${name}]"]`).value, text);
    const disabled = s.propose(`${field} no aplica`);
    assert.equal(disabled.entries.length, 1);
    assert.equal(disabled.entries[0].valor, "No aplica");
    assert.equal(disabled.remove[0], `respuestas[${name}]`);
  });
}

test("motivo y vacuna conservan números, acentos y palabras de navegación", (t) => {
  const s = setup(); t.after(s.close);
  for (const label of ["Motivo de consulta", "Informe de vacuna covid-2019"]) {
    const text = "Refiere dolor 3 días, baja intensidad; consultar al inicio.";
    assert.equal(s.propose(`${label}: ${text}`).entries[0].valor, text);
  }
});

test("no infiere campos por conversación ni procesa otros módulos", (t) => {
  const s = setup(); t.after(s.close);
  assert.equal(s.propose("refiere dolor desde hace tres días").handled, false);
  assert.equal(s.w.proposeAnamnesisActual("inicio brusco", []).handled, false);
  s.w.document.querySelector("h4.text-c").textContent = "2 EXAMEN CLÍNICO";
  s.w.eval("window.otherFields = dentaiScan(ANAMNESIS_ACTUAL_FIELDS)");
  assert.equal(s.w.otherFields.filter((f) => f.contexto === "anamnesis").length, 0);
  assert.equal(s.w.dentaiFill(s.items("inicio brusco"))[0].ok, false);
});

test("no usa una clave obsoleta ni escribe al cambiar de página", (t) => {
  const s = setup(); t.after(s.close);
  const entries = s.items("inicio brusco");
  entries[0].key = s.w.fields[0].key;
  assert.ok(s.w.dentaiFill(entries)[0].ok);
  assert.equal(s.w.document.querySelector("textarea").value, "");
  s.w.history.pushState({}, "", "/otro-paciente");
  assert.equal(s.w.dentaiFill(entries)[0].ok, false);
});

test("falla si falta una opción y no elige una coincidencia parcial", (t) => {
  const s = setup(); t.after(s.close);
  const select = s.w.document.querySelector('[name="respuestas[20_1_10_1]"]');
  Array.from(select.options).find((option) => option.value.trim() === "1").remove();
  const result = s.w.dentaiFill(s.items("última visita 1 mes"));
  assert.equal(result[0].ok, false);
  assert.equal(select.value, "");
});

test("actualiza el texto Select2 y emite change con la opción nativa", (t) => {
  const s = setup(); t.after(s.close);
  const select = s.w.document.querySelector('[name="respuestas[30_1_0_1]"]');
  const container = s.w.document.createElement("span");
  container.className = "select2-container";
  container.innerHTML = '<span class="select2-selection__rendered"></span>';
  select.after(container);
  let changed = false;
  select.addEventListener("change", () => { changed = true; });
  s.w.dentaiFill(s.items("inicio insidioso"));
  assert.ok(changed);
  assert.equal(container.textContent.trim(), "Incidioso");
});

test("un detalle oculto por CSS y un selector bloqueado no se escriben", (t) => {
  const s = setup(); t.after(s.close);
  const entries = s.items("relato dolor constante");
  const style = s.w.document.createElement("style");
  style.textContent = '#renglon_1_80 { display: none !important; }';
  s.w.document.head.append(style);
  const result = s.w.dentaiFill(entries);
  assert.equal(result[0].ok, true);
  assert.equal(result[1].ok, false);
  assert.equal(s.w.document.querySelector('[name="respuestas[80_1_0_1]"]').value, "");
  s.w.document.querySelector('[name="respuestas[30_1_0_1]"]').disabled = true;
  assert.equal(s.w.dentaiFill(s.items("inicio brusco"))[0].ok, false);
});

function setupPanel() {
  const s = setup();
  const w = s.w;
  w.eval(source("core/state.js"));
  w.state.fields = w.fields;
  const listen = w.document.addEventListener.bind(w.document);
  w.document.addEventListener = (event, ...args) => {
    if (event !== "DOMContentLoaded") listen(event, ...args);
  };
  w.eval(source("sidepanel.js"));
  w.eval(`
    getSettings = async () => ({ geminiApiKey: 'unused' });
    addTranscript = () => {};
    speak = () => {};
    setStatus = (text) => { window.statusText = text; };
    renderPending = () => {};
    checkSite = async () => true;
    addLog = async () => {};
    extractWithGemini = async () => { throw new Error('No debe llamar Gemini para campos A'); };
    state.tab = { id: 1, url: location.href };
    window.chrome = { scripting: { executeScript: async ({ args }) => [{ result: dentaiFill(args[0]) }] } };
  `);
  return s;
}

test("integración del panel: propone antes de Gemini, confirma dependencias y conserva fallos", async (t) => {
  const s = setupPanel(); t.after(s.close);
  const w = s.w;
  await w.processText("Relato el paciente pide confirmar que baja el dolor");
  assert.equal(w.state.pending.size, 2);
  assert.equal(w.document.querySelector('[name="respuestas[80_1_0_1]"]').value, "");
  await w.processText("Relato no aplica");
  assert.equal(w.state.pending.size, 1);
  await w.processText("Relato dolor persistente");
  // Simula que otra propuesta cambió el orden y que un control quedó bloqueado.
  const entry = Array.from(w.state.pending.entries())[0];
  w.state.pending.delete(entry[0]); w.state.pending.set(...entry);
  await w.processText("motivo de consulta dolor dental");
  w.document.querySelector('[name="respuestas[10_1_0_1]"]').readOnly = true;
  await w.processText("confirmar");
  assert.equal(w.document.querySelector('[name="respuestas[80_1_0_1]"]').value, "dolor persistente");
  assert.equal(w.state.pending.size, 1);
  assert.equal(Array.from(w.state.pending.values())[0].valor, "dolor dental");
});

test("regresión de captura: motivo de consulta, el valor dolor de muelas, confirmar", async (t) => {
  const s = setupPanel(); t.after(s.close);
  const w = s.w;
  await w.processText("motivo de consulta");
  assert.equal(w.state.pending.size, 0);
  assert.equal(w.state.anamnesisAwaiting.label, "Motivo de consulta");
  assert.match(w.statusText, /Ahora dicta el valor/);
  await w.processText("el valor dolor de muelas");
  assert.equal(w.state.pending.size, 1);
  assert.equal(w.state.anamnesisAwaiting, null);
  assert.equal(Array.from(w.state.pending.values())[0].valor, "dolor de muelas");
  assert.equal(w.document.querySelector("textarea").value, "");
  await w.processText("confirmar");
  assert.equal(w.document.querySelector("textarea").value, "dolor de muelas");
  assert.equal(w.state.pending.size, 0);
});

for (const [field, answer, expected] of [
  ["Motivo de consulta.", "Dolor al masticar", ["Dolor al masticar"]],
  ["Inicio", "el valor es insidioso", ["Incidioso"]],
  ["Curso", "regresivo", ["Regresivo"]],
  ["Tiempo de enfermedad", "el valor tres días", ["3", "DÍA"]],
  ["Relato", "el texto es El paciente indica que baja el dolor al inicio.", ["Aplica", "El paciente indica que baja el dolor al inicio."]],
]) test(`dictado con pausa: ${field} → ${answer}`, async (t) => {
  const s = setupPanel(); t.after(s.close);
  await s.w.processText(field);
  await s.w.processText(answer);
  assert.deepEqual(Array.from(s.w.state.pending.values(), (item) => item.valor), expected);
});

test("confirmar y descartar nunca se escriben como valor del campo seleccionado", async (t) => {
  const s = setupPanel(); t.after(s.close);
  for (const command of ["confirmar", "descartar", "cancelar"] ) {
    await s.w.processText("motivo de consulta");
    await s.w.processText(command);
    assert.equal(s.w.state.anamnesisAwaiting, null);
    assert.equal(s.w.state.pending.size, 0);
    assert.equal(s.w.document.querySelector("textarea").value, "");
  }
});

test("un nuevo campo reemplaza la selección y un valor incorrecto permite reintentar", async (t) => {
  const s = setupPanel(); t.after(s.close);
  await s.w.processText("Motivo de consulta");
  await s.w.processText("Inicio");
  await s.w.processText("el valor progresivo");
  assert.equal(s.w.state.pending.size, 0);
  assert.equal(s.w.state.anamnesisAwaiting.label, "Inicio");
  await s.w.processText("brusco");
  assert.equal(s.w.state.pending.size, 1);
  assert.equal(Array.from(s.w.state.pending.values())[0].field.name, "respuestas[30_1_0_1]");
});

test("la selección vence y no se reutiliza al cambiar de página o ante navegación", async (t) => {
  const s = setupPanel(); t.after(s.close);
  await s.w.processText("Motivo de consulta");
  const waiting = s.w.state.anamnesisAwaiting;
  const propose = (text, value) => s.w.proposeAnamnesisActual(text, s.w.fields, value);
  assert.equal(propose("dolor", { ...waiting, expiresAt: Date.now() - 1 }).handled, false);
  assert.equal(propose("dolor", { ...waiting, pagina: "https://smile.example.test/otra" }).handled, false);
  for (const command of ["abre examen clínico", "ve a registros clínicos", "guardar", "actualizar campos", "baja", "nombre Pedro"]) {
    assert.equal(propose(command, waiting).handled, false);
  }
});
