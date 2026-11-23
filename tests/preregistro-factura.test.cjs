const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");
const source = (name) => fs.readFileSync(path.join(root, name), "utf8");

function setupEnv() {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <div class="navbar"><a href="/usmile/index.php/admision/preregistro_control">Preregistro</a></div>
  </body></html>`, {
    url: "https://cayetano-qa.smilesoftware.com.mx/usmile/index.php/admin",
    runScripts: "outside-only"
  });
  const w = dom.window;
  w.eval = (code) => vm.runInContext(code, dom.getInternalVMContext());
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    return { width: 100, height: 30, top: 0, left: 0, right: 100, bottom: 30 };
  };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.eval(source("modules/preregistro/nuevo_preregistro/factura.js"));
  w.eval(source("modules/preregistro/nuevo_preregistro/direccion.js"));
  w.eval(source("modules/preregistro/nuevo_preregistro/otros_datos.js"));
  w.eval(source("inject.js"));
  return { w, close: () => w.close() };
}

test("Factura: extrae comandos de voz para campos específicos de Factura", (t) => {
  const { w, close } = setupEnv();
  t.after(close);

  // Suffix patterns
  const res1 = w.extractFacturaFieldCommand("edita calle en factura universitaria");
  assert.ok(res1);
  assert.equal(res1.type, "calle");
  assert.equal(res1.field, "Calle (Factura)");
  assert.equal(res1.value, "universitaria");

  const res2 = w.extractFacturaFieldCommand("edita calle de factura universitaria");
  assert.ok(res2);
  assert.equal(res2.type, "calle");
  assert.equal(res2.value, "universitaria");

  // Prefix patterns con 'dentro de factura'
  const res3 = w.extractFacturaFieldCommand("dentro de factura edita calle Av. Universitaria 1500");
  assert.ok(res3);
  assert.equal(res3.type, "calle");
  assert.equal(res3.value, "Av. Universitaria 1500");

  const res4 = w.extractFacturaFieldCommand("dentro de factura edita país Perú");
  assert.ok(res4);
  assert.equal(res4.type, "pais");
  assert.equal(res4.value, "PERÚ");

  const res5 = w.extractFacturaFieldCommand("dentro de factura edita departamento Lima");
  assert.ok(res5);
  assert.equal(res5.type, "departamento");
  assert.equal(res5.value, "LIMA");

  // Prefix patterns con 'datos de factura'
  const res6 = w.extractFacturaFieldCommand("datos de factura calle universitaria");
  assert.ok(res6);
  assert.equal(res6.type, "calle");
  assert.equal(res6.value, "universitaria");

  const res7 = w.extractFacturaFieldCommand("cambia datos de factura calle Girón universitaria 221");
  assert.ok(res7);
  assert.equal(res7.type, "calle");
  assert.equal(res7.value, "Girón universitaria 221");

  // Razón Social
  const res8 = w.extractFacturaFieldCommand("edita razón social Clínica Cayetano Heredia");
  assert.ok(res8);
  assert.equal(res8.type, "razon_social");
  assert.equal(res8.value, "CLÍNICA CAYETANO HEREDIA");

  // Correo y Documento
  const res9 = w.extractFacturaFieldCommand("edita correo de factura administracion@clinica.pe");
  assert.ok(res9);
  assert.equal(res9.type, "correo");
  assert.equal(res9.value, "administracion@clinica.pe");

  const res10 = w.extractFacturaFieldCommand("dentro de factura edita documento 20123456789");
  assert.ok(res10);
  assert.equal(res10.type, "documento");
  assert.equal(res10.value, "20123456789");

  // Casos reportados por Yojan con acentos y factura al final:
  const res11 = w.extractFacturaFieldCommand("edita número exterior de factura 552");
  assert.ok(res11);
  assert.equal(res11.type, "exterior");
  assert.equal(res11.value, "552");

  const res12 = w.extractFacturaFieldCommand("edita tipo de identificación RUC dentro de factura");
  assert.ok(res12);
  assert.equal(res12.type, "tipo_documento");
  assert.equal(res12.value, "RUC");

  const res13 = w.extractFacturaFieldCommand("aedita tipo de identificación RUC dentro de factura");
  assert.ok(res13);
  assert.equal(res13.type, "tipo_documento");
  assert.equal(res13.value, "RUC");

  const res14 = w.extractFacturaFieldCommand("edita calle de factura Girón Honorio delgado");
  assert.ok(res14);
  assert.equal(res14.type, "calle");
  assert.equal(res14.value, "Girón Honorio delgado");
});

test("Factura: búsqueda de Calle NO debe coincidir con radio 'Los datos son iguales a la dirección'", (t) => {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <fieldset>
      <legend>Factura</legend>
      <label>Los datos son iguales a la dirección</label>
      <input type="radio" name="igual_direc" value="1"> Si
      <input type="radio" name="igual_direc" value="0"> No
      <label for="fac_calle">*Calle:</label>
      <input type="text" id="fac_calle" name="calle_factura" value="Av. Honorio Delgado 430">
    </fieldset>
  </body></html>`, {
    url: "https://cayetano-qa.smilesoftware.com.mx/usmile/index.php/admin",
    runScripts: "outside-only"
  });
  const w = dom.window;
  w.eval = (code) => vm.runInContext(code, dom.getInternalVMContext());
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    return { width: 100, height: 30, top: 0, left: 0, right: 100, bottom: 30 };
  };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.eval(source("inject.js"));
  
  const scanned = w.dentaiScan();
  const fields = scanned.map((f, id) => ({ ...f, id }));
  
  // Función findField idéntica a sidepanel.js
  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[*:]+/g, "").trim();
  const etPattern = /^calle$|calle(?!.*ext)/i;
  const isCalleSearch = etPattern && /calle/i.test(etPattern.source) && !/ext|exterior/i.test(etPattern.source);
  
  const calleFactura = fields.find((f) => {
    const secNorm = norm(f.seccion);
    const etNorm = norm(f.etiqueta);
    const nameNorm = norm(f.name);
    const idNorm = norm(f.domId);
    const phNorm = norm(f.placeholder);
    if (isCalleSearch && (f.tipo === "radio" || /igual.*direc/i.test(etNorm) || /exterior|num.*ext|no.*ext|vivienda/i.test(etNorm))) {
      return false;
    }
    return /factura/i.test(secNorm) && (etPattern.test(etNorm) || etPattern.test(nameNorm) || etPattern.test(idNorm) || etPattern.test(phNorm));
  });

  assert.ok(calleFactura, "Debe encontrar el campo de Calle de Factura");
  assert.equal(calleFactura.tipo, "text", "Debe ser input de texto, no radio");
  assert.notEqual(calleFactura.tipo, "radio", "NUNCA debe ser radio button");
  assert.equal(calleFactura.etiqueta, "Calle");
});

test("Dirección General: comandos sin 'factura' NO son interceptados por Factura", (t) => {
  const { w, close } = setupEnv();
  t.after(close);

  assert.equal(w.extractFacturaFieldCommand("edita calle universitaria"), null);
  assert.equal(w.extractFacturaFieldCommand("edita país Perú"), null);
  assert.equal(w.extractFacturaFieldCommand("edita departamento Lima"), null);
  assert.equal(w.extractFacturaFieldCommand("edita provincia Lima"), null);
  assert.equal(w.extractFacturaFieldCommand("edita distrito San Miguel"), null);
  assert.equal(w.extractFacturaFieldCommand("edita número exterior 552"), null);
  assert.equal(w.extractFacturaFieldCommand("edita correo juan@gmail.com"), null);
});

test("Dirección General: extractCalle no se contamina si el dictado menciona Factura", (t) => {
  const { w, close } = setupEnv();
  t.after(close);

  assert.equal(w.extractCalle("edita calle en factura universitaria"), null);
  assert.equal(w.extractCalle("datos de factura calle universitaria"), null);
  assert.equal(w.extractCalle("dentro de factura calle universitaria"), null);
  assert.equal(w.extractCalle("calle de factura universitaria"), null);

  // En cambio, cuando es dirección normal sí extrae correctamente:
  assert.equal(w.extractCalle("calle Los Cedros 123"), "Los Cedros 123");
});

test("Navegación: soporta 'prerregistro' con doble r y navega exitosamente", (t) => {
  const { w, close } = setupEnv();
  t.after(close);

  // 1. dentaiNavigate con 'prerregistro'
  const navPrerregistro = w.dentaiNavigate("prerregistro");
  assert.ok(navPrerregistro.ok, "Debe encontrar la pestaña de prerregistro");

  // 2. dentaiNavigate con 'abre prerregistro' (normalizado)
  const navAbre = w.dentaiNavigate("prerregistro");
  assert.ok(navAbre.ok);

  // 3. Diccionario SMILE_URLS incluye prerregistro
  const navDirect = w.dentaiNavigate("nuevo prerregistro");
  assert.ok(navDirect.ok);
});

test("Ubigeo Compuesto: extrae departamento, provincia y distrito simultáneos", (t) => {
  const { w, close } = setupEnv();
  t.after(close);

  // 1. Caso estándar Dirección General
  const res1 = w.extractUbigeoCompound("departamento Cajamarca provincia Cajamarca distrito Cajamarca");
  assert.ok(res1);
  assert.equal(res1.isFactura, false);
  assert.equal(res1.fields.length, 3);
  assert.equal(res1.fields[0].type, "departamento");
  assert.equal(res1.fields[0].val, "CAJAMARCA");
  assert.equal(res1.fields[1].type, "provincia");
  assert.equal(res1.fields[1].val, "CAJAMARCA");
  assert.equal(res1.fields[2].type, "distrito");
  assert.equal(res1.fields[2].val, "CAJAMARCA");

  // 2. Caso en Factura
  const res2 = w.extractUbigeoCompound("en factura departamento Cajamarca provincia Cajamarca distrito Cajamarca");
  assert.ok(res2);
  assert.equal(res2.isFactura, true);
  assert.equal(res2.fields.length, 3);
  assert.equal(res2.fields[0].type, "departamento");
  assert.equal(res2.fields[0].val, "CAJAMARCA");
  assert.equal(res2.fields[1].type, "provincia");
  assert.equal(res2.fields[1].val, "CAJAMARCA");
  assert.equal(res2.fields[2].type, "distrito");
  assert.equal(res2.fields[2].val, "CAJAMARCA");

  // 3. Caso dentro de factura con orden invertido y distrito compuesto "San Martín de Porres"
  const res3 = w.extractUbigeoCompound("dentro de factura distrito San Martín de Porres provincia Lima departamento Lima");
  assert.ok(res3);
  assert.equal(res3.isFactura, true);
  assert.equal(res3.fields.length, 3);
  const dep = res3.fields.find(f => f.type === "departamento");
  const prov = res3.fields.find(f => f.type === "provincia");
  const dist = res3.fields.find(f => f.type === "distrito");
  assert.equal(dep.val, "LIMA");
  assert.equal(prov.val, "LIMA");
  assert.equal(dist.val, "SAN MARTÍN DE PORRES");

  // 4. Caso reporte de Yojan con verbo 'selecciona'
  const res4 = w.extractUbigeoCompound("selecciona en departamento en factura departamento Cajamarca");
  assert.ok(res4);
  assert.equal(res4.isFactura, true);
  assert.equal(res4.fields[0].type, "departamento");
  assert.equal(res4.fields[0].val, "CAJAMARCA");

  const res5 = w.extractUbigeoCompound("selecciona en factura provincia Cajamarca");
  assert.ok(res5);
  assert.equal(res5.isFactura, true);
  assert.equal(res5.fields[0].type, "provincia");
  assert.equal(res5.fields[0].val, "CAJAMARCA");

  // 5. No intercepta texto no relacionado a Ubigeo
  assert.equal(w.extractUbigeoCompound("edita calle Los Sauces 123"), null);
});

test("Ubigeo Cascada: aplicación por etapas da tiempo a que Smile pueble opciones dinámicas por AJAX", async (t) => {
  const { w, close } = setupEnv();
  t.after(close);

  const doc = w.document;
  doc.body.innerHTML = `
    <select id="id_departamento" data-dentai-key="k_dep">
      <option value="">::seleccione::</option>
      <option value="06">CAJAMARCA</option>
      <option value="15">LIMA</option>
    </select>
    <select id="id_provincia" data-dentai-key="k_prov">
      <option value="">::seleccione::</option>
    </select>
    <select id="id_distrito" data-dentai-key="k_dist">
      <option value="">::seleccione::</option>
    </select>
  `;

  const depSelect = doc.getElementById("id_departamento");
  const provSelect = doc.getElementById("id_provincia");
  const distSelect = doc.getElementById("id_distrito");

  depSelect.addEventListener("change", () => {
    setTimeout(() => {
      provSelect.innerHTML = `
        <option value="">::seleccione::</option>
        <option value="0601">CAJAMARCA</option>
        <option value="0602">CAJABAMBA</option>
      `;
    }, 40);
  });

  provSelect.addEventListener("change", () => {
    setTimeout(() => {
      distSelect.innerHTML = `
        <option value="">::seleccione::</option>
        <option value="060101">CAJAMARCA</option>
        <option value="060102">ASUNCION</option>
      `;
    }, 40);
  });

  // Etapa 1: Departamento
  const resDep = w.dentaiFill([{ key: "k_dep", valor: "CAJAMARCA", etiqueta: "Departamento" }]);
  assert.ok(resDep[0].ok);
  assert.equal(depSelect.value, "06");

  // Espera para AJAX de provincias (simula la espera en apply())
  await new Promise((r) => setTimeout(r, 60));

  // Etapa 2: Provincia
  const resProv = w.dentaiFill([{ key: "k_prov", valor: "CAJAMARCA", etiqueta: "Provincia" }]);
  assert.ok(resProv[0].ok);
  assert.equal(provSelect.value, "0601");

  // Espera para AJAX de distritos (simula la espera en apply())
  await new Promise((r) => setTimeout(r, 60));

  // Etapa 3: Distrito
  const resDist = w.dentaiFill([{ key: "k_dist", valor: "CAJAMARCA", etiqueta: "Distrito" }]);
  assert.ok(resDist[0].ok);
  assert.equal(distSelect.value, "060101");
});

test("Otros Datos: Cómo se enteró distingue Amigos y familiares, Recomendación y TIK TOK", (t) => {
  const { w, close } = setupEnv();
  t.after(close);

  // 1. Detección en otros_datos.js
  assert.equal(w.extractComoSeEntero("cómo se enteró mediante amigos y familiares"), "AMIGOS Y FAMILIARES");
  assert.equal(w.extractComoSeEntero("cómo se enteró amigos y familiares"), "AMIGOS Y FAMILIARES");
  assert.equal(w.extractComoSeEntero("se enteró por un amigo"), "AMIGOS Y FAMILIARES");
  assert.equal(w.extractComoSeEntero("cómo se enteró por recomendación"), "RECOMENDACION");
  assert.equal(w.extractComoSeEntero("cómo se enteró mediante tiktok"), "TIK TOK");
  assert.equal(w.extractComoSeEntero("cómo se enteró por tik tok"), "TIK TOK");

  // 2. Selección en DOM con dentaiFill para dropdown de Smile
  const doc = w.document;
  doc.body.innerHTML = `
    <select id="como_entero" data-dentai-key="k_entero">
      <option value="">::seleccione::</option>
      <option value="1">FACEBOOK</option>
      <option value="2">INSTAGRAM</option>
      <option value="3">TIK TOK</option>
      <option value="4">AMIGOS Y FAMILIARES</option>
      <option value="5">RECOMENDACION</option>
    </select>
  `;

  const select = doc.getElementById("como_entero");

  // Dictado TIKTOK (sin espacio) o TIK TOK (con espacio) selecciona la opción 3 "TIK TOK"
  const fill1 = w.dentaiFill([{ key: "k_entero", valor: "TIKTOK", etiqueta: "Cómo se enteró" }]);
  assert.ok(fill1[0].ok);
  assert.equal(select.value, "3");

  const fill2 = w.dentaiFill([{ key: "k_entero", valor: "AMIGOS Y FAMILIARES", etiqueta: "Cómo se enteró" }]);
  assert.ok(fill2[0].ok);
  assert.equal(select.value, "4");

  const fill3 = w.dentaiFill([{ key: "k_entero", valor: "RECOMENDACION", etiqueta: "Cómo se enteró" }]);
  assert.ok(fill3[0].ok);
  assert.equal(select.value, "5");
});
