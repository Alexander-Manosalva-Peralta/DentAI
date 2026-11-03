const TEXT_IDS = [
  "aiProvider",
  "geminiApiKey",
  "apiKey",
  "sttEngine",
  "operador",
  "vocab",
  "dbProvider",
  "supabaseUrl",
  "supabaseKey",
  "customApiUrl",
  "localPatientsDb",
  "dniApiProvider",
  "dniApiToken",
  "wakeWord",
];

const BOOL_IDS = [
  "autoListen",
  "voiceFeedback",
  "dniAutoQuery",
  "wakeWordEnabled",
  "noiseFilter",
];

function updateDbBoxes(provider) {
  const supa = document.getElementById("supabaseConfigBox");
  const custom = document.getElementById("customApiBox");
  const local = document.getElementById("localDbBox");
  if (supa) supa.style.display = provider === "supabase" ? "block" : "none";
  if (custom) custom.style.display = provider === "custom_api" ? "block" : "none";
  if (local) local.style.display = provider === "local" ? "block" : "none";
}

(async () => {
  const s = await getSettings();
  TEXT_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el && s[id] !== undefined) el.value = s[id];
  });
  BOOL_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el && s[id] !== undefined) el.checked = Boolean(s[id]);
  });

  const dbProvEl = document.getElementById("dbProvider");
  if (dbProvEl) {
    updateDbBoxes(dbProvEl.value);
    dbProvEl.onchange = () => updateDbBoxes(dbProvEl.value);
  }

  const resetBtn = document.getElementById("resetDbBtn");
  if (resetBtn) {
    resetBtn.onclick = () => {
      const localDbEl = document.getElementById("localPatientsDb");
      if (localDbEl && typeof DEFAULT_PATIENTS_DB !== "undefined") {
        localDbEl.value = JSON.stringify(DEFAULT_PATIENTS_DB, null, 2);
      }
    };
  }

  const { dentai_log = [] } = await chrome.storage.local.get("dentai_log");
  const nEl = document.getElementById("n");
  if (nEl) nEl.textContent = ` (${dentai_log.length} registros)`;
})();

document.getElementById("save").onclick = async () => {
  const o = {};
  TEXT_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) o[id] = el.value.trim();
  });
  BOOL_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) o[id] = el.checked;
  });

  await chrome.storage.local.set(o);
  const msg = document.getElementById("msg");
  if (msg) {
    msg.textContent = "Configuración guardada correctamente.";
    setTimeout(() => { msg.textContent = ""; }, 3000);
  }
};

document.getElementById("mic").onclick = () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("mic.html") });
};

document.getElementById("csv").onclick = async () => {
  const { dentai_log = [] } = await chrome.storage.local.get("dentai_log");
  const cols = ["fecha", "operador", "modo", "sitio", "ok", "fallidos", "latenciaMs"];
  const csv = [cols.join(",")]
    .concat(dentai_log.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(",")))
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = "dentai_registro_uso.csv";
  a.click();
};

document.getElementById("clear").onclick = async () => {
  if (confirm("¿Estás seguro de borrar todo el registro de uso?")) {
    await chrome.storage.local.remove("dentai_log");
    const nEl = document.getElementById("n");
    if (nEl) nEl.textContent = " (0 registros)";
  }
};
