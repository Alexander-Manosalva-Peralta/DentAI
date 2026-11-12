/* DentAI – Orquestador y Coordinador de Flujo Clínico (sidepanel.js)
   Coordina los módulos de Core (state, tts, orb, gemini, voice) y Módulos de Smile (preregistro/...)
   Mapeo semántico para Smile, normalización de datos, filtro anti-eco y validación estricta. */

/* ---------- Pestaña activa y Permisos de sitio en Smile ---------- */
async function activeTab() {
  try {
    const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    state.tab = t || null;
    return t || null;
  } catch (e) {
    console.warn("activeTab error:", e);
    return null;
  }
}

async function checkSite() {
  try {
    const t = await activeTab();
    if (!t || !t.url || !/^https?:/.test(t.url)) {
      banner("Abre la plataforma Smile en la pestaña principal de Chrome.", "info");
      if ($("host")) $("host").textContent = "";
      return false;
    }
    const urlObj = new URL(t.url);
    if ($("host")) $("host").textContent = urlObj.host;

    const origin = urlObj.origin;
    const ok = await chrome.permissions.contains({ origins: [origin + "/*"] });
    if (!ok) {
      banner(`DentAI necesita permiso en <b>${urlObj.host}</b>. <button id="grantSiteBtn" style="padding:4px 8px;font-size:11px;margin-left:6px;border-radius:4px;cursor:pointer;">Autorizar sitio</button>`, "info");
      const gBtn = $("grantSiteBtn");
      if (gBtn) {
        gBtn.onclick = async () => {
          if (await chrome.permissions.request({ origins: [origin + "/*"] })) {
            banner("");
            scan();
          }
        };
      }
      return false;
    }
    banner("");
    return true;
  } catch (e) {
    console.warn("checkSite error:", e);
    return false;
  }
}

/* ---------- Escaneo de campos y pestañas de Smile ---------- */
async function scan() {
  if (!(await checkSite())) return [];
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId: state.tab.id, allFrames: true },
      func: dentaiScan,
    });
    const all = [];
    let n = 0;
    for (const r of res) {
      for (const f of (r.result || [])) {
        all.push({ ...f, frameId: r.frameId, id: n++ });
      }
    }
    state.fields = all;
    renderFields();
    await scanTabs();
    return all;
  } catch (e) {
    console.warn("Scan error:", e);
    return [];
  }
}

async function scanTabs() {
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId: state.tab.id, allFrames: false },
      func: dentaiListTabs,
    });
    const tabs = (res && res[0] && res[0].result) || [];
    state.discoveredTabs = tabs;
    renderTabs();
    return tabs;
  } catch (e) {
    console.warn("Scan tabs error:", e);
    return [];
  }
}

function renderTabs() {
  const container = $("tabsDiscovered");
  if (!container) return;
  container.innerHTML = "";
  if (!state.discoveredTabs || state.discoveredTabs.length === 0) {
    container.innerHTML = `<span class="empty">No se encontraron pestañas visibles en Smile.</span>`;
    return;
  }
  state.discoveredTabs.forEach((tab) => {
    const pill = document.createElement("span");
    pill.className = "tab-pill" + (tab.active ? " active" : "");
    pill.textContent = tab.name;
    pill.title = `Pestaña detectada (${tab.kind || "módulo"})`;
    pill.onclick = () => navigateToTab(tab.name);
    container.appendChild(pill);
  });
}

function renderFields() {
  const box = $("fields");
  if (!box) return;
  box.innerHTML = "";
  state.fields.forEach((f) => {
    const d = document.createElement("div");
    d.textContent = `${f.etiqueta || "(sin etiqueta)"} · ${f.tipo}` + (f.seccion ? ` · ${f.seccion}` : "");
    box.appendChild(d);
  });
  if (!state.fields.length) box.innerHTML = `<span class="empty">No se detectaron campos de entrada en esta pantalla.</span>`;
}

/* ---------- Navegación por voz entre pestañas de Smile ---------- */
async function navigateToTab(targetName, silentOnFail = false) {
  if (!targetName) return false;

  const now = Date.now();
  const normTarget = targetName.toLowerCase().trim();

  // DEBOUNCE: evitar navegar repetidamente al mismo destino en menos de 2.5 segundos
  if (state.lastNavTarget === normTarget && (now - (state.lastNavTime || 0)) < 2500) {
    console.log("Debounce: ignorando navegación duplicada a ->", targetName);
    return true;
  }
  state.lastNavTarget = normTarget;
  state.lastNavTime = now;

  setStatus(`Buscando pestaña "${targetName}"…`);
  try {
    const t = await activeTab();
    const tabId = (t && t.id) || (state.tab && state.tab.id);
    if (!tabId) {
      setStatus(`Abre Smile en la pestaña principal.`);
      return false;
    }

    const res = await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: dentaiNavigate,
      args: [targetName],
    });

    let found = false;
    let matchedName = targetName;
    let targetUrl = null;

    for (const r of res) {
      if (r.result && r.result.ok) {
        found = true;
        matchedName = r.result.matched || targetName;
        if (r.result.url) {
          targetUrl = r.result.url;
        }
        break;
      }
    }

    if (found) {
      if (/guardar/i.test(matchedName)) {
        speak("Guardando.");
        setStatus("Guardando datos en Smile…");
      } else if (/limpiar/i.test(matchedName)) {
        speak("Formulario limpio.");
        setStatus("Formulario de Smile limpiado.");
      } else {
        speak("Listo.");
        setStatus(`Navegando a: ${matchedName}…`);
      }

      // Si obtuvimos la URL de navegación de Smile, asegurar la navegación con la API de Chrome
      if (targetUrl) {
        try {
          await chrome.tabs.update(tabId, { url: targetUrl });
        } catch (e) {
          console.warn("Tab update error:", e);
        }
      }

      setTimeout(async () => {
        await scan();
        setStatus(`Pestaña "${matchedName}" lista. Escuchando…`);
      }, 1000);
      return true;
    } else {
      if (!silentOnFail) {
        speak("No encontrado.");
        setStatus(`Pestaña o botón "${targetName}" no encontrado.`);
      }
      return false;
    }
  } catch (e) {
    console.error("Navigation error:", e);
    setStatus("Error al navegar: " + e.message);
    return false;
  }
}

/* ---------- Desplazamiento por voz (Scroll Manos Libres) ---------- */
async function scrollPage(dir, amount = 380) {
  try {
    const t = await activeTab();
    const tabId = (t && t.id) || (state.tab && state.tab.id);
    if (!tabId) return false;

    await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: dentaiScroll,
      args: [dir, amount]
    });

    // Retroalimentación visual inmediata sin retraso TTS para permitir dictar "baja, baja, baja" fluido
    setStatus(dir === "up" ? "Subiendo formulario…" : "Bajando formulario…");
    return true;
  } catch (e) {
    console.warn("Scroll error:", e);
    return false;
  }
}

/* ---------- Desplazamiento directo a secciones del formulario ---------- */
async function scrollToSection(secName) {
  if (!secName) return false;
  try {
    const t = await activeTab();
    const tabId = (t && t.id) || (state.tab && state.tab.id);
    if (!tabId) return false;

    const res = await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: dentaiScrollToSection,
      args: [secName],
    });

    const anyOk = res && res.some((r) => r.result === true);
    if (anyOk) {
      speak(secName.slice(0, 18) + ".");
      setStatus(`Desplazado a sección ${secName}.`);
      return true;
    }
  } catch (e) {
    console.warn("Scroll to section error:", e);
  }
  return false;
}

/* ---------- Selección y Apertura de Pacientes en la Tabla de Smile (cuadrito azul / Modificar) ---------- */
async function selectPatientInSmile(criterion, action = "select") {
  const t = await activeTab();
  const tabId = (t && t.id) || (state.tab && state.tab.id);
  if (!tabId) {
    setStatus("Abre Smile en la pestaña principal.");
    return false;
  }

  const critDesc = (criterion && criterion.value) ? `${criterion.type || ""} ${criterion.value}`.trim() : String(criterion);
  setStatus(action === "modificar" ? `Buscando y abriendo paciente ${critDesc}…` : `Seleccionando paciente ${critDesc} en la tabla…`);

  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: dentaiSelectPatientRow,
      args: [criterion, action],
    });

    let hit = null;
    if (res && Array.isArray(res)) {
      for (const r of res) {
        if (r.result && r.result.ok) {
          hit = r.result;
          break;
        }
      }
    }

    if (hit) {
      const p = hit.matched || {};
      state.currentPatient = p;

      if (action === "modificar" || action === "abrir") {
        speak("Abierto.");
        setStatus(`Abriendo paciente: ${p.nombre || "—"} (Código: ${p.codigo || "—"}, DNI: ${p.dni || "—"}).`);
      } else {
        speak("Seleccionado.");
        setStatus(`Paciente seleccionado: ${p.nombre || "—"} (Código: ${p.codigo || "—"}, DNI: ${p.dni || "—"}). Di "modificar" para editar.`);
      }
      return true;
    } else {
      const motivo = (res && res[0] && res[0].result && res[0].result.motivo) || `Paciente "${critDesc}" no encontrado en la tabla.`;
      speak("No encontrado.");
      setStatus(motivo);
      return false;
    }
  } catch (err) {
    console.error("selectPatientInSmile error:", err);
    setStatus("Error al interactuar con tabla de Smile: " + err.message);
    return false;
  }
}

/* ---------- Apertura de Servicios / Clínicas Integrales UPCH (Módulo Servicio) ---------- */
async function openServicioInSmile(serviceTarget) {
  const t = await activeTab();
  const tabId = (t && t.id) || (state.tab && state.tab.id);
  if (!tabId) {
    setStatus("Abre Smile en la pestaña principal.");
    return false;
  }

  const srvObj = typeof reconcileServicioNombre === "function" ? reconcileServicioNombre(serviceTarget) : null;
  const officialName = srvObj ? srvObj.nombreOficial : serviceTarget;

  setStatus(`Abriendo servicio clínico: ${officialName}…`);

  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: dentaiSelectServicio,
      args: [{ target: officialName, serviceId: srvObj ? srvObj.id : null }],
    });

    let hit = null;
    if (res && Array.isArray(res)) {
      for (const r of res) {
        if (r.result && r.result.ok) {
          hit = r.result;
          break;
        }
      }
    }

    if (hit) {
      speak("Abierto.");
      setStatus(`Servicio abierto: ${officialName}.`);
      return true;
    } else {
      const motivo = (res && res[0] && res[0].result && res[0].result.motivo) || `Servicio "${officialName}" no encontrado en pantalla.`;
      speak("No encontrado.");
      setStatus(motivo);
      return false;
    }
  } catch (err) {
    console.error("openServicioInSmile error:", err);
    setStatus("Error al interactuar con Servicio en Smile: " + err.message);
    return false;
  }
}


/* ---------- Apertura por Voz de Registros Clínicos (Examen Clínico, Anamnesis, etc.) ---------- */
async function openRegistroClinicoInSmile(targetRecord) {
  const t = await activeTab();
  const tabId = (t && t.id) || (state.tab && state.tab.id);
  if (!tabId) {
    setStatus("Abre Smile en la pestaña principal.");
    return false;
  }

  setStatus(`Abriendo registro clínico: ${targetRecord}…`);

  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: dentaiOpenRegistroClinico,
      args: [targetRecord],
    });

    let hit = null;
    if (res && Array.isArray(res)) {
      for (const r of res) {
        if (r.result && r.result.ok) {
          hit = r.result;
          break;
        }
      }
    }

    if (hit) {
      speak("Abierto.");
      setStatus(`Registro abierto: ${hit.matched || targetRecord}. Cargando formulario…`);
      // Disparar re-escaneos automáticos para capturar el formulario AJAX recién cargado en Smile
      setTimeout(async () => { await scan(); }, 600);
      setTimeout(async () => { await scan(); setStatus(`Formulario listo. Escuchando…`); }, 1500);
      return true;
    } else {
      const motivo = (res && res[0] && res[0].result && res[0].result.motivo) || `Registro clínico "${targetRecord}" no encontrado.`;
      speak("No encontrado.");
      setStatus(motivo);
      return false;
    }
  } catch (err) {
    console.error("openRegistroClinicoInSmile error:", err);
    setStatus("Error al abrir registro clínico: " + err.message);
    return false;
  }
}

/* ---------- CONSULTA DE PACIENTE (BASE DE DATOS CLÍNICA / SUPABASE / RENIEC) ---------- */
async function buscarPaciente(dni, s) {
  if (!dni || dni.length !== 8) return null;

  // 1. Consultar Base de Datos Institucional (Microsoft SQL Server SMILE QA via Bridge)
  if (s.dbProvider === "smile_qa" || !s.dbProvider) {
    try {
      setStatus(`Consultando SQL Server SMILE QA para DNI ${dni}…`);
      const bridgeUrl = (s.sqlBridgeUrl || "http://localhost:3000/api/pacientes").replace(/\/+$/, "");
      const res = await fetch(`${bridgeUrl}?dni=${dni}`);
      if (res.ok) {
        const p = await res.json();
        if (p && (p.nombres || p.nombre)) {
          return {
            origen: p.origen || "SQL Server SMILE QA",
            dni: dni,
            nombres: (p.nombres || p.nombre || "").trim(),
            apellidoPaterno: (p.apellidoPaterno || p.apellido_paterno || "").trim(),
            apellidoMaterno: (p.apellidoMaterno || p.apellido_materno || "").trim(),
            genero: (p.genero || "MASCULINO").toUpperCase(),
            fechaNacimiento: p.fechaNacimiento || p.fecha_nacimiento || "",
            celular: p.celular || p.telefono || "",
            email: p.email || p.correo || "",
            direccion: p.direccion || p.calle || "",
            departamento: p.departamento || "LIMA",
            provincia: p.provincia || "LIMA",
            distrito: p.distrito || ""
          };
        }
      }
    } catch (e) {
      console.warn("SQL Server QA Bridge query error:", e);
    }
  }

  // 2. Consultar API REST personalizada (servidor local de la clínica o laptop)
  if (s.dbProvider === "custom_api" && s.customApiUrl) {
    try {
      setStatus(`Consultando API clínica para DNI ${dni}…`);
      const res = await fetch(`${s.customApiUrl}?dni=${dni}`);
      if (res.ok) {
        const p = await res.json();
        if (p && (p.nombres || p.nombre)) {
          return {
            origen: "API Clínica",
            dni: dni,
            nombres: (p.nombres || p.nombre || "").trim(),
            apellidoPaterno: (p.apellido_paterno || p.apellidoPaterno || "").trim(),
            apellidoMaterno: (p.apellido_materno || p.apellidoMaterno || "").trim(),
            genero: (p.genero || "MASCULINO").toUpperCase(),
            fechaNacimiento: p.fecha_nacimiento || p.fechaNacimiento || "",
            celular: p.celular || p.telefono || "",
            email: p.email || p.correo || "",
            direccion: p.direccion || p.calle || "",
            departamento: p.departamento || "LIMA",
            provincia: p.provincia || "LIMA",
            distrito: p.distrito || ""
          };
        }
      }
    } catch (e) {
      console.warn("Custom API query error:", e);
    }
  }

  // 3. Consultar Base de Datos Local / Ficticia (Triaje / Recepción de la clínica)
  try {
    let db = (typeof DEFAULT_PATIENTS_DB !== "undefined") ? DEFAULT_PATIENTS_DB : [];
    if (s.localPatientsDb) {
      try {
        const parsed = JSON.parse(s.localPatientsDb);
        if (Array.isArray(parsed) && parsed.length > 0) db = parsed;
      } catch (err) {}
    }
    const foundLocal = db.find((p) => String(p.dni).replace(/\D/g, "") === dni);
    if (foundLocal) {
      return {
        origen: "Base de Datos Clínica",
        dni: dni,
        nombres: foundLocal.nombres || "",
        apellidoPaterno: foundLocal.apellidoPaterno || foundLocal.apellido_paterno || "",
        apellidoMaterno: foundLocal.apellidoMaterno || foundLocal.apellido_materno || "",
        genero: (foundLocal.genero || "MASCULINO").toUpperCase(),
        fechaNacimiento: foundLocal.fechaNacimiento || foundLocal.fecha_nacimiento || "",
        celular: foundLocal.celular || "",
        email: foundLocal.email || foundLocal.correo || "",
        direccion: foundLocal.direccion || foundLocal.calle || "",
        departamento: foundLocal.departamento || "LIMA",
        provincia: foundLocal.provincia || "LIMA",
        distrito: foundLocal.distrito || ""
      };
    }
  } catch (e) {
    console.warn("Local DB lookup error:", e);
  }

  // 4. Fallback a RENIEC oficial si no estuvo en base de datos
  if (s.dniAutoQuery && s.dniApiToken) {
    setStatus(`Consultando RENIEC para DNI ${dni}…`);
    try {
      const url = `https://api.decolecta.com/v1/reniec/dni?numero=${dni}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${s.dniApiToken}`, Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          origen: "RENIEC",
          dni: dni,
          nombres: (data.nombres || data.nombre || "").trim(),
          apellidoPaterno: (data.apellidoPaterno || data.primer_apellido || data.apellido_paterno || "").trim(),
          apellidoMaterno: (data.apellidoMaterno || data.segundo_apellido || data.apellido_materno || "").trim(),
        };
      }
    } catch (e) {
      console.warn("Fallo consulta DNI RENIEC:", e);
    }
  }

  return null;
}

function poblarCamposPaciente(patient) {
  if (!patient) return [];
  state.currentPatient = patient;

  const addedLabels = [];

  // Nombres y Apellidos (No sobreescribir si fueron rectificados manualmente por voz)
  const nomField = findField(/identificacion/i, /^nombre$/i);
  const patField = findField(/identificacion/i, /primer\s+apellido/i);
  const matField = findField(/identificacion/i, /segundo\s+apellido/i);
  if (nomField && patient.nombres && !state.lockedFields.has(nomField.id)) {
    state.pending.set(nomField.id, { valor: patient.nombres, label: "Nombre" });
    addedLabels.push("Nombre");
  }
  if (patField && patient.apellidoPaterno && !state.lockedFields.has(patField.id)) {
    state.pending.set(patField.id, { valor: patient.apellidoPaterno, label: "Primer Apellido" });
    addedLabels.push("Primer Apellido");
  }
  if (matField && patient.apellidoMaterno && !state.lockedFields.has(matField.id)) {
    state.pending.set(matField.id, { valor: patient.apellidoMaterno, label: "Segundo Apellido" });
    addedLabels.push("Segundo Apellido");
  }

  // Género
  if (patient.genero) {
    const genField = findField(/identificacion/i, /genero|sexo/i);
    if (genField && !state.lockedFields.has(genField.id)) {
      state.pending.set(genField.id, { valor: patient.genero, label: "Género" });
      addedLabels.push("Género");
    }
  }

  // Fecha de Nacimiento
  if (patient.fechaNacimiento) {
    const nacField = findField(/identificacion/i, /nacimiento/i);
    if (nacField && !state.lockedFields.has(nacField.id)) {
      state.pending.set(nacField.id, { valor: patient.fechaNacimiento, label: "Fecha Nacimiento" });
      addedLabels.push("Fecha Nacimiento");
    }
  }

  // Tipo identificación y Documento
  const tipoField = findField(/identificacion/i, /tipo.*ident/i) || findField(null, /tipo.*ident/i);
  const docField = findField(/identificacion/i, /^documento$|dni/i) || findField(null, /^documento$|dni/i);
  if (tipoField && !state.lockedFields.has(tipoField.id)) {
    state.pending.set(tipoField.id, { valor: patient.tipoIdentificacion || "DNI", label: "Tipo identificación" });
    addedLabels.push("Tipo ID");
  }
  if (docField && !state.lockedFields.has(docField.id)) {
    state.pending.set(docField.id, { valor: patient.dni, label: "Documento" });
    addedLabels.push("DNI");
  }

  // Contacto: Celular
  if (patient.celular) {
    const celField = findField(/contacto/i, /celular/i) || findField(null, /celular/i);
    if (celField && !state.lockedFields.has(celField.id)) {
      state.pending.set(celField.id, { valor: patient.celular, label: "Celular" });
      addedLabels.push("Celular");
    }
  }

  // Contacto: Email
  if (patient.email) {
    const emailField = findField(/contacto/i, /email|correo/i) || findField(null, /email|correo/i);
    if (emailField && !state.lockedFields.has(emailField.id)) {
      state.pending.set(emailField.id, { valor: patient.email, label: "Email" });
      addedLabels.push("Email");
    }
  }

  // Dirección: Calle, No. Exterior, Referencia, Departamento, Provincia, Distrito
  if (patient.direccion) {
    const calleField = findField(/direcci[oó]n/i, /^calle$|calle(?!.*ext)|direcci[oó]n(?!.*ext)/i) || findField(null, /^calle$|calle(?!.*ext)|direcci[oó]n(?!.*ext)/i);
    if (calleField && !state.lockedFields.has(calleField.id)) {
      state.pending.set(calleField.id, { valor: patient.direccion, label: "Calle" });
      addedLabels.push("Calle");
    }
  }
  if (patient.numeroExterior) {
    const extField = findField(/direcci[oó]n/i, /exterior|no\.\s*exterior|num_ext|numext|vivienda/i) || findField(null, /exterior|no\.\s*exterior|num_ext|numext|vivienda/i);
    if (extField && !state.lockedFields.has(extField.id)) {
      state.pending.set(extField.id, { valor: patient.numeroExterior, label: "No. Exterior" });
      addedLabels.push("No. Exterior");
    }
  }
  if (patient.referencia) {
    const refField = findField(/direcci[oó]n/i, /referencia/i);
    if (refField && !state.lockedFields.has(refField.id)) {
      state.pending.set(refField.id, { valor: patient.referencia, label: "Referencia" });
      addedLabels.push("Referencia");
    }
  }
  if (patient.departamento) {
    const depField = findField(/direcci[oó]n/i, /departamento/i);
    if (depField) { state.pending.set(depField.id, { valor: patient.departamento, label: "Departamento" }); addedLabels.push("Departamento"); }
  }
  if (patient.provincia) {
    const provField = findField(/direcci[oó]n/i, /provincia/i);
    if (provField) { state.pending.set(provField.id, { valor: patient.provincia, label: "Provincia" }); addedLabels.push("Provincia"); }
  }
  if (patient.distrito) {
    const distField = findField(/direcci[oó]n/i, /distrito/i);
    if (distField) { state.pending.set(distField.id, { valor: patient.distrito, label: "Distrito" }); addedLabels.push("Distrito"); }
  }

  // Otros datos: Cómo se enteró, Estado Civil, Ocupación, Escolaridad, Agenda varias citas
  if (patient.comoSeEntero) {
    const recomField = findField(/otros/i, /como.*entero|recomendad/i) || findField(null, /como.*entero|recomendad/i);
    if (recomField && !state.lockedFields.has(recomField.id)) {
      state.pending.set(recomField.id, { valor: patient.comoSeEntero, label: "Cómo se enteró" });
      addedLabels.push("Cómo se enteró");
    }
  }
  if (patient.estadoCivil) {
    const civilField = findField(/otros/i, /estado.*civil|civil/i) || findField(null, /estado.*civil|civil/i);
    if (civilField && !state.lockedFields.has(civilField.id)) {
      state.pending.set(civilField.id, { valor: patient.estadoCivil, label: "Estado Civil" });
      addedLabels.push("Estado Civil");
    }
  }
  if (patient.ocupacion) {
    const ocupField = findField(/otros/i, /ocupaci|profesi/i) || findField(null, /ocupaci|profesi/i);
    if (ocupField && !state.lockedFields.has(ocupField.id)) {
      state.pending.set(ocupField.id, { valor: patient.ocupacion, label: "Ocupación" });
      addedLabels.push("Ocupación");
    }
  }
  if (patient.escolaridad) {
    const escField = findField(/otros/i, /escolar|estudio/i) || findField(null, /escolar|estudio/i);
    if (escField && !state.lockedFields.has(escField.id)) {
      state.pending.set(escField.id, { valor: patient.escolaridad, label: "Escolaridad" });
      addedLabels.push("Escolaridad");
    }
  }
  if (patient.agendaVariasCitas) {
    const citasField = findField(/otros/i, /agenda.*cita|varias.*cita/i) || findField(null, /agenda.*cita|varias.*cita/i);
    if (citasField && !state.lockedFields.has(citasField.id)) {
      state.pending.set(citasField.id, { valor: patient.agendaVariasCitas, label: "Agenda varias citas" });
      addedLabels.push("Agenda varias citas");
    }
  }

  return addedLabels;
}

/* ---------- Búsqueda semántica de campos en Smile ---------- */
function findField(secPattern, etPattern) {
  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[*:]+/g, "").trim();
  
  const isCalleSearch = etPattern && /calle/i.test(etPattern.source) && !/ext|exterior/i.test(etPattern.source);

  if (secPattern) {
    return state.fields.find((f) => {
      const secNorm = norm(f.seccion);
      const etNorm = norm(f.etiqueta);
      const nameNorm = norm(f.name);
      const idNorm = norm(f.domId);

      // Si se busca Calle, descartar terminantemente campos de No. Exterior
      if (isCalleSearch && (/exterior|num.*ext|no.*ext|vivienda/i.test(etNorm) || /exterior|num.*ext|no.*ext|vivienda/i.test(nameNorm))) {
        return false;
      }

      return secPattern.test(secNorm) && (etPattern.test(etNorm) || etPattern.test(nameNorm) || etPattern.test(idNorm));
    });
  }

  // Si no se especificó sección, preferir campos que NO sean de factura para evitar sobreescribir datos de facturación
  const nonFactura = state.fields.find((f) => {
    const secNorm = norm(f.seccion);
    if (/factura/i.test(secNorm)) return false;
    const etNorm = norm(f.etiqueta);
    const nameNorm = norm(f.name);
    const idNorm = norm(f.domId);

    if (isCalleSearch && (/exterior|num.*ext|no.*ext|vivienda/i.test(etNorm) || /exterior|num.*ext|no.*ext|vivienda/i.test(nameNorm))) {
      return false;
    }

    return etPattern.test(etNorm) || etPattern.test(nameNorm) || etPattern.test(idNorm);
  });
  if (nonFactura) return nonFactura;

  // Si no se encontró fuera de factura, buscar en cualquier campo
  return state.fields.find((f) => {
    const etNorm = norm(f.etiqueta);
    const nameNorm = norm(f.name);
    const idNorm = norm(f.domId);

    if (isCalleSearch && (/exterior|num.*ext|no.*ext|vivienda/i.test(etNorm) || /exterior|num.*ext|no.*ext|vivienda/i.test(nameNorm))) {
      return false;
    }

    return etPattern.test(etNorm) || etPattern.test(nameNorm) || etPattern.test(idNorm);
  });
}

/* ---------- PROCESAR TEXTO POR VOZ ---------- */
function handleText(rawText) {
  state.queue = state.queue.then(() => processText(rawText)).catch((e) => {
    setStatus("Error: " + e.message);
  });
  return state.queue;
}

async function processText(rawText) {
  // ANTI-ECO INTELIGENTE: Solo ignorar si el texto coincide con lo que el asistente pronuncia
  if (state.isSpeakingTTS && state.speakingText) {
    const cleanNorm = (rawText || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
    if (cleanNorm === state.speakingText || state.speakingText.includes(cleanNorm)) {
      return;
    }
  }

  const rawTrimmed = (rawText || "").trim();
  if (!rawTrimmed || JUNK.test(rawTrimmed)) return;

  // Limpiar prefijo opcional de invocación si el doctor lo usó
  let text = rawTrimmed.replace(/^(?:dentai|doctor|asistente)[,\s]*/i, "").trim();
  if (!text) return;

  addTranscript(text);
  const s = await getSettings();

  // Asegurar campos escaneados
  if (!state.fields.length) await scan();

  // Comandos de voz directos (ejecución rápida nativa)
  const normRaw = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,;:]+$/, "").trim();

  // 1. NAVEGACIÓN DIRECTA A SECCIONES DEL FORMULARIO DE SMILE
  // Ejemplos: "ve a Datos de Identificación", "sube a Factura", "ve a Contacto", "ve a Dirección", "sube a Otros datos", "ir a otros datos"
  const SECTION_NAV_REGEX = /^(?:(?:ve\s+a|ir\s+a|sube\s+a|baja\s+a|pasa\s+a|lleva\s+a|mostrar|ver|abrir|abre)\s+)?(?:la\s+secci[oó]n\s+(?:de\s+)?)?(?:secci[oó]n\s+(?:de\s+)?)?(datos\s+de\s+identificaci[oó]n|identificaci[oó]n|contacto|direcci[oó]n|factura|otros\s+datos|otro\s+dato)$/i;
  const secNavMatch = normRaw.match(SECTION_NAV_REGEX);
  if (secNavMatch) {
    const secTarget = secNavMatch[1];
    const ok = await scrollToSection(secTarget);
    if (ok) return;
  }

  // 2. COMANDOS DE SCROLL RÁPIDO (Manos Libres) - Ultra sensible y ejecución inmediata
  // Reconoce con alta sensibilidad: "sube", "subir", "suba", "suve", "tube", "tuve", "arriba", "más arriba", "sube un poco"
  // y "baja", "bajar", "baje", "abajo", "más abajo", "baja un poco"
  const isNavigatingToTarget = /(?:a|hacia|en)\s+(?:datos|identificaci|contacto|direcci|factura|otro|inicio|agenda|servicio|preregistro|guardar|limpiar)/i.test(normRaw);

  if (!isNavigatingToTarget) {
    const IS_SCROLL_UP = /\b(?:sube|subir|suba|suban|subi|subí|suve|suva|tube|tuve|arriba)\b/i;
    const IS_SCROLL_DOWN = /\b(?:baja|bajar|baje|bajan|abajo)\b/i;
    const hasFieldWord = /(?:calle|correo|nombre|apellido|dni|doc|vivienda|exterior|casa|factura|citas)/i.test(normRaw);

    if (IS_SCROLL_UP.test(normRaw) && !hasFieldWord) {
      const count = (normRaw.match(/sube|subir|suba|suve|tube|tuve|arriba/gi) || []).length || 1;
      const delta = Math.min(count, 3) * 380;
      await scrollPage("up", delta);
      return;
    }
    if (IS_SCROLL_DOWN.test(normRaw) && !hasFieldWord) {
      const count = (normRaw.match(/baja|bajar|baje|abajo/gi) || []).length || 1;
      const delta = Math.min(count, 3) * 380;
      await scrollPage("down", delta);
      return;
    }
  }

  if (/^(modo redactar|modo nota)$/i.test(normRaw)) {
    setMode("write");
    speak("Redactar.");
    return;
  }
  if (/^(modo llenar|modo campos)$/i.test(normRaw)) {
    setMode("fill");
    speak("Llenar.");
    return;
  }

  // ACCIÓN DE APERTURA DE SERVICIOS / CLÍNICAS INTEGRALES UPCH (MÓDULO SERVICIO)
  // Ej: "abre Integral DASE 1", "abre Integral DASE 3", "abre DAENA 4 SIMUL", "abre maqueta UPCH 1", "abre clip SMP"
  const srvCmd = typeof extractSeleccionServicio === "function" ? extractSeleccionServicio(text) : null;
  if (srvCmd) {
    const ok = await openServicioInSmile(srvCmd.target);
    if (ok) return;
  }

  // ACCIÓN DE APERTURA DIRECTA / MODIFICACIÓN DE PACIENTE EN TABLA DE SMILE
  // Ej: "abre código 62", "modificar código 62", "abre DNI 10203040", "abre paciente Sánchez"
  const openCmd = typeof extractAperturaPaciente === "function" ? extractAperturaPaciente(text) : null;
  if (openCmd) {
    const ok = await selectPatientInSmile(openCmd.criterion, "modificar");
    if (ok) return;
  }

  // ACCIÓN DE SELECCIÓN DE PACIENTE EN TABLA DE SMILE (Marcar cuadrito azul)
  // Ej: "selecciona código 62", "selecciona DNI 10203040", "selecciona paciente Sánchez", "selecciona fila 1"
  const selCmd = typeof extractSeleccionPaciente === "function" ? extractSeleccionPaciente(text) : null;
  if (selCmd) {
    const ok = await selectPatientInSmile(selCmd.criterion, "select");
    if (ok) return;
  }

  // ACCIÓN DIRECTA BOTÓN MODIFICAR EN SMILE
  // Ej: "modificar", "ve a modificar", "dale a modificar", "clic en modificar"
  if ((typeof extractComandoModificar === "function" && extractComandoModificar(text)) ||
      /^(?:(?:ve\s+a|ir\s+a|dale\s+(?:a\s+)?|dar\s+|haz\s+|presiona|presionar|toca|clic(?:k)?\s+(?:en\s+)?)\s*)?(?:modificar|editar)$/i.test(normRaw)) {
    await navigateToTab("modificar");
    return;
  }

  // ACCIONES DIRECTAS EN FORMULARIO DE SMILE: GUARDAR, LIMPIAR Y BUSCAR
  // Prioridad máxima para evitar confusiones con descarte de propuesta
  if (/^(?:(?:ve\s+a|voy\s+a|ir\s+a|abre|abrir|dale\s+clic(?:k)?\s+en|haz\s+clic(?:k)?\s+en|clic(?:k)?\s+en|presiona|presionar|toca)\s+)?(?:guardar|grabar|salvar)$/i.test(normRaw)) {
    await navigateToTab("guardar");
    return;
  }
  if (/^(?:(?:ve\s+a|voy\s+a|ir\s+a|abre|abrir|dale\s+clic(?:k)?\s+en|haz\s+clic(?:k)?\s+en|clic(?:k)?\s+en|presiona|presionar|toca)\s+)?(?:limpiar|reset|borrar\s+formulario|limpiar\s+formulario)$/i.test(normRaw)) {
    await navigateToTab("limpiar");
    return;
  }
  if (/^(?:(?:ve\s+a|voy\s+a|ir\s+a|abre|abrir|dale\s+(?:a\s+)?|dar\s+|haz\s+|presiona|presionar|toca|clic(?:k)?\s+(?:en\s+)?)\s*)?(?:buscar|busca|buscar\s+paciente|busca\s+paciente)$/i.test(normRaw)) {
    // Si hay campos pendientes en la búsqueda (ej: DNI o Nombre), aplicarlos primero antes de presionar buscar
    if (state.pending.size > 0) {
      await apply();
      await new Promise((r) => setTimeout(r, 250));
    }
    await navigateToTab("buscar");
    return;
  }

  // Navegación de pestañas, módulos y botones de acción de Smile (ej: "inicio", "agenda", "servicio", "preregistro")
  // A. Coincidencia con frase de acción o navegación
  const ACTION_PHRASE_REGEX = /^(?:ir\s+a|ve\s+a|abre|abrir|pasa\s+a|cambia\s+a|cambiar\s+a|ver|pestana|pestaña|menu|menú|modulo|módulo|dale\s+(?:a\s+)?(?:clic|click|presionar|tocar)?|dar\s+|haz\s+clic\s+en|haz\s+click\s+en|clic\s+en|click\s+en|presiona|presionar|toca|voy\s+a)\s+(.+)/i;
  const navMatch = text.match(ACTION_PHRASE_REGEX);
  if (navMatch) {
    const target = navMatch[1].replace(/[.,;]+$/, "").trim();
    if (target) {
      const ok = await navigateToTab(target, true);
      if (ok) return;
    }
  }

  // B. Coincidencia directa por nombre de módulo o botón de Smile
  const DIRECT_MODULES = /^(?:inicio|preregistro|pre registro|pre-registro|servicio|agenda|citas|reporte|reporte de fallas|nuevo|nuevo preregistro|nuevo registro|nuevos registro|nuevo paciente|crear preregistro|crear paciente|modificar|buscar|busca)$/i;
  if (DIRECT_MODULES.test(normRaw)) {
    const ok = await navigateToTab(normRaw);
    if (ok) return;
  }

  // COMANDO CONFIRMAR PROPUESTA: Escribe los campos pendientes en Smile
  if (/^(?:confirmar|confirmado|aplicar|aplicalo|confirmar\s+datos|aplicar\s+datos|listo\s+confirmar|ya\s+confirmar)$/i.test(normRaw) ||
      (/\b(?:confirmar|confirmado|aplicar|aplicalo)\b/i.test(normRaw) &&
       !/(?:dni|documento|celular|tel[eé]fono|correo|email|fecha|nacimiento|calle|nombre|apellido|pasaporte|carnet|ruc|guardar|limpiar)/i.test(normRaw))) {
    await apply();
    return;
  }

  // COMANDO DESCARTAR / CANCELAR PROPUESTA: Limpia la propuesta actual del asistente
  if (/^(?:descartar|descartalo|cancelar|cancelalo|descartar\s+propuesta|cancelar\s+propuesta)$/i.test(normRaw) ||
      (/\b(?:descartar|descartalo|cancelar|cancelalo)\b/i.test(normRaw) &&
       !/(?:dni|documento|celular|tel[eé]fono|correo|email|fecha|nacimiento|calle|nombre|apellido|pasaporte|carnet|ruc|guardar|limpiar)/i.test(normRaw))) {
    discard();
    speak("Borrado.");
    return;
  }

  // FILTRO ANTI-ECO DEL PROPIO ASISTENTE:
  // 1. Descartar si el texto capturado coincide con lo que el asistente acaba de decir por TTS
  if (state.speakingText) {
    const timeSinceSpeech = Date.now() - (state.lastSpeechTime || 0);
    if (timeSinceSpeech < 2500) {
      const cleanNorm = normRaw.replace(/[^a-z0-9\s]/g, "").trim();
      if (cleanNorm === state.speakingText || state.speakingText.includes(cleanNorm)) {
        console.log("Anti-echo: Descartado eco del asistente ->", normRaw);
        return;
      }
    }
  }

  // 2. Solo descartar si el texto capturado es EXCLUSIVAMENTE una palabra corta de confirmación que dice el asistente
  const PURE_TTS_WORDS = /^(?:listo|anotado|llenado|borrado|abriendo|redactar|llenar|error)[.!\s]*$/i;
  if (PURE_TTS_WORDS.test(normRaw)) {
    console.log("Anti-echo: Descartada palabra suelta de TTS ->", normRaw);
    return;
  }

  // ACCIONES DIRECTAS DE FACTURACIÓN Y CHECKBOXES RÁPIDOS
  const facDirect = extractFactura(text);
  if (facDirect && /(?:factura|requerir)/i.test(normRaw)) {
    const f = findField(/factura/i, /factura/i) || findField(null, /factura/i);
    if (f) {
      state.pending.set(f.id, { valor: facDirect, label: "Va a requerir factura?" });
      renderPending();
      speak("Listo.");
      setStatus(`Factura: ${facDirect}.`);
      await apply();
      setTimeout(async () => { await scan(); }, 600);
      return;
    }
  }

  const igDirect = extractDatosIgualesDireccion(text);
  if (igDirect) {
    const f = findField(/factura/i, /igual.*direc/i) || findField(null, /igual.*direc/i);
    if (f) {
      state.pending.set(f.id, { valor: igDirect, label: "Los datos son iguales a la dirección" });
      renderPending();
      speak("Listo.");
      setStatus(`Datos iguales a dirección: ${igDirect}.`);
      await apply();
      setTimeout(async () => { await scan(); }, 600);
      return;
    }
  }

  const citasDirect = extractAgendaVariasCitas(text);
  if (citasDirect && /(?:agenda|citas)/i.test(normRaw)) {
    const f = findField(/otros/i, /agenda.*cita|varias.*cita/i) || findField(null, /agenda.*cita|varias.*cita/i);
    if (f) {
      state.pending.set(f.id, { valor: citasDirect, label: "Agenda varias citas" });
      renderPending();
      speak("Listo.");
      setStatus(`Agenda varias citas: ${citasDirect}.`);
      await apply();
      return;
    }
  }

  // ACCIÓN DIRECTA: NÚMERO EXTERIOR / VIVIENDA / CASA / SIN NÚMERO
  // Atiende directamente dictados como "número exterior 555", "número exterior de vivienda 555", "vivienda 555", "sin número"
  const numExtDirect = extractNumeroExterior(text);
  if (numExtDirect && /(?:exterior|vivienda|casa|predio|sin\s+numero|\bsn\b)/i.test(normRaw)) {
    const f = findField(/direcci[oó]n/i, /exterior|no\.\s*exterior|num_ext|numext|vivienda/i) || findField(null, /exterior|no\.\s*exterior|num_ext|numext|vivienda/i);
    if (f) {
      state.pending.set(f.id, { valor: numExtDirect, label: "No. Exterior" });
      state.lockedFields.add(f.id);
      renderPending();
      speak("Listo.");
      setStatus(`No. Exterior: "${numExtDirect}". Di "confirmar".`);
      return;
    }
  }

  // ACCIÓN DIRECTA: CALLE / DIRECCIÓN GENERAL (Protegido contra exterior y vivienda)
  const calleDirect = extractCalle(text);
  if (calleDirect && /(?:calle|direcci[oó]n|avenida|jir[oó]n|pasaje)/i.test(normRaw) && !/(?:exterior|vivienda|casa|factura)/i.test(normRaw)) {
    const f = findField(/direcci[oó]n/i, /^calle$|calle(?!.*ext)|direcci[oó]n(?!.*ext)/i) || findField(null, /^calle$|calle(?!.*ext)|direcci[oó]n(?!.*ext)/i);
    if (f) {
      state.pending.set(f.id, { valor: calleDirect, label: "Calle" });
      state.lockedFields.add(f.id);
      renderPending();
      speak("Listo.");
      setStatus(`Calle: "${calleDirect}". Di "confirmar".`);
      return;
    }
  }

  // ACCIÓN DIRECTA: REFERENCIA
  const refDirect = extractReferencia(text);
  if (refDirect) {
    const f = findField(/direcci[oó]n/i, /referencia/i) || findField(null, /referencia/i);
    if (f) {
      state.pending.set(f.id, { valor: refDirect, label: "Referencia" });
      state.lockedFields.add(f.id);
      renderPending();
      speak("Listo.");
      setStatus(`Referencia: "${refDirect}". Di "confirmar".`);
      return;
    }
  }

  // ACCIÓN DIRECTA: CÓDIGO DE PACIENTE (Pantalla de búsqueda / Preregistro)
  const codDirect = extractCodigo(text);
  if (codDirect && /c[oó]digo/i.test(normRaw)) {
    const f = findField(null, /c[oó]digo/i);
    if (f) {
      state.pending.set(f.id, { valor: codDirect, label: "Código" });
      state.lockedFields.add(f.id);
      renderPending();
      speak("Listo.");
      setStatus(`Código: "${codDirect}". Di "confirmar" o "buscar".`);
      return;
    }
  }

  // ACCIÓN DIRECTA: MOSTRAR PACIENTES REGISTRADOS (Checkbox de Preregistro)
  const mostrarRegDirect = extractMostrarPacientesRegistrados(text);
  if (mostrarRegDirect && /mostrar|paciente|registrado/i.test(normRaw)) {
    const f = findField(null, /mostrar.*paciente|paciente.*registrado/i);
    if (f) {
      const boolVal = mostrarRegDirect === "true";
      state.pending.set(f.id, { valor: String(boolVal), label: "Mostrar pacientes registrados" });
      renderPending();
      speak("Listo.");
      setStatus(`Mostrar pacientes registrados: ${boolVal ? "Sí" : "No"}.`);
      await apply();
      return;
    }
  }

  // COMANDOS DE CORRECCIÓN / RECTIFICACIÓN / EDICIÓN DE CAMPOS
  const CORR_VERBS = "(?:cambia|cambiar|corrige|corregir|modifica|modificar|edita|editar|rectifica|rectificar|selecciona|seleccionar|marca|marcar|pon|poner)";
  const FIELD_TYPES = [
    "primer\\s+nombre", "segundo\\s+nombre", "nombres?",
    "primer\\s+apellido", "apellido\\s+paterno", "paterno",
    "segundo\\s+apellido", "apellido\\s+materno", "materno",
    "c[oó]digo(?:\\s+del\\s+paciente)?",
    "mostrar\\s+pacientes\\s+registrados", "pacientes\\s+registrados",
    "celular", "tel[eé]fono(?:\\s+de\\s+casa|\\s+casa|\\s+fijo)?", "casa", "fijo",
    "tel[eé]fono(?:\\s+de\\s+oficina|\\s+oficina|\\s+trabajo)?", "oficina", "trabajo",
    "calle\\s+de\\s+factura", "direcci[oó]n\\s+de\\s+factura",
    "correo\\s+de\\s+factura", "email\\s+de\\s+factura",
    "raz[oó]n\\s+social",
    "los\\s+datos\\s+(?:si\\s+)?son\\s+iguales(?:\\s+a\\s+la\\s+direcci[oó]n)?",
    "datos\\s+iguales(?:\\s+a\\s+la\\s+direcci[oó]n)?",
    "factura", "va\\s+a\\s+requerir\\s+factura",
    "calle", "direcci[oó]n",
    "n[uú]mero\\s+exterior(?:\\s+de\\s+vivienda)?", "n[uú]mero\\s+de\\s+vivienda", "n[uú]mero\\s+de\\s+casa", "n[uú]mero\\s+de\\s+direcci[oó]n", "no\\.?\\s*exterior", "vivienda", "n[uú]mero",
    "referencia", "distrito", "provincia", "departamento",
    "fecha", "nacimiento", "g[eé]nero", "sexo",
    "tipo(?:\\s+de)?\\s+identificaci[oó]n", "documento", "dni",
    "c[oó]mo\\s+se\\s+enter[oó]", "como\\s+se\\s+entero", "recomendador", "medio",
    "estado\\s+civil", "ocupaci[oó]n", "profesi[oó]n", "escolaridad", "estudios",
    "agenda(?:r)?\\s+varias\\s+citas", "varias\\s+citas",
    "observaciones", "observaci[oó]n", "nota"
  ].join("|");
  const corrMatch = text.match(new RegExp(`^${CORR_VERBS}\\s+(?:el\\s+|la\\s+)?(${FIELD_TYPES})(?:\\s+(?:\\ba\\b|\\bpor\\b|\\bes\\b|\\bde\\b))?\\s*[:=]?\\s*(.+)`, "i"));
  if (corrMatch) {
    const fieldType = corrMatch[1].toLowerCase();
    let rawVal = corrMatch[2].trim();

    // 1. Quitar preposiciones y conectores iniciales como "a", "por", "es", ":", "de" sin dañar nombres que inician con A (ej: Alexander, Antonio, Ana)
    let cleanVal = rawVal.replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();

    // 2. Cortar si el dictado continúa con charla o conector de siguiente acción
    cleanVal = cleanVal.split(/\s+(?:y\s+luego|luego|despu[eé]s|y\s+despu[eé]s|para|con|rectifica|edita|cambia|corrige|confirmar|aplicar|descartar|cancelar|baja|sube)\b/i)[0].trim();

    // RAMA A1: PRIMER NOMBRE ESPECÍFICO (ej: "cambia el primer nombre a Juan")
    if (/^primer\s+nombre$/i.test(fieldType)) {
      const validWords = filterValidNameWords(cleanVal, 1);
      if (validWords.length > 0) {
        const nomField = findField(/identificacion/i, /^nombre$/i) || findField(null, /^nombre$/i);
        const currVal = state.pending.get(nomField?.id)?.valor || state.currentPatient?.nombres || "";
        const currWords = currVal.trim().split(/\s+/).filter(Boolean);
        const newFirst = validWords[0];
        const secondPart = currWords.slice(1).join(" ");
        const finalName = secondPart ? `${newFirst} ${secondPart}` : newFirst;

        if (nomField) {
          state.pending.set(nomField.id, { valor: finalName, label: "Nombre" });
          state.lockedFields.add(nomField.id);
          if (state.currentPatient) state.currentPatient.nombres = finalName;
          renderPending();
          speak("Listo.");
          setStatus(`Primer nombre rectificado a "${newFirst}". Di "confirmar".`);
          return;
        }
      }
    }

    // RAMA A2: SEGUNDO NOMBRE ESPECÍFICO (ej: "cambia el segundo nombre a Alexander")
    if (/^segundo\s+nombre$/i.test(fieldType)) {
      const validWords = filterValidNameWords(cleanVal, 2);
      if (validWords.length > 0) {
        const nomField = findField(/identificacion/i, /^nombre$/i) || findField(null, /^nombre$/i);
        const currVal = state.pending.get(nomField?.id)?.valor || state.currentPatient?.nombres || "";
        const currWords = currVal.trim().split(/\s+/).filter(Boolean);
        const firstPart = currWords[0] || (state.currentPatient?.nombres ? state.currentPatient.nombres.split(/\s+/)[0] : "");
        const newSecond = validWords.join(" ");
        const finalName = firstPart ? `${firstPart} ${newSecond}` : newSecond;

        if (nomField) {
          state.pending.set(nomField.id, { valor: finalName, label: "Nombre" });
          state.lockedFields.add(nomField.id);
          if (state.currentPatient) state.currentPatient.nombres = finalName;
          renderPending();
          speak("Listo.");
          setStatus(`Segundo nombre rectificado a "${newSecond}". Di "confirmar".`);
          return;
        }
      }
    }

    // RAMA A3: NOMBRE / NOMBRES GENERAL (ej: "cambia el nombre a Juan", "cambia el nombre a Johan Alexander")
    if (/^nombres?$/i.test(fieldType)) {
      const validWords = filterValidNameWords(cleanVal, 3);
      if (validWords.length > 0) {
        const dbName = state.currentPatient?.nombres || "";
        const formattedName = reconcileNameWithDb(validWords, dbName);
        const nomField = findField(/identificacion/i, /^nombre$/i) || findField(null, /^nombre$/i);
        if (nomField && formattedName) {
          state.pending.set(nomField.id, { valor: formattedName, label: "Nombre" });
          state.lockedFields.add(nomField.id); // Bloqueado para que el DNI no lo sobreescriba
          if (state.currentPatient) {
            state.currentPatient.nombres = formattedName;
          }
          renderPending();
          speak("Listo.");
          setStatus(`Nombre rectificado a "${formattedName}". Di "confirmar".`);
          return;
        }
      } else {
        console.log("Ruido descartado en rectificación de nombre ->", cleanVal);
        setStatus("Ignorado: no se detectó un nombre válido de persona.");
        return;
      }
    }

    // RAMA B: PRIMER APELLIDO / PATERNO (Reconciliado con BD)
    if (/primer\s+apellido|apellido\s+paterno|paterno/i.test(fieldType)) {
      const validWords = filterValidNameWords(cleanVal, 2);
      if (validWords.length > 0) {
        const dbApe = state.currentPatient?.apellidoPaterno || "";
        const formattedApe = reconcileNameWithDb(validWords, dbApe);
        const patField = findField(/identificacion/i, /primer\s+apellido/i) || findField(null, /primer\s+apellido/i);
        if (patField && formattedApe) {
          state.pending.set(patField.id, { valor: formattedApe, label: "Primer Apellido" });
          state.lockedFields.add(patField.id);
          if (state.currentPatient) {
            state.currentPatient.apellidoPaterno = formattedApe;
          }
          renderPending();
          speak("Listo.");
          setStatus(`Primer apellido rectificado a "${formattedApe}". Di "confirmar".`);
          return;
        }
      } else {
        setStatus("Ignorado: no se detectó un apellido válido.");
        return;
      }
    }

    // RAMA C: SEGUNDO APELLIDO / MATERNO (Reconciliado con BD)
    if (/segundo\s+apellido|apellido\s+materno|materno/i.test(fieldType)) {
      const validWords = filterValidNameWords(cleanVal, 2);
      if (validWords.length > 0) {
        const dbApe = state.currentPatient?.apellidoMaterno || "";
        const formattedApe = reconcileNameWithDb(validWords, dbApe);
        const matField = findField(/identificacion/i, /segundo\s+apellido/i) || findField(null, /segundo\s+apellido/i);
        if (matField && formattedApe) {
          state.pending.set(matField.id, { valor: formattedApe, label: "Segundo Apellido" });
          state.lockedFields.add(matField.id);
          if (state.currentPatient) {
            state.currentPatient.apellidoMaterno = formattedApe;
          }
          renderPending();
          speak("Listo.");
          setStatus(`Segundo apellido rectificado a "${formattedApe}". Di "confirmar".`);
          return;
        }
      } else {
        setStatus("Ignorado: no se detectó un apellido válido.");
        return;
      }
    }

    // RAMA D: CELULAR O TELÉFONOS
    if (/celular/i.test(fieldType)) {
      const dig = cleanVal.replace(/\D/g, "");
      const f = findField(/contacto/i, /celular/i) || findField(null, /celular/i);
      if (f && dig) {
        state.pending.set(f.id, { valor: dig, label: "Celular" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Celular corregido a ${dig}. Di "confirmar".`);
        return;
      }
    }

    if (/casa|fijo/i.test(fieldType)) {
      const dig = cleanVal.replace(/\D/g, "");
      const f = findField(/contacto/i, /tel.*casa|telefono.*casa/i) || findField(null, /tel.*casa/i);
      if (f && dig) {
        state.pending.set(f.id, { valor: dig, label: "Tel. Casa" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Teléfono de casa corregido a ${dig}. Di "confirmar".`);
        return;
      }
    }

    if (/oficina|trabajo/i.test(fieldType)) {
      const dig = cleanVal.replace(/\D/g, "");
      const f = findField(/contacto/i, /tel.*ofi|telefono.*ofi/i) || findField(null, /tel.*ofi/i);
      if (f && dig) {
        state.pending.set(f.id, { valor: dig, label: "Tel. Oficina" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Teléfono de oficina corregido a ${dig}. Di "confirmar".`);
        return;
      }
    }

    // RAMA FACTURA AISLADA (Calle de factura, Correo de factura, Razón Social, Toggle Factura, Toggle Datos Iguales)
    if (/calle\s+de\s+factura|direcci[oó]n\s+de\s+factura/i.test(fieldType)) {
      const f = findField(/factura/i, /calle|direcci[oó]n/i);
      if (f && cleanVal) {
        state.pending.set(f.id, { valor: cleanVal, label: "Calle (Factura)" });
        renderPending();
        speak("Listo.");
        setStatus(`Calle de factura: "${cleanVal}". Di "confirmar".`);
        return;
      }
    }

    if (/correo\s+de\s+factura|email\s+de\s+factura/i.test(fieldType)) {
      const em = extractEmail(cleanVal) || cleanVal.replace(/\s+/g, "").toLowerCase();
      const f = findField(/factura/i, /correo|email/i);
      if (f && em) {
        state.pending.set(f.id, { valor: em, label: "Correo (Factura)" });
        renderPending();
        speak("Listo.");
        setStatus(`Correo de factura: ${em}. Di "confirmar".`);
        return;
      }
    }

    if (/raz[oó]n\s+social/i.test(fieldType)) {
      const f = findField(/factura/i, /raz[oó]n\s+social/i) || findField(null, /raz[oó]n\s+social/i);
      if (f && cleanVal) {
        state.pending.set(f.id, { valor: cleanVal.toUpperCase(), label: "Razón Social" });
        renderPending();
        speak("Listo.");
        setStatus(`Razón Social: "${cleanVal.toUpperCase()}". Di "confirmar".`);
        return;
      }
    }

    if (/^factura$|^va\s+a\s+requerir\s+factura$/i.test(fieldType)) {
      const facVal = /^(?:no|false|0|desactivar)$/i.test(cleanVal) ? "No" : "Si";
      const f = findField(/factura/i, /factura/i) || findField(null, /factura/i);
      if (f) {
        state.pending.set(f.id, { valor: facVal, label: "Va a requerir factura?" });
        renderPending();
        speak("Listo.");
        setStatus(`Factura: ${facVal}.`);
        await apply();
        setTimeout(async () => { await scan(); }, 600);
        return;
      }
    }

    if (/datos\s+(?:si\s+)?son\s+iguales|datos\s+iguales/i.test(fieldType)) {
      const igVal = /^(?:no|false|0)$/i.test(cleanVal) ? "No" : "Si";
      const f = findField(/factura/i, /igual.*direc/i) || findField(null, /igual.*direc/i);
      if (f) {
        state.pending.set(f.id, { valor: igVal, label: "Los datos son iguales a la dirección" });
        renderPending();
        speak("Listo.");
        setStatus(`Datos iguales a dirección: ${igVal}.`);
        await apply();
        setTimeout(async () => { await scan(); }, 600);
        return;
      }
    }

    // RAMA E: DIRECCIÓN / CALLE (Exclusivo Sección Dirección de Paciente)
    if (/^calle$|^direcci[oó]n$/i.test(fieldType)) {
      const f = findField(/direcci[oó]n/i, /^calle$|calle(?!.*ext)|direcci[oó]n(?!.*ext)/i) || findField(null, /^calle$|calle(?!.*ext)|direcci[oó]n(?!.*ext)/i);
      if (f && cleanVal) {
        state.pending.set(f.id, { valor: cleanVal, label: "Calle" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Dirección corregida a "${cleanVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA E2: NO. EXTERIOR / NÚMERO DE VIVIENDA / CASA / SIN NÚMERO
    if (/exterior|vivienda|n[uú]mero\s+de\s+casa|n[uú]mero\s+de\s+direcci[oó]n|^n[uú]mero$/i.test(fieldType)) {
      let extVal = cleanVal;
      if (/^(?:sin\s+n[uú]mero|sin\s+numero|sn|s\/n)$/i.test(cleanVal)) extVal = "S/N";
      const f = findField(/direcci[oó]n/i, /exterior|no\.\s*exterior|num_ext|numext|vivienda/i) || findField(null, /exterior|no\.\s*exterior|num_ext|numext|vivienda/i);
      if (f && extVal) {
        state.pending.set(f.id, { valor: extVal, label: "No. Exterior" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`No. Exterior corregido a "${extVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA E3: REFERENCIA
    if (/referencia/i.test(fieldType)) {
      const f = findField(/direcci[oó]n/i, /referencia/i);
      if (f && cleanVal) {
        state.pending.set(f.id, { valor: cleanVal, label: "Referencia" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Referencia corregida a "${cleanVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA F: CORREO / EMAIL
    if (/correo|email/i.test(fieldType)) {
      const em = extractEmail(cleanVal) || cleanVal.replace(/\s+/g, "").toLowerCase();
      const f = findField(/contacto/i, /email|correo/i) || findField(null, /email|correo/i);
      if (f && em) {
        state.pending.set(f.id, { valor: em, label: "Email" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Correo corregido a ${em}. Di "confirmar".`);
        return;
      }
    }

    // RAMA G: FECHA DE NACIMIENTO
    if (/fecha|nacimiento/i.test(fieldType)) {
      const nac = extractFechaNacimiento(cleanVal) || extractFechaNacimiento("fecha nacimiento " + cleanVal);
      const f = findField(/identificacion/i, /nacimiento/i);
      if (f && nac) {
        state.pending.set(f.id, { valor: nac.val, label: "Fecha Nacimiento" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Fecha corregida a ${nac.val}. Di "confirmar".`);
        return;
      }
    }

    // RAMA H: DISTRITO
    if (/distrito/i.test(fieldType)) {
      const f = findField(/direccion/i, /distrito/i);
      if (f && cleanVal) {
        state.pending.set(f.id, { valor: cleanVal.toUpperCase(), label: "Distrito" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Distrito corregido a "${cleanVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA I: TIPO DE IDENTIFICACIÓN
    if (/tipo.*ident|tipo/i.test(fieldType)) {
      const tipoObj = extractTipoIdentificacion(cleanVal);
      const f = findField(/identificacion/i, /tipo.*ident/i) || findField(null, /tipo.*ident/i);
      if (f && tipoObj) {
        state.pending.set(f.id, { valor: tipoObj.val, label: "Tipo identificación" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Tipo de identificación cambiado a ${tipoObj.label}.`);
        await apply();
        return;
      }
    }

    // RAMA J: DOCUMENTO / DNI
    if (/documento|dni/i.test(fieldType)) {
      const dig = cleanVal.replace(/\D/g, "");
      const f = findField(/identificacion/i, /^documento$/i) || findField(null, /documento/i);
      if (f && dig) {
        state.pending.set(f.id, { valor: dig, label: "Documento" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Documento corregido a ${dig}. Di "confirmar".`);
        return;
      }
    }

    // RAMA K: CÓMO SE ENTERÓ
    if (/c[oó]mo\s+se\s+enter[oó]|como\s+se\s+entero|recomendador|medio/i.test(fieldType)) {
      const recomVal = extractComoSeEntero(cleanVal) || cleanVal.toUpperCase();
      const f = findField(/otros/i, /como.*entero|recomendad/i) || findField(null, /como.*entero|recomendad/i);
      if (f && recomVal) {
        state.pending.set(f.id, { valor: recomVal, label: "Cómo se enteró" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Cómo se enteró: "${recomVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA L: ESTADO CIVIL
    if (/estado\s+civil/i.test(fieldType)) {
      const civVal = extractEstadoCivil(cleanVal) || cleanVal.toUpperCase();
      const f = findField(/otros/i, /estado.*civil|civil/i) || findField(null, /estado.*civil|civil/i);
      if (f && civVal) {
        state.pending.set(f.id, { valor: civVal, label: "Estado Civil" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Estado Civil: "${civVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA M: OCUPACIÓN / PROFESIÓN
    if (/ocupaci[oó]n|profesi[oó]n/i.test(fieldType)) {
      const ocupVal = extractOcupacion(cleanVal) || cleanVal.toUpperCase();
      const f = findField(/otros/i, /ocupaci|profesi/i) || findField(null, /ocupaci|profesi/i);
      if (f && ocupVal) {
        state.pending.set(f.id, { valor: ocupVal, label: "Ocupación" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Ocupación: "${ocupVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA N: ESCOLARIDAD / ESTUDIOS
    if (/escolaridad|estudios/i.test(fieldType)) {
      const escVal = extractEscolaridad(cleanVal) || cleanVal.toUpperCase();
      const f = findField(/otros/i, /escolar|estudio/i) || findField(null, /escolar|estudio/i);
      if (f && escVal) {
        state.pending.set(f.id, { valor: escVal, label: "Escolaridad" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Escolaridad: "${escVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA O: AGENDA VARIAS CITAS
    if (/agenda(?:r)?\s+varias\s+citas|varias\s+citas/i.test(fieldType)) {
      const citVal = /^(?:no|false|0)$/i.test(cleanVal) ? "No" : "Si";
      const f = findField(/otros/i, /agenda.*cita|varias.*cita/i) || findField(null, /agenda.*cita|varias.*cita/i);
      if (f) {
        state.pending.set(f.id, { valor: citVal, label: "Agenda varias citas" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Agenda varias citas: ${citVal}.`);
        await apply();
        return;
      }
    }

    // RAMA P: OBSERVACIONES / NOTA
    if (/observaci[oó]n|observaciones|nota/i.test(fieldType)) {
      const f = findField(/otros/i, /observaci|nota/i) || findField(null, /observaci|nota/i);
      if (f && cleanVal) {
        state.pending.set(f.id, { valor: cleanVal, label: "Observaciones" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Observaciones: "${cleanVal}". Di "confirmar".`);
        return;
      }
    }

    // RAMA Q: CÓDIGO (Pantalla de búsqueda / Preregistro)
    if (/c[oó]digo/i.test(fieldType)) {
      const f = findField(null, /c[oó]digo/i);
      if (f && cleanVal) {
        state.pending.set(f.id, { valor: cleanVal, label: "Código" });
        state.lockedFields.add(f.id);
        renderPending();
        speak("Listo.");
        setStatus(`Código: "${cleanVal}". Di "confirmar" o "buscar".`);
        return;
      }
    }

    // RAMA R: MOSTRAR PACIENTES REGISTRADOS (Checkbox de Preregistro)
    if (/mostrar.*paciente|paciente.*registrado/i.test(fieldType)) {
      const boolVal = !/^(?:no|false|0|desactivar|quitar)$/i.test(cleanVal);
      const f = findField(null, /mostrar.*paciente|paciente.*registrado/i);
      if (f) {
        state.pending.set(f.id, { valor: String(boolVal), label: "Mostrar pacientes registrados" });
        renderPending();
        speak("Listo.");
        setStatus(`Mostrar pacientes registrados: ${boolVal ? "Sí" : "No"}.`);
        await apply();
        return;
      }
    }
  }

  // PROTECCIÓN DE TOKENS Y SOLICITUDES DIARIAS:
  // Si son murmullos cortos o monosílabos sin números ni datos clínicos, no llamar a Gemini para no quemar la cuota diaria
  const words = text.split(/\s+/).filter(Boolean);
  const hasNumbers = /\d/.test(text);
  const hasClinicalWord = /(?:dni|documento|tipo|pasaporte|carnet|extranjer|ruc|nombre|apellido|fecha|nacimiento|celular|telefono|tel|correo|email|arroba|genero|sexo|masculino|femenino|calle|direccion|exterior|vivienda|casa|referencia|factura|razon|entero|recomendad|civil|soltero|casado|ocupacion|profesion|estudiante|escolaridad|citas|observacion|inicio|agenda|servicio|preregistro|reporte|sube|subir|baja|bajar|arriba|abajo|seccion)/i.test(normRaw);

  if (words.length < 2 && !hasNumbers && !hasClinicalWord) {
    return;
  }

  // ==========================================
  // MOTOR 1: INTELIGENCIA ARTIFICIAL GOOGLE GEMINI (MOTOR PRIMARIO)
  // ==========================================
  if (s.geminiApiKey) {
    setStatus("Analizando con Gemini…");
    const aiResult = await extractWithGemini(text, s);

    if (aiResult) {
      // 1. Filtro inteligente de charlas de fondo y ruido ambiental
      if (aiResult.es_charla_irrelevante) {
        console.log("DentAI IA: Charla de fondo ignorada ->", text);
        setStatus("Charla de fondo ignorada. Escuchando…");
        return;
      }

      // 2. Comandos interpretados por IA
      if (aiResult.comando === "confirmar") {
        await apply();
        return;
      }
      if (aiResult.comando === "descartar") {
        discard();
        speak("Borrado.");
        return;
      }
      if (aiResult.comando === "navegar" && aiResult.destino_navegacion) {
        await navigateToTab(aiResult.destino_navegacion);
        return;
      }
      if (aiResult.comando === "seccion" && aiResult.destino_seccion) {
        await scrollToSection(aiResult.destino_seccion);
        return;
      }
      if (aiResult.comando === "bajar") {
        await scrollPage("down");
        return;
      }
      if (aiResult.comando === "subir") {
        await scrollPage("up");
        return;
      }
      if (aiResult.comando === "abrir_paciente" && aiResult.criterio_seleccion) {
        const ok = await selectPatientInSmile(aiResult.criterio_seleccion, "modificar");
        if (ok) return;
      }
      if (aiResult.comando === "seleccionar_paciente" && aiResult.criterio_seleccion) {
        const ok = await selectPatientInSmile(aiResult.criterio_seleccion, "select");
        if (ok) return;
      }
            if (aiResult.comando === "abrir_registro_clinico" && aiResult.registro_target) {
        const ok = await openRegistroClinicoInSmile(aiResult.registro_target);
        if (ok) return;
      }
      if (aiResult.comando === "abrir_servicio" && aiResult.servicio_target) {
        const ok = await openServicioInSmile(aiResult.servicio_target);
        if (ok) return;
      }

      let dniFetched = false;
      // 3. Consulta DNI en Base de Datos Clínica / RENIEC si la IA detectó DNI de 8 dígitos
      if (aiResult.dni_para_reniec && s.dniAutoQuery && !isSearchScreen()) {
        const patient = await buscarPaciente(aiResult.dni_para_reniec, s);
        if (patient) {
          poblarCamposPaciente(patient);
          dniFetched = true;
          speak(`${patient.nombres}.`);
        }
      }

      // 4. Campos estructurados por la IA
      if (aiResult.campos && Array.isArray(aiResult.campos) && aiResult.campos.length > 0) {
        const addedLabels = [];
        for (const c of aiResult.campos) {
          const f = state.fields.find((x) => x.id === c.id);
          if (f && c.valor != null && String(c.valor).trim() !== "") {
            let val = String(c.valor).trim();
            // Limpieza estricta de preposición "a", filtro de ruido y reconciliación con BD oficial
            if (/nombre/i.test(f.etiqueta || c.etiqueta)) {
              val = val.replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
              const validWords = filterValidNameWords(val, 3);
              if (validWords.length === 0) continue; // Descartar si era ruido o charla
              const dbName = state.currentPatient?.nombres || "";
              val = reconcileNameWithDb(validWords, dbName);
              state.lockedFields.add(f.id);
              if (state.currentPatient) state.currentPatient.nombres = val;
            }
            if (/primer\s+apellido/i.test(f.etiqueta || c.etiqueta)) {
              val = val.replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
              const validWords = filterValidNameWords(val, 2);
              if (validWords.length === 0) continue;
              const dbApe = state.currentPatient?.apellidoPaterno || "";
              val = reconcileNameWithDb(validWords, dbApe);
              state.lockedFields.add(f.id);
              if (state.currentPatient) state.currentPatient.apellidoPaterno = val;
            }
            if (/segundo\s+apellido/i.test(f.etiqueta || c.etiqueta)) {
              val = val.replace(/^(?:[\s:]*(?:\ba\b|\bpor\b|\bes\b|\bde\b)[\s:]*|[\s:]+)+/i, "").trim();
              const validWords = filterValidNameWords(val, 2);
              if (validWords.length === 0) continue;
              const dbApe = state.currentPatient?.apellidoMaterno || "";
              val = reconcileNameWithDb(validWords, dbApe);
              state.lockedFields.add(f.id);
              if (state.currentPatient) state.currentPatient.apellidoMaterno = val;
            }
            state.pending.set(f.id, { valor: val, label: f.etiqueta || c.etiqueta });
            addedLabels.push(f.etiqueta || "campo");
          }
        }
        renderPending();
        if (!dniFetched) {
          speak("Listo.");
        }
        setStatus(`Campos listos: ${addedLabels.join(", ")}. Di "confirmar".`);
        return;
      } else if (dniFetched) {
        renderPending();
        setStatus("Datos de RENIEC listos. Di 'confirmar'.");
        return;
      }
    }
  }

  // ==========================================
  // MOTOR 2: REGLAS CLÍNICAS LOCALES (MOTOR DE RESPALDO)
  // Se ejecuta si no hay clave de Gemini o si falló la conexión
  // ==========================================
  const detectedLabels = [];

      // Comando de voz para actualizar o refrescar campos del formulario
  if (/(?:actualiza|actualizar|refresca|refrescar|escanear|escanea)\s+(?:los\s+)?campos/i.test(normRaw)) {
    setStatus("Actualizando campos del formulario…");
    await scan();
    speak("Campos actualizados.");
    return;
  }

  // Detección de apertura de registros clínicos (ej: "abre examen clínico", "abre 2 examen clínico", "abre anamnesis", "abre registro 26")
  const regClinCmd = typeof extractOpenRegistroClinico === "function" ? extractOpenRegistroClinico(normRaw) : null;
  if (regClinCmd && regClinCmd.target) {
    const ok = await openRegistroClinicoInSmile(regClinCmd.target);
    if (ok) return;
  }

  // Detección de navegación por menú del expediente (ej: "abre registros clínicos", "ve a datos generales", "odontograma hallazgos")
  const expNavCmd = typeof extractExpedienteNav === "function" ? extractExpedienteNav(normRaw) : null;
  if (expNavCmd && expNavCmd.target) {
    const ok = await navigateToTab(expNavCmd.target);
    if (ok) return;
  }

  // --- PASO 1: DETECCIÓN DE FECHA DE NACIMIENTO ---
  const nacObj = extractFechaNacimiento(text);
  if (nacObj) {
    const nacField = findField(/identificacion/i, /nacimiento/i);
    if (nacField) {
      state.pending.set(nacField.id, { valor: nacObj.val, label: "Fecha Nacimiento" });
      detectedLabels.push("Fecha de nacimiento");
      text = text.replace(nacObj.raw, "").replace(/fecha\s*(?:de)?\s*nacimiento|nacimiento|nacido\s*el/gi, "").trim();
    }
  }

  // --- PASO 2: DETECCIÓN DE TIPO DE IDENTIFICACIÓN ---
  const tipoObj = extractTipoIdentificacion(text);
  if (tipoObj) {
    const tipoField = findField(/identificacion/i, /tipo.*ident|tipo.*doc/i) || findField(null, /tipo.*ident|tipo.*doc/i);
    if (tipoField) {
      state.pending.set(tipoField.id, { valor: tipoObj.val, label: "Tipo identificación" });
      detectedLabels.push(`Tipo de identificación (${tipoObj.label})`);

      // Si el doctor dijo "cambia...", aplicar de inmediato en Smile
      if (/\b(?:cambia|cambiar|selecciona|poner|actualiza)\b/i.test(normRaw)) {
        renderPending();
        speak("Listo.");
        setStatus(`Tipo de identificación cambiado a ${tipoObj.label}.`);
        await apply();
        return;
      }
    }
  }

  // --- PASO 3: DETECCIÓN DE DNI / DOCUMENTO ---
  const dniVal = extractDni(text);
  if (dniVal) {
    const docField = findField(/identificacion/i, /^documento$|dni/i) || findField(null, /^documento$|dni/i);
    const tipoField = findField(/identificacion/i, /tipo.*ident/i) || findField(null, /tipo.*ident/i);

    if (docField) {
      state.pending.set(docField.id, { valor: dniVal, label: docField.etiqueta || "DNI" });
      detectedLabels.push("DNI");
    }
    if (tipoField && !state.pending.has(tipoField.id)) {
      state.pending.set(tipoField.id, { valor: "DNI", label: "Tipo identificación" });
    }

    const isSearchMode = isSearchScreen();
    if (!isSearchMode && s.dniAutoQuery) {
      const patient = await buscarPaciente(dniVal, s);
      if (patient) {
        const added = poblarCamposPaciente(patient);
        const full = `${patient.nombres} ${patient.apellidoPaterno || ""} ${patient.apellidoMaterno || ""}`.trim();
        renderPending();
        speak(`${patient.nombres} cargado.`);
        setStatus(`Paciente: ${full} (${patient.origen || "DB"}). ${added.length} campos listos. Di "confirmar".`);
        return;
      }
    } else if (isSearchMode && docField) {
      renderPending();
      speak("DNI listo.");
      setStatus(`DNI: ${dniVal}. Di "confirmar" o "buscar".`);
      return;
    }
  } else {
    const otherDoc = extractDocNum(text);
    if (otherDoc) {
      const docField = findField(/identificacion/i, /^documento$|dni/i) || findField(null, /^documento$|dni/i);
      if (docField) {
        state.pending.set(docField.id, { valor: otherDoc, label: "Documento" });
        detectedLabels.push("Documento");
      }
    }
  }

  // --- PASO 4: DETECCIÓN DE NOMBRE ---
  const nameVal = extractName(text);
  if (nameVal) {
    const nomField = findField(/identificacion/i, /^nombre$/i) || findField(null, /^nombre$/i);
    if (nomField) {
      state.pending.set(nomField.id, { valor: nameVal, label: "Nombre" });
      state.lockedFields.add(nomField.id);
      if (state.currentPatient) state.currentPatient.nombres = nameVal;
      detectedLabels.push("Nombre");
    }
  }

  // --- PASO 5: DETECCIÓN DE PRIMER APELLIDO ---
  const patVal = extractPrimerApellido(text);
  if (patVal) {
    const patField = findField(/identificacion/i, /primer\s+apellido/i);
    if (patField) {
      state.pending.set(patField.id, { valor: patVal, label: "Primer Apellido" });
      state.lockedFields.add(patField.id);
      if (state.currentPatient) state.currentPatient.apellidoPaterno = patVal;
      detectedLabels.push("Primer apellido");
    }
  }

  // --- PASO 6: DETECCIÓN DE SEGUNDO APELLIDO ---
  const matVal = extractSegundoApellido(text);
  if (matVal) {
    const matField = findField(/identificacion/i, /segundo\s+apellido/i);
    if (matField) {
      state.pending.set(matField.id, { valor: matVal, label: "Segundo Apellido" });
      state.lockedFields.add(matField.id);
      if (state.currentPatient) state.currentPatient.apellidoMaterno = matVal;
      detectedLabels.push("Segundo apellido");
    }
  }

  // --- PASO 7: TELÉFONOS (CASA VS OFICINA VS CELULAR) ---
  const telCasaVal = extractTelCasa(text);
  if (telCasaVal) {
    const telCasaField = findField(/contacto/i, /tel.*casa|telefono.*casa/i) || findField(null, /tel.*casa/i);
    if (telCasaField) {
      state.pending.set(telCasaField.id, { valor: telCasaVal, label: "Tel. Casa" });
      detectedLabels.push("Teléfono de casa");
    }
  }

  const telOfiVal = extractTelOficina(text);
  if (telOfiVal) {
    const telOfiField = findField(/contacto/i, /tel.*ofi|telefono.*ofi/i) || findField(null, /tel.*ofi/i);
    if (telOfiField) {
      state.pending.set(telOfiField.id, { valor: telOfiVal, label: "Tel. Oficina" });
      detectedLabels.push("Teléfono de oficina");
    }
  }

  const celVal = extractCelular(text);
  if (celVal) {
    const celField = findField(/contacto/i, /celular/i) || findField(null, /celular/i);
    if (celField) {
      state.pending.set(celField.id, { valor: celVal, label: "Celular" });
      detectedLabels.push("Celular");
    }
  }

  // --- PASO 8: DETECCIÓN DE EMAIL (SOPORTE .PE, .EDU.PE, .COM, ETC.) ---
  const emailVal = extractEmail(text);
  if (emailVal) {
    const emailField = findField(/contacto/i, /email|correo/i) || findField(null, /email|correo/i);
    if (emailField) {
      state.pending.set(emailField.id, { valor: emailVal, label: "Email" });
      detectedLabels.push("Email");
    }
  }

  // --- PASO 9: DETECCIÓN DE GÉNERO ---
  const genVal = extractGenero(text);
  if (genVal) {
    const genField = findField(/identificacion/i, /genero|sexo/i) || findField(null, /genero|sexo/i);
    if (genField) {
      state.pending.set(genField.id, { valor: genVal, label: "Género" });
      detectedLabels.push("Género");
    }
  }

  // --- PASO 10: CALLE / DIRECCIÓN ---
  const calleVal = extractCalle(text);
  if (calleVal) {
    const calleField = findField(/direcci[oó]n/i, /^calle$|calle(?!.*ext)|direcci[oó]n(?!.*ext)/i) || findField(null, /^calle$|calle(?!.*ext)|direcci[oó]n(?!.*ext)/i);
    if (calleField) {
      state.pending.set(calleField.id, { valor: calleVal, label: "Calle" });
      detectedLabels.push("Calle");
    }
  }

  // --- PASO 11: NO. EXTERIOR / NÚMERO DE VIVIENDA / CASA / SIN NÚMERO ---
  const numExtVal = extractNumeroExterior(text);
  if (numExtVal) {
    const extField = findField(/direcci[oó]n/i, /exterior|no\.\s*exterior|num_ext|numext|vivienda/i) || findField(null, /exterior|no\.\s*exterior|num_ext|numext|vivienda/i);
    if (extField) {
      state.pending.set(extField.id, { valor: numExtVal, label: "No. Exterior" });
      detectedLabels.push("No. Exterior");
    }
  }

  // --- PASO 12: REFERENCIA ---
  const refVal = extractReferencia(text);
  if (refVal) {
    const refField = findField(/direcci[oó]n/i, /referencia/i);
    if (refField) {
      state.pending.set(refField.id, { valor: refVal, label: "Referencia" });
      detectedLabels.push("Referencia");
    }
  }

  // --- PASO 13: FACTURA ---
  const facVal = extractFactura(text);
  if (facVal) {
    const facField = findField(/factura/i, /factura/i) || findField(null, /factura/i);
    if (facField) {
      state.pending.set(facField.id, { valor: facVal, label: "Va a requerir factura?" });
      detectedLabels.push(`Factura (${facVal})`);
    }
  }

  // --- PASO 14: DATOS IGUALES A DIRECCIÓN ---
  const igVal = extractDatosIgualesDireccion(text);
  if (igVal) {
    const igField = findField(/factura/i, /igual.*direc/i) || findField(null, /igual.*direc/i);
    if (igField) {
      state.pending.set(igField.id, { valor: igVal, label: "Los datos son iguales a la dirección" });
      detectedLabels.push(`Datos iguales a dirección (${igVal})`);
    }
  }

  // --- PASO 15: CÓMO SE ENTERÓ ---
  const recomVal = extractComoSeEntero(text);
  if (recomVal) {
    const recomField = findField(/otros/i, /como.*entero|recomendad/i) || findField(null, /como.*entero|recomendad/i);
    if (recomField) {
      state.pending.set(recomField.id, { valor: recomVal, label: "Cómo se enteró" });
      detectedLabels.push(`Cómo se enteró (${recomVal})`);
    }
  }

  // --- PASO 16: ESTADO CIVIL ---
  const civVal = extractEstadoCivil(text);
  if (civVal) {
    const civField = findField(/otros/i, /estado.*civil|civil/i) || findField(null, /estado.*civil|civil/i);
    if (civField) {
      state.pending.set(civField.id, { valor: civVal, label: "Estado Civil" });
      detectedLabels.push(`Estado Civil (${civVal})`);
    }
  }

  // --- PASO 17: OCUPACIÓN / PROFESIÓN ---
  const ocupVal = extractOcupacion(text);
  if (ocupVal) {
    const ocupField = findField(/otros/i, /ocupaci|profesi/i) || findField(null, /ocupaci|profesi/i);
    if (ocupField) {
      state.pending.set(ocupField.id, { valor: ocupVal, label: "Ocupación" });
      detectedLabels.push(`Ocupación (${ocupVal})`);
    }
  }

  // --- PASO 18: ESCOLARIDAD / ESTUDIOS ---
  const escVal = extractEscolaridad(text);
  if (escVal) {
    const escField = findField(/otros/i, /escolar|estudio/i) || findField(null, /escolar|estudio/i);
    if (escField) {
      state.pending.set(escField.id, { valor: escVal, label: "Escolaridad" });
      detectedLabels.push(`Escolaridad (${escVal})`);
    }
  }

  // --- PASO 19: AGENDA VARIAS CITAS ---
  const citasVal = extractAgendaVariasCitas(text);
  if (citasVal) {
    const citasField = findField(/otros/i, /agenda.*cita|varias.*cita/i) || findField(null, /agenda.*cita|varias.*cita/i);
    if (citasField) {
      state.pending.set(citasField.id, { valor: citasVal, label: "Agenda varias citas" });
      detectedLabels.push(`Agenda varias citas (${citasVal})`);
    }
  }

  // --- PASO 20: OBSERVACIONES ---
  const obsVal = extractObservaciones(text);
  if (obsVal) {
    const obsField = findField(/otros/i, /observaci|nota/i) || findField(null, /observaci|nota/i);
    if (obsField) {
      state.pending.set(obsField.id, { valor: obsVal, label: "Observaciones" });
      detectedLabels.push("Observaciones");
    }
  }

  // --- PASO 21: EXAMEN CLÍNICO (ECTOSCOPIA, FUNCIONES VITALES, PESO Y TALLA) ---
  if (typeof extractEctoscopia === "function") {
    const ecto = extractEctoscopia(text);
    if (ecto.apreciacionGeneral) {
      const f = findField(null, /apreciaci[oó]n\s+general/i);
      if (f) { state.pending.set(f.id, { valor: ecto.apreciacionGeneral, label: "Apreciación General" }); detectedLabels.push(`Apreciación General (${ecto.apreciacionGeneral})`); }
    }
    if (ecto.estadoNutricional) {
      const f = findField(null, /nutricional/i);
      if (f) { state.pending.set(f.id, { valor: ecto.estadoNutricional, label: "Estado Nutricional" }); detectedLabels.push(`Estado Nutricional (${ecto.estadoNutricional})`); }
    }
    if (ecto.estadoHidratacion) {
      const f = findField(null, /hidrataci[oó]n/i);
      if (f) { state.pending.set(f.id, { valor: ecto.estadoHidratacion, label: "Estado Hidratación" }); detectedLabels.push(`Estado Hidratación (${ecto.estadoHidratacion})`); }
    }
    if (ecto.lucidez) {
      const f = findField(null, /lucidez/i);
      if (f) { state.pending.set(f.id, { valor: ecto.lucidez, label: "Lucidez y Orientación" }); detectedLabels.push("Lucidez (LOTEP)"); }
    }
    if (ecto.colaboracion) {
      const f = findField(null, /colaboraci[oó]n/i);
      if (f) { state.pending.set(f.id, { valor: ecto.colaboracion, label: "Grado de Colaboración" }); detectedLabels.push(`Colaboración (${ecto.colaboracion})`); }
    }
  }

  if (typeof extractPesoTalla === "function") {
    const pt = extractPesoTalla(text);
    if (pt.peso) {
      const f = findField(null, /peso/i);
      if (f) { state.pending.set(f.id, { valor: pt.peso, label: "Peso (Kg)" }); detectedLabels.push(`Peso (${pt.peso} kg)`); }
    }
    if (pt.talla) {
      const f = findField(null, /talla/i);
      if (f) { state.pending.set(f.id, { valor: pt.talla, label: "Talla (M)" }); detectedLabels.push(`Talla (${pt.talla} m)`); }
    }
    if (pt.imc) {
      const f = findField(null, /imc/i);
      if (f) { state.pending.set(f.id, { valor: pt.imc, label: "IMC" }); detectedLabels.push(`IMC (${pt.imc})`); }
    }
  }

  if (typeof extractFuncionesVitales === "function") {
    const fv = extractFuncionesVitales(text);
    if (fv.temperatura) {
      const f = findField(null, /temperatura\s+corporal|corporal/i) || findField(null, /temperatura/i);
      if (f) { state.pending.set(f.id, { valor: fv.temperatura, label: "Temperatura Corporal" }); detectedLabels.push(`Temp (${fv.temperatura} °C)`); }
    }
    if (fv.frecuenciaRespiratoria) {
      const f = findField(null, /respiratoria|respiraci[oó]n/i);
      if (f) { state.pending.set(f.id, { valor: fv.frecuenciaRespiratoria, label: "Frecuencia Respiratoria" }); detectedLabels.push(`Frec. Resp (${fv.frecuenciaRespiratoria}/min)`); }
    }
    if (fv.pulso) {
      const f = findField(null, /pulso|card[ií]aca/i);
      if (f) { state.pending.set(f.id, { valor: fv.pulso, label: "Pulso" }); detectedLabels.push(`Pulso (${fv.pulso}/min)`); }
    }
    if (fv.presionArterial) {
      const f = findField(null, /presi[oó]n\s+arterial|presi[oó]n/i);
      if (f) { state.pending.set(f.id, { valor: fv.presionArterial, label: "Presión Arterial" }); detectedLabels.push(`PA (${fv.presionArterial})`); }
    }
  }

  if (typeof extractEstomatologico === "function") {
    const estom = extractEstomatologico(text);
    if (estom.respiracion) {
      const f = findField(null, /respiraci[oó]n/i);
      if (f) { state.pending.set(f.id, { valor: estom.respiracion, label: "Respiración" }); detectedLabels.push(`Respiración (${estom.respiracion})`); }
    }
    if (estom.simetriaFacial) {
      const f = findField(null, /simetr[ií]a/i);
      if (f) { state.pending.set(f.id, { valor: estom.simetriaFacial, label: "Simetría Facial" }); detectedLabels.push(`Simetría (${estom.simetriaFacial})`); }
    }
    if (estom.aperturaBucal) {
      const f = findField(null, /apertura/i);
      if (f) { state.pending.set(f.id, { valor: estom.aperturaBucal, label: "Apertura Bucal" }); detectedLabels.push(`Apertura (${estom.aperturaBucal})`); }
    }
    if (estom.atm) {
      const f = findField(null, /a\.?t\.?m\.?/i);
      if (f) { state.pending.set(f.id, { valor: estom.atm, label: "A.T.M." }); detectedLabels.push(`ATM (${estom.atm})`); }
    }
  }

  // RESPUESTA DE MOTOR LOCAL
  if (detectedLabels.length > 0) {
    renderPending();
    speak("Listo.");
    setStatus(`Campos listos: ${detectedLabels.join(", ")}. Di "confirmar" para llenar en Smile.`);
    return;
  }

  if (!s.geminiApiKey) {
    setStatus("Escuchando… (Conecta tu clave de Google Gemini para filtrado inteligente)");
  } else {
    setStatus("Escuchando dictado clínico…");
  }
}

/* ---------- Propuesta de llenado en el panel ---------- */
function renderPending() {
  const box = $("pending");
  if (!box) return;
  box.innerHTML = "";

  if (!state.pending.size) {
    box.className = "empty";
    box.textContent = "Esperando dictado (ej: “DNI 72 73 62 89”, “fecha de nacimiento 22 02 2006”)…";
  } else {
    box.className = "";
  }

  for (const [id, v] of state.pending) {
    const f = state.fields.find((x) => x.id === id);
    if (!f) continue;
    const d = document.createElement("div");
    d.className = "item";
    const long = f.tipo === "textarea" || f.tipo === "richtext" || v.valor.length > 60;
    d.innerHTML = `<label></label>${long ? "<textarea rows=3></textarea>" : "<input>"}`;
    d.querySelector("label").textContent = (f.etiqueta || "(campo)") + (f.seccion ? " — " + f.seccion : "");
    const inp = d.querySelector("input,textarea");
    inp.value = v.valor;
    inp.oninput = () => (v.valor = inp.value);
    box.appendChild(d);
  }

  if ($("count")) $("count").textContent = state.pending.size ? `(${state.pending.size})` : "";
}

function discard() {
  state.pending.clear();
  if (state.lockedFields) state.lockedFields.clear();
  state.currentPatient = null;
  if ($("result")) $("result").innerHTML = "";
  renderPending();
}

/* ---------- Aplicar datos en Smile ---------- */
async function apply() {
  if (!state.pending.size) {
    setStatus("No hay datos pendientes para llenar en Smile. Dicta datos o un DNI.");
    const resultBox = $("result");
    if (resultBox) {
      resultBox.innerHTML = `<div class="empty" style="color:var(--apple-secondary);">No hay campos pendientes en la propuesta. Habla al micrófono o dicta un DNI.</div>`;
    }
    const pBox = $("pending");
    if (pBox) {
      pBox.style.transition = "background 0.2s";
      pBox.style.background = "rgba(0, 113, 227, 0.08)";
      setTimeout(() => { pBox.style.background = ""; }, 400);
    }
    return;
  }
  if (!(await checkSite())) return;

  const byFrame = new Map();
  for (const [id, v] of state.pending) {
    const f = state.fields.find((x) => x.id === id);
    if (!f) continue;
    if (!byFrame.has(f.frameId)) byFrame.set(f.frameId, []);
    byFrame.get(f.frameId).push({
      key: f.key,
      valor: v.valor,
      id,
      domId: f.domId,
      name: f.name,
      etiqueta: f.etiqueta,
      seccion: f.seccion,
      tipo: f.tipo,
    });
  }

  const ok = [], fail = [];
  for (const [frameId, items] of byFrame) {
    try {
      const [r] = await chrome.scripting.executeScript({
        target: { tabId: state.tab.id, frameIds: [frameId] },
        func: dentaiFill,
        args: [items],
      });
      (r.result || []).forEach((x, i) => (x.ok ? ok : fail).push({ ...x, id: items[i].id }));
    } catch (e) {
      items.forEach((i) => fail.push({ id: i.id, motivo: e.message }));
    }
  }

  const name = (id) => (state.fields.find((x) => x.id === id) || {}).etiqueta || "campo";
  const resultBox = $("result");
  if (resultBox) {
    resultBox.innerHTML =
      (ok.length ? `<div class="good">${ok.length} campo(s) llenado(s) en Smile exitosamente.</div>` : "") +
      fail.map((f) => `<div class="fail">${name(f.id)}: ${f.motivo || "falló"}</div>`).join("");
  }

  if (ok.length > 0) {
    speak("Llenado.");
    setStatus(`${ok.length} campo(s) llenado(s) en Smile exitosamente.`);
    state.pending.clear();
    renderPending();
  } else {
    speak("Error.");
    setStatus("Revisa los campos en pantalla.");
  }

  const s = await getSettings();
  await addLog({
    fecha: new Date().toISOString(),
    operador: s.operador,
    modo: state.mode,
    sitio: state.tab ? new URL(state.tab.url).host : "",
    ok: ok.length,
    fallidos: fail.length,
    latenciaMs: state.lastLatency || 0,
  });
}

/* ---------- Inicialización ---------- */
function init() {
  try {
    if (typeof OrbVisualizer !== "undefined") {
      OrbVisualizer.init();
    }

    const optLink = $("optLink");
    if (optLink) optLink.onclick = (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); };

    const applyBtn = $("applyBtn");
    if (applyBtn) {
      applyBtn.onclick = async () => {
        applyBtn.style.opacity = "0.7";
        try {
          await apply();
        } finally {
          applyBtn.style.opacity = "1";
        }
      };
    }

    const discardBtn = $("discardBtn");
    if (discardBtn) {
      discardBtn.onclick = () => {
        discard();
        speak("Borrado.");
        setStatus("Propuesta descartada.");
      };
    }

    const refreshFieldsBtn = $("refreshFieldsBtn");
    if (refreshFieldsBtn) {
      refreshFieldsBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setStatus("Actualizando campos del formulario…");
        await scan();
        speak("Campos actualizados.");
      };
    }

    // Control manual del micrófono en el badge pulsante
    const pulseBadge = $("pulseBadge");
    if (pulseBadge) {
      pulseBadge.style.cursor = "pointer";
      pulseBadge.title = "Clic para pausar o reactivar el micrófono";
      pulseBadge.onclick = () => {
        if (!state.listening) {
          startListening();
        } else {
          state.paused = !state.paused;
          updatePulseBadge(state.listening, state.paused);
          if (state.paused) {
            try { state.recognition.stop(); } catch (e) {}
            setStatus("Micrófono pausado. Clic para reactivar.");
          } else {
            try { state.recognition.start(); } catch (e) {}
            setStatus("Manos libres activo. Escuchando…");
          }
        }
      };
    }

    // Control rápido para silenciar / activar respuestas de voz del asistente
    const voiceToggleBtn = $("voiceToggleBtn");
    if (voiceToggleBtn) {
      const updateVoiceUI = (active) => {
        const textSpan = $("voiceBtnText");
        if (textSpan) textSpan.textContent = active ? "Voz activa" : "Silencio";
        voiceToggleBtn.className = "apple-pill-btn" + (active ? " active" : "");
        voiceToggleBtn.title = active ? "Respuestas habladas activas. Clic para silenciar asistente." : "Asistente silenciado. Clic para activar respuestas habladas.";
      };

      getSettings().then((s) => updateVoiceUI(s.voiceFeedback !== false)).catch(console.warn);

      voiceToggleBtn.onclick = async () => {
        const curr = await getSettings();
        const next = !curr.voiceFeedback;
        await chrome.storage.local.set({ voiceFeedback: next });
        updateVoiceUI(next);
        if (next) {
          speak("Listo.");
          setStatus("Respuestas de voz activadas.");
        } else {
          window.speechSynthesis.cancel();
          setStatus("Asistente silenciado.");
        }
      };
    }

    // Conexión rápida con Google Gemini API
    const saveKeyBtn = $("saveKeyBtn");
    const editKeyBtn = $("editKeyBtn");
    const geminiQuickKey = $("geminiQuickKey");
    const aiConfigBox = $("aiConfigBox");
    const aiConnectedBox = $("aiConnectedBox");

    if (saveKeyBtn && geminiQuickKey) {
      saveKeyBtn.onclick = async () => {
        const key = geminiQuickKey.value.trim();
        if (!key) {
          alert("Pega tu clave gratuita de Google Gemini (inicia con AIzaSy...)");
          geminiQuickKey.focus();
          return;
        }
        await chrome.storage.local.set({ geminiApiKey: key, aiProvider: "gemini" });
        if (aiConfigBox) aiConfigBox.classList.add("hidden");
        if (aiConnectedBox) aiConnectedBox.classList.remove("hidden");
        speak("IA Conectada.");
        setStatus("Gemini conectado. Filtrado y extracción inteligente activos.");
      };

      geminiQuickKey.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          saveKeyBtn.click();
        }
      });
    }

    if (editKeyBtn) {
      editKeyBtn.onclick = () => {
        if (aiConnectedBox) aiConnectedBox.classList.add("hidden");
        if (aiConfigBox) aiConfigBox.classList.remove("hidden");
        if (geminiQuickKey) geminiQuickKey.focus();
      };
    }

    // Iniciar reconocimiento de voz de inmediato
    initWebSpeech();
    startListening();

    // Cargar ajustes y actualizar estado de IA Gemini
    getSettings().then((s) => {
      if (s.geminiApiKey) {
        if (aiConfigBox) aiConfigBox.classList.add("hidden");
        if (aiConnectedBox) aiConnectedBox.classList.remove("hidden");
        if (geminiQuickKey) geminiQuickKey.value = s.geminiApiKey;
      } else {
        if (aiConfigBox) aiConfigBox.classList.remove("hidden");
        if (aiConnectedBox) aiConnectedBox.classList.add("hidden");
      }
    }).catch(console.warn);

    // Conectar eventos de pestañas
    if (chrome.tabs && chrome.tabs.onActivated) {
      chrome.tabs.onActivated.addListener(() => { checkSite().then((ok) => ok && scan()).catch(console.warn); });
    }
    if (chrome.tabs && chrome.tabs.onUpdated) {
      chrome.tabs.onUpdated.addListener((id, info) => {
        if (info.status === "complete" && state.tab && id === state.tab.id) {
          checkSite().then((ok) => ok && scan()).catch(console.warn);
        }
      });
    }

    // Escuchar cambios DOM automáticos emitidos por inject.js cuando Smile carga vistas AJAX
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg && msg.action === "dentai_dom_changed") {
          scan().catch(console.warn);
        }
      });
    }

    // Escanear pestaña en segundo plano
    checkSite().then(async (ok) => {
      if (ok) await scan();
    }).catch(console.warn);

  } catch (err) {
    console.error("DentAI Init Error:", err);
    setStatus("Error al iniciar: " + err.message);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
