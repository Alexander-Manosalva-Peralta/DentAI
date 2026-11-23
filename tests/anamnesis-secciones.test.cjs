const { test } = require("node:test");
const assert = require("node:assert/strict");
const { fullAnamnesis } = require("./helpers/anamnesis-env.cjs");

test("mapea B a E, incluye dependientes ocultos y distingue las siete casillas familiares", (t) => {
  const s = fullAnamnesis(); t.after(s.close);
  assert.equal(s.w.fields.filter((f) => f.contexto === "anamnesis").length, 98);
  const relatives = s.w.fields.filter((f) => f.name === "respuestas[10_5_0_1][]");
  assert.equal(new Set(relatives.map((f) => f.domId)).size, 7);
  assert.equal(s.w.fields.filter((f) => f.tipo === "hidden").length, 0);
});

for (const [label, row] of [["apetito", 10], ["sed", 40], ["sudoración", 70], ["deposición", 100], ["orina", 130]]) {
  for (const [option, offset] of [["normal", 0], ["disminuido", 10], ["aumentado", 20]]) {
    test(`${label}: ${option} y su descripción condicional`, (t) => {
      const s = fullAnamnesis(); t.after(s.close);
      const text = `${label} ${option}${offset ? " descripción Detalle dictado de prueba." : ""}`;
      const proposal = s.propose(text);
      assert.deepEqual(Array.from(proposal.errors), []);
      assert.ok(s.w.dentaiFill(s.items(text)).every((r) => r.ok));
      assert.equal(s.field(`respuestas[${row}_2_0_1]`).value.trim(), offset ? option[0].toUpperCase() + option.slice(1) : "Aparentemente normal");
      if (offset) assert.equal(s.field(`respuestas[${row + offset}_2_0_0]`).value, "Detalle dictado de prueba.");
    });
  }
}

test("apetito por intervenciones conserva contexto para descripción y al cambiar estado retira el detalle anterior", async (t) => {
  const s = fullAnamnesis(); t.after(s.close); s.panel();
  for (const command of ["apetito", "disminuido", "descripción", "solo tolera líquidos"]) await s.w.processText(command);
  assert.equal(s.w.state.pending.size, 2);
  await s.w.processText("confirmar");
  assert.equal(s.field("respuestas[20_2_0_0]").value, "solo tolera líquidos");
  for (const command of ["apetito disminuido descripción otro detalle", "apetito aumentado descripción detalle nuevo"]) await s.w.processText(command);
  assert.equal(Array.from(s.w.state.pending.values()).some((p) => p.field.name === "respuestas[20_2_0_0]"), false);
  assert.ok(s.propose("sed normal descripción texto").errors.length);
  assert.ok(s.propose("orina muy alterada").errors.length);
});

for (let number = 1; number <= 16; number++) test(`pregunta ${number}: marcar, confirmar repetidamente y desmarcar sin tocar su entrada oculta`, (t) => {
  const s = fullAnamnesis(); t.after(s.close);
  const id = `id10_3_${number * 20 - 10}_1`;
  const hidden = s.w.document.querySelector(`[name="respuestas[10_3_${number * 20 - 10}_1]"][type="hidden"]`);
  for (let i = 0; i < 2; i++) assert.ok(s.w.dentaiFill(s.items(`pregunta ${number} marcar`))[0].ok);
  assert.equal(s.row(id).checked, true);
  assert.equal(hidden.value, "0");
  assert.ok(s.w.dentaiFill(s.items(`pregunta ${number} desmarcar`))[0].ok);
  assert.equal(s.row(id).checked, false);
});

test("número solo, marcar y descripción se mantienen en la misma pregunta, incluso tras confirmar", async (t) => {
  const s = fullAnamnesis(); t.after(s.close); s.panel();
  await s.w.processText("1");
  await s.w.processText("marcar");
  await s.w.processText("confirmar");
  await s.w.processText("descripción");
  await s.w.processText("Sangra al cepillarse y no al inicio.");
  await s.w.processText("confirmar");
  assert.equal(s.row("id10_3_10_1").checked, true);
  assert.equal(s.row("id10_3_20_1").value, "Sangra al cepillarse y no al inicio.");
  assert.equal(s.row("id10_3_40_1").value, "");
  await s.w.processText("pregunta dos marcar descripción Refiere una reacción previa.");
  await s.w.processText("confirmar");
  assert.equal(s.row("id10_3_30_1").checked, true);
  assert.equal(s.row("id10_3_40_1").value, "Refiere una reacción previa.");
});

test("describir una pregunta no supone marcarla y la evaluación conserva el texto literal", (t) => {
  const s = fullAnamnesis(); t.after(s.close);
  s.w.dentaiFill(s.items("pregunta tres descripción Niega alergias."));
  assert.equal(s.row("id10_3_50_1").checked, false);
  assert.equal(s.row("id10_3_60_1").value, "Niega alergias.");
  s.w.dentaiFill(s.items("evaluación del cuestionario Refiere dos intervenciones previas."));
  assert.equal(s.field("respuestas[20_3_0_1]").value, "Refiere dos intervenciones previas.");
  assert.ok(s.propose("pregunta 17 marcar").errors.length);
  assert.ok(s.propose("descripción sin seleccionar una pregunta").errors.length);
});

test("descripción numérica de pregunta trece no selecciona otra pregunta", async (t) => {
  const s = fullAnamnesis(); t.after(s.close); s.panel();
  for (const text of ["pregunta trece", "descripción", "3", "confirmar"]) await s.w.processText(text);
  assert.equal(s.row("id10_3_260_1").value, "3");
  assert.equal(s.w.state.anamnesisSelection.number, 13);
  assert.equal(s.row("id10_3_50_1").checked, false);
});

test("pregunta, opción y marcar pueden decirse por separado", async (t) => {
  const s = fullAnamnesis(); t.after(s.close); s.panel();
  for (const text of ["pregunta seis", "opción", "marcar", "confirmar"]) await s.w.processText(text);
  assert.equal(s.row("id10_3_110_1").checked, true);
});

test("puede pausar después de marcar descripción sin perder la opción ya dictada", async (t) => {
  const s = fullAnamnesis(); t.after(s.close); s.panel();
  for (const text of ["pregunta cuatro marcar descripción", "Duró dos días.", "confirmar"]) await s.w.processText(text);
  assert.equal(s.row("id10_3_70_1").checked, true);
  assert.equal(s.row("id10_3_80_1").value, "Duró dos días.");
  for (const text of ["sed aumentada descripción", "Comentario que conserva su primera palabra.", "confirmar"]) await s.w.processText(text);
  assert.equal(s.field("respuestas[40_2_0_1]").value.trim(), "Aumentado");
  assert.equal(s.field("respuestas[60_2_0_0]").value, "Comentario que conserva su primera palabra.");
});

for (const [habit, row] of [["RRSS", 1010], ["RHS", 1040], ["tabaco", 1070], ["alcohol", 1120], ["drogas", 1170]]) {
  test(`${habit}: sí y no controlan únicamente sus campos dependientes`, (t) => {
    const s = fullAnamnesis(); t.after(s.close);
    assert.ok(s.w.dentaiFill(s.items(`${habit} sí`))[0].ok);
    assert.equal(s.field(`respuestas[${row}_4_0_1]`).value.trim(), "Si");
    assert.ok(s.w.dentaiFill(s.items(`${habit} no`))[0].ok);
    assert.equal(s.field(`respuestas[${row}_4_0_1]`).value.trim(), "No");
  });
}

for (const [habit, count, duration] of [["tabaco", 1080, 1100], ["alcohol", 1130, 1150], ["drogas", 1180, 1200]]) {
  test(`${habit}: cantidad y tiempo usan sus propios números y unidades`, (t) => {
    const s = fullAnamnesis(); t.after(s.close);
    for (const text of [`${habit} cantidad cinco por día`, `${habit} tiempo diez años`]) {
      assert.deepEqual(Array.from(s.propose(text).errors), []);
      assert.ok(s.w.dentaiFill(s.items(text)).every((r) => r.ok));
    }
    const value = (n) => s.field(`respuestas[${n}_4_0_0]`).value.trim();
    assert.equal(value(count), "5"); assert.equal(value(count + 10), "DIA");
    assert.equal(value(duration), "10"); assert.equal(value(duration + 10), "AÑO");
    assert.ok(s.propose(`${habit} cantidad 32 por día`).errors.length);
  });
}

test("parejas, comentarios, tipo de droga y subcampos por pausas", async (t) => {
  const s = fullAnamnesis(); t.after(s.close); s.panel();
  for (const text of ["RRSS", "sí", "parejas dos", "comentario", "Comentario literal de prueba.", "confirmar"]) await s.w.processText(text);
  assert.equal(s.field("respuestas[1020_4_0_0]").value, "2");
  assert.equal(s.field("respuestas[1030_4_0_0]").value, "Comentario literal de prueba.");
  assert.equal(s.field("respuestas[1050_4_0_0]").value, "");
  s.w.dentaiFill(s.items("drogas tipo Texto dictado sobre el tipo."));
  assert.equal(s.field("respuestas[1220_4_0_0]").value, "Texto dictado sobre el tipo.");
  assert.ok(s.propose("RRSS parejas menos dos").errors.length);
});

test("un subcampo inválido puede corregirse dictando solo su valor", async (t) => {
  const s = fullAnamnesis(); t.after(s.close); s.panel();
  for (const text of ["tabaco tiempo", "mucho tiempo", "tres años", "confirmar"]) await s.w.processText(text);
  assert.equal(s.field("respuestas[1100_4_0_0]").value.trim(), "3");
  assert.equal(s.field("respuestas[1110_4_0_0]").value.trim(), "AÑO");
});

for (const [relative, index] of [["padre", 0], ["madre", 1], ["hermano uno", 2], ["hermano dos", 3], ["hermano tres", 4], ["hijos", 5], ["otros", 6]]) {
  test(`${relative}: selección individual y comentario sin afectar a otro familiar`, (t) => {
    const s = fullAnamnesis(); t.after(s.close);
    const text = `familiar ${relative} comentario Texto propio de este familiar.`;
    assert.deepEqual(Array.from(s.propose(text).errors), []);
    assert.ok(s.w.dentaiFill(s.items(text)).every((r) => r.ok));
    assert.equal(s.row(`id10_5_0_1_${index}`).checked, true);
    assert.equal(s.field(`respuestas[${index * 10 + 21}_5_0_0]`).value, "Texto propio de este familiar.");
    assert.equal(s.row(`id10_5_0_1_${(index + 1) % 7}`).checked, false);
    s.w.dentaiFill(s.items(`familiar ${relative} desmarcar`));
    assert.equal(s.row(`id10_5_0_1_${index}`).checked, false);
  });
}

test("varios familiares en una propuesta conservan casillas distintas", async (t) => {
  const s = fullAnamnesis(); t.after(s.close); s.panel();
  for (const text of ["padre", "marcar", "madre marcar", "descripción Comentario de madre.", "confirmar"]) await s.w.processText(text);
  assert.equal(s.row("id10_5_0_1_0").checked, true);
  assert.equal(s.row("id10_5_0_1_1").checked, true);
  assert.equal(s.field("respuestas[31_5_0_0]").value, "Comentario de madre.");
  assert.equal(s.field("respuestas[21_5_0_0]").value, "");
});

test("catálogo CIE: abrir, escoger opciones realmente cargadas, confirmar y guardar solo en ese modal", async (t) => {
  const s = fullAnamnesis(); t.after(s.close); s.panel();
  await s.w.processText("añadir diagnóstico personal");
  assert.equal(s.modal.style.display, "block");
  assert.ok(s.w.fields.some((f) => f.scope === "diagnostico"));
  for (const [label, option] of [["tipo de diagnóstico", "CIE 10"], ["clasificación", "Grupo de prueba"], ["diagnóstico", "Q12.3"], ["comentario del diagnóstico", "Comentario del registro de prueba."]]) {
    await s.w.processText(`${label} ${option}`);
    assert.equal(s.w.state.pending.size, 1);
    await s.w.processText("confirmar");
    await s.w.processText("actualizar campos");
  }
  await s.w.processText("guardar diagnóstico");
  assert.equal(s.row("bodyDiag_1240").rows.length, 1);
  assert.equal(s.modal.style.display, "none");
});

test("CIE familiar abre su propio bloque y no inventa diagnósticos ni guarda propuestas pendientes", async (t) => {
  const s = fullAnamnesis(); t.after(s.close); s.panel();
  await s.w.processText("añadir diagnóstico padre");
  assert.equal(s.modal.style.display, "none");
  await s.w.processText("padre marcar"); await s.w.processText("confirmar");
  await s.w.processText("añadir diagnóstico padre");
  assert.equal(s.modal.dataset.targetRow, "renglon_5_20");
  assert.ok(s.propose("diagnóstico enfermedad inventada").errors.length);
  await s.w.processText("tipo de diagnóstico CIE10");
  await s.w.processText("guardar diagnóstico");
  assert.match(s.w.statusText, /confirmar/);
  assert.equal(s.modal.style.display, "block");
  await s.w.processText("cerrar diagnóstico");
  assert.equal(s.modal.style.display, "none");
});

test("un código ambiguo en el catálogo CIE pide precisión", (t) => {
  const s = fullAnamnesis(); t.after(s.close);
  s.modal.style.display = "block";
  s.field("diagnostic").append(new s.w.Option("Q12.3 - Variante de prueba uno", "variant-one"), new s.w.Option("Q12.3 - Variante de prueba dos", "variant-two"));
  s.scan();
  assert.ok(s.propose("diagnóstico Q12.3").errors.some((error) => error.includes("más de una")));
});

test("las secciones nuevas respetan página, visibilidad, cancelación y límites del contexto", async (t) => {
  const s = fullAnamnesis(); t.after(s.close); s.panel();
  await s.w.processText("pregunta uno"); await s.w.processText("descartar");
  assert.equal(s.w.state.anamnesisSelection, null);
  const selected = s.scope({ kind: "question", number: 1, prefix: "pregunta 1" });
  const expired = { ...selected, expiresAt: 0 };
  assert.equal(s.propose("marcar", null, expired).handled, false);
  const entries = s.items("pregunta uno marcar");
  s.w.history.pushState({}, "", "/otro-paciente");
  assert.equal(s.w.dentaiFill(entries)[0].ok, false);
});
