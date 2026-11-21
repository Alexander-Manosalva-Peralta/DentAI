/* DentAI – Funciones inyectadas en Smile (todos los frames).
   Se ejecutan en el contexto del DOM de Smile sin requerir acceso al backend. */

function dentaiScan(anamnesisFields = []) {
  const MAX = 200;
  const clean = (s) => (s || "").replace(/\s+/g, " ").replace(/^[*:\s]+|[*:\s]+$/g, "").trim().slice(0, 120);
  const esc = (s) => (typeof CSS !== "undefined" && CSS.escape) ? CSS.escape(s) : String(s || "").replace(/[^a-zA-Z0-9_-]/g, "\\$&");

  const visible = (el) => {
    try {
      // 1. Descartar elementos dentro de pestañas inactivas o contenedores ocultos de Smile
      if (el.closest(".tab-pane:not(.active), [style*='display: none'], [style*='display:none']")) {
        return false;
      }

      const tag = el.tagName.toLowerCase();
      const type = (el.type || "").toLowerCase();

      // 2. Selects (nativos, Select2 o estilizados de Smile)
      if (tag === "select") {
        const p = el.closest("td, th, .form-group, .row, tr, div, form");
        if (p) {
          const pr = p.getBoundingClientRect();
          const pst = getComputedStyle(p);
          if ((pr.width > 0 || pr.height > 0) && pst.visibility !== "hidden" && pst.display !== "none") {
            return true;
          }
        }
      }

      // 3. Radios y Checkboxes
      if (type === "radio" || type === "checkbox") {
        if (el.parentElement) {
          const pr = el.parentElement.getBoundingClientRect();
          const pst = getComputedStyle(el.parentElement);
          if ((pr.width > 0 || pr.height > 0) && pst.visibility !== "hidden" && pst.display !== "none") {
            return true;
          }
        }
      }

      // 4. Elementos estándar
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return (r.width > 0 || r.height > 0) && st.visibility !== "hidden" && st.display !== "none";
    } catch (e) {
      return false;
    }
  };

  const textOf = (n) => clean(n && n.textContent);

  function labelFor(el) {
    const ph = clean(el.placeholder);
    if (ph && /primer.*apellido|segundo.*apellido|apellido|nombre|documento|dni|celular|telefono|email|correo|calle|direccion|nacimiento|codigo/i.test(ph)) {
      return ph;
    }

    const earlyName = clean(el.name || el.id || el.title);
    if (/paterno|primer.*apellido|ape.*pat/i.test(earlyName)) return "PRIMER APELLIDO";
    if (/materno|segundo.*apellido|ape.*mat/i.test(earlyName)) return "SEGUNDO APELLIDO";
    if (/fec.*nac|fecha.*nac|nacimiento/i.test(earlyName)) return "*Fecha Nacimiento";
    if (/genero|sexo/i.test(earlyName)) return "Género";

    if (el.type === "checkbox" || el.type === "radio") {
      if (el.nextSibling && clean(el.nextSibling.textContent)) {
        const t = clean(el.nextSibling.textContent);
        if (t && t.length < 80) return t;
      }
      if (el.nextElementSibling && clean(el.nextElementSibling.textContent)) {
        const t = clean(el.nextElementSibling.textContent);
        if (t && t.length < 80) return t;
      }
      if (el.parentElement) {
        const pTxt = clean(el.parentElement.textContent);
        if (pTxt && pTxt.length < 80) return pTxt;
      }
    }

    const ids = el.getAttribute("aria-labelledby");
    if (ids) {
      const t = ids.split(/\s+/).map((i) => textOf(document.getElementById(i))).join(" ").trim();
      if (t) return t;
    }

    if (el.getAttribute("aria-label")) return clean(el.getAttribute("aria-label"));

    if (el.id) {
      const l = document.querySelector('label[for="' + esc(el.id) + '"]');
      if (l && textOf(l)) return textOf(l);
    }

    const wrap = el.closest("label");
    if (wrap) {
      const c = wrap.cloneNode(true);
      c.querySelectorAll("input,select,textarea").forEach((x) => x.remove());
      if (textOf(c)) return textOf(c);
    }

    let s = el.previousElementSibling;
    while (s) {
      if (/^(LABEL|SPAN|B|STRONG|P|DIV|TD|TH)$/.test(s.tagName) && textOf(s)) {
        const txt = textOf(s);
        if (txt && txt.length < 60) return txt;
      }
      s = s.previousElementSibling;
    }

    let pCol = el.parentElement;
    if (pCol && pCol !== document.body) {
      let prevCol = pCol.previousElementSibling;
      if (prevCol && !prevCol.querySelector("input,select,textarea")) {
        const t = textOf(prevCol);
        if (t && t.length < 60) return t;
      }
    }

    const cell = el.closest("td,th");
    if (cell) {
      const prevCell = cell.previousElementSibling;
      if (prevCell && !prevCell.querySelector("input,select,textarea")) {
        const t = textOf(prevCell);
        if (t) return t;
      }
      const row = cell.parentElement;
      const table = cell.closest("table");
      if (table && row) {
        const thead = table.querySelector("thead");
        if (thead) {
          const idx = Array.prototype.indexOf.call(row.children, cell);
          const th = thead.querySelectorAll("th,td")[idx];
          if (th && textOf(th)) return textOf(th);
        }
      }
    }

    const container = el.closest(".form-group, .form-row, .row, tr, fieldset, div");
    if (container) {
      const labels = Array.from(container.querySelectorAll("label, .control-label, .form-label, span.label, b, strong, th"));
      for (let i = labels.length - 1; i >= 0; i--) {
        const lbl = labels[i];
        if (lbl.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) {
          const t = textOf(lbl);
          if (t && t.length < 60) return t;
        }
      }
    }

    const nameOrId = clean(el.name || el.id || el.title);
    if (/codigo|cod_paciente|codpaciente|txt_codigo/i.test(nameOrId)) return "Codigo:";
    if (/mostrar.*paciente|paciente.*registrado|chk.*registrado/i.test(nameOrId)) return "Mostrar pacientes registrados";
    if (/exterior|num.*ext|no.*ext|vivienda|casa/i.test(nameOrId)) return "*No. Exterior";
    if (/referencia/i.test(nameOrId)) return "Referencia:";
    if (/paterno|primer.*apellido|ape.*pat/i.test(nameOrId)) return "PRIMER APELLIDO";
    if (/materno|segundo.*apellido|ape.*mat/i.test(nameOrId)) return "SEGUNDO APELLIDO";
    if (/documento|num.*doc|dni/i.test(nameOrId)) return "Documento";
    if (/tipo.*doc|tipo.*ident/i.test(nameOrId)) return "Tipo identificación";
    if (/nombre/i.test(nameOrId)) return "Nombre";
    if (/fec.*nac|fecha.*nac/i.test(nameOrId)) return "*Fecha Nacimiento";
    if (/genero|sexo/i.test(nameOrId)) return "Género";
    if (/celular|movil/i.test(nameOrId)) return "*Celular";
    if (/tel.*casa|telefono.*casa/i.test(nameOrId)) return "*Tel. Casa";
    if (/tel.*ofi|telefono.*ofi/i.test(nameOrId)) return "Tel. Oficina";
    if (/email|correo/i.test(nameOrId)) return "*Email";
    if (/calle|direccion/i.test(nameOrId)) return "*Calle";
    if (/recomendad|como.*enter/i.test(nameOrId)) return "*Como se entero:";
    if (/civil|estado.*civ/i.test(nameOrId)) return "*Estado Civil:";
    if (/ocupaci|profesi/i.test(nameOrId)) return "*Ocupación/profesión:";
    if (/escolar|estudio/i.test(nameOrId)) return "*Escolaridad:";
    if (/clasific/i.test(nameOrId)) return "*Clasificación:";
    if (/alerta.*admin/i.test(nameOrId)) return "Alerta administrativa:";
    if (/agenda.*cita|varias.*cita/i.test(nameOrId)) return "Agenda varias citas";
    if (/observaci|nota/i.test(nameOrId)) return "Observaciones:";
    if (/factura/i.test(nameOrId)) return "Va a requerir factura?";
    if (/igual.*direc/i.test(nameOrId)) return "Los datos son iguales a la dirección";
    if (/razon.*soc/i.test(nameOrId)) return "*Razón Social:";

    return clean(el.placeholder || el.title || el.name || el.id);
  }

  function radioGroupLabel(el) {
    const fs = el.closest("fieldset");
    if (fs && fs.querySelector("legend")) {
      const leg = textOf(fs.querySelector("legend"));
      if (leg) return leg;
    }
    const container = el.closest(".form-group, .form-row, .row, tr, div");
    if (container) {
      const lbls = Array.from(container.querySelectorAll("label, .control-label, .form-label, span.label, b, strong"));
      for (const lbl of lbls) {
        if (!lbl.querySelector("input[type=radio]")) {
          const t = textOf(lbl);
          if (t && t.length > 2 && t.length < 80) return t;
        }
      }
    }
    let pCol = el.parentElement;
    while (pCol && pCol !== document.body && !pCol.previousElementSibling) {
      pCol = pCol.parentElement;
    }
    if (pCol && pCol.previousElementSibling) {
      const prev = pCol.previousElementSibling;
      if (!prev.querySelector("input,select,textarea")) {
        const t = textOf(prev);
        if (t && t.length > 2 && t.length < 80) return t;
      }
    }
    const n = (el.name || "").toLowerCase();
    if (/factura/i.test(n)) return "Va a requerir factura?";
    if (/igual.*direc/i.test(n)) return "Los datos son iguales a la dirección";
    if (/agenda.*cita|varias.*cita/i.test(n)) return "Agenda varias citas";
    return el.name || "";
  }

  function radioOptionLabel(r) {
    if (r.parentElement && r.parentElement.tagName.toLowerCase() === "label") {
      const clone = r.parentElement.cloneNode(true);
      clone.querySelectorAll("input").forEach((x) => x.remove());
      const t = textOf(clone);
      if (t) return t;
    }
    if (r.nextSibling && r.nextSibling.textContent) {
      const t = clean(r.nextSibling.textContent);
      if (t) return t;
    }
    if (r.nextElementSibling) {
      const t = clean(r.nextElementSibling.textContent);
      if (t) return t;
    }
    const p = r.closest(".iradio, .icheckbox, .radio, .radio-inline") || r.parentElement;
    if (p) {
      if (p.nextSibling && p.nextSibling.textContent) {
        const t = clean(p.nextSibling.textContent);
        if (t) return t;
      }
      if (p.nextElementSibling) {
        const t = clean(p.nextElementSibling.textContent);
        if (t) return t;
      }
      const pLabel = p.closest("label");
      if (pLabel) {
        const clone = pLabel.cloneNode(true);
        clone.querySelectorAll("input, .iradio, .icheckbox").forEach((x) => x.remove());
        const t = textOf(clone);
        if (t) return t;
      }
    }
    return labelFor(r) || r.value || "";
  }

  function sectionOf(el) {
    const fs = el.closest("fieldset");
    if (fs && fs.querySelector("legend")) return textOf(fs.querySelector("legend"));
    let n = el;
    while (n && n !== document.body) {
      let p = n.previousElementSibling;
      while (p) {
        if (/^H[1-6]$/.test(p.tagName)) return textOf(p);
        const h = p.querySelector && p.querySelector("h1,h2,h3,h4,h5,h6,.panel-title,.card-title,legend");
        if (h) return textOf(h);
        p = p.previousElementSibling;
      }
      n = n.parentElement;
    }
    return "";
  }

  const out = [];
  const hcForm = document.getElementById("hc_form");
  const isAnamnesis = hcForm && visible(hcForm) && Array.from(document.querySelectorAll("h4.text-c, h4, h3, h2"))
    .some((h) => /^\s*(?:1\s*)?ANAMNESIS\s*$/i.test(h.textContent) && visible(h));
  const isExamenClinico = Boolean(hcForm) && Array.from(document.querySelectorAll("h4.text-c, h4, h3, h2, .panel-title"))
    .some((h) => /(?:2\s*)?EXAMEN\s+CL[IÍ]NICO/i.test(h.textContent));
  const anamnesisByName = new Map(isAnamnesis ? anamnesisFields.map((f) => [f.name, f]) : []);
  const seenRadio = new Set();
  const els = document.querySelectorAll("input, select, textarea, [contenteditable='true']");
  let k = 0;
  let examenObsCount = 0;

  for (const el of els) {
    if (out.length >= MAX) break;
    const tag = el.tagName.toLowerCase();
    let type = tag === "input" ? (el.type || "text").toLowerCase() : tag;
    if (el.isContentEditable && tag !== "input" && tag !== "textarea") type = "richtext";
    if (["password", "hidden", "submit", "button", "reset", "image", "file"].includes(type)) continue;
    const anamnesisField = hcForm?.contains(el) ? anamnesisByName.get(el.name) : null;
    const isExamenConditional = isExamenClinico && (
      /^(areg|ameg|aren|amen|areh|ameh|aumentada|disminuida|no\s+caracter[ií]stica|caracter[ií]stica|no\s+receptivo|receptivo):?$/i.test(labelFor(el) || el.name || "") ||
      /describa/i.test(labelFor(el) || el.name || "")
    );
    const isImc = isExamenClinico && /imc/i.test(labelFor(el) || el.name || "");
    const isFacturaField = /factura/i.test(sectionOf(el) || "") || /factura/i.test(el.name || "") || /factura/i.test(el.id || "");
    // Los detalles condicionales, Factura e IMC deben poder proponerse antes de activar su selector.
    if ((el.disabled && !isFacturaField) || (el.readOnly && !isImc && !isFacturaField) || (!visible(el) && !anamnesisField?.dependsOn && !isExamenConditional && !isFacturaField)) continue;

    let key, entry;
    el.setAttribute("data-dentai-id", "tmp");

    if (type === "radio") {
      const g = el.name || "radio-" + k;
      if (seenRadio.has(g)) { el.removeAttribute("data-dentai-id"); continue; }
      seenRadio.add(g);
      const radios = Array.from(document.querySelectorAll('input[type=radio]')).filter((r) => (r.name || "") === (el.name || ""));
      radios.forEach((r) => r.setAttribute("data-dentai-group", g));
      const groupLbl = radioGroupLabel(el) || g;
      entry = {
        tipo: "radio",
        etiqueta: groupLbl,
        opciones: radios.map((r) => radioOptionLabel(r)),
        valorActual: (radios.find((r) => r.checked) || {}).value || "",
      };
      key = "g:" + g;
    } else {
      entry = {
        tipo: type,
        etiqueta: labelFor(el),
        valorActual: type === "checkbox" ? String(el.checked) : type === "richtext" ? textOf(el) : (el.value || "").slice(0, 80),
      };
      if (tag === "select") {
        entry.opciones = Array.from(el.options)
          .map((o) => clean(o.text || o.innerText || o.value))
          .filter((t) => t && !/^::seleccione::$/i.test(t))
          .slice(0, 40);
      }
      key = "e:" + k;
      el.setAttribute("data-dentai-key", key);
    }

    el.removeAttribute("data-dentai-id");
    entry.seccion = sectionOf(el);
    if (anamnesisField) {
      entry.etiqueta = anamnesisField.label;
      entry.contexto = "anamnesis";
      entry.pagina = location.href;
      entry.dependsOn = anamnesisField.dependsOn || "";
    } else if (isExamenClinico) {
      entry.contexto = "examen_clinico";
      entry.pagina = location.href;
      const lbl = labelFor(el) || "";
      // Desambiguar los dos campos "Describa"
      if (/describa/i.test(lbl)) {
        let isResp = /respiraci[oó]n/i.test((el.name || "") + " " + (el.id || ""));
        let isHab = /otros?\s*h[aá]bitos?/i.test((el.name || "") + " " + (el.id || ""));
        if (!isResp && !isHab) {
          let prev = el.closest("tr")?.previousElementSibling;
          while (prev) {
            const ptxt = prev.textContent || "";
            if (/otros?\s+h[aá]bitos?/i.test(ptxt)) { isHab = true; break; }
            if (/respiraci[oó]n/i.test(ptxt)) { isResp = true; break; }
            prev = prev.previousElementSibling;
          }
        }
        if (isResp || /respiraci[oó]n/i.test(entry.seccion)) {
          entry.etiqueta = "Describa (Respiración)";
          entry.dependsOn = "respiracion";
        } else if (isHab || /otros?\s+h[aá]bitos?/i.test(entry.seccion)) {
          entry.etiqueta = "Describa (Otros hábitos)";
          entry.dependsOn = "otros_habitos";
        }
      }
      // Desambiguar Temperatura (Piel y Anexos vs Funciones Vitales)
      if (tag === "select" && /^temperatura$/i.test(lbl.trim())) {
        entry.etiqueta = "Temperatura (Piel y Anexos)";
      }
      // Desambiguar Observación (General / Funciones Vitales vs Conclusión / Final)
      if (/^observaci[oó]n(?:es)?:?$/i.test(lbl.trim())) {
        let isConclusion = /conclusi[oó]n|final/i.test(entry.seccion) ||
                           /conclusi[oó]n|final/i.test((el.name || "") + " " + (el.id || ""));
        if (!isConclusion) {
          const card = el.closest(".card, .panel, fieldset, table, div");
          const cardText = card ? (card.textContent || "").substring(0, 600) : "";
          if (/conclusi[oó]n/i.test(cardText) && !/funciones\s+vitales/i.test(cardText)) {
            isConclusion = true;
          }
        }
        if (!isConclusion && examenObsCount > 0) {
          isConclusion = true;
        }
        examenObsCount++;
        if (isConclusion) {
          entry.etiqueta = "Observación (Conclusión)";
          entry.dependsOn = "conclusion";
        } else {
          entry.etiqueta = "Observación General";
        }
      }
      if (/^areg:?$/i.test(lbl)) { entry.etiqueta = "AREG:"; entry.dependsOn = "apreciacion_general"; }
      if (/^ameg:?$/i.test(lbl)) { entry.etiqueta = "AMEG:"; entry.dependsOn = "apreciacion_general"; }
      if (/^aren:?$/i.test(lbl)) { entry.etiqueta = "AREN:"; entry.dependsOn = "estado_nutricional"; }
      if (/^amen:?$/i.test(lbl)) { entry.etiqueta = "AMEN:"; entry.dependsOn = "estado_nutricional"; }
      if (/^areh:?$/i.test(lbl)) { entry.etiqueta = "AREH:"; entry.dependsOn = "estado_hidratacion"; }
      if (/^ameh:?$/i.test(lbl)) { entry.etiqueta = "AMEH:"; entry.dependsOn = "estado_hidratacion"; }
      if (/^aumentada:?$/i.test(lbl)) { entry.etiqueta = "Aumentada:"; entry.dependsOn = "temperatura_piel"; }
      if (/^disminuida:?$/i.test(lbl)) { entry.etiqueta = "Disminuida:"; entry.dependsOn = "temperatura_piel"; }
      if (/^no\s+caracter[ií]stica:?$/i.test(lbl)) { entry.etiqueta = "No característica:"; entry.dependsOn = "facies"; }
      if (/^caracter[ií]stica:?$/i.test(lbl)) { entry.etiqueta = "Característica:"; entry.dependsOn = "facies"; }
      if (/^no\s+receptivo:?$/i.test(lbl)) { entry.etiqueta = "No receptivo:"; entry.dependsOn = "colaboracion"; }
      if (/^receptivo:?$/i.test(lbl)) { entry.etiqueta = "Receptivo:"; entry.dependsOn = "colaboracion"; }
    }
    entry.key = key;
    entry.name = el.name || "";
    entry.domId = el.id || "";
    entry.placeholder = el.placeholder || "";
    entry.enfocado = document.activeElement === el;
    k++;
    out.push(entry);
  }
  return out;
}

function dentaiFill(items) {
  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  const esc = (s) => (typeof CSS !== "undefined" && CSS.escape) ? CSS.escape(s) : String(s || "").replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  const results = [];
  function visibleAnamnesis(el) {
    if (!el) return false;
    for (let node = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  }

  function setNative(el, v) {
    if (el.disabled) el.disabled = false;
    if (el.readOnly) el.readOnly = false;
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, v);
    else el.value = v;
  }

  function fire(el) {
    el.dispatchEvent(new Event("focus", { bubbles: true }));
    el.dispatchEvent(new Event("keydown", { bubbles: true }));
    el.dispatchEvent(new Event("keypress", { bubbles: true }));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("keyup", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));

    try {
      if (typeof window.jQuery === "function") {
        window.jQuery(el).trigger("input").trigger("change").trigger("blur");
      }
    } catch (e) {}
  }

  function mark(el) {
    const old = el.style.outline;
    el.style.outline = "3px solid #16a34a";
    try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) {}
    setTimeout(() => { el.style.outline = old; }, 2500);
  }

  function labelOf(el) {
    const l = (el.id && document.querySelector('label[for="' + esc(el.id) + '"]')) || el.closest("label");
    return (l ? l.textContent : "") + " " + (el.value || "");
  }

  for (const it of items) {
    try {
      if (it.contexto === "anamnesis" && (it.pagina !== location.href ||
          !Array.from(document.querySelectorAll("h4.text-c")).some((h) => /^\s*(?:1\s*)?ANAMNESIS\s*$/i.test(h.textContent) && visibleAnamnesis(h)))) {
        results.push({ key: it.key, ok: false, motivo: "Abre la misma Anamnesis donde dictaste los datos y vuelve a intentarlo." });
        continue;
      }
      if (it.key && it.key.startsWith("g:")) {
        const g = it.key.slice(2);
        const radios = Array.from(document.querySelectorAll('input[type=radio][data-dentai-group="' + esc(g) + '"]'));
        if (!radios.length) { results.push({ key: it.key, ok: false, motivo: "grupo no encontrado" }); continue; }
        const v = norm(it.valor);
        let hit = radios.find((r) => norm(labelOf(r)).includes(v) || norm(r.value) === v);
        if (!hit) {
          if (/si|yes|true|1/i.test(v)) hit = radios[0];
          else if (/no|false|0/i.test(v)) hit = radios[1] || radios[0];
        }
        if (!hit) { results.push({ key: it.key, ok: false, motivo: "opción no encontrada" }); continue; }
        hit.checked = true;
        hit.click();
        if (hit.parentElement) {
          hit.parentElement.click();
        }
        try {
          if (typeof window.jQuery === "function") {
            window.jQuery(hit).iCheck('check');
            window.jQuery(hit).trigger('ifChecked').trigger('change');
          } else if (typeof window.$ === "function") {
            window.$(hit).iCheck('check');
            window.$(hit).trigger('ifChecked').trigger('change');
          }
        } catch (e) {}
        fire(hit);
        mark(hit.parentElement || hit);
        results.push({ key: it.key, ok: true });
        continue;
      }

      // 1. Buscar por clave data-dentai-key
      let el = it.contexto === "anamnesis"
        ? document.querySelector('#hc_form [name="' + esc(it.name) + '"]')
        : it.key ? document.querySelector('[data-dentai-key="' + esc(it.key) + '"]') : null;

      // 2. Fallback por domId o name
      if (!el && it.contexto !== "anamnesis" && it.domId) el = document.getElementById(it.domId);
      if (!el && it.contexto !== "anamnesis" && it.name) el = document.querySelector(`[name="${esc(it.name)}"]`);

      // 3. Fallback por etiqueta aproximada
      if (!el && it.contexto !== "anamnesis" && it.etiqueta) {
        const targetClean = norm(it.etiqueta);
        const inputs = Array.from(document.querySelectorAll("input, select, textarea"));
        el = inputs.find((inp) => {
          const ph = norm(inp.placeholder || "");
          const nm = norm(inp.name || "");
          const id = norm(inp.id || "");
          return ph === targetClean || nm === targetClean || id === targetClean || (ph && targetClean.includes(ph));
        });
      }

      if (!el) {
        results.push({ key: it.key, ok: false, motivo: `Campo "${it.etiqueta || it.key}" no encontrado en pantalla.` });
        continue;
      }

      const tag = el.tagName.toLowerCase();
      if (it.contexto === "anamnesis") {
        const hidden = !visibleAnamnesis(tag === "select" ? el.parentElement : el);
        const dependency = it.dependsOn && document.querySelector('#hc_form [name="' + esc(it.dependsOn) + '"]');
        if (el.disabled || el.readOnly || hidden || (it.dependsOn && norm(dependency?.value) !== "aplica")) {
          results.push({ key: it.key, ok: false, motivo: "El campo está oculto o bloqueado. Activa su opción Aplica y verifica que sea editable." });
          continue;
        }
      }

      // SELECT / DROPDOWN (Soporte nativo y Select2 de Smile)
      if (tag === "select") {
        const v = norm(it.valor);
        let opt = null;

        // En Anamnesis nunca elegir por coincidencia parcial (1 no debe convertirse en 10).
        if (it.contexto === "anamnesis") {
          opt = Array.from(el.options).find((o) => norm(o.text) === v || norm(o.value) === v);
          if (!opt) {
            results.push({ key: it.key, ok: false, motivo: `Opción "${it.valor}" no encontrada en el selector.` });
            continue;
          }
        }

        // Búsqueda en dos fases para SELECT (evita que "No característica" se seleccione al pedir "Característica"):
        // Fase 1: Coincidencia EXACTA por texto o valor en cualquiera de las opciones
        opt = Array.from(el.options).find((o) => {
          const oText = norm(o.text);
          const oVal = norm(o.value);
          return oText === v || oVal === v;
        });

        // Fase 2: Coincidencia parcial o por patrón clínico (solo si no hubo exacta)
        if (!opt && it.contexto !== "anamnesis") {
          opt = Array.from(el.options).find((o) => {
            const oText = norm(o.text);
            const oVal = norm(o.value);
            if (!oText || oText.startsWith("::")) return false;
            // Si el valor buscado NO empieza con "no " o "sin ", no permitir que coincida con una opción que sí empiece con "no " o "sin "
            if (!v.startsWith("no ") && !v.startsWith("sin ") && (oText.startsWith("no ") || oText.startsWith("sin "))) {
              return false;
            }
            if (/dni/i.test(v) && (/dni/i.test(oText) || /dni/i.test(oVal))) return true;
            return oText.includes(v) || (v.length > 2 && v.includes(oText));
          });
        }

        // Si es DNI (index 0 suele ser ::seleccione::)
        if (!opt && /dni/i.test(v)) {
          opt = Array.from(el.options).find((o) => /dni/i.test(norm(o.text)) || /dni/i.test(norm(o.value))) ||
                (el.options.length > 1 ? el.options[1] : null);
        }

        // Si es Carnet de extranjería
        if (!opt && /extranjer/i.test(v)) {
          opt = Array.from(el.options).find((o) => /extranjer/i.test(norm(o.text)) || /extranjer/i.test(norm(o.value)) || /^ce$/i.test(norm(o.value)));
        }

        // Si es Pasaporte
        if (!opt && /pasaporte/i.test(v)) {
          opt = Array.from(el.options).find((o) => /pasaporte/i.test(norm(o.text)) || /pas/i.test(norm(o.value)));
        }

        // Si es RUC
        if (!opt && /ruc/i.test(v)) {
          opt = Array.from(el.options).find((o) => /ruc/i.test(norm(o.text)) || /ruc/i.test(norm(o.value)));
        }

        // Si es Género
        if (!opt && (/masculino|hombre/i.test(v))) {
          opt = Array.from(el.options).find((o) => /masculino/i.test(o.text) || /^m(asculino)?$/i.test(o.value) || o.value === "1" || o.value === "H");
        }
        if (!opt && (/femenino|mujer/i.test(v))) {
          opt = Array.from(el.options).find((o) => /femenino/i.test(o.text) || /^f(emenino)?$/i.test(o.value) || o.value === "2");
        }

        if (!opt && it.contexto !== "anamnesis") {
          // Último recurso: si el texto coincide con cualquier opción (respetando negaciones)
          opt = Array.from(el.options).find((o) => {
            const oText = norm(o.text);
            if (!v.startsWith("no ") && !v.startsWith("sin ") && (oText.startsWith("no ") || oText.startsWith("sin "))) {
              return false;
            }
            return o.text.trim().length > 1 && oText.includes(v);
          });
        }

        if (opt) {
          el.selectedIndex = opt.index;
          opt.selected = true;
          setNative(el, opt.value);
          el.value = opt.value;
          fire(el);

          // Actualizar contenedor visual Select2 de Smile si existe
          try {
            // Contenedor Select2 adyacente o por atributo data-select2-id
            const s2Container = el.nextElementSibling?.classList?.contains("select2-container")
              ? el.nextElementSibling
              : (el.id ? document.querySelector(`.select2-container[data-select2-id*="${el.id}"]`) : null);
            if (s2Container) {
              const textSpan = s2Container.querySelector(".select2-selection__rendered");
              if (textSpan) {
                textSpan.textContent = opt.text;
                textSpan.title = opt.text;
              }
            }
            // Soporte Select2 v4 ID estándar: select2-[id]-container
            if (el.id) {
              const s2IdSpan = document.getElementById(`select2-${el.id}-container`);
              if (s2IdSpan) {
                s2IdSpan.textContent = opt.text;
                s2IdSpan.title = opt.text;
              }
            }
            if (typeof window.jQuery === "function") {
              window.jQuery(el).val(opt.value).trigger("change");
            } else if (typeof window.$ === "function") {
              window.$(el).val(opt.value).trigger("change");
            }
          } catch (e) {}

          mark(el.nextElementSibling || el);
          results.push({ key: it.key, ok: true });
          continue;
        } else {
          results.push({ key: it.key, ok: false, motivo: `Opción "${it.valor}" no encontrada en el selector.` });
          continue;
        }

      } else if (el.type === "checkbox" || el.type === "radio") {
        const want = /^(true|si|sí|1|marcado)$/i.test(String(it.valor).trim());
        const wrapper = el.closest('[class*="icheckbox"], [class*="iradio"], [class*="custom-control"], .checkbox') || el.parentElement;

        const wasChecked = Boolean(el.checked);
        el.checked = want;
        if (want) el.setAttribute("checked", "checked");
        else el.removeAttribute("checked");

        // 1. Manejo visual de iCheck / Bootstrap de Smile
        if (wrapper) {
          if (want) {
            wrapper.classList.add("checked");
          } else {
            wrapper.classList.remove("checked");
          }
        }

        // 2. Ejecutar plugin jQuery iCheck en el contexto de página de Smile si está presente
        try {
          const scr = document.createElement("script");
          scr.textContent = `(function() {
            try {
              var el = document.querySelector('[data-dentai-key="${esc(it.key)}"]') || (document.getElementById("${esc(el.id || "")}"));
              if (el) {
                var jq = window.jQuery || window.$;
                if (jq && typeof jq.fn.iCheck === "function") {
                  jq(el).iCheck(${want ? "'check'" : "'uncheck'"});
                  jq(el).prop('checked', ${want}).trigger('change');
                } else if (${wasChecked !== want}) {
                  el.checked = ${want};
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }
            } catch (err) {}
          })();`;
          (document.head || document.documentElement).appendChild(scr);
          scr.remove();
        } catch (e) {}

        fire(el);
        try {
          el.dispatchEvent(new Event("ifChanged", { bubbles: true }));
          el.dispatchEvent(new Event(want ? "ifChecked" : "ifUnchecked", { bubbles: true }));
        } catch (e) {}

        mark(wrapper || el);
        results.push({ key: it.key, ok: true });
        continue;
      } else if (el.isContentEditable && tag !== "input" && tag !== "textarea") {
        el.focus();
        document.execCommand("selectAll", false);
        document.execCommand("insertText", false, String(it.valor));
        fire(el);
      } else {
        // Campo tipo fecha (HTML5 input[type="date"] requiere formato YYYY-MM-DD)
        let finalVal = String(it.valor);
        if (el.type === "date") {
          const parts = finalVal.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (parts) {
            finalVal = `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
          }
        }

        // GUARDIA ESTRICTA DE TIPOS: Números solo a numéricos, texto solo a texto
        const etiq = (it.etiqueta || "").toLowerCase();
        if (/nombre|primer\s+apellido|segundo\s+apellido/i.test(etiq)) {
          // Nombres y apellidos NO deben contener números
          finalVal = finalVal.replace(/[0-9]/g, "").trim();
        } else if (/documento|dni|celular|tel|telefono/i.test(etiq) && !/tipo/i.test(etiq)) {
          // Documentos y teléfonos deben ser exclusivamente dígitos numéricos
          finalVal = finalVal.replace(/[^0-9]/g, "").trim();
        }

        // Si es campo de observación o descripción clínica, asegurar primera letra con mayúscula
        if (/areg|ameg|aren|amen|areh|ameh|aumentada|disminuida|describa|observaci|caracter[ií]stica|receptivo/i.test(etiq)) {
          if (finalVal.length > 0) {
            finalVal = finalVal.charAt(0).toUpperCase() + finalVal.slice(1);
          }
        }

        el.focus();
        setNative(el, finalVal);
        el.value = finalVal;
        fire(el);
      }

      mark(el);
      results.push({ key: it.key, ok: true });
    } catch (e) {
      results.push({ key: it.key, ok: false, motivo: String(e && e.message || e) });
    }
  }
  return results;
}

/* ---------- Navegación por voz entre pestañas y módulos de Smile ---------- */
function dentaiNavigate(target) {
  if (!target || typeof target !== "string") return { ok: false, motivo: "Destino vacío" };

  const norm = (s) => String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const targetClean = norm(target);
  if (!targetClean) return { ok: false, motivo: "Destino no válido" };

  // Diccionario oficial de rutas de Smile (Cayetano / CREO)
  const SMILE_URLS = {
    inicio: "/usmile/index.php/admin",
    home: "/usmile/index.php/admin",
    preregistro: "/usmile/index.php/admision/preregistro_control",
    prerregistro: "/usmile/index.php/admision/preregistro_control",
    "pre registro": "/usmile/index.php/admision/preregistro_control",
    "pre rregistro": "/usmile/index.php/admision/preregistro_control",
    "nuevo preregistro": "/usmile/index.php/admision/preregistro_control",
    "nuevo prerregistro": "/usmile/index.php/admision/preregistro_control",
    servicio: "/usmile/index.php/panel/inicio",
    agenda: "/usmile/index.php/agenda/index/admin",
    citas: "/usmile/index.php/agenda/index/admin",
    reporte: "/usmile/index.php/reporte_fallas",
    fallas: "/usmile/index.php/reporte_fallas",
    "reporte de fallas": "/usmile/index.php/reporte_fallas"
  };

  const visible = (el) => {
    try {
      const r = el.getBoundingClientRect();
      const st = window.getComputedStyle(el);
      return (r.width > 0 || r.height > 0) && st.visibility !== "hidden" && st.display !== "none" && st.opacity !== "0";
    } catch (e) {
      return false;
    }
  };

  // 1. Acciones y botones de formulario específicos de Smile (ej: 'Nuevo preregistro', 'Modificar', 'Buscar', 'Guardar', 'Limpiar')
  if (/nuevo|crear/i.test(targetClean)) {
    const btnEntrega = document.getElementById("btn_entrega") ||
      Array.from(document.querySelectorAll("button, .btn, a.btn")).find((b) => visible(b) && /nuevo/i.test(norm(b.textContent || b.value)));
    if (btnEntrega) {
      btnEntrega.scrollIntoView({ block: "center", behavior: "smooth" });
      const prevOutline = btnEntrega.style.outline;
      btnEntrega.style.outline = "3px solid #0d9488";
      setTimeout(() => { btnEntrega.style.outline = prevOutline; }, 2000);
      btnEntrega.click();
      if (typeof window.$ === "function" || typeof window.jQuery === "function") {
        try { (window.$ || window.jQuery)(btnEntrega).trigger("click"); } catch (e) {}
      }
      return { ok: true, matched: "Nuevo preregistro", navigated: true, score: 100 };
    }
  }

  // Botón Guardar / Grabar en el formulario de Smile
  if (/guardar|grabar|salvar/i.test(targetClean)) {
    const btnGuardar = document.getElementById("btn_guardar") ||
      document.getElementById("btn_grabar") ||
      document.getElementById("guardar") ||
      document.querySelector("button[name='guardar'], input[name='guardar'], button[name='grabar'], input[name='grabar']") ||
      Array.from(document.querySelectorAll("button, .btn, input[type='submit'], input[type='button'], a.btn")).find((b) => visible(b) && /^(?:guardar|grabar)$/i.test(norm(b.textContent || b.value))) ||
      Array.from(document.querySelectorAll("button, .btn, input[type='submit'], a.btn")).find((b) => visible(b) && /guardar|grabar/i.test(norm(b.textContent || b.value)));

    if (btnGuardar) {
      btnGuardar.scrollIntoView({ block: "center", behavior: "smooth" });
      const prevOutline = btnGuardar.style.outline;
      btnGuardar.style.outline = "3px solid #0d9488";
      setTimeout(() => { btnGuardar.style.outline = prevOutline; }, 2000);
      btnGuardar.click();
      if (typeof window.$ === "function" || typeof window.jQuery === "function") {
        try { (window.$ || window.jQuery)(btnGuardar).trigger("click"); } catch (e) {}
      }
      return { ok: true, matched: "Guardar", navigated: true, score: 100 };
    }
  }

  // Botón Limpiar / Cancelar / Reset en el formulario de Smile
  if (/limpiar|borrar|reset/i.test(targetClean)) {
    const btnLimpiar = document.getElementById("btn_limpiar") ||
      document.getElementById("btn_cancelar") ||
      document.getElementById("limpiar") ||
      document.querySelector("button[name='limpiar'], input[name='limpiar'], input[type='reset']") ||
      Array.from(document.querySelectorAll("button, .btn, input[type='reset'], input[type='button'], a.btn")).find((b) => visible(b) && /^(?:limpiar|reset)$/i.test(norm(b.textContent || b.value))) ||
      Array.from(document.querySelectorAll("button, .btn, a.btn")).find((b) => visible(b) && /limpiar/i.test(norm(b.textContent || b.value)));

    if (btnLimpiar) {
      btnLimpiar.scrollIntoView({ block: "center", behavior: "smooth" });
      const prevOutline = btnLimpiar.style.outline;
      btnLimpiar.style.outline = "3px solid #e11d48";
      setTimeout(() => { btnLimpiar.style.outline = prevOutline; }, 2000);
      btnLimpiar.click();
      if (typeof window.$ === "function" || typeof window.jQuery === "function") {
        try { (window.$ || window.jQuery)(btnLimpiar).trigger("click"); } catch (e) {}
      }
      return { ok: true, matched: "Limpiar", navigated: true, score: 100 };
    }
  }

  if (/modificar|editar/i.test(targetClean)) {
    const isExamen = Array.from(document.querySelectorAll("h4.text-c, h4, h3, h2, .panel-title"))
      .some((h) => /(?:2\s*)?EXAMEN\s+CL[IÍ]NICO/i.test(h.textContent));
    const isLesionBtn = (el) => el && (el.id === "btn_editar_lesion_ant" || /lesion/i.test(el.id || "") || el.closest("#renglon_lesiones_ant_btn"));

    const btnMod = document.getElementById("btn_modificar") ||
      (!isExamen ? document.getElementById("btn_editar") : null) ||
      document.getElementById("modificar") ||
      document.querySelector("button[name='modificar'], input[name='modificar'], [name*='modificar']") ||
      Array.from(document.querySelectorAll("button, .btn, input[type='button'], input[type='submit'], a.btn, a")).find((b) => visible(b) && !isLesionBtn(b) && /^\s*modificar\s*$/i.test(norm(b.textContent || b.value))) ||
      Array.from(document.querySelectorAll("button, .btn, input[type='button'], input[type='submit'], a")).find((b) => visible(b) && !isLesionBtn(b) && /modificar|editar/i.test(norm(b.textContent || b.value)));

    if (btnMod) {
      btnMod.scrollIntoView({ block: "center", behavior: "smooth" });
      const prevOutline = btnMod.style.outline;
      btnMod.style.outline = "3px solid #0071e3";
      setTimeout(() => { btnMod.style.outline = prevOutline; }, 2000);
      try {
        if (btnMod.getAttribute("onclick")) {
          new Function(btnMod.getAttribute("onclick")).call(btnMod);
        }
      } catch (e) {}
      btnMod.click();
      if (typeof window.$ === "function" || typeof window.jQuery === "function") {
        try { (window.$ || window.jQuery)(btnMod).trigger("click"); } catch (e) {}
      }
      return { ok: true, matched: "Modificar", navigated: true, score: 100 };
    }
  }

  if (/buscar|busca/i.test(targetClean)) {
    const btnBuscar = document.getElementById("btn_buscar") ||
      document.getElementById("buscar") ||
      document.querySelector("input[name*='buscar'], button[name*='buscar'], [name*='buscar']") ||
      Array.from(document.querySelectorAll("button, .btn, input[type='button'], input[type='submit'], a, div.btn")).find((b) => visible(b) && /^(?:buscar|busca)$/i.test(norm(b.textContent || b.value))) ||
      Array.from(document.querySelectorAll("button, .btn, input[type='button'], input[type='submit'], a")).find((b) => visible(b) && /buscar|busca/i.test(norm(b.textContent || b.value)));

    if (btnBuscar) {
      btnBuscar.scrollIntoView({ block: "center", behavior: "smooth" });
      const prevOutline = btnBuscar.style.outline;
      btnBuscar.style.outline = "3px solid #0071e3";
      setTimeout(() => { btnBuscar.style.outline = prevOutline; }, 2000);
      try {
        if (btnBuscar.getAttribute("onclick")) {
          new Function(btnBuscar.getAttribute("onclick")).call(btnBuscar);
        }
      } catch (e) {}
      btnBuscar.click();
      if (typeof window.$ === "function" || typeof window.jQuery === "function") {
        try { (window.$ || window.jQuery)(btnBuscar).trigger("click"); } catch (e) {}
      }
      return { ok: true, matched: "Buscar", navigated: true, score: 100 };
    }
  }

  // Selectores prioritarios: buscar primero enlaces <a> y botones
  const selectors = [
    ".navbar a", ".nav-pills a", ".nav-tabs a", ".nav a", "nav a",
    "[role='tab']", "[role='menuitem']", "[data-toggle='tab']", "[data-bs-toggle='tab']",
    ".sidebar a", ".menu a", "a", "button",
    ".dropdown-menu a", ".dropdown-menu li > a", "ul.dropdown-menu a", ".dropdown-toggle",
    "[data-toggle='dropdown']", "[data-bs-toggle='dropdown']",
    ".nav-tabs li", ".nav-pills li", ".nav li", ".sidebar li", ".menu li", "[onclick]"
  ];

  // Normalizar variaciones fonéticas comunes de Google Web Speech para menús de Smile:
  let cleanTarget = targetClean
    .replace(/\bpre\s*r+egistro\b/gi, "preregistro")
    .replace(/\bde\s+talle\b/gi, "detalle")
    .replace(/\boperacione\b/gi, "operaciones");

  // Soporte para comandos compuestos jerárquicos: "X en Y", "X de Y", "X dentro de Y"
  let subTarget = "";
  let parentTarget = "";

  // Desambiguación específica de REPORTES (Reportes de Mantenimiento vs Reportes de Caja)
  if (/\b(?:detalle\s+equipos?|detalle\s+de\s+equipos?)\b/i.test(cleanTarget)) {
    subTarget = "detalle equipos";
    parentTarget = "mantenimiento";
  } else if (/\breportes?\b/i.test(cleanTarget) && /\bmantenimiento\b/i.test(cleanTarget)) {
    subTarget = "reportes";
    parentTarget = "mantenimiento";
  } else if (/\breportes?\b/i.test(cleanTarget) && /\bcaja\b/i.test(cleanTarget)) {
    subTarget = "reportes";
    parentTarget = "caja";
  } else {
    const compMatch = cleanTarget.match(/^(.+?)\s+(?:en|dentro\s+de|de|del)\s+(.+)$/i);
    if (compMatch) {
      subTarget = compMatch[1].trim();
      parentTarget = compMatch[2].trim();
    }
  }

  const elements = Array.from(document.querySelectorAll(selectors.join(",")));
  let bestEl = null;
  let bestScore = -1;
  let bestMatchedText = "";

  const targetNoSpace = cleanTarget.replace(/\s+/g, "");
  const subTargetNoSpace = subTarget ? subTarget.replace(/\s+/g, "") : "";
  const parentTargetNoSpace = parentTarget ? parentTarget.replace(/\s+/g, "") : "";

  for (const el of elements) {
    // Si está en la barra de navegación o en un menú desplegable, evaluarlo incluso si el dropdown está cerrado
    const isMenuElement = !!el.closest(".navbar, nav, .nav, .menu, .dropdown-menu, .dropdown, header, .sidebar, [role='menubar'], [role='menu']");
    if (!visible(el) && !isMenuElement) continue;

    const rawText = (el.innerText || el.textContent || "").trim();
    const cleanText = norm(rawText).replace(/\bpre\s*r+egistro\b/gi, "preregistro");
    const titleText = norm(el.getAttribute("title") || "").replace(/\bpre\s*r+egistro\b/gi, "preregistro");
    const ariaText = norm(el.getAttribute("aria-label") || "").replace(/\bpre\s*r+egistro\b/gi, "preregistro");
    const idText = norm(el.id || "");

    const candidates = [
      { text: cleanText, weight: 1.0, raw: rawText },
      { text: titleText, weight: 0.9, raw: el.getAttribute("title") },
      { text: ariaText, weight: 0.9, raw: el.getAttribute("aria-label") },
      { text: idText, weight: 0.6, raw: el.id }
    ];

    for (const c of candidates) {
      if (!c.text) continue;

      const candNoSpace = c.text.replace(/\s+/g, "");
      let score = 0;

      // 1. Coincidencia jerárquica compuesta ("X en Y")
      if (subTarget && parentTarget) {
        const matchesSub = c.text === subTarget || (candNoSpace && candNoSpace === subTargetNoSpace) ||
                           c.text.startsWith(subTarget + " ") || c.text.includes(subTarget);
        if (matchesSub) {
          const parentContainer = el.closest(".dropdown, .dropdown-submenu, li.dropdown, li, .btn-group");
          const parentText = norm(parentContainer ? (parentContainer.querySelector("a, button, .dropdown-toggle")?.textContent || parentContainer.textContent || "") : "");
          // Revisar todos los ancestros hacia arriba en el menú
          let curr = el.parentElement;
          let allAncestorsText = parentText;
          while (curr && curr !== document.body) {
            allAncestorsText += " " + norm(curr.querySelector("a, button, .dropdown-toggle")?.textContent || curr.textContent || "");
            curr = curr.parentElement;
          }
          if (parentText.includes(parentTarget) || allAncestorsText.includes(parentTarget) ||
              (parentTargetNoSpace.length >= 4 && allAncestorsText.replace(/\s+/g, "").includes(parentTargetNoSpace))) {
            score = 150;
          } else {
            score = 50;
          }
        }
      }

      // 2. Coincidencia estándar si no hubo match jerárquico
      if (score === 0) {
        if (c.text === cleanTarget || (candNoSpace && candNoSpace === targetNoSpace)) {
          score = 100;
        } else if (candNoSpace.startsWith(targetNoSpace) || candNoSpace.endsWith(targetNoSpace)) {
          score = 90;
        } else if (c.text.startsWith(cleanTarget + " ") || c.text.endsWith(" " + cleanTarget)) {
          score = 85;
        } else if (c.text.includes(cleanTarget) || (targetNoSpace.length >= 4 && candNoSpace.includes(targetNoSpace))) {
          const diff = Math.abs(c.text.length - cleanTarget.length);
          score = Math.max(50, 85 - diff);
        } else if ((cleanTarget.includes(c.text) || (candNoSpace.length >= 4 && targetNoSpace.includes(candNoSpace))) && c.text.length >= 3) {
          score = 65;
        }
      }

      if (score > 0) {
        // Bonificación extra para enlaces <a> directos
        if (el.tagName.toLowerCase() === "a") {
          score += 20;
        }
        if (el.getAttribute("role") === "tab" || el.getAttribute("data-toggle") === "tab" || el.classList.contains("nav-link")) {
          score += 15;
        }
        if (el.closest("nav, .nav, .tabs, .sidebar, .menu, header, .navbar")) {
          score += 10;
        }

        score *= c.weight;

        if (score > bestScore) {
          bestScore = score;
          bestEl = el;
          bestMatchedText = c.raw || target;
        }
      }
    }
  }

  // Si no se encontró en el DOM, revisar si coincide directamente con el catálogo de Smile
  if (!bestEl || bestScore < 40) {
    for (const [key, path] of Object.entries(SMILE_URLS)) {
      const keyNoSpace = key.replace(/\s+/g, "");
      if (cleanTarget === key || targetNoSpace === keyNoSpace || targetNoSpace.includes(keyNoSpace) || keyNoSpace.includes(targetNoSpace)) {
        const directUrl = window.location.origin + path;
        setTimeout(() => {
          window.location.href = directUrl;
        }, 50);
        return { ok: true, matched: key.charAt(0).toUpperCase() + key.slice(1), url: directUrl, navigated: true, score: 90 };
      }
    }
    return { ok: false, motivo: `No se encontró pestaña o menú que coincida con "${target}".` };
  }

  try {
    // Resolver el elemento de enlace <a> (si bestEl es un <li> o contenedor, extraer el <a> interno)
    const link = bestEl.tagName.toLowerCase() === "a" ? bestEl : (bestEl.querySelector("a") || bestEl.closest("a"));
    const targetEl = link || bestEl;

    // 1. Cerrar cualquier otro menú desplegable abierto previamente para que no se superpongan
    const openMenus = document.querySelectorAll(".dropdown.open, .dropdown.show, .dropdown-submenu.open, .dropdown-submenu.show, li.open, li.show");
    for (const om of openMenus) {
      if (om === targetEl || om.contains(targetEl) || targetEl.contains(om)) continue;
      om.classList.remove("open", "show");
      const subM = om.querySelector(".dropdown-menu, ul");
      if (subM && !subM.contains(targetEl)) {
        subM.style.display = "";
        subM.style.visibility = "";
      }
    }

    // Detectar si el elemento seleccionado es un botón/pestaña desplegable (Dropdown)
    const isDropdownToggle = targetEl.classList.contains("dropdown-toggle") ||
                             targetEl.getAttribute("data-toggle") === "dropdown" ||
                             targetEl.getAttribute("data-bs-toggle") === "dropdown" ||
                             !!(targetEl.parentElement && (targetEl.parentElement.classList.contains("dropdown") || targetEl.parentElement.classList.contains("dropdown-submenu") || targetEl.parentElement.querySelector(".dropdown-menu"))) ||
                             !!targetEl.querySelector(".caret, [class*='caret'], [class*='arrow'], [class*='fa-caret']");

    // Si el elemento está dentro de un menú desplegable, abrir primero todos los dropdowns ancestros
    let ancestor = targetEl.parentElement;
    while (ancestor && ancestor !== document.body) {
      if (ancestor.classList.contains("dropdown") || ancestor.classList.contains("dropdown-submenu") || ancestor.tagName.toLowerCase() === "li") {
        ancestor.classList.add("open", "show");
        const m = ancestor.querySelector(".dropdown-menu, ul");
        if (m) {
          m.style.display = "block";
          m.style.visibility = "visible";
          m.style.opacity = "1";
        }
      }
      ancestor = ancestor.parentElement;
    }

    targetEl.scrollIntoView({ block: "center", behavior: "smooth" });

    const prevOutline = targetEl.style.outline;
    targetEl.style.outline = "3px solid #0d9488";
    setTimeout(() => { targetEl.style.outline = prevOutline; }, 2500);

    // CASO A: Si el usuario pidió abrir la pestaña desplegable (ej: "Patología", "Mantenimiento", "Entrega de materiales")
    if (isDropdownToggle) {
      const parentContainer = targetEl.closest(".dropdown, .dropdown-submenu, li, .btn-group") || targetEl.parentElement;
      if (parentContainer) {
        parentContainer.classList.add("open", "show");
        targetEl.setAttribute("aria-expanded", "true");
        const menu = parentContainer.querySelector(".dropdown-menu, ul");
        if (menu) {
          menu.style.display = "block";
          menu.style.visibility = "visible";
          menu.style.opacity = "1";
        }
      }

      // Ejecutar toggle en jQuery / Bootstrap si está disponible
      if (typeof window.$ === "function" || typeof window.jQuery === "function") {
        try {
          const jq = window.$ || window.jQuery;
          jq(targetEl).dropdown("toggle");
          if (parentContainer) jq(parentContainer).addClass("open show");
        } catch (e) {}
      }

      // Disparar eventos de mouse (hover y clic) para abrir el menú
      const mouseOpts = { bubbles: true, cancelable: true, view: window };
      targetEl.dispatchEvent(new MouseEvent("mouseenter", mouseOpts));
      targetEl.dispatchEvent(new MouseEvent("mouseover", mouseOpts));
      targetEl.dispatchEvent(new MouseEvent("mousedown", mouseOpts));
      targetEl.dispatchEvent(new MouseEvent("mouseup", mouseOpts));
      targetEl.dispatchEvent(new MouseEvent("click", mouseOpts));
      if (typeof targetEl.click === "function") {
        try { targetEl.click(); } catch (e) {}
      }

      // Extraer las opciones disponibles dentro de este dropdown
      const subOptions = [];
      if (parentContainer) {
        const optionEls = parentContainer.querySelectorAll(".dropdown-menu a, .dropdown-menu li > a");
        for (const optEl of optionEls) {
          const optTxt = (optEl.innerText || optEl.textContent || "").trim();
          if (optTxt && !subOptions.includes(optTxt)) {
            subOptions.push(optTxt);
          }
        }
      }

      return {
        ok: true,
        matched: bestMatchedText,
        isDropdown: true,
        options: subOptions,
        score: Math.round(bestScore)
      };
    }

    // CASO B: Si es un elemento con URL o acción directa
    // Obtener la URL del enlace
    let targetUrl = null;
    if (link) {
      const rawHref = link.getAttribute("href") || link.href;
      if (rawHref && rawHref !== "#" && !rawHref.startsWith("javascript:void") && !rawHref.startsWith("javascript:;")) {
        try {
          targetUrl = new URL(rawHref, window.location.href).href;
        } catch (e) {
          targetUrl = link.href || rawHref;
        }
      }
    }

    // Si aún no hay URL, buscar en el catálogo conocido de Smile
    if (!targetUrl) {
      for (const [key, path] of Object.entries(SMILE_URLS)) {
        if (targetClean === key || targetClean.includes(key) || norm(bestMatchedText).includes(key)) {
          targetUrl = window.location.origin + path;
          break;
        }
      }
    }

    // 1. Ejecutar onclick inline de Smile si existe (ej: sessionStorage.setItem('title', 'SMILE - Inicio'))
    try {
      if (link && link.getAttribute("onclick")) {
        const code = link.getAttribute("onclick");
        if (code) {
          try { new Function(code).call(link); } catch (e) {}
        }
      }
    } catch (e) {}

    // 2. Disparar eventos de mouse en el enlace
    const mouseOpts = { bubbles: true, cancelable: true, view: window };
    targetEl.dispatchEvent(new MouseEvent("mouseenter", mouseOpts));
    targetEl.dispatchEvent(new MouseEvent("mousedown", mouseOpts));
    targetEl.dispatchEvent(new MouseEvent("mouseup", mouseOpts));
    targetEl.dispatchEvent(new MouseEvent("click", mouseOpts));
    if (typeof targetEl.click === "function") {
      targetEl.click();
    }

    // 3. Soporte jQuery / Bootstrap tabs de Smile
    if (typeof window.$ === "function" || typeof window.jQuery === "function") {
      try {
        const jq = window.$ || window.jQuery;
        jq(targetEl).trigger("click");
        if (typeof jq(targetEl).tab === "function") {
          jq(targetEl).tab("show");
        }
      } catch (e) {}
    }

    // 4. Si tiene URL de navegación, navegar directamente en la página
    if (targetUrl) {
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 50);
      return { ok: true, matched: bestMatchedText, url: targetUrl, navigated: true, score: Math.round(bestScore) };
    }

    return { ok: true, matched: bestMatchedText, score: Math.round(bestScore) };
  } catch (err) {
    return { ok: false, motivo: err.message };
  }
}

/* ---------- Descubrir pestañas visibles en la página actual ---------- */
function dentaiListTabs() {
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const visible = (el) => {
    try {
      const r = el.getBoundingClientRect();
      const st = window.getComputedStyle(el);
      return (r.width > 0 || r.height > 0) && st.visibility !== "hidden" && st.display !== "none";
    } catch (e) {
      return false;
    }
  };
  const list = [];
  const els = document.querySelectorAll("[role='tab'], .nav-tabs a, .nav-tabs button, .sidebar a, nav a, .navbar a, .menu a, .nav-link, .dropdown-menu a");
  for (const el of els) {
    const inNav = !!el.closest("nav, .navbar, .menu, .dropdown-menu");
    if (!visible(el) && !inNav) continue;
    const txt = norm(el.innerText || el.textContent);
    if (txt && txt.length < 35 && !list.includes(txt)) {
      list.push(txt);
    }
  }
  return list.slice(0, 25);
}

/* ---------- Desplazamiento por voz (Scroll Manos Libres) ---------- */
function dentaiScroll(dir, amount) {
  const step = (amount && typeof amount === "number") ? amount : 380;
  const delta = (dir === "up" || dir === -1) ? -step : step;

  // 1. Desplazar la ventana principal suavemente
  window.scrollBy({ top: delta, left: 0, behavior: "smooth" });

  // 2. Desplazar también contenedores internos de Smile si tienen barra de desplazamiento
  const scrollables = document.querySelectorAll("div, main, section, form, article, .content-wrapper, .modal-body, .panel-body, .table-responsive");
  for (const c of scrollables) {
    if (c.scrollHeight > c.clientHeight + 40) {
      const st = window.getComputedStyle(c);
      if (st.overflowY === "auto" || st.overflowY === "scroll") {
        c.scrollBy({ top: delta, left: 0, behavior: "smooth" });
      }
    }
  }

  return { ok: true, delta: delta };
}

/* ---------- Desplazamiento directo a secciones del formulario ---------- */
function dentaiScrollToSection(sectionName) {
  if (!sectionName) return false;
  const norm = (s) => String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const target = norm(sectionName);

  let targetPattern = null;
  if (/identificaci/i.test(target)) {
    targetPattern = /identificaci/i;
  } else if (/contacto/i.test(target)) {
    targetPattern = /contacto/i;
  } else if (/direcci/i.test(target)) {
    targetPattern = /direcci/i;
  } else if (/factura/i.test(target)) {
    targetPattern = /factura/i;
  } else if (/otro/i.test(target)) {
    targetPattern = /otro/i;
  }

  if (!targetPattern) return false;

  // Si pide ir a Datos de Identificación, está al inicio del formulario
  if (/identificaci/i.test(target)) {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    const scrollables = document.querySelectorAll("div, main, section, form, article, .content-wrapper, .modal-body, .panel-body");
    for (const c of scrollables) {
      if (c.scrollHeight > c.clientHeight + 40) {
        c.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      }
    }
  }

  // 1. Buscar en encabezados limpios (H1-H6, legend, panel-title, card-title, card-header, box-title)
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6, legend, .panel-title, .card-title, .card-header, .box-title"));
  let hit = headings.find((h) => {
    const t = norm(h.textContent);
    return t.length >= 3 && t.length <= 45 && targetPattern.test(t);
  });

  // 2. Si no se encontró en encabezados, buscar en etiquetas y textos destacados
  if (!hit) {
    const labels = Array.from(document.querySelectorAll("strong, b, .control-label, label, div.card-header"));
    hit = labels.find((l) => {
      const t = norm(l.textContent);
      return l.children.length <= 2 && t.length >= 3 && t.length <= 40 && targetPattern.test(t);
    });
  }

  // 3. Fallback: buscar el primer input o control representativo de esa sección
  if (!hit) {
    if (/identificaci/i.test(target)) {
      hit = document.querySelector('input[name*="doc"], input[name*="dni"], [data-dentai-key="e:0"]');
    } else if (/contacto/i.test(target)) {
      hit = document.querySelector('input[name*="celular"], input[name*="movil"], input[name*="email"], input[name*="correo"]');
    } else if (/direcci/i.test(target)) {
      hit = document.querySelector('input[name*="calle"], input[name*="direccion"], input[name*="ext"]');
    } else if (/factura/i.test(target)) {
      hit = document.querySelector('[data-dentai-group*="factura"], input[name*="factura"], [data-dentai-group*="FACTURA"]');
    } else if (/otro/i.test(target)) {
      hit = document.querySelector('select[name="RECOMENDADOR"], [name*="RECOMENDADOR"], select[name*="CIVIL"]');
    }
  }

  if (hit) {
    const container = hit.closest(".form-group, .row, .panel, .card, fieldset") || hit;
    container.scrollIntoView({ block: "center", behavior: "smooth" });
    const old = container.style.outline;
    container.style.outline = "2px solid #0071e3";
    setTimeout(() => { container.style.outline = old; }, 1800);
    return true;
  }

  return false;
}

/* ========================================================
   SELECCIÓN Y APERTURA DE PACIENTES EN TABLA DE PREREGISTRO
   Permite seleccionar por Código, DNI, Nombre o Fila ("cuadrito azul"),
   y opcionalmente abrir directamente en modo Modificar.
   ======================================================== */
function dentaiSelectPatientRow(criterion, action) {
  try {
    const norm = (s) => String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const visible = (el) => {
      try {
        const r = el.getBoundingClientRect();
        const st = window.getComputedStyle(el);
        return (r.width > 0 || r.height > 0) && st.visibility !== "hidden" && st.display !== "none";
      } catch (e) {
        return false;
      }
    };

    // 1. Normalizar criterio de búsqueda
    let searchType = "query";
    let searchValue = "";

    if (criterion && typeof criterion === "object") {
      searchType = criterion.type || "query";
      searchValue = norm(criterion.value);
    } else {
      searchValue = norm(criterion);
    }

    if (!searchValue) {
      return { ok: false, motivo: "Criterio de búsqueda vacío." };
    }

    // 2. Localizar tablas en la página de Smile
    const tables = Array.from(document.querySelectorAll("table, .table, [role='grid']"));
    if (!tables.length) {
      return { ok: false, motivo: "No se encontró ninguna tabla de pacientes en pantalla." };
    }

    let targetRow = null;
    let targetPatient = null;
    let targetIndex = -1;

    // Detectar si busca por fila numérica (ej: fila 1, fila 2, primer paciente)
    const isRowIndex = searchType === "fila" || searchType === "index" || /\bfila\s*\d+\b/i.test(searchValue) || /^(?:primer|segund|tercer)/i.test(searchValue);
    let requestedRowIdx = -1;
    if (isRowIndex) {
      const matchIdx = searchValue.match(/(\d+)/);
      if (matchIdx) requestedRowIdx = parseInt(matchIdx[1], 10);
      else if (/primer/i.test(searchValue)) requestedRowIdx = 1;
      else if (/segund/i.test(searchValue)) requestedRowIdx = 2;
      else if (/tercer/i.test(searchValue)) requestedRowIdx = 3;
    }

    for (const table of tables) {
      if (!visible(table)) continue;

      // Mapear encabezados de columna
      const headers = Array.from(table.querySelectorAll("thead th, thead td, tr:first-child th"));
      let colCod = -1, colNom = -1, colDni = -1, colCel = -1, colFec = -1;
      headers.forEach((h, idx) => {
        const ht = norm(h.textContent);
        if (/cod|codigo/i.test(ht)) colCod = idx;
        else if (/nombre|paciente/i.test(ht)) colNom = idx;
        else if (/dni|doc/i.test(ht)) colDni = idx;
        else if (/celular|movil|tel/i.test(ht)) colCel = idx;
        else if (/fecha|nacimiento/i.test(ht)) colFec = idx;
      });

      // Obtener filas de datos (ignorar encabezados)
      let rows = Array.from(table.querySelectorAll("tbody tr"));
      if (!rows.length) {
        rows = Array.from(table.querySelectorAll("tr"));
      }
      rows = rows.filter((r) => !r.closest("thead") && r.querySelectorAll("td").length >= 2);

      let dataRowCounter = 0;
      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const row = rows[rIdx];
        if (!visible(row)) continue;
        const cells = Array.from(row.querySelectorAll("td, th"));
        if (cells.length < 2) continue;

        dataRowCounter++;

        const cellTexts = cells.map((c) => (c.textContent || "").trim());
        const rowNorm = norm(cellTexts.join(" "));

        const codText = colCod >= 0 && cells[colCod] ? cells[colCod].textContent.trim() : (cells[1] ? cells[1].textContent.trim() : "");
        const nomText = colNom >= 0 && cells[colNom] ? cells[colNom].textContent.trim() : (cells[2] ? cells[2].textContent.trim() : "");
        const dniText = colDni >= 0 && cells[colDni] ? cells[colDni].textContent.trim() : (cellTexts.find((t) => /^\d{8}$/.test(t.replace(/\D/g, ""))) || "");
        const celText = colCel >= 0 && cells[colCel] ? cells[colCel].textContent.trim() : "";
        const fecText = colFec >= 0 && cells[colFec] ? cells[colFec].textContent.trim() : "";

        const cleanCod = norm(codText);
        const cleanNom = norm(nomText);
        const cleanDni = dniText.replace(/\D/g, "");

        let isMatch = false;

        // Comprobación de coincidencia según el criterio
        if (isRowIndex && requestedRowIdx > 0) {
          if (dataRowCounter === requestedRowIdx) isMatch = true;
        } else if (searchType === "codigo" || /^\d{1,6}$/.test(searchValue)) {
          if (cleanCod === searchValue) {
            isMatch = true;
          } else {
            const re = new RegExp(`\\b${searchValue}\\b`);
            if (re.test(cleanCod) || re.test(rowNorm)) {
              isMatch = true;
            }
          }
        } else if (searchType === "dni" || /^\d{8}$/.test(searchValue)) {
          if (cleanDni === searchValue || rowNorm.includes(searchValue)) {
            isMatch = true;
          }
        } else if (searchType === "nombre" || /[a-z]/i.test(searchValue)) {
          const words = searchValue.split(/\s+/).filter((w) => w.length >= 2);
          if (words.length > 0) {
            const allInNom = words.every((w) => cleanNom.includes(w) || rowNorm.includes(w));
            if (allInNom) isMatch = true;
          }
        } else {
          if (rowNorm.includes(searchValue)) isMatch = true;
        }

        if (isMatch) {
          targetRow = row;
          targetIndex = dataRowCounter;
          targetPatient = {
            codigo: codText,
            nombre: nomText,
            dni: cleanDni,
            celular: celText,
            fechaNac: fecText,
            rowIndex: dataRowCounter
          };
          break;
        }
      }

      if (targetRow) break;
    }

    if (!targetRow) {
      return { ok: false, motivo: `No se encontró al paciente con criterio "${searchValue}" en la tabla.` };
    }

    // 3. Scroll suave hasta la fila encontrada
    targetRow.scrollIntoView({ block: "center", behavior: "smooth" });

    // 4. Resaltado visual en Smile (outline azul + pulso de fondo)
    const oldOutline = targetRow.style.outline;
    const oldBg = targetRow.style.backgroundColor;
    targetRow.style.outline = "3px solid #0071e3";
    targetRow.style.backgroundColor = "rgba(0, 113, 227, 0.18)";
    setTimeout(() => {
      targetRow.style.outline = oldOutline;
      targetRow.style.backgroundColor = oldBg;
    }, 3500);

    // 5. SELECCIÓN DE LA FILA (Activar el cuadrito azul)
    const cells = Array.from(targetRow.querySelectorAll("td, th"));
    const firstCell = cells[0];

    // A. Checkbox o radio en la fila o primera celda
    const inputSelector = targetRow.querySelector("input[type='checkbox'], input[type='radio']") || (firstCell && firstCell.querySelector("input"));
    if (inputSelector) {
      inputSelector.checked = true;
      inputSelector.click();
      try {
        inputSelector.dispatchEvent(new Event("change", { bubbles: true }));
        inputSelector.dispatchEvent(new Event("input", { bubbles: true }));
      } catch (e) {}
    }

    // B. Elementos interactivos en la primera celda (cuadrito azul estilizado en Smile)
    if (firstCell) {
      const clickables = Array.from(firstCell.querySelectorAll("a, button, [role='checkbox'], [role='radio'], span, div, i"));
      clickables.forEach((c) => {
        try { c.click(); } catch (e) {}
      });
      firstCell.click();
      try { firstCell.dispatchEvent(new Event("click", { bubbles: true })); } catch (e) {}
    }

    // C. Clic en la fila completa (tr)
    targetRow.click();
    try { targetRow.dispatchEvent(new Event("click", { bubbles: true })); } catch (e) {}

    // D. Soporte para jQuery en Smile
    if (typeof window.jQuery === "function" || typeof window.$ === "function") {
      const jq = window.jQuery || window.$;
      try {
        jq(targetRow).trigger("click");
        if (firstCell) jq(firstCell).trigger("click");
        if (inputSelector) jq(inputSelector).prop("checked", true).trigger("change").trigger("click");
      } catch (e) {}
    }

    // 6. Si se solicitó la acción "modificar" o "abrir", presionar directamente el botón Modificar
    if (action === "modificar" || action === "abrir") {
      setTimeout(() => {
        const btnMod = document.getElementById("btn_modificar") ||
          document.getElementById("btn_editar") ||
          document.getElementById("modificar") ||
          document.querySelector("button[name='modificar'], input[name='modificar'], [name*='modificar']") ||
          Array.from(document.querySelectorAll("button, .btn, input[type='button'], a.btn, a")).find((b) => {
            const t = norm(b.textContent || b.value || "");
            return /^\s*modificar\s*$/i.test(t);
          }) ||
          Array.from(document.querySelectorAll("button, .btn, a")).find((b) => {
            const t = norm(b.textContent || b.value || "");
            return /modificar|editar/i.test(t);
          });

        if (btnMod) {
          btnMod.scrollIntoView({ block: "center", behavior: "smooth" });
          const prevOut = btnMod.style.outline;
          btnMod.style.outline = "3px solid #0071e3";
          setTimeout(() => { btnMod.style.outline = prevOut; }, 2000);
          try {
            if (btnMod.getAttribute("onclick")) {
              new Function(btnMod.getAttribute("onclick")).call(btnMod);
            }
          } catch (e) {}
          btnMod.click();
          if (typeof window.jQuery === "function" || typeof window.$ === "function") {
            try { (window.jQuery || window.$)(btnMod).trigger("click"); } catch (e) {}
          }
        } else {
          // En tablas de Servicio / Pacientes de Smile, abrir directamente el expediente haciendo clic en el enlace o doble clic en la fila
          const link = targetRow.querySelector("a[href*='paciente'], a[href*='expediente'], a[href*='historia'], a") ||
            (cells[colNom] && cells[colNom].querySelector("a")) ||
            (cells[colCod] && cells[colCod].querySelector("a"));

          if (link) {
            link.click();
            if (typeof window.jQuery === "function" || typeof window.$ === "function") {
              try { (window.jQuery || window.$)(link).trigger("click"); } catch (e) {}
            }
          } else {
            const clickTarget = (colNom >= 0 && cells[colNom]) ? cells[colNom] : (cells[2] || cells[1] || targetRow);
            clickTarget.click();
            try {
              clickTarget.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
              targetRow.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
            } catch (e) {}
          }
        }
      }, 250);
    }

    return {
      ok: true,
      matched: targetPatient,
      action: action || "select"
    };
  } catch (err) {
    return { ok: false, motivo: err.message };
  }
}

// Lista los pacientes visibles actualmente en la tabla de Smile
function dentaiListPatientsTable() {
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const tables = Array.from(document.querySelectorAll("table, .table"));
  const patients = [];

  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll("td"));
      if (cells.length >= 3) {
        patients.push({
          codigo: norm(cells[1]?.textContent),
          nombre: norm(cells[2]?.textContent),
          dni: cells.map((c) => norm(c.textContent)).find((t) => /^\d{8}$/.test(t.replace(/\D/g, ""))) || ""
        });
      }
    }
  }

  return patients;
}

// Selecciona y abre una clínica/rotación en el Módulo Servicio de Smile
function dentaiSelectServicio(target) {
  try {
    const rawTarget = (typeof target === "object" && target !== null)
      ? (target.target || target.nombreOficial || target.serviceId || "")
      : (target || "");

    if (!rawTarget) {
      return { ok: false, motivo: "No se especificó el servicio clínico a seleccionar" };
    }

    const clean = (s) => (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Normalización fonética rápida
    const fonetic = (s) => {
      let str = clean(s)
        .replace(/\b(?:uno|una|un)\b/gi, "1")
        .replace(/\bdos\b/gi, "2")
        .replace(/\btres\b/gi, "3")
        .replace(/\bcuatro\b/gi, "4");
      str = str.replace(/\b(?:u\s*p\s*c\s*h|ups\s*h|up\s*s\s*h|upsh|up\s*sh|u\s*p\s*s\s*h|u\s*p\s*h|uph)(\d*)\b/gi, (match, p1) => {
        return p1 ? "upch " + p1 : "upch";
      });
      str = str.replace(/\b(?:de\s*arena|d\s*arena|dearena|darena|de\s*aena|da\s*ena|dae\s*na|da\s+en\s+a|dayna|daina|deina|dayena|deyna|dayan|dayana)\b/gi, "daena");
      str = str.replace(/\bda\s*c\s*(\d+)\b/gi, "dace $1");
      str = str.replace(/\b(?:de\s*hace|de\s*ase|dehace|dease|d\s*hace|d\s*ace)\b/gi, "dace");
      str = str.replace(/\b(?:da\s*se|da\s*ce|da\s*c|dase|darse|daze|dahe|dasi)\b/gi, "dace");
      str = str.replace(/\bintegral\s+hace\s+(\d+)\b/gi, "integral dace $1");
      str = str.replace(/\b(?:clip\s*smp|clic\s*smp|clis\s*smp|cli\s*smp|clism\b|clismepe|clip\s*ese\s*eme\s*pe)\b/gi, "clismp");
      str = str.replace(/\b(?:simulaci[oó]n|simulador|simulaciones)\b/gi, "simul");
      return str.replace(/\s+/g, " ").trim();
    };

    const targetClean = fonetic(rawTarget);
    const targetTokens = targetClean.split(" ").filter(Boolean);

    // Buscar elementos en el DOM de Smile
    const candidates = Array.from(document.querySelectorAll(
      ".list-group-item, a, button, tr, div[onclick], li, [role='button'], td, div"
    )).filter((el) => {
      const text = clean(el.textContent);
      if (text.length < 5 || text.length > 160) return false;
      // Comprobar que no contenga contenedores masivos con muchos hijos de bloque
      if (el.children.length > 6) return false;
      return /integral|dace|dase|daena|maqueta|clismp|simul/i.test(text);
    });

    let matchedEl = null;
    let bestScore = 0;

    const isTargetDaena = /\bdaena\b/i.test(targetClean);
    const isTargetDace = /\bdace\b/i.test(targetClean);
    const targetHas1 = /\b1\b/.test(targetClean);
    const targetHas2 = /\b2\b/.test(targetClean);
    const targetHas3 = /\b3\b/.test(targetClean);
    const targetHas4 = /\b4\b/.test(targetClean);
    const targetHasMaqueta1 = /\bmaqueta\b/i.test(targetClean) && targetHas1;
    const targetHasMaqueta2 = /\bmaqueta\b/i.test(targetClean) && targetHas2;
    const targetHasSimul = /\bsimul\b/i.test(targetClean);
    const targetHasClismp = /\bclismp\b/i.test(targetClean);

    for (const el of candidates) {
      const elText = fonetic(el.textContent);

      // AISLAMIENTO ESTRICTO DACE vs DAENA:
      const isElDaena = /\bdaena\b/i.test(elText);
      const isElDace = /\bdace\b/i.test(elText);
      if (isTargetDaena && !isElDaena) continue;
      if (isTargetDace && !isElDace) continue;

      // AISLAMIENTO ESTRICTO DE NÚMEROS:
      const elHas1 = /\b1\b/.test(elText);
      const elHas2 = /\b2\b/.test(elText);
      const elHas3 = /\b3\b/.test(elText);
      const elHas4 = /\b4\b/.test(elText);
      if (targetHas1 && !elHas1) continue;
      if (targetHas2 && !elHas2) continue;
      if (targetHas3 && !elHas3) continue;
      if (targetHas4 && !elHas4) continue;

      // AISLAMIENTO ESTRICTO DE SUBTIPOS:
      const elHasMaqueta = /\bmaqueta\b/i.test(elText);
      const elHasSimul = /\bsimul\b/i.test(elText);
      const elHasClismp = /\bclismp\b/i.test(elText);
      if (targetHasMaqueta1 && (!elHasMaqueta || !elHas1)) continue;
      if (targetHasMaqueta2 && (!elHasMaqueta || !elHas2)) continue;
      if (targetHasSimul && !elHasSimul) continue;
      if (targetHasClismp && !elHasClismp) continue;

      // Coincidencia exacta
      if (elText === targetClean) {
        matchedEl = el;
        bestScore = 100;
        break;
      }

      // Inclusión completa
      if (elText.includes(targetClean)) {
        if (85 > bestScore) {
          bestScore = 85;
          matchedEl = el;
        }
      } else if (targetClean.includes(elText)) {
        if (75 > bestScore) {
          bestScore = 75;
          matchedEl = el;
        }
      }

      // Coincidencia token a token ponderada
      let matchCount = 0;
      for (const tok of targetTokens) {
        if (elText.includes(tok)) matchCount++;
      }
      const score = (matchCount / Math.max(targetTokens.length, 1)) * 70;
      if (score > bestScore && score >= 45) {
        bestScore = score;
        matchedEl = el;
      }
    }

    if (!matchedEl) {
      return { ok: false, motivo: `No se encontró en pantalla el servicio: ${rawTarget}` };
    }

    // Ubicar el elemento clickeable más apropiado
    const clickable = matchedEl.closest("a, button, tr, .list-group-item, [role='button']") || matchedEl;

    // Scroll suave
    clickable.scrollIntoView({ block: "center", behavior: "smooth" });

    // Resaltado visual en Smile
    const oldOutline = clickable.style.outline;
    const oldBg = clickable.style.backgroundColor;
    clickable.style.outline = "3px solid #0071e3";
    clickable.style.backgroundColor = "rgba(0, 113, 227, 0.22)";
    setTimeout(() => {
      clickable.style.outline = oldOutline;
      clickable.style.backgroundColor = oldBg;
    }, 3500);

    // Clic en el elemento o enlace interno
    const innerLink = clickable.querySelector("a, button");
    if (innerLink && innerLink !== clickable) {
      try { innerLink.click(); } catch (e) {}
    }

    try {
      if (clickable.getAttribute("onclick")) {
        new Function(clickable.getAttribute("onclick")).call(clickable);
      }
    } catch (e) {}

    clickable.click();
    try {
      const win = typeof window !== "undefined" ? window : null;
      if (typeof MouseEvent !== "undefined") {
        clickable.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: win }));
      }
    } catch (e) {}

    if (typeof window !== "undefined" && (typeof window.jQuery === "function" || typeof window.$ === "function")) {
      try { (window.jQuery || window.$)(clickable).trigger("click"); } catch (e) {}
    }

    return {
      ok: true,
      servicio: rawTarget,
      textoDetectado: (clickable.textContent || "").trim().slice(0, 80)
    };
  } catch (err) {
    return { ok: false, motivo: err.message };
  }
}

/* ---------- Apertura por Voz de Fila en Registros Clínicos de Smile ---------- */
function dentaiOpenRegistroClinico(target) {
  try {
    const norm = (s) => String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const targetClean = norm(target);
    if (!targetClean) return { ok: false, motivo: "Registro clínico no especificado." };

    const visible = (el) => {
      try {
        const r = el.getBoundingClientRect();
        const st = window.getComputedStyle(el);
        return (r.width > 0 || r.height > 0) && st.visibility !== "hidden" && st.display !== "none";
      } catch (e) {
        return false;
      }
    };

    const tables = Array.from(document.querySelectorAll("table, .table"));
    let targetRow = null;
    let targetName = "";

    for (const table of tables) {
      if (!visible(table)) continue;
      const rows = Array.from(table.querySelectorAll("tbody tr, tr")).filter((r) => !r.closest("thead") && r.querySelectorAll("td").length >= 2);

      for (const row of rows) {
        if (!visible(row)) continue;
        const cells = Array.from(row.querySelectorAll("td, th"));
        const cellTexts = cells.map((c) => norm(c.textContent));
        const rowText = cellTexts.join(" ");

        let isMatch = false;

        if (/^\d+$/.test(targetClean)) {
          const firstCellText = cellTexts[0] || "";
          if (firstCellText === targetClean || new RegExp(`\\b${targetClean}\\b`).test(rowText)) {
            isMatch = true;
          }
        } else {
          const targetWords = targetClean.split(/\s+/).filter((w) => w.length >= 2 && !/^(?:abrir|abre|el|la|los|las|registro|numero)$/i.test(w));
          if (targetWords.length > 0 && targetWords.every((w) => rowText.includes(w))) {
            isMatch = true;
          }
        }

        if (isMatch) {
          targetRow = row;
          targetName = cells[2]?.textContent?.trim() || cells[1]?.textContent?.trim() || targetClean;
          break;
        }
      }
      if (targetRow) break;
    }

    if (!targetRow) {
      return { ok: false, motivo: `No se encontró el registro "${target}" en la tabla de Registros Clínicos.` };
    }

    targetRow.scrollIntoView({ block: "center", behavior: "smooth" });
    const prevOut = targetRow.style.outline;
    targetRow.style.outline = "3px solid #0071e3";
    setTimeout(() => { targetRow.style.outline = prevOut; }, 2500);

    const link = targetRow.querySelector("a") || targetRow.querySelectorAll("td")[2] || targetRow.querySelectorAll("td")[1] || targetRow;
    link.click();
    try {
      link.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
      targetRow.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    } catch (e) {}
    if (typeof window.jQuery === "function" || typeof window.$ === "function") {
      try { (window.jQuery || window.$)(link).trigger("click"); } catch (e) {}
    }

    return { ok: true, matched: targetName };
  } catch (err) {
    return { ok: false, motivo: err.message };
  }
}

/* ---------- Manejador de la Imagen Interactiva de Lesiones (Smile UPCH) ---------- */
function dentaiHandleInteractiveLesion(cmd) {
  if (!cmd || !cmd.action) return { ok: false };
  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  // Helper para buscar tarjetas en el panel lateral del modal interactivo
  const modal = document.querySelector(".modal, .dialog, div[role=dialog], #modal_lesion, #modal_lesiones, .modal-content, .modal-body") || document.body;

  function getAllCards() {
    const selects = Array.from(modal.querySelectorAll("select"));
    const cards = [];
    for (const sel of selects) {
      const card = sel.closest(".card, tr, table, .panel, .form-group, div[style*='border'], div") || sel.parentElement;
      if (card && !cards.includes(card)) cards.push(card);
    }
    return cards;
  }

  function findCardForRegion(targetRegion) {
    if (!targetRegion) return null;
    const rNorm = norm(targetRegion).replace("perineal", "perinal").replace("optica", "otica");
    const cards = getAllCards();
    return cards.find((c) => {
      const inputs = Array.from(c.querySelectorAll("input, span, label, td"));
      return inputs.some((inp) => {
        const v = norm(inp.value || inp.textContent || "");
        return v.includes(rNorm) || rNorm.includes(v);
      });
    });
  }

  function findCommentField(card) {
    if (!card) return null;
    const ta = card.querySelector("textarea");
    if (ta) return ta;
    const inputs = Array.from(card.querySelectorAll("input:not([type=button]):not([type=submit]):not([readonly])"));
    // Excluir input que contiene el nombre de la región anatómica ("En: Dorsal")
    return inputs.find((inp) => !inp.readOnly && !inp.disabled && inp.name !== "en" && inp.id !== "en");
  }

  function setSelectValue(select, lesionName) {
    if (!select || !lesionName) return false;
    const lesNorm = norm(lesionName);
    const opt = Array.from(select.options).find((o) => {
      const t = norm(o.text || o.innerText || o.value || "");
      return t === lesNorm || t.includes(lesNorm) || lesNorm.includes(t);
    });
    if (opt) {
      select.value = opt.value;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      try {
        const scr = document.createElement("script");
        scr.textContent = `(function(){ try { if (window.jQuery) window.jQuery("select").trigger("change"); }catch(e){} })();`;
        (document.head || document.documentElement).appendChild(scr);
        scr.remove();
      } catch(e) {}
      return true;
    }
    return false;
  }

  // 1. Abrir modal interactivo pulsando el botón "Editar" de Lesiones Anterior o Posterior
  if (cmd.action === "abrir_modal_lesiones") {
    const isPost = cmd.target === "posterior";
    const selects = Array.from(document.querySelectorAll("select"));
    const hitSelect = selects.find((s) => {
      const pText = norm((s.closest("tr, td, .form-group, .row") || {}).textContent || "");
      return isPost ? pText.includes("lesiones posterior") : pText.includes("lesiones anterior");
    });
    if (hitSelect) {
      const container = hitSelect.closest("tr, table, .card, tbody") || hitSelect.parentElement;
      const editBtn = Array.from(container.querySelectorAll("button, a, input[type=button]"))
        .find((b) => norm(b.textContent || b.value).includes("editar"));
      if (editBtn) {
        editBtn.click();
        return { ok: true, msg: "Modal interactivo abierto." };
      }
    }
    const anyEdit = Array.from(document.querySelectorAll("button, a, .btn"))
      .find((b) => norm(b.textContent || b.value).includes("editar") && b.getBoundingClientRect().height > 0);
    if (anyEdit) { anyEdit.click(); return { ok: true, msg: "Modal interactivo abierto." }; }
    return { ok: false, motivo: "Botón Editar de lesiones no encontrado en el formulario." };
  }

  // 2. Cerrar modal interactivo pulsando "Cerrar" o la "X"
  if (cmd.action === "cerrar_modal_lesiones") {
    const closeBtns = Array.from(document.querySelectorAll(".modal button, .modal a, .dialog button, button, a"))
      .filter((b) => {
        const t = norm(b.textContent || b.value || b.getAttribute("aria-label") || "");
        return t === "cerrar" || t === "close" || b.classList.contains("close") || t === "x" || b.getAttribute("data-dismiss") === "modal";
      });
    const visibleBtn = closeBtns.find((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (visibleBtn) {
      visibleBtn.click();
      return { ok: true, msg: "Modal interactivo cerrado." };
    }
    return { ok: false, motivo: "Botón Cerrar no encontrado en el modal." };
  }

  // 3. Eliminar tarjeta de lesión por región
  if (cmd.action === "eliminar_lesion") {
    const card = findCardForRegion(cmd.region);
    if (card) {
      const delBtn = Array.from(card.querySelectorAll("button, a, span, .btn"))
        .find((el) => norm(el.textContent).includes("eliminar"));
      if (delBtn) {
        delBtn.click();
        return { ok: true, msg: `Lesión en ${cmd.region} eliminada.` };
      }
    }
    return { ok: false, motivo: `No se encontró la tabla de lesión para "${cmd.region}".` };
  }

  // 4. Seleccionar punto / región anatómica en el gráfico interactivo
  if (cmd.action === "seleccionar_region") {
    const rNorm = norm(cmd.region).replace("perineal", "perinal").replace("optica", "otica");
    const candidates = Array.from(modal.querySelectorAll("circle, text, tspan, path, area, a, span, div, [data-region]"))
      .filter((el) => {
        const t = norm(el.textContent || el.getAttribute("alt") || el.getAttribute("title") || el.getAttribute("data-region") || el.id || "");
        return t === rNorm || t.includes(rNorm);
      });
    if (candidates.length > 0) {
      const targetEl = candidates[0];
      targetEl.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      targetEl.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      targetEl.click();
      return { ok: true, msg: `Punto "${cmd.region}" seleccionado en gráfico.` };
    }
    return { ok: false, motivo: `No se encontró el punto "${cmd.region}" en la imagen anatómica.` };
  }

  // 5. Asignar tipo de lesión (y opcionalmente comentario)
  if (cmd.action === "asignar_lesion") {
    let card = null;
    if (cmd.region) {
      card = findCardForRegion(cmd.region);
    }
    if (!card) {
      const cards = getAllCards();
      if (cmd.cardIndex !== undefined && cards[cmd.cardIndex]) {
        card = cards[cmd.cardIndex];
      } else {
        // Usar tarjeta sin lesión seleccionada o la última tarjeta activa
        card = cards.find((c) => {
          const sel = c.querySelector("select");
          return sel && !sel.value;
        }) || cards[cards.length - 1];
      }
    }

    if (!card && cmd.region) {
      // Intentar hacer clic en el gráfico anatómico primero para crear la tarjeta
      const rNorm = norm(cmd.region).replace("perineal", "perinal").replace("optica", "otica");
      const candidate = Array.from(modal.querySelectorAll("circle, text, tspan, path, area, a, span, div, [data-region]"))
        .find((el) => {
          const t = norm(el.textContent || el.getAttribute("alt") || el.getAttribute("title") || el.getAttribute("data-region") || el.id || "");
          return t === rNorm || t.includes(rNorm);
        });
      if (candidate) {
        candidate.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        candidate.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        candidate.click();
      }
    }

    // Aplicar con tolerancia de renderizado
    const applyToCard = (targetCard) => {
      if (!targetCard) return false;
      if (cmd.lesion) {
        setSelectValue(targetCard.querySelector("select"), cmd.lesion);
      }
      if (cmd.comentario) {
        const commentInput = findCommentField(targetCard);
        if (commentInput) {
          commentInput.value = cmd.comentario;
          commentInput.dispatchEvent(new Event("input", { bubbles: true }));
          commentInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      return true;
    };

    if (card) {
      applyToCard(card);
      return { ok: true, region: cmd.region, lesion: cmd.lesion, comentario: cmd.comentario };
    }

    // Reintentar si se hizo clic en el punto
    setTimeout(() => {
      const targetCard = (cmd.region ? findCardForRegion(cmd.region) : null) || getAllCards().pop();
      applyToCard(targetCard);
    }, 150);

    return { ok: true, region: cmd.region, lesion: cmd.lesion };
  }

  // 6. Dictar comentario solo
  if (cmd.action === "dictar_comentario") {
    let card = null;
    if (cmd.region) {
      card = findCardForRegion(cmd.region);
    }
    if (!card) {
      const cards = getAllCards();
      if (cmd.cardIndex !== undefined && cards[cmd.cardIndex]) {
        card = cards[cmd.cardIndex];
      } else {
        card = cards[cards.length - 1];
      }
    }

    if (card && cmd.comentario) {
      const commentInput = findCommentField(card);
      if (commentInput) {
        commentInput.value = cmd.comentario;
        commentInput.dispatchEvent(new Event("input", { bubbles: true }));
        commentInput.dispatchEvent(new Event("change", { bubbles: true }));
        return { ok: true, msg: "Comentario agregado.", comentario: cmd.comentario };
      }
    }

    return { ok: false, motivo: "No se encontró la casilla de comentario en la tarjeta de lesión." };
  }

  return { ok: false };
}

/* ---------- Manejador Global de Modales de Alertas / Notificaciones (Smile UPCH) ---------- */
function dentaiHandleAlertModal(actionText) {
  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const act = norm(actionText);

  // 1. Buscar modales visibles o flotantes
  const dialogs = Array.from(document.querySelectorAll(".modal, .modal-dialog, div[role=dialog], #modal_alerta, [id*='alert'], [class*='alert-modal'], .sweet-alert, .swal2-modal, .bootbox"))
    .filter((d) => {
      const r = d.getBoundingClientRect();
      const st = window.getComputedStyle ? getComputedStyle(d) : {};
      return (r.width > 0 || r.height > 0) && st.display !== "none" && st.visibility !== "hidden";
    });

  const containers = dialogs.length > 0 ? dialogs : [document.body];
  let clickedBtn = null;

  for (const container of containers) {
    const btns = Array.from(container.querySelectorAll("button, a, input[type=button], input[type=submit], .btn"))
      .filter((b) => {
        const r = b.getBoundingClientRect();
        const st = window.getComputedStyle ? getComputedStyle(b) : {};
        return (r.width > 0 || r.height > 0) && st.display !== "none" && st.visibility !== "hidden";
      });

    // Búsqueda específica por el comando (ej: "enterado", "aceptar", "entendido", "cerrar", "ok")
    clickedBtn = btns.find((b) => {
      const t = norm(b.textContent || b.value || "");
      if (act.includes("enterado") && t.includes("enterado")) return true;
      if (act.includes("aceptar") && t.includes("aceptar")) return true;
      if (act.includes("entendido") && t.includes("entendido")) return true;
      if (act.includes("continuar") && t.includes("continuar")) return true;
      if (act.includes("cerrar") && (t.includes("cerrar") || t === "x" || b.classList.contains("close") || b.getAttribute("data-dismiss") === "modal")) return true;
      if (act === "ok" && (t === "ok" || t.includes("enterado") || t.includes("aceptar") || t.includes("cerrar"))) return true;
      return false;
    });

    // Si solo hay un botón en el diálogo y se dijo cualquier confirmación
    if (!clickedBtn && btns.length === 1 && (act.includes("enterado") || act.includes("aceptar") || act === "ok" || act.includes("cerrar") || act.includes("entendido"))) {
      clickedBtn = btns[0];
    }

    if (clickedBtn) break;
  }

  // Si se pidió "cerrar" y hay botón de cierre (X)
  if (!clickedBtn && (act.includes("cerrar") || act === "ok")) {
    for (const container of containers) {
      const closeBtn = Array.from(container.querySelectorAll("button.close, .close, [data-dismiss='modal'], a.close"))
        .find((b) => {
          const r = b.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
      if (closeBtn) {
        clickedBtn = closeBtn;
        break;
      }
    }
  }

  if (clickedBtn) {
    const label = norm(clickedBtn.textContent || clickedBtn.value || "cerrar");
    clickedBtn.click();
    return { ok: true, clicked: label };
  }

  return { ok: false, motivo: "No se encontró ningún modal o botón de alerta visible." };
}

/* ---------- Detector Automático de Cambios de Vista en Smile (AJAX Observer) ---------- */
(function initSmileDomObserver() {
  if (window.__dentaiObserverInitialized) return;
  window.__dentaiObserverInitialized = true;

  let debounceTimer = null;
  const observer = new MutationObserver((mutations) => {
    let hasRelevantChange = false;
    for (const m of mutations) {
      if (m.type === "childList" && m.addedNodes.length > 0) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1 && (node.querySelector("input, select, textarea, table, .table") || node.matches("input, select, textarea, table"))) {
            hasRelevantChange = true;
            break;
          }
        }
      }
      if (hasRelevantChange) break;
    }

    if (hasRelevantChange) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        try {
          chrome.runtime.sendMessage({ action: "dentai_dom_changed" });
        } catch (e) {}
      }, 500);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
