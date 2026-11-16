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
      if (select.name === "facies") {
        const rNo = w.document.getElementById("renglon_facies_no_caract");
        const rSi = w.document.getElementById("renglon_facies_caract");
        if (rNo) rNo.style.display = val === "No característica" ? "" : "none";
        if (rSi) rSi.style.display = val === "Característica" ? "" : "none";
      }
      if (select.name === "colaboracion") {
        const rRec = w.document.getElementById("renglon_colab_receptivo");
        const rNoRec = w.document.getElementById("renglon_colab_no_receptivo");
        if (rRec) rRec.style.display = val === "Receptivo" ? "" : "none";
        if (rNoRec) rNoRec.style.display = val === "No receptivo" ? "" : "none";
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
  assert.equal(pAreg.entries.find((e) => e.field.etiqueta === "AREG:").valor, "Paciente con palidez marcada");

  const pAmeg = s.propose("apreciación general AMEG paciente postrado en cama");
  assert.equal(pAmeg.handled, true);
  assert.equal(pAmeg.entries.find((e) => e.field.etiqueta === "Apreciación General").valor, "AMEG");
  assert.equal(pAmeg.entries.find((e) => e.field.etiqueta === "AMEG:").valor, "Paciente postrado en cama");
});

test("nutrición e hidratación: AREN, AMEN, AREH y AMEH capturan observaciones", (t) => {
  const s = setup(); t.after(s.close);
  const pNut = s.propose("estado nutricional AREN baja de peso progresiva");
  assert.equal(pNut.entries.find((e) => e.field.etiqueta.includes("Nutricional")).valor, "AREN");
  assert.equal(pNut.entries.find((e) => e.field.etiqueta === "AREN:").valor, "Baja de peso progresiva");

  const pHid = s.propose("estado de hidratación AMEH mucosas deshidratadas");
  assert.equal(pHid.entries.find((e) => e.field.etiqueta.includes("Hidratación")).valor, "AMEH");
  assert.equal(pHid.entries.find((e) => e.field.etiqueta === "AMEH:").valor, "Mucosas deshidratadas");
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
  assert.equal(pAum.entries.find((e) => e.field.etiqueta === "Aumentada:").valor, "Piel caliente al tacto");

  const pDis = s.propose("temperatura disminuida frialdad distal");
  assert.equal(pDis.entries.find((e) => e.field.etiqueta === "Temperatura (Piel y Anexos)").valor, "Disminuida");
  assert.equal(pDis.entries.find((e) => e.field.etiqueta === "Disminuida:").valor, "Frialdad distal");
});

test("funciones vitales: limpia el prefijo de observación", (t) => {
  const s = setup(); t.after(s.close);
  const p = s.propose("temperatura corporal 36.5, frecuencia respiratoria 18, pulso 72, presión arterial 120 sobre 80, la observación sería que el paciente no tomó su medicación");
  assert.equal(p.entries.find((e) => e.field.etiqueta.includes("Temperatura Corporal")).valor, "36.5");
  assert.equal(p.entries.find((e) => e.field.etiqueta.includes("Frecuencia respiratoria")).valor, "18");
  assert.equal(p.entries.find((e) => e.field.etiqueta.includes("Pulso")).valor, "72");
  assert.equal(p.entries.find((e) => e.field.etiqueta.includes("Presión arterial")).valor, "120/80");
  const obs = p.entries.find((e) => e.field.etiqueta.includes("Observación")).valor;
  assert.equal(obs, "El paciente no tomó su medicación");
  assert.ok(!obs.includes("la observación sería que"), "No debe incluir el prefijo");
});

test("estomatológico extraoral: respiración y otros hábitos diferencian sus campos Describa", (t) => {
  const s = setup(); t.after(s.close);
  const p = s.propose("respiración bucal la descripción de respiración es respira con boca abierta, otros hábitos presentes describa onicofagia y bruxismo");
  assert.equal(p.entries.find((e) => e.field.etiqueta === "Respiración").valor, "Bucal");
  assert.equal(p.entries.find((e) => e.field.etiqueta === "Describa (Respiración)").valor, "Respira con boca abierta");
  assert.equal(p.entries.find((e) => e.field.etiqueta === "Otros hábitos").valor, "Presentes");
  assert.equal(p.entries.find((e) => e.field.etiqueta === "Describa (Otros hábitos)").valor, "Onicofagia y bruxismo");
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
  assert.equal(pCambiar.entries.find((e) => e.field.etiqueta === "AREG:").valor, "Calidez neutral");

  // "editar AREG calidez neutral"
  const pEditar = s.propose("editar AREG calidez neutral");
  assert.equal(pEditar.handled, true);
  assert.equal(pEditar.entries.find((e) => e.field.etiqueta === "AREG:").valor, "Calidez neutral");

  // "cambiar AREN baja de peso progresiva"
  const pAren = s.propose("cambiar AREN baja de peso progresiva");
  assert.equal(pAren.handled, true);
  assert.equal(pAren.entries.find((e) => e.field.etiqueta === "AREN:").valor, "Baja de peso progresiva");

  // "editar AMEH mucosas deshidratadas"
  const pAmeh = s.propose("editar AMEH mucosas deshidratadas");
  assert.equal(pAmeh.handled, true);
  assert.equal(pAmeh.entries.find((e) => e.field.etiqueta === "AMEH:").valor, "Mucosas deshidratadas");

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

test("marcar, seleccionar y desmarcar Lucidez y Orientación con check visual", (t) => {
  const s = setup(); t.after(s.close);

  // "marca lucidez y orientación"
  const pMarca = s.propose("marca lucidez y orientación");
  assert.equal(pMarca.handled, true);
  assert.equal(pMarca.entries.find((e) => e.field.etiqueta.includes("Lucidez")).valor, "true");

  // "selecciona lucidez y orientación"
  const pSel = s.propose("selecciona lucidez y orientación");
  assert.equal(pSel.handled, true);
  assert.equal(pSel.entries.find((e) => e.field.etiqueta.includes("Lucidez")).valor, "true");

  // "colócale el check a lucidez y orientación"
  const pColocale = s.propose("colócale el check a lucidez y orientación");
  assert.equal(pColocale.handled, true);
  assert.equal(pColocale.entries.find((e) => e.field.etiqueta.includes("Lucidez")).valor, "true");

  // "desmarca lucidez y orientación"
  const pDesmarca = s.propose("desmarca lucidez y orientación");
  assert.equal(pDesmarca.handled, true);
  assert.equal(pDesmarca.entries.find((e) => e.field.etiqueta.includes("Lucidez")).valor, "false");

  // "quítale el check a lucidez y orientación"
  const pQuitale = s.propose("quítale el check a lucidez y orientación");
  assert.equal(pQuitale.handled, true);
  assert.equal(pQuitale.entries.find((e) => e.field.etiqueta.includes("Lucidez")).valor, "false");

  // Llenado en DOM y verificación de checked
  s.w.dentaiFill(s.items("colócale el check a lucidez y orientación"));
  assert.equal(s.w.document.getElementById("lucidez_chk").checked, true);

  s.w.dentaiFill(s.items("desmarca lucidez y orientación"));
  assert.equal(s.w.document.getElementById("lucidez_chk").checked, false);
});

test("escribir y borrar en campos condicionales con mayúscula inicial siempre", (t) => {
  const s = setup(); t.after(s.close);

  // "escribe en AREG paciente pálido"
  const pEscribeAreg = s.propose("escribe en AREG paciente pálido");
  assert.equal(pEscribeAreg.handled, true);
  assert.equal(pEscribeAreg.entries.find((e) => e.field.etiqueta === "AREG:").valor, "Paciente pálido");

  // "escribir dentro de AREG calidez neutral"
  const pDentroAreg = s.propose("escribir dentro de AREG calidez neutral");
  assert.equal(pDentroAreg.handled, true);
  assert.equal(pDentroAreg.entries.find((e) => e.field.etiqueta === "AREG:").valor, "Calidez neutral");

  // "escribe en AMEG mucosas deshidratadas 2.0"
  const pEscribeAmeg = s.propose("escribe en AMEG mucosas deshidratadas 2.0");
  assert.equal(pEscribeAmeg.handled, true);
  assert.equal(pEscribeAmeg.entries.find((e) => e.field.etiqueta === "AMEG:").valor, "Mucosas deshidratadas 2.0");

  // "borrar AREG"
  const pBorrarAreg = s.propose("borrar AREG");
  assert.equal(pBorrarAreg.handled, true);
  assert.equal(pBorrarAreg.entries.find((e) => e.field.etiqueta === "AREG:").valor, "");

  // "borrar descripción de AREG"
  const pBorrarDesc = s.propose("borrar descripción de AREG");
  assert.equal(pBorrarDesc.handled, true);
  assert.equal(pBorrarDesc.entries.find((e) => e.field.etiqueta === "AREG:").valor, "");

  // "borrar AREN"
  const pBorrarAren = s.propose("borrar AREN");
  assert.equal(pBorrarAren.handled, true);
  assert.equal(pBorrarAren.entries.find((e) => e.field.etiqueta === "AREN:").valor, "");

  // "borrar AMEH"
  const pBorrarAmeh = s.propose("borrar AMEH");
  assert.equal(pBorrarAmeh.handled, true);
  assert.equal(pBorrarAmeh.entries.find((e) => e.field.etiqueta === "AMEH:").valor, "");

  // Verificación en DOM con dentaiFill: texto en minúscula debe convertirse a mayúscula inicial
  s.w.document.querySelector('[name="apreciacion_general"]').value = "AREG";
  s.w.document.getElementById("renglon_areg").style.display = "";
  s.w.dentaiFill(s.items("escribe en AREG paciente pálido"));
  assert.equal(s.w.document.querySelector('[name="areg_obs"]').value, "Paciente pálido");

  // Borrar en DOM
  s.w.dentaiFill(s.items("borrar AREG"));
  assert.equal(s.w.document.querySelector('[name="areg_obs"]').value, "");
});

test("variaciones fonéticas de dictado continuo: ARN, a reen, red con deshidratación", (t) => {
  const s = setup(); t.after(s.close);

  // "escribir dentro de ARN mucosas deshidratadas 3.1" -> AREN
  const pArn = s.propose("escribir dentro de ARN mucosas deshidratadas 3.1");
  assert.equal(pArn.handled, true);
  assert.equal(pArn.entries.find((e) => e.field.etiqueta.includes("Nutricional")).valor, "AREN");
  assert.equal(pArn.entries.find((e) => e.field.etiqueta === "AREN:").valor, "Mucosas deshidratadas 3.1");

  // "escribir dentro de a reen mucosas deshidratadas 3.1" -> AREN
  const pReen = s.propose("escribir dentro de a reen mucosas deshidratadas 3.1");
  assert.equal(pReen.handled, true);
  assert.equal(pReen.entries.find((e) => e.field.etiqueta.includes("Nutricional")).valor, "AREN");
  assert.equal(pReen.entries.find((e) => e.field.etiqueta === "AREN:").valor, "Mucosas deshidratadas 3.1");

  // "escribir dentro de red mucosas deshidratadas 3.0" -> AREH (por contexto de hidratación)
  const pRedHid = s.propose("escribir dentro de red mucosas deshidratadas 3.0");
  assert.equal(pRedHid.handled, true);
  assert.equal(pRedHid.entries.find((e) => e.field.etiqueta.includes("Hidratación")).valor, "AREH");
  assert.equal(pRedHid.entries.find((e) => e.field.etiqueta === "AREH:").valor, "Mucosas deshidratadas 3.0");

  // "escribir dentro de red calidez neutral" -> AREG (por ectoscopia general)
  const pRedGen = s.propose("escribir dentro de red calidez neutral");
  assert.equal(pRedGen.handled, true);
  assert.equal(pRedGen.entries.find((e) => e.field.etiqueta === "Apreciación General").valor, "AREG");
  assert.equal(pRedGen.entries.find((e) => e.field.etiqueta === "AREG:").valor, "Calidez neutral");

  // "borrar ARN"
  const pBorrarArn = s.propose("borrar ARN");
  assert.equal(pBorrarArn.handled, true);
  assert.equal(pBorrarArn.entries.find((e) => e.field.etiqueta === "AREN:").valor, "");

  // "borrar red"
  const pBorrarRed = s.propose("borrar red");
  assert.equal(pBorrarRed.handled, true);
  assert.equal(pBorrarRed.entries.find((e) => e.field.etiqueta === "AREG:").valor, "");
});

test("facies y grado de colaboración: fonética, selección, escritura y borrado de observaciones", (t) => {
  const s = setup(); t.after(s.close);

  // Facies característica + observación
  const pFaciesCaract = s.propose("facies característica dolor agudo y asimetría");
  assert.equal(pFaciesCaract.handled, true);
  assert.equal(pFaciesCaract.entries.find((e) => e.field.etiqueta === "Facies").valor, "Característica");
  assert.equal(pFaciesCaract.entries.find((e) => e.field.etiqueta === "Característica:").valor, "Dolor agudo y asimetría");

  // Facies no característica + observación
  const pFaciesNo = s.propose("facies no característica paciente sin alteraciones");
  assert.equal(pFaciesNo.handled, true);
  assert.equal(pFaciesNo.entries.find((e) => e.field.etiqueta === "Facies").valor, "No característica");
  assert.equal(pFaciesNo.entries.find((e) => e.field.etiqueta === "No característica:").valor, "Paciente sin alteraciones");

  // Escribir dentro de no característica
  const pEscribeNoCaract = s.propose("escribir dentro de no característica paciente tranquilo");
  assert.equal(pEscribeNoCaract.handled, true);
  assert.equal(pEscribeNoCaract.entries.find((e) => e.field.etiqueta === "No característica:").valor, "Paciente tranquilo");

  // Escribir dentro de característica
  const pEscribeCaract = s.propose("escribir dentro de característica asimetría en mejilla izquierda");
  assert.equal(pEscribeCaract.handled, true);
  assert.equal(pEscribeCaract.entries.find((e) => e.field.etiqueta === "Característica:").valor, "Asimetría en mejilla izquierda");

  // Borrar no característica
  const pBorrarNoCaract = s.propose("borrar no característica");
  assert.equal(pBorrarNoCaract.handled, true);
  assert.equal(pBorrarNoCaract.entries.find((e) => e.field.etiqueta === "No característica:").valor, "");

  // Borrar característica
  const pBorrarCaract = s.propose("borrar característica");
  assert.equal(pBorrarCaract.handled, true);
  assert.equal(pBorrarCaract.entries.find((e) => e.field.etiqueta === "Característica:").valor, "");

  // Variaciones fonéticas de Facies (faz, fases, fase, faces)
  assert.equal(s.propose("faz no característica").entries.find((e) => e.field.etiqueta === "Facies").valor, "No característica");
  assert.equal(s.propose("fases característica").entries.find((e) => e.field.etiqueta === "Facies").valor, "Característica");
  assert.equal(s.propose("fase no característica").entries.find((e) => e.field.etiqueta === "Facies").valor, "No característica");

  // Grado de colaboración receptivo + observación
  const pColabRec = s.propose("grado de colaboración receptivo paciente colabora en todo momento");
  assert.equal(pColabRec.handled, true);
  assert.equal(pColabRec.entries.find((e) => e.field.etiqueta === "Grado de Colaboración").valor, "Receptivo");
  assert.equal(pColabRec.entries.find((e) => e.field.etiqueta === "Receptivo:").valor, "Paciente colabora en todo momento");

  // Grado de colaboración no receptivo + observación
  const pColabNo = s.propose("grado de colaboración no receptivo paciente temeroso e inquieto");
  assert.equal(pColabNo.handled, true);
  assert.equal(pColabNo.entries.find((e) => e.field.etiqueta === "Grado de Colaboración").valor, "No receptivo");
  assert.equal(pColabNo.entries.find((e) => e.field.etiqueta === "No receptivo:").valor, "Paciente temeroso e inquieto");

  // Escribir dentro de receptivo
  const pEscribeRec = s.propose("escribir dentro de receptivo muy colaborador");
  assert.equal(pEscribeRec.handled, true);
  assert.equal(pEscribeRec.entries.find((e) => e.field.etiqueta === "Receptivo:").valor, "Muy colaborador");

  // Escribir dentro de no receptivo
  const pEscribeNoRec = s.propose("escribir dentro de no receptivo ansiedad marcada");
  assert.equal(pEscribeNoRec.handled, true);
  assert.equal(pEscribeNoRec.entries.find((e) => e.field.etiqueta === "No receptivo:").valor, "Ansiedad marcada");

  // Borrar receptivo
  const pBorrarRec = s.propose("borrar receptivo");
  assert.equal(pBorrarRec.handled, true);
  assert.equal(pBorrarRec.entries.find((e) => e.field.etiqueta === "Receptivo:").valor, "");

  // Borrar no receptivo
  const pBorrarNoRec = s.propose("borrar no receptivo");
  assert.equal(pBorrarNoRec.handled, true);
  assert.equal(pBorrarNoRec.entries.find((e) => e.field.etiqueta === "No receptivo:").valor, "");

  // Llenado en DOM simulado con dentaiFill
  s.w.document.querySelector('[name="facies"]').value = "No característica";
  s.w.document.getElementById("renglon_facies_no_caract").style.display = "";
  s.w.dentaiFill(s.items("escribir dentro de no característica paciente tranquilo"));
  assert.equal(s.w.document.querySelector('[name="facies_no_caract_obs"]').value, "Paciente tranquilo");
});

test("talla con modismos 'metro 70' y filtro anti-tartamudeo 'ta ta ta talla'", (t) => {
  const s = setup(); t.after(s.close);

  // "talla metro 70" -> 1.70
  const pM70 = s.propose("talla metro 70");
  assert.equal(pM70.handled, true);
  assert.equal(pM70.entries.find((e) => e.field.etiqueta.includes("Talla")).valor, "1.70");

  // "talla metro con 70" -> 1.70
  const pMCon70 = s.propose("talla metro con 70");
  assert.equal(pMCon70.handled, true);
  assert.equal(pMCon70.entries.find((e) => e.field.etiqueta.includes("Talla")).valor, "1.70");

  // "talla metro setenta" -> 1.70
  const pMSetenta = s.propose("talla metro setenta");
  assert.equal(pMSetenta.handled, true);
  assert.equal(pMSetenta.entries.find((e) => e.field.etiqueta.includes("Talla")).valor, "1.70");

  // "talla metro y medio" -> 1.50
  const pMMedio = s.propose("talla metro y medio");
  assert.equal(pMMedio.handled, true);
  assert.equal(pMMedio.entries.find((e) => e.field.etiqueta.includes("Talla")).valor, "1.50");

  // "talla metro sesenta y cinco" -> 1.65
  const pM65 = s.propose("talla metro sesenta y cinco");
  assert.equal(pM65.handled, true);
  assert.equal(pM65.entries.find((e) => e.field.etiqueta.includes("Talla")).valor, "1.65");

  // "talla un metro 70" -> 1.70
  const pUnM70 = s.propose("talla un metro 70");
  assert.equal(pUnM70.handled, true);
  assert.equal(pUnM70.entries.find((e) => e.field.etiqueta.includes("Talla")).valor, "1.70");

  // Limpieza de tartamudeo repetido: "ta ta ta ta ta ... talla metro 70"
  const pStutter = s.propose("ta ta ta ta ta ta ta ta ta ta ta ta ta talla metro 70");
  assert.equal(pStutter.handled, true);
  assert.equal(pStutter.entries.find((e) => e.field.etiqueta.includes("Talla")).valor, "1.70");
});
