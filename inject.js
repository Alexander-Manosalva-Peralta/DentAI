/* DentAI – Funciones inyectadas en Smile (todos los frames).
   Se ejecutan en el contexto del DOM de Smile sin requerir acceso al backend. */

function dentaiScan() {
  const MAX = 200;
  const clean = (s) => (s || "").replace(/\s+/g, " ").replace(/^[*:\s]+|[*:\s]+$/g, "").trim().slice(0, 120);

  const visible = (el) => {
    try {
      const type = (el.type || "").toLowerCase();
      if (type === "radio" || type === "checkbox") {
        if (el.parentElement) {
          const pr = el.parentElement.getBoundingClientRect();
          const pst = getComputedStyle(el.parentElement);
          if ((pr.width > 0 || pr.height > 0) && pst.visibility !== "hidden" && pst.display !== "none") {
            return true;
          }
        }
      }
      if (el.tagName.toLowerCase() === "select") {
        if (el.classList.contains("select2-hidden-accessible") || el.getAttribute("data-select2-id")) {
          const s2Container = el.nextElementSibling?.classList?.contains("select2-container")
            ? el.nextElementSibling
            : document.querySelector(`.select2-container[data-select2-id*="${el.id}"]`);
          if (s2Container) {
            const r2 = s2Container.getBoundingClientRect();
            return (r2.width > 0 || r2.height > 0) && getComputedStyle(s2Container).display !== "none";
          }
        }
      }
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
      const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
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
  const seenRadio = new Set();
  const els = document.querySelectorAll("input, select, textarea, [contenteditable='true']");
  let k = 0;

  for (const el of els) {
    if (out.length >= MAX) break;
    const tag = el.tagName.toLowerCase();
    let type = tag === "input" ? (el.type || "text").toLowerCase() : tag;
    if (el.isContentEditable && tag !== "input" && tag !== "textarea") type = "richtext";
    if (["password", "hidden", "submit", "button", "reset", "image", "file"].includes(type)) continue;
    if (el.disabled || el.readOnly || !visible(el)) continue;

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
        entry.opciones = Array.from(el.options).map((o) => clean(o.text)).filter(Boolean).slice(0, 60);
      }
      key = "e:" + k;
      el.setAttribute("data-dentai-key", key);
    }

    el.removeAttribute("data-dentai-id");
    entry.seccion = sectionOf(el);
    entry.key = key;
    entry.name = el.name || "";
    entry.domId = el.id || "";
    entry.enfocado = document.activeElement === el;
    k++;
    out.push(entry);
  }
  return out;
}

function dentaiFill(items) {
  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  const results = [];

  function setNative(el, v) {
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
    const l = (el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]')) || el.closest("label");
    return (l ? l.textContent : "") + " " + (el.value || "");
  }

  for (const it of items) {
    try {
      if (it.key && it.key.startsWith("g:")) {
        const g = it.key.slice(2);
        const radios = Array.from(document.querySelectorAll('input[type=radio][data-dentai-group="' + CSS.escape(g) + '"]'));
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
      let el = it.key ? document.querySelector('[data-dentai-key="' + CSS.escape(it.key) + '"]') : null;

      // 2. Fallback por domId o name
      if (!el && it.domId) el = document.getElementById(it.domId);
      if (!el && it.name) el = document.querySelector(`[name="${CSS.escape(it.name)}"]`);

      // 3. Fallback por etiqueta aproximada
      if (!el && it.etiqueta) {
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

      // SELECT / DROPDOWN (Soporte nativo y Select2 de Smile)
      if (tag === "select") {
        const v = norm(it.valor);
        let opt = null;

        // Búsqueda directa por texto o valor exacto / contenido
        for (let i = 0; i < el.options.length; i++) {
          const o = el.options[i];
          const oText = norm(o.text);
          const oVal = norm(o.value);
          if (oText === v || oVal === v) { opt = o; break; }
          if (oText.includes(v) || (v.length > 2 && v.includes(oText))) { opt = o; break; }
          if (/dni/i.test(v) && (/dni/i.test(oText) || /dni/i.test(oVal))) { opt = o; break; }
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
          opt = Array.from(el.options).find((o) => /masculino/i.test(o.text) || o.value === "M");
        }
        if (!opt && (/femenino|mujer/i.test(v))) {
          opt = Array.from(el.options).find((o) => /femenino/i.test(o.text) || o.value === "F");
        }

        if (!opt) {
          // Último recurso: si el texto coincide con cualquier opción
          opt = Array.from(el.options).find((o) => o.text.trim().length > 1 && norm(o.text).includes(v));
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
        if (el.checked !== want) {
          el.checked = want;
          el.click();
          if (el.parentElement && el.parentElement.classList.contains("icheckbox")) {
            el.parentElement.click();
          }
        }
        try {
          const jq = window.jQuery || window.$;
          if (typeof jq === "function") {
            jq(el).iCheck(want ? 'check' : 'uncheck');
            jq(el).prop('checked', want).trigger(want ? 'ifChecked' : 'ifUnchecked').trigger('change');
          }
        } catch (e) {}
        fire(el);
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
    "pre registro": "/usmile/index.php/admision/preregistro_control",
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
    const btnMod = Array.from(document.querySelectorAll("button, .btn")).find((b) => visible(b) && /modificar/i.test(norm(b.textContent || b.value)));
    if (btnMod) {
      btnMod.scrollIntoView({ block: "center", behavior: "smooth" });
      btnMod.click();
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
    ".nav-tabs li", ".nav-pills li", ".nav li", ".sidebar li", ".menu li", "[onclick]"
  ];

  const elements = Array.from(document.querySelectorAll(selectors.join(",")));
  let bestEl = null;
  let bestScore = -1;
  let bestMatchedText = "";

  const targetNoSpace = targetClean.replace(/\s+/g, "");

  for (const el of elements) {
    if (!visible(el)) continue;

    const rawText = (el.innerText || el.textContent || "").trim();
    const cleanText = norm(rawText);
    const titleText = norm(el.getAttribute("title") || "");
    const ariaText = norm(el.getAttribute("aria-label") || "");
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
      if (c.text === targetClean || (candNoSpace && candNoSpace === targetNoSpace)) {
        score = 100;
      } else if (candNoSpace.startsWith(targetNoSpace) || candNoSpace.endsWith(targetNoSpace)) {
        score = 90;
      } else if (c.text.startsWith(targetClean + " ") || c.text.endsWith(" " + targetClean)) {
        score = 85;
      } else if (c.text.includes(targetClean) || (targetNoSpace.length >= 4 && candNoSpace.includes(targetNoSpace))) {
        const diff = Math.abs(c.text.length - targetClean.length);
        score = Math.max(50, 85 - diff);
      } else if ((targetClean.includes(c.text) || (candNoSpace.length >= 4 && targetNoSpace.includes(candNoSpace))) && c.text.length >= 3) {
        score = 65;
      }

      if (score > 0) {
        // Bonificación extra para enlaces <a> directos
        if (el.tagName.toLowerCase() === "a") {
          score += 20;
        }
        if (el.getAttribute("role") === "tab" || el.getAttribute("data-toggle") === "tab" || el.classList.contains("nav-link")) {
          score += 15;
        }
        if (el.closest("nav, .nav, .tabs, .sidebar, .menu, header")) {
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
      if (targetClean === key || targetNoSpace === keyNoSpace || targetNoSpace.includes(keyNoSpace) || keyNoSpace.includes(targetNoSpace)) {
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

    targetEl.scrollIntoView({ block: "center", behavior: "smooth" });

    const prevOutline = targetEl.style.outline;
    targetEl.style.outline = "3px solid #0d9488";
    setTimeout(() => { targetEl.style.outline = prevOutline; }, 2000);

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
  const els = document.querySelectorAll("[role='tab'], .nav-tabs a, .nav-tabs button, .sidebar a, nav a, .menu a, .nav-link");
  for (const el of els) {
    if (!visible(el)) continue;
    const txt = norm(el.innerText || el.textContent);
    if (txt && txt.length < 30 && !list.includes(txt)) {
      list.push(txt);
    }
  }
  return list.slice(0, 15);
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
