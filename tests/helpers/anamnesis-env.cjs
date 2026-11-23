const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");
const root = path.join(__dirname, "../..");
const source = (name) => fs.readFileSync(path.join(root, name), "utf8");

function fullAnamnesis() {
  const dom = new JSDOM(source("tests/fixtures/anamnesis-completa.html"), {
    url: "https://smile.example.test/paciente/prueba", runScripts: "outside-only",
  });
  const w = dom.window;
  w.eval = (code) => vm.runInContext(code, dom.getInternalVMContext());
  w.CSS = { escape: (text) => String(text).replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`) };
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    const hidden = Array.from((function* (node) { while (node) { yield node; node = node.parentElement; } })(this))
      .some((node) => w.getComputedStyle(node).display === "none");
    return { width: hidden ? 0 : 300, height: hidden ? 0 : 30 };
  };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.setTimeout = () => 0;
  w.eval(source("modules/expediente/anamnesis.js"));
  w.eval(source("inject.js"));
  const field = (name) => w.document.querySelector(`[name="${name}"]:not([type="hidden"])`);
  const row = (id) => w.document.getElementById(id);
  w.document.querySelectorAll('#hc_form select[name^="respuestas["]').forEach((select) => {
    const section = select.name.match(/\[(\d+)_(\d+)_/)[2];
    const targets = new Set(Array.from(select.options).flatMap((o) => (o.dataset.activar || "").split(",")).filter(Boolean));
    const update = () => {
      const shown = (select.selectedOptions[0]?.dataset.activar || "").split(",");
      for (const target of targets) if (row(`renglon_${section}_${target}`)) row(`renglon_${section}_${target}`).style.display = shown.includes(target) ? "" : "none";
    };
    select.addEventListener("change", update); update();
  });
  w.document.querySelectorAll('#hc_form input[type="checkbox"][data-activar]').forEach((checkbox) => {
    const update = () => {
      for (const target of checkbox.dataset.activar.split(",")) row(`renglon_5_${target}`).style.display = checkbox.checked ? "" : "none";
    };
    checkbox.addEventListener("change", update); update();
  });
  const modal = row("diagnosticoCie");
  w.document.querySelectorAll("#hc_form button").forEach((button) => {
    button.addEventListener("click", () => {
      modal.dataset.targetRow = button.closest('[id^="renglon_"]').id;
      modal.style.display = "block";
    });
  });
  const addOptions = (select, options) => {
    select.replaceChildren(new w.Option("::Seleccione opción::", ""), ...options.map(([label, value]) => new w.Option(label, value)));
  };
  field("typeCie10").addEventListener("change", () => {
    addOptions(field("classification"), [["Grupo de prueba", "group-test"]]);
    addOptions(field("diagnostic"), []);
  });
  field("classification").addEventListener("change", () => {
    addOptions(field("diagnostic"), [["Q12.3 - Opción de catálogo de prueba", "diagnostic-test"], ["Otra opción de prueba", "other-test"]]);
  });
  modal.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.textContent.trim() === "Guardar") {
        const table = row(modal.dataset.targetRow).querySelector("tbody");
        const tr = table.insertRow(); tr.insertCell().textContent = field("diagnostic").value;
        tr.insertCell().textContent = field("comment").value;
      }
      modal.style.display = "none";
    });
  });
  const scan = () => {
    w.eval("window.fields = dentaiScan(ANAMNESIS_FIELDS).map((f, id) => ({ ...f, id, frameId: 0 }));");
    if (w.state) w.state.fields = w.fields;
    return w.fields;
  };
  const pending = new Map();
  const propose = (text, awaiting = null, selection = null) => w.proposeAnamnesis(text, w.fields, awaiting, selection, pending);
  const items = (text) => propose(text).entries.map(({ field, valor }) => ({ ...field, valor }));
  const scope = (target) => ({ ...target, pagina: w.location.href, frameId: 0, expiresAt: Date.now() + 60000 });
  const panel = () => {
    w.eval(source("core/state.js"));
    w.state.fields = w.fields;
    const listen = w.document.addEventListener.bind(w.document);
    w.document.addEventListener = (event, ...args) => { if (event !== "DOMContentLoaded") listen(event, ...args); };
    w.eval(source("sidepanel.js"));
    w.eval(`
      getSettings = async () => ({ geminiApiKey: 'unused' });
      addTranscript = () => {};
      speak = () => {};
      setStatus = (text) => { window.statusText = text; };
      renderPending = () => {};
      checkSite = async () => true;
      addLog = async () => {};
      extractWithGemini = async () => { throw new Error('No se debe enviar a Gemini'); };
      state.tab = { id: 1, url: location.href };
    `);
    w.chrome = { scripting: { executeScript: async ({ func, args }) => [{ result: func(...args) }] } };
    w.scan = async () => scan();
  };
  scan();
  return { w, field, row, modal, scan, propose, items, pending, scope, panel, close: () => w.close() };
}
module.exports = { fullAnamnesis };
