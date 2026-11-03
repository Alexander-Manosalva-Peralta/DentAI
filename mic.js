document.getElementById("b").onclick = async () => {
  const m = document.getElementById("m");
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
    m.textContent = "Micrófono permitido. Ya puedes cerrar esta pestaña y volver a DentAI.";
    m.style.color = "#1b873f";
  } catch (e) {
    m.textContent = "No se concedió el permiso: " + e.name + ". Revisa los permisos del navegador.";
    m.style.color = "#df3f34";
  }
};
