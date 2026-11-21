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
