const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");
const root = path.join(__dirname, "..");
const source = (name) => fs.readFileSync(path.join(root, name), "utf8");

function setup() {
  const dom = new JSDOM(source("tests/fixtures/examen-clinico.html"), {
    url: "https://smile.example.test/paciente/examen_clinico",
    runScripts: "outside-only",
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
  w.setTimeout = (fn, ms) => { fn(); return 0; };
  w.eval(source("modules/expediente/examen_clinico.js"));
  w.eval(source("inject.js"));

  // Simular interactividad de Smile (mostrar/ocultar renglones al cambiar selects)
  w.document.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", () => {
      const val = select.value;
      if (select.name === "apreciacion_general") {
        w.document.getElementById("renglon_areg").style.display = val === "AREG" ? "" : "none";
        w.document.getElementById("renglon_ameg").style.display = val === "AMEG" ? "" : "none";
      }
      if (select.name === "estado_nutricional") {
        w.document.getElementById("renglon_aren").style.display = val === "AREN" ? "" : "none";
        w.document.getElementById("renglon_amen").style.display = val === "AMEN" ? "" : "none";
      }
      if (select.name === "estado_hidratacion") {
        w.document.getElementById("renglon_areh").style.display = val === "AREH" ? "" : "none";
        w.document.getElementById("renglon_ameh").style.display = val === "AMEH" ? "" : "none";
      }
      if (select.name === "temperatura_piel") {
        w.document.getElementById("renglon_aumentada").style.display = val === "Aumentada" ? "" : "none";
        w.document.getElementById("renglon_disminuida").style.display = val === "Disminuida" ? "" : "none";
      }
      if (select.name === "lesiones_anterior") {
        w.document.getElementById("renglon_lesiones_ant_btn").style.display = val === "Presentes" ? "" : "none";
      }
      if (select.name === "respiracion") {
        w.document.getElementById("renglon_respiracion_desc").style.display = val === "Bucal" ? "" : "none";
      }
      if (select.name === "otros_habitos") {
        w.document.getElementById("renglon_otros_habitos_desc").style.display = val === "Presentes" ? "" : "none";
      }
    });
  });

  w.eval('window.fields = dentaiScan().map((f, id) => ({ ...f, id, frameId: 0 }));');
  const propose = (text) => w.proposeExamenClinico(text, w.fields);
  const items = (text) => {
    const prop = propose(text);
    return (prop.entries || []).map(({ field, valor }) => ({ ...field, valor }));
  };

  return { w, propose, items, close: () => w.close() };
}

test("detecta los controles de examen clínico y desambigua los campos Describa y Temperatura", (t) => {
  const s = setup(); t.after(s.close);
  assert.ok(s.w.fields.length >= 20, "Debe detectar más de 20 campos");
  const descResp = s.w.fields.find((f) => f.etiqueta === "Describa (Respiración)");
  const descHab = s.w.fields.find((f) => f.etiqueta === "Describa (Otros hábitos)");
  assert.ok(descResp, "Debe desambiguar Describa (Respiración)");
  assert.ok(descHab, "Debe desambiguar Describa (Otros hábitos)");
  const tempPiel = s.w.fields.find((f) => f.etiqueta === "Temperatura (Piel y Anexos)");
  assert.ok(tempPiel, "Debe etiquetar Temperatura (Piel y Anexos)");
});

test("ectoscopia: ABEG no pide observación", (t) => {
  const s = setup(); t.after(s.close);
  const p = s.propose("apreciación general ABEG");
  assert.equal(p.handled, true);
  assert.equal(p.entries.length, 1);
  assert.equal(p.entries[0].valor, "ABEG");
});

test("ectoscopia: AREG y AMEG capturan observación en su campo correspondiente", (t) => {
  const s = setup(); t.after(s.close);
  const pAreg = s.propose("apreciación general AREG regular estado general, paciente con palidez marcada");
  assert.equal(pAreg.handled, true);
  assert.equal(pAreg.entries.find((e) => e.field.etiqueta === "Apreciación General").valor, "AREG");
  assert.equal(pAreg.entries.find((e) => e.field.etiqueta === "AREG:").valor, "paciente con palidez marcada");

  const pAmeg = s.propose("apreciación general AMEG paciente postrado en cama");
  assert.equal(pAmeg.handled, true);
  assert.equal(pAmeg.entries.find((e) => e.field.etiqueta === "Apreciación General").valor, "AMEG");
  assert.equal(pAmeg.entries.find((e) => e.field.etiqueta === "AMEG:").valor, "postrado en cama");
});

test("nutrición e hidratación: AREN, AMEN, AREH y AMEH capturan observaciones", (t) => {
  const s = setup(); t.after(s.close);
  const pNut = s.propose("estado nutricional AREN baja de peso progresiva");
  assert.equal(pNut.entries.find((e) => e.field.etiqueta.includes("Nutricional")).valor, "AREN");
  assert.equal(pNut.entries.find((e) => e.field.etiqueta === "AREN:").valor, "baja de peso progresiva");

  const pHid = s.propose("estado de hidratación AMEH mucosas deshidratadas");
  assert.equal(pHid.entries.find((e) => e.field.etiqueta.includes("Hidratación")).valor, "AMEH");
  assert.equal(pHid.entries.find((e) => e.field.etiqueta === "AMEH:").valor, "mucosas deshidratadas");
});

test("lucidez y orientación: marca y desmarca el checkbox", (t) => {
  const s = setup(); t.after(s.close);
  const pMark = s.propose("marcar lucidez y orientación");
  assert.equal(pMark.entries[0].field.etiqueta, "Lucidez y Orientación");
  assert.equal(pMark.entries[0].valor, "true");

  s.w.dentaiFill(s.items("marcar lucidez y orientación"));
  assert.equal(s.w.document.getElementById("lucidez_chk").checked, true);

  const pUnmark = s.propose("desmarcar lucidez");
  assert.equal(pUnmark.entries[0].valor, "false");
  s.w.dentaiFill(s.items("desmarcar lucidez"));
  assert.equal(s.w.document.getElementById("lucidez_chk").checked, false);
});

test("persona con necesidades especiales: asigna Si o No", (t) => {
  const s = setup(); t.after(s.close);
  const pSi = s.propose("persona con necesidades especiales sí");
  assert.equal(pSi.entries[0].valor, "Si");

  const pNo = s.propose("no es persona con necesidades especiales");
  assert.equal(pNo.entries[0].valor, "No");
});

test("facies: tolera fascies con s intermedia y asigna Característica o No característica", (t) => {
  const s = setup(); t.after(s.close);
  const p1 = s.propose("facies característica");
  assert.equal(p1.entries[0].valor, "Característica");

  const p2 = s.propose("fascies no característica");
  assert.equal(p2.entries[0].valor, "No característica");
});

test("grado de colaboración: reconoce Receptivo y No receptivo", (t) => {
  const s = setup(); t.after(s.close);
  const pRec = s.propose("grado de colaboración receptivo");
  assert.equal(pRec.entries[0].valor, "Receptivo");

  const pNoRec = s.propose("paciente no receptivo");
  assert.equal(pNoRec.entries[0].valor, "No receptivo");
});

test("peso y talla: calcula automáticamente el IMC", (t) => {
  const s = setup(); t.after(s.close);
  const p = s.propose("el paciente pesa 80 kg y tiene una talla de 1.40 m");
  assert.equal(p.entries.find((e) => e.field.etiqueta.includes("Peso")).valor, "80");
  assert.equal(p.entries.find((e) => e.field.etiqueta.includes("Talla")).valor, "1.40");
  assert.equal(p.entries.find((e) => e.field.etiqueta.includes("IMC")).valor, "40.8");
});

test("talla en centímetros se convierte a metros con punto decimal", (t) => {
  const s = setup(); t.after(s.close);
  const p = s.propose("peso 70 kilos, talla 140 cm");
  assert.equal(p.entries.find((e) => e.field.etiqueta.includes("Talla")).valor, "1.40");
});

test("temperatura en piel y anexos: aumentada y disminuida capturan observación", (t) => {
  const s = setup(); t.after(s.close);
  const pAum = s.propose("temperatura aumentada piel caliente al tacto");
  assert.equal(pAum.entries.find((e) => e.field.etiqueta === "Temperatura (Piel y Anexos)").valor, "Aumentada");
  assert.equal(pAum.entries.find((e) => e.field.etiqueta === "Aumentada:").valor, "piel caliente al tacto");

  const pDis = s.propose("temperatura disminuida frialdad distal");
  assert.equal(pDis.entries.find((e) => e.field.etiqueta === "Temperatura (Piel y Anexos)").valor, "Disminuida");
  assert.equal(pDis.entries.find((e) => e.field.etiqueta === "Disminuida:").valor, "frialdad distal");
});

test("funciones vitales: limpia el prefijo de observación", (t) => {
  const s = setup(); t.after(s.close);
  const p = s.propose("temperatura corporal 36.5, frecuencia respiratoria 18, pulso 72, presión arterial 120 sobre 80, la observación sería que el paciente no tomó su medicación");
  assert.equal(p.entries.find((e) => e.field.etiqueta.includes("Temperatura Corporal")).valor, "36.5");
  assert.equal(p.entries.find((e) => e.field.etiqueta.includes("Frecuencia respiratoria")).valor, "18");
  assert.equal(p.entries.find((e) => e.field.etiqueta.includes("Pulso")).valor, "72");
  assert.equal(p.entries.find((e) => e.field.etiqueta.includes("Presión arterial")).valor, "120/80");
  const obs = p.entries.find((e) => e.field.etiqueta.includes("Observación")).valor;
  assert.equal(obs, "el paciente no tomó su medicación");
  assert.ok(!obs.includes("la observación sería que"), "No debe incluir el prefijo");
});

test("estomatológico extraoral: respiración y otros hábitos diferencian sus campos Describa", (t) => {
  const s = setup(); t.after(s.close);
  const p = s.propose("respiración bucal la descripción de respiración es respira con boca abierta, otros hábitos presentes describa onicofagia y bruxismo");
  assert.equal(p.entries.find((e) => e.field.etiqueta === "Respiración").valor, "Bucal");
  assert.equal(p.entries.find((e) => e.field.etiqueta === "Describa (Respiración)").valor, "respira con boca abierta");
  assert.equal(p.entries.find((e) => e.field.etiqueta === "Otros hábitos").valor, "Presentes");
  assert.equal(p.entries.find((e) => e.field.etiqueta === "Describa (Otros hábitos)").valor, "onicofagia y bruxismo");
});

test("comandos interactivos para modal de lesiones", (t) => {
  const s = setup(); t.after(s.close);
  const cOpen = s.propose("abrir lesiones anterior");
  assert.equal(cOpen.handled, true);
  assert.equal(cOpen.interactiveCommand.action, "abrir_modal_lesiones");
  assert.equal(cOpen.interactiveCommand.target, "anterior");

  const cAssign = s.propose("seleccionar orbital lesión pápula comentario sospecha de dermatitis");
  assert.equal(cAssign.handled, true);
  assert.equal(cAssign.interactiveCommand.action, "asignar_lesion");
  assert.equal(cAssign.interactiveCommand.region, "orbital");
  assert.equal(cAssign.interactiveCommand.lesion, "PÁPULA");
  assert.equal(cAssign.interactiveCommand.comentario, "sospecha de dermatitis");

  const cDel = s.propose("eliminar tabla orbital");
  assert.equal(cDel.handled, true);
  assert.equal(cDel.interactiveCommand.action, "eliminar_lesion");
  assert.equal(cDel.interactiveCommand.region, "orbital");

  const cClose = s.propose("cerrar imagen interactiva");
  assert.equal(cClose.handled, true);
  assert.equal(cClose.interactiveCommand.action, "cerrar_modal_lesiones");
});

test("llenado completo en DOM simulado con dentaiFill", (t) => {
  const s = setup(); t.after(s.close);
  const text = "apreciación general AREG paciente pálido, peso 80 kilos, talla 1.40 m, respiración bucal la descripción de respiración es respira por la boca";
  const results = s.w.dentaiFill(s.items(text));
  assert.ok(results.every((r) => r.ok), "Todos los campos deben aplicarse con éxito");
  assert.equal(s.w.document.querySelector('[name="apreciacion_general"]').value, "AREG");
  assert.equal(s.w.document.querySelector('[name="peso_kg"]').value, "80");
  assert.equal(s.w.document.querySelector('[name="talla_m"]').value, "1.40");
});

test("variaciones fonéticas de siglas (ARG, abeja, a MEG, a REM, a meh h)", (t) => {
  const s = setup(); t.after(s.close);

  // ARG -> AREG
  const pArg = s.propose("ARG");
  assert.equal(pArg.handled, true);
  assert.equal(pArg.entries.find((e) => e.field.etiqueta.includes("General")).valor, "AREG");

  // abeja -> ABEG
  const pAbeja = s.propose("abeja");
  assert.equal(pAbeja.handled, true);
  assert.equal(pAbeja.entries.find((e) => e.field.etiqueta.includes("General")).valor, "ABEG");

  // a MEG -> AMEG
  const pAmeg = s.propose("a MEG");
  assert.equal(pAmeg.handled, true);
  assert.equal(pAmeg.entries.find((e) => e.field.etiqueta.includes("General")).valor, "AMEG");

  // estado nutricional a REM -> AREN
  const pArem = s.propose("estado nutricional a REM");
  assert.equal(pArem.handled, true);
  assert.equal(pArem.entries.find((e) => e.field.etiqueta.includes("Nutricional")).valor, "AREN");

  // a meh h -> AMEH
  const pAmeh = s.propose("a meh h");
  assert.equal(pAmeh.handled, true);
  assert.equal(pAmeh.entries.find((e) => e.field.etiqueta.includes("Hidratación")).valor, "AMEH");
});

test("cambiar y editar observaciones condicionales directamente", (t) => {
  const s = setup(); t.after(s.close);

  // "cambiar AREG calidez neutral"
  const pCambiar = s.propose("cambiar AREG calidez neutral");
  assert.equal(pCambiar.handled, true);
  assert.equal(pCambiar.entries.find((e) => e.field.etiqueta === "Apreciación General").valor, "AREG");
  assert.equal(pCambiar.entries.find((e) => e.field.etiqueta === "AREG:").valor, "calidez neutral");

  // "editar AREG calidez neutral"
  const pEditar = s.propose("editar AREG calidez neutral");
  assert.equal(pEditar.handled, true);
  assert.equal(pEditar.entries.find((e) => e.field.etiqueta === "AREG:").valor, "calidez neutral");

  // "cambiar AREN baja de peso progresiva"
  const pAren = s.propose("cambiar AREN baja de peso progresiva");
  assert.equal(pAren.handled, true);
  assert.equal(pAren.entries.find((e) => e.field.etiqueta === "AREN:").valor, "baja de peso progresiva");

  // "editar AMEH mucosas deshidratadas"
  const pAmeh = s.propose("editar AMEH mucosas deshidratadas");
  assert.equal(pAmeh.handled, true);
  assert.equal(pAmeh.entries.find((e) => e.field.etiqueta === "AMEH:").valor, "mucosas deshidratadas");

  // "cambiar AREG a ABEG"
  const pSwap = s.propose("cambiar AREG a ABEG");
  assert.equal(pSwap.handled, true);
  assert.equal(pSwap.entries.find((e) => e.field.etiqueta === "Apreciación General").valor, "ABEG");

  // "tipo de lesión editar" abre modal de lesiones
  const pLesion = s.propose("tipo de lesión editar");
  assert.equal(pLesion.handled, true);
  assert.equal(pLesion.interactiveCommand.action, "abrir_modal_lesiones");
});

test("dictado continuo rápido y fonética de voz (amej, ameja, areja, a reja, are, listo)", (t) => {
  const s = setup(); t.after(s.close);

  // "apreciación general amej" -> AMEG
  const pAmej = s.propose("apreciación general amej");
  assert.equal(pAmej.handled, true);
  assert.equal(pAmej.entries.find((e) => e.field.etiqueta === "Apreciación General").valor, "AMEG");

  // "apreciación general ameja" -> AMEG
  const pAmeja = s.propose("apreciación general ameja");
  assert.equal(pAmeja.handled, true);
  assert.equal(pAmeja.entries.find((e) => e.field.etiqueta === "Apreciación General").valor, "AMEG");

  // "apreciación general areja" -> AREG
  const pAreja = s.propose("apreciación general areja");
  assert.equal(pAreja.handled, true);
  assert.equal(pAreja.entries.find((e) => e.field.etiqueta === "Apreciación General").valor, "AREG");

  // "apreciación general a reja" -> AREG
  const pAReja = s.propose("apreciación general a reja");
  assert.equal(pAReja.handled, true);
  assert.equal(pAReja.entries.find((e) => e.field.etiqueta === "Apreciación General").valor, "AREG");

  // "apreciación general are" -> AREG
  const pAre = s.propose("apreciación general are");
  assert.equal(pAre.handled, true);
  assert.equal(pAre.entries.find((e) => e.field.etiqueta === "Apreciación General").valor, "AREG");

  // "listo apreciación general a re" -> AREG (tolera muletilla 'listo' y truncado 'a re')
  const pListoAre = s.propose("listo apreciación general a re");
  assert.equal(pListoAre.handled, true);
  assert.equal(pListoAre.entries.find((e) => e.field.etiqueta === "Apreciación General").valor, "AREG");

  // "apreciación general AREG"
  const pAreg = s.propose("apreciación general AREG");
  assert.equal(pAreg.handled, true);
  assert.equal(pAreg.entries.find((e) => e.field.etiqueta === "Apreciación General").valor, "AREG");

  // "apreciación general ABEG"
  const pAbeg = s.propose("apreciación general ABEG");
  assert.equal(pAbeg.handled, true);
  assert.equal(pAbeg.entries.find((e) => e.field.etiqueta === "Apreciación General").valor, "ABEG");

  // Normalizador a nivel de función para 'listo confirmar'
  assert.equal(s.w.normalizeClinicalAcronyms("listo confirmar"), "confirmar");
});
