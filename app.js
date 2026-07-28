const el = {
  cover: document.getElementById("phaseCover"),
  void: document.getElementById("phase-void"),
  reading: document.getElementById("phase-reading"),
  loaded: document.getElementById("phase-loaded"),
  readingLabel: document.getElementById("readingLabel"),
  fileInput: document.getElementById("fileInput"),
  legend: document.getElementById("legend"),
  groupsGrid: document.getElementById("groupsGrid"),
  hoverCard: document.getElementById("hoverCard"),
  sizeVal: document.getElementById("sizeVal"),
  sizeInc: document.getElementById("sizeInc"),
  sizeDec: document.getElementById("sizeDec"),
  reshuffleBtn: document.getElementById("reshuffleBtn"),
  reshuffleIcon: document.getElementById("reshuffleIcon"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
  exportXlsxBtn: document.getElementById("exportXlsxBtn"),
  resetBtn: document.getElementById("resetBtn"),
};

const QUESTIONS = [
  { type: "C", text: "Me gusta probar y revisar mis ideas antes de generar la solución final" },
  { type: "C", text: "Me gusta analizar todo lo positivo y lo negativo de una solución potencial" },
  { type: "C", text: "Antes de implementar una solución, me gusta desarrollar los pasos" },
  { type: "C", text: "Me gusta generar criterios que se puedan utilizar para identificar la mejor opción" },
  { type: "C", text: "Me gusta tomarme el tiempo para perfeccionar una idea" },
  { type: "C", text: "Me gusta pensar en todas las cosas que necesito para implementar una idea" },
  { type: "C", text: "Me gusta explorar las fortalezas y debilidades de una solución potencial" },
  { type: "C", text: "Disfruto el análisis y esfuerzo que toma transformar un concepto en una idea accionable." },

  { type: "D", text: "Me gusta tomar los pasos necesarios para accionar una idea" },
  { type: "D", text: "Normalmente no dedico mucho tiempo en definir el problema a solucionar" },
  { type: "D", text: "Disfruto ver que las cosas sucedan" },
  { type: "D", text: "Realmente disfruto implementar una idea" },
  { type: "D", text: "Disfruto poner mis ideas en acción" },
  { type: "D", text: "Tengo poca paciencia para refinar o pulir una idea" },
  { type: "D", text: "Tiendo a buscar una solución rápida y ejecutarla"},
  { type: "D", text: "Me desespera ver que las cosas no se están ejecutando" },

  { type: "A", text: "Me gusta tomarme el tiempo para clarificar la naturaleza exacta del problema" },
  { type: "A", text: "Me gusta analizar un problema desde diferentes ángulos" },
  { type: "A", text: "Me gusta identificar los hechos más relevantes de un problema" },
  { type: "A", text: "Disfruto identificar formas únicas de entender un problema" },
  { type: "A", text: "Me gusta enfocarme en formular un enunciado que precise el problema" },
  { type: "A", text: "Me gusta enfocarme en la información clave alrededor de la situación de reto" },
  { type: "A", text: "Antes de avanzar me gusta tener un entendimiento clave del problema" },
  { type: "A", text: "Disfruto reunir información para identificar las causas clave de un problema" },

  { type: "B", text: "Generalmente abordo los problemas de manera creativa" },
  { type: "B", text: "Se me facilita generar ideas inusuales para resolver problemas"},
  { type: "B", text: "Me gusta generar muchas ideas" },
  { type: "B", text: "Disfruto esforzar mi imaginación para producir muchas ideas"},
  { type: "B", text: "Se me hace difícil ejecutar mis ideas" },
  { type: "B", text: "Me gusta trabajar con ideas únicas" },
  { type: "B", text: "Mi tendencia natural es generar muchísimas ideas para resolver problemas" },
  { type: "B", text: "Disfruto usar metáforas y analogías para generar nuevas ideas para solucionar problemas" },
];

function normalizeText(text) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code < 0x300 || code > 0x36f;
    })
    .join("");
}

// ---- Catálogo de tipos (colores definidos en index.html vía @theme) ----
const TYPES = {
  A: { name: "Clarificador", bg: "bg-type-a", fg: "text-type-a-fg", line: "bg-type-a-line", ring: "ring-type-a-line" },
  B: { name: "Ideador", bg: "bg-type-b", fg: "text-type-b-fg", line: "bg-type-b-line", ring: "ring-type-b-line" },
  C: { name: "Desarrollador", bg: "bg-type-c", fg: "text-type-c-fg", line: "bg-type-c-line", ring: "ring-type-c-line" },
  D: { name: "Implementador", bg: "bg-type-d", fg: "text-type-d-fg", line: "bg-type-d-line", ring: "ring-type-d-line" },
};

// ---- Estado global de la app ----
const state = {
  phase: "void", // "void" | "reading" | "loaded"
  people: [],
  size: 5,
  assign: {}, // personId -> índice de grupo (todos quedan siempre asignados a alguno)
  dragId: null,
};

function initials(name) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("");
}

// =====================================================================
// TODO — lo vemos juntos: LÓGICA REAL (reemplaza estos placeholders)
// =====================================================================

// Lee el archivo y entrega las filas crudas a `onDone` (asíncrono: no
// se puede devolver con `return`, ver CLAUDE.md — ojo que la fila 2
// tiene los encabezados reales, no la fila 1).
function parseExcelFile(file, onDone) {
  const reader = new FileReader();
  reader.onload = function () {
    const book = XLSX.read(reader.result, { type: "array" });
    const sheetName = book.SheetNames[0];
    const sheet = book.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    onDone(rows);
  };
  reader.readAsArrayBuffer(file);
}

// Detecta en qué columna del Excel quedó cada dato que nos interesa,
// por texto normalizado (trim + sin tildes/mayúsculas) — no por
// posición, para seguir funcionando si el formulario reordena las
// preguntas en otro semestre.
function detectColumns(headerRow) {
  const nameIndex = headerRow.findIndex((cell) => normalizeText(cell) === "nombre");
  const emailIndex = headerRow.findIndex((cell) => normalizeText(cell) === "correo electronico");
  const questionColumns = QUESTIONS.map((q) => ({
    type: q.type,
    index: headerRow.findIndex((cell) => normalizeText(cell) === normalizeText(q.text)),
  }));

  return { nameIndex, emailIndex, questionColumns };
}

function computeType(row, columns) {
  const counts = {A:0, B:0, C:0, D:0};

  columns.questionColumns.forEach((q) => {
    const answer = row[q.index];
    if (normalizeText(answer) === "si") {
      counts[q.type]++;
    }
  });

  const maxCount = Math.max(counts.A, counts.B, counts.C, counts.D); 
  const topTypes = Object.keys(counts).filter((t) => counts[t] === maxCount);

  return topTypes.join("/");
}

function buildPeople(rows, columns) {
  const dataRows = rows.slice(2);

  return dataRows.filter((row) => row[columns.nameIndex]).map((row, i) => {
    const type = computeType(row, columns);
    return{
      id: i+1,
      name: row[columns.nameIndex],
      mail: row[columns.emailIndex],
      type,
      mixed: type.includes("/")
    };
  });
}

// TODO — placeholder: algoritmo de balanceo provisional, inspirado en
// el mockup de Claude Design. Hay que revisarlo juntos contra la regla
// exacta del CLAUDE.md (máx. 2 por tipo, 3 solo si es matemáticamente
// inevitable) antes de darlo por definitivo. Los tipos mixtos se
// reparten al final entre los grupos más chicos, junto con todos los
// demás (ver CLAUDE.md — decisión revisada, ya no quedan sin asignar).
function balanceGroups(people, size) {
  const solo = people.filter((p) => !p.mixed);
  const groupCount = Math.max(1, Math.ceil(people.length / size));
  const base = Math.floor(people.length / groupCount);
  const rem = people.length % groupCount;
  const cap = Array.from({ length: groupCount }, (_, i) => base + (i < rem ? 1 : 0));

  const buckets = { A: [], B: [], C: [], D: [] };
  solo.forEach((p) => buckets[p.type].push(p));
  Object.keys(buckets).forEach((k) => buckets[k].sort(() => Math.random() - 0.5));
  const order = Object.keys(buckets).sort((a, b) => buckets[b].length - buckets[a].length);

  const groups = Array.from({ length: groupCount }, () => []);
  const assign = {};
  let cursor = 0;

  order.forEach((t) => {
    buckets[t].forEach((p) => {
      let placed = false;
      for (let maxSameType = 2; maxSameType <= 5 && !placed; maxSameType++) {
        for (let k = 0; k < groupCount; k++) {
          const i = (cursor + k) % groupCount;
          const sameTypeCount = groups[i].filter((x) => x.type === t).length;
          if (groups[i].length < cap[i] && sameTypeCount < maxSameType) {
            groups[i].push(p);
            assign[p.id] = i;
            cursor = i + 1;
            placed = true;
            break;
          }
        }
      }
    });
  });

  people.filter((p) => p.mixed).forEach((p) => {
    let smallest = 0;
    for (let i = 1; i < groupCount; i++) {
      if (groups[i].length < groups[smallest].length) smallest = i;
    }
    groups[smallest].push(p);
    assign[p.id] = smallest;
  });

  return assign;
}

function setPhase(phase) {
  state.phase = phase;
  // La capa negra (#phaseCover) solo se desvanece al entrar/salir de
  // "loaded" (transition-opacity en index.html). Cambiar entre "void"
  // y "reading" es instantáneo: ambos viven dentro de la misma capa
  // negra, así que no hay nada que transicionar entre ellos.
  el.cover.classList.toggle("opacity-0", phase === "loaded");
  el.cover.classList.toggle("pointer-events-none", phase === "loaded");
  el.void.classList.toggle("hidden", phase !== "void");
  el.reading.classList.toggle("hidden", phase !== "reading");
  el.reading.classList.toggle("flex", phase === "reading");
  el.loaded.classList.toggle("hidden", phase !== "loaded");
}

function startLoading(people, label) {
  setPhase("reading");
  el.readingLabel.textContent = label || `Leyendo ${people.length} respuestas…`;
  setTimeout(() => {
    state.people = people;
    state.assign = balanceGroups(people, state.size);
    setPhase("loaded");
    render();
  }, 1100);
}

function typeChip(person) {
  const span = document.createElement("span");
  span.className = "w-7 h-7 rounded-[9px] flex items-center justify-center text-[10.5px] font-semibold flex-none";
  if (person.mixed) {
    const [t1, t2] = person.type.split("/");
    span.style.background = `linear-gradient(135deg, var(--color-type-${t1.toLowerCase()}) 50%, var(--color-type-${t2.toLowerCase()}) 50%)`;
    span.style.color = "rgba(27,26,24,.62)";
  } else {
    span.classList.add(TYPES[person.type].bg, TYPES[person.type].fg);
  }
  span.textContent = initials(person.name);
  return span;
}

function personRow(person) {
  const row = document.createElement("div");
  row.className = "flex items-center gap-2.5 pl-2 pr-3 py-2 rounded-xl cursor-grab transition hover:-translate-y-px hover:shadow-md bg-transparent";
  row.draggable = true;
  row.dataset.personId = person.id;

  row.appendChild(typeChip(person));

  const name = document.createElement("span");
  name.className = "text-[13.5px] leading-tight flex-1 min-w-0 truncate";
  name.textContent = person.name;
  row.appendChild(name);

  const short = document.createElement("span");
  short.className = "text-[10.5px] uppercase tracking-wide opacity-70";
  short.textContent = person.type;
  row.appendChild(short);

  row.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", String(person.id));
    state.dragId = person.id;
    row.classList.add("opacity-40");
  });
  row.addEventListener("dragend", () => {
    state.dragId = null;
    row.classList.remove("opacity-40");
  });
  row.addEventListener("mouseenter", () => showHoverCard(person));
  row.addEventListener("mouseleave", hideHoverCard);

  return row;
}

// Lee el grupo actual de `state.assign` en el momento del hover (no un
// valor capturado al crear la fila), para que siga siendo correcto
// incluso después de mover a la persona con drag & drop.
function showHoverCard(person) {
  const groupIndex = state.assign[person.id];
  const where = "Grupo " + String(groupIndex + 1).padStart(2, "0");
  const typeLabel = person.mixed
    ? person.type.split("/").map((t) => TYPES[t].name).join(" / ")
    : TYPES[person.type].name;

  el.hoverCard.innerHTML = "";
  el.hoverCard.classList.remove("hidden");
  el.hoverCard.classList.add("flex");

  const avatar = typeChip(person);
  avatar.className = avatar.className.replace("w-7 h-7 rounded-[9px]", "w-[38px] h-[38px] rounded-[13px] text-[13px]");
  el.hoverCard.appendChild(avatar);

  const info = document.createElement("div");
  info.className = "flex flex-col gap-0.5";
  info.innerHTML = `<span class="text-[15px]">${person.name}</span><span class="text-[11.5px] text-cream/50">${typeLabel}</span>`;
  el.hoverCard.appendChild(info);

  const sep = document.createElement("span");
  sep.className = "w-px self-stretch bg-cream/15";
  el.hoverCard.appendChild(sep);

  const meta = document.createElement("div");
  meta.className = "flex flex-col gap-0.5";
  meta.innerHTML = `<span class="text-[11px] tracking-wide uppercase text-cream/40">${where}</span><span class="text-[12.5px] text-cream/70">${person.mail}</span>`;
  el.hoverCard.appendChild(meta);
}

function hideHoverCard() {
  el.hoverCard.classList.add("hidden");
  el.hoverCard.classList.remove("flex");
}

// Cuenta tipos y decide si un grupo queda con 3 del mismo tipo.
function groupMeta(members) {
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  members.forEach((p) => (p.mixed ? p.type.split("/") : [p.type]).forEach((t) => (counts[t] += p.mixed ? 0.5 : 1)));
  const over = Object.values(counts).some((c) => c >= 3);
  return { counts, over };
}

function groupCard(members, index) {
  const card = document.createElement("section");
  card.dataset.groupIndex = index;

  const { counts, over } = groupMeta(members);
  card.className = `rounded-[18px] border p-4 flex flex-col gap-3.5 bg-white transition-shadow animate-rise ${over ? "border-[var(--color-warn-line)]" : "border-ink/10"}`;
  card.style.animationDelay = index * 60 + "ms";

  const head = document.createElement("div");
  head.className = "flex items-baseline justify-between gap-2";
  head.innerHTML = `
    <span class="font-display text-[22px] leading-none tracking-tight">Grupo ${String(index + 1).padStart(2, "0")}</span>
    <span class="group-status text-[11px] tracking-wide uppercase" style="color:${over ? "var(--color-warn)" : "rgba(27,26,24,.36)"}">${over ? "3 iguales" : members.length + " personas"}</span>
  `;
  card.appendChild(head);

  const bars = document.createElement("div");
  bars.className = "group-bars flex gap-1";
  renderBars(bars, counts);
  card.appendChild(bars);

  const list = document.createElement("div");
  list.className = "member-list flex flex-col gap-1.5";
  members.forEach((p) => list.appendChild(personRow(p)));
  card.appendChild(list);

  card.addEventListener("dragover", (e) => e.preventDefault());
  card.addEventListener("drop", (e) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData("text/plain"));
    if (id) movePerson(id, index);
  });

  return card;
}

function renderBars(bars, counts) {
  bars.innerHTML = "";
  Object.keys(TYPES).forEach((t) => {
    if (!counts[t]) return;
    const bar = document.createElement("span");
    bar.className = `h-1 rounded-full ${TYPES[t].line}`;
    bar.style.flex = String(counts[t]);
    bars.appendChild(bar);
  });
  if (!bars.children.length) {
    const bar = document.createElement("span");
    bar.className = "h-1 rounded-full flex-1 bg-ink/10";
    bars.appendChild(bar);
  }
}

// Actualiza solo el encabezado/barras de un grupo (sin tocar el resto
// de la pantalla). La usa movePerson() para que arrastrar a alguien no
// reconstruya ni reanime todas las tarjetas — solo la fila se mueve y
// los dos grupos afectados actualizan su cuenta.
function refreshGroupCard(index) {
  const card = el.groupsGrid.querySelector(`[data-group-index="${index}"]`);
  if (!card) return;
  const members = state.people.filter((p) => state.assign[p.id] === index);
  const { counts, over } = groupMeta(members);

  card.classList.toggle("border-ink/10", !over);
  card.classList.toggle("border-[var(--color-warn-line)]", over);

  const status = card.querySelector(".group-status");
  status.textContent = over ? "3 iguales" : members.length + " personas";
  status.style.color = over ? "var(--color-warn)" : "rgba(27,26,24,.36)";

  renderBars(card.querySelector(".group-bars"), counts);
}

// Mueve una persona de un grupo a otro sin re-renderizar toda la
// página: reubica su fila en el DOM y solo refresca los dos grupos
// involucrados (origen y destino).
function movePerson(personId, targetIndex) {
  const sourceIndex = state.assign[personId];
  if (sourceIndex === targetIndex) return;

  state.assign[personId] = targetIndex;

  const row = el.groupsGrid.querySelector(`[data-person-id="${personId}"]`);
  const targetList = el.groupsGrid.querySelector(`[data-group-index="${targetIndex}"] .member-list`);
  if (row && targetList) targetList.appendChild(row);

  if (sourceIndex !== undefined) refreshGroupCard(sourceIndex);
  refreshGroupCard(targetIndex);
}

// Reconstruye toda la pantalla: solo hace falta cuando cambia quién
// participa o cuántos grupos hay (carga inicial, rebarajar, cambiar
// tamaño). El drag & drop normal usa movePerson(), no esta función.
function render() {
  el.legend.innerHTML = "";
  Object.entries(TYPES).forEach(([key, t]) => {
    const count = state.people.filter((p) => p.type === key).length;
    const item = document.createElement("div");
    item.className = "flex items-center gap-2.5";
    item.innerHTML = `
      <span class="w-[11px] h-[11px] rounded-[4px] ${t.bg} ring-1 ring-inset ${t.ring}"></span>
      <span class="text-[13px] text-ink/70">${t.name}</span>
      <span class="text-[11.5px] text-ink/35">${count}</span>
    `;
    el.legend.appendChild(item);
  });

  const groupCount = Math.max(0, ...Object.values(state.assign), -1) + 1;
  el.groupsGrid.innerHTML = "";
  for (let i = 0; i < groupCount; i++) {
    const members = state.people.filter((p) => state.assign[p.id] === i);
    el.groupsGrid.appendChild(groupCard(members, i));
  }
}

function reshuffle() {
  state.assign = balanceGroups(state.people, state.size);
  const current = Number((el.reshuffleIcon.style.transform.match(/-?\d+/) || [0])[0]);
  el.reshuffleIcon.style.transform = `rotate(${current + 360}deg)`;
  render();
}

function rowsForExport() {
  const out = [["Grupo", "Nombre", "Correo", "Tipo"]];
  state.people.forEach((p) => {
    const g = state.assign[p.id];
    out.push(["Grupo " + String(g + 1).padStart(2, "0"), p.name, p.mail, p.type]);
  });
  return out;
}

function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ---- Eventos de la interfaz ----

el.fileInput.addEventListener("change", () => {
  const file = el.fileInput.files[0];
  if (!file) return;

  parseExcelFile(file, (rows) => {
    const headerRow = rows[1];
    const columns = detectColumns(headerRow);
    const people = buildPeople(rows, columns);
    
    startLoading(people, `Leyendo ${file.name}…`);
  });
});

el.sizeInc.addEventListener("click", () => {
  state.size = Math.min(8, state.size + 1);
  el.sizeVal.textContent = state.size;
  state.assign = balanceGroups(state.people, state.size);
  render();
});
el.sizeDec.addEventListener("click", () => {
  state.size = Math.max(3, state.size - 1);
  el.sizeVal.textContent = state.size;
  state.assign = balanceGroups(state.people, state.size);
  render();
});

el.reshuffleBtn.addEventListener("click", reshuffle);

el.exportCsvBtn.addEventListener("click", () => {
  const csv = "﻿" + rowsForExport().map((r) => r.join(";")).join("\n");
  downloadBlob("grupos.csv", new Blob([csv], { type: "text/csv;charset=utf-8" }));
});

el.exportXlsxBtn.addEventListener("click", () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rowsForExport()), "Grupos");
  XLSX.writeFile(wb, "grupos.xlsx");
});

el.resetBtn.addEventListener("click", () => {
  state.people = [];
  state.assign = {};
  el.fileInput.value = "";
  setPhase("void");
});
