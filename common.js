const DEFAULT_PATIENTS_DB = [
  {
    dni: "72736289",
    nombres: "YOJAN",
    apellidoPaterno: "MANOSALVA",
    apellidoMaterno: "PERALTA",
    genero: "MASCULINO",
    fechaNacimiento: "22/02/2005",
    tipoIdentificacion: "DNI",
    celular: "987654321",
    email: "yojan.manosalva@upch.pe",
    direccion: "Av. Honorio Delgado 430",
    numeroExterior: "430",
    referencia: "Frente al hospital Cayetano Heredia",
    departamento: "LIMA",
    provincia: "LIMA",
    distrito: "SAN MARTIN DE PORRES",
    comoSeEntero: "FACEBOOK",
    estadoCivil: "SOLTERO",
    ocupacion: "ESTUDIANTE",
    escolaridad: "SUPERIOR UNIVERSITARIA",
    agendaVariasCitas: "NO"
  },
  {
    dni: "45123456",
    nombres: "MARIA ELENA",
    apellidoPaterno: "QUISPE",
    apellidoMaterno: "FLORES",
    genero: "FEMENINO",
    fechaNacimiento: "15/08/1998",
    tipoIdentificacion: "DNI",
    celular: "912345678",
    email: "maria.quispe@upch.pe",
    direccion: "Jr. Las Flores 123",
    numeroExterior: "123",
    referencia: "Cerca al parque zonal",
    departamento: "LIMA",
    provincia: "LIMA",
    distrito: "LOS OLIVOS",
    comoSeEntero: "RECOMENDACION",
    estadoCivil: "SOLTERO",
    ocupacion: "EMPLEADO",
    escolaridad: "SUPERIOR UNIVERSITARIA",
    agendaVariasCitas: "NO"
  },
  {
    dni: "10203040",
    nombres: "CARLOS ANDRES",
    apellidoPaterno: "SANCHEZ",
    apellidoMaterno: "RODRIGUEZ",
    genero: "MASCULINO",
    fechaNacimiento: "10/05/1990",
    tipoIdentificacion: "DNI",
    celular: "998877665",
    email: "carlos.sanchez@cayetano.edu.pe",
    direccion: "Av. Universitaria 1500",
    numeroExterior: "1500",
    referencia: "Cruce con Av. La Marina",
    departamento: "LIMA",
    provincia: "LIMA",
    distrito: "SAN MIGUEL",
    comoSeEntero: "INSTAGRAM",
    estadoCivil: "CASADO",
    ocupacion: "PROFESIONAL",
    escolaridad: "SUPERIOR UNIVERSITARIA",
    agendaVariasCitas: "NO"
  }
];

const DEFAULTS = {
  // Proveedor de Inteligencia Artificial: "gemini" | "openai" | "local"
  aiProvider: "gemini",
  // Claves de API
  geminiApiKey: "",
  apiKey: "", // OpenAI API Key
  apiBase: "https://api.openai.com/v1",
  geminiModel: "gemini-1.5-flash",
  modelLLM: "gpt-4o-mini",

  // Base de Datos Clínica de Pacientes (Triaje / Recepción / Consultorio)
  dbProvider: "local",              // "local" (Memoria/JSON) | "supabase" | "custom_api"
  supabaseUrl: "",                  // Ej: https://xyz.supabase.co
  supabaseKey: "",                  // Clave anon/public de Supabase
  customApiUrl: "",                 // Ej: http://localhost:3000/api/pacientes
  localPatientsDb: JSON.stringify(DEFAULT_PATIENTS_DB, null, 2),

  // Consulta DNI (DB Pacientes / RENIEC Perú) – Llenado automático de datos clínicos
  dniAutoQuery: true,               // Al dictar DNI, consulta DB o RENIEC y llena campos
  dniApiProvider: "decolecta",      // "decolecta" | "apisperu" | "perudevs"
  dniApiToken: "",                  // Token para consulta DNI (Decolecta / ApisPeru / PeruDevs)

  // Filtro de Ruido Ambiental
  // Desactivado por defecto para que el doctor hable de forma natural directa (sin tener que decir siempre "DentAI")
  wakeWordEnabled: false,           
  wakeWord: "DentAI",               // Palabra clave opcional si se activa el filtro
  noiseFilter: true,                // Supresión activa de ruido en micrófono

  // Motor de Voz (STT): "webspeech" (Nativo Chrome, sin clave, gratis) | "whisper" (OpenAI VAD)
  sttEngine: "webspeech",
  modelSTT: "whisper-1",

  // Manos Libres y Cero Contaminación Cruzada
  autoListen: true,                 // Inicia escucha de inmediato al abrir el panel
  voiceFeedback: true,              // Asistente responde por voz (TTS) para no tener que mirar la pantalla
  operador: "",
  silencioMs: 1200,
  vocab: "sube, subir, arriba, baja, bajar, abajo, datos de identificación, contacto, dirección, factura, otros datos, número exterior de vivienda, número de vivienda, número exterior, número de casa, vivienda, sin número, SN, referencia, Odontología, historia clínica, odontograma, DNI, RENIEC, nombres, primer apellido, segundo apellido, tipo identificación, documento, fecha nacimiento, género, celular, teléfono, correo, email, calle, departamento, provincia, distrito, razón social, datos iguales a la dirección, cómo se enteró, Facebook, Instagram, TikTok, recomendación, página web, estado civil, soltero, casado, viudo, divorciado, ocupación, profesión, estudiante, escolaridad, superior universitaria, agenda varias citas, observaciones, caries, pulpitis, gingivitis, periodontitis, endodoncia, profilaxis, resina, amalgama, corona, exodoncia, ortodoncia, brackets, oclusión, molar, premolar, canino, incisivo, pieza 16, pieza 46, vestibular, palatino, lingual, mesial, distal, imágenes, biblioteca, codex, preregistro, servicio, agenda.",
};

async function getSettings() {
  const s = await chrome.storage.local.get(Object.keys(DEFAULTS));
  return { ...DEFAULTS, ...s };
}

async function addLog(entry) {
  const { dentai_log = [] } = await chrome.storage.local.get("dentai_log");
  dentai_log.push(entry);
  await chrome.storage.local.set({ dentai_log: dentai_log.slice(-2000) });
}
