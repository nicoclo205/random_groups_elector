// =====================================================================
// Creación de Grupos — app.js
//
// Este archivo tiene dos partes bien separadas:
//
//  1) INTERFAZ (ya implementada): estados de la pantalla, tarjetas de
//     grupo, drag & drop, exportar, animaciones. Usa datos de EJEMPLO
//     (DEMO_PEOPLE) mientras no conectamos el Excel real.
//
//  2) LÓGICA REAL (marcada con "TODO — lo vemos juntos"): parsear el
//     Excel de verdad, detectar columnas por texto, calcular el tipo
//     de cada persona a partir de sus respuestas Sí/No, y el algoritmo
//     de balanceo definitivo según las reglas del CLAUDE.md. Por ahora
//     esas funciones son placeholders que devuelven los datos de
//     ejemplo, para que toda la interfaz ya se pueda probar.
// =====================================================================

// ---- Catálogo de tipos (colores definidos en index.html vía @theme) ----
const TYPES = {
  A: { name: "Clarificador", short: "Clar", chip: "chip-a", line: "line-a", dot: "dot-a" },
  B: { name: "Ideador", short: "Idea", chip: "chip-b", line: "line-b", dot: "dot-b" },
  C: { name: "Desarrollador", short: "Desa", chip: "chip-c", line: "line-c", dot: "dot-c" },
  D: { name: "Implementador", short: "Impl", chip: "chip-d", line: "line-d", dot: "dot-d" },
};

// ---- Datos de ejemplo (fICTICIOS — solo para probar la interfaz) ----
const DEMO_NAMES = [
  ["Valentina Ríos", "A"], ["Mateo Cárdenas", "B"], ["Salomé Aguirre", "C"], ["Tomás Bermúdez", "D"],
  ["Isabela Quintero", "A"], ["Emiliano Vega", "B"], ["Antonia Restrepo", "C"], ["Joaquín Pardo", "D"],
  ["Manuela Ospina", "A"], ["Samuel Echeverri", "B"], ["Luciana Mejía", "C"], ["Bruno Salazar", "D"],
  ["Camila Arango", "A"], ["Nicolás Zapata", "B"], ["Renata Villamil", "C"], ["Andrés Bustos", "D"],
  ["Julieta Ferrer", "A"], ["Gabriel Montoya", "B"], ["Amelia Cifuentes", "C"], ["Simón Trujillo", "D"],
  ["Elena Naranjo", "A"], ["Facundo Peláez", "B"], ["Paulina Escobar", "C"], ["Martín Lozano", "A/C"],
  ["Sofía Gallego", "A"], ["Lorenzo Duque", "B"], ["Mariana Botero", "C"], ["Iván Céspedes", "D"],
  ["Catalina Uribe", "A"], ["Dante Molina", "B"], ["Ximena Palacio", "C"], ["Rafael Guzmán", "B/D"],
  ["Alejandra Serna", "A"], ["Teo Castrillón", "B"], ["Violeta Henao", "A"], ["Nicolás Reina", "B"],
  ["Daniela Torrado", "D"], ["Esteban Marín", "D"], ["Fernanda Robles", "C/D"], ["Óscar Villegas", "B"],
];

function buildDemoPeople() {
  return DEMO_NAMES.map(([name, type], i) => ({
    id: i + 1,
    name,
    type,
    mixed: type.includes("/"),
    mail: name.toLowerCase().normalize("NFD")
      .split("").filter((ch) => { const code = ch.charCodeAt(0); return code < 0x300 || code > 0x36f; }).join("")
      .replace(/ /g, ".") + "@uni.edu",
  }));
}

// ---- Estado global de la app ----
const state = {
  phase: "void", // "void" | "reading" | "loaded"
  people: [],
  size: 5,
  assign: {}, // personId -> índice de grupo, o "tray" si es tipo mixto sin asignar
  dragId: null,
};

function initials(name) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("");
}

// =====================================================================
// TODO — lo vemos juntos: LÓGICA REAL (reemplaza estos placeholders)
// =====================================================================

// TODO: leer el archivo con FileReader + XLSX.read (ver CLAUDE.md,
// ojo que la fila 2 tiene los encabezados reales, no la fila 1).
function parseExcelFile(file) {
  console.warn("TODO: parsear el Excel real. Por ahora se usan datos de ejemplo.");
  return buildDemoPeople();
}

// TODO: detectar columnas de Nombre / Correo / las 32 preguntas por
// texto de encabezado normalizado (trim + sin tildes/mayúsculas).
function detectColumns(headerRow) {
  console.warn("TODO: detección de columnas por texto.");
}

// TODO: contar "Sí" por bloque (A/B/C/D, ver tabla de mapeo en
// CLAUDE.md) y asignar el tipo de mayor conteo; empate -> tipo mixto.
function computeType(answers) {
  console.warn("TODO: cálculo de tipo por persona.");
}

// TODO — placeholder: algoritmo de balanceo provisional, inspirado en
// el mockup de Claude Design. Hay que revisarlo juntos contra la regla
// exacta del CLAUDE.md (máx. 2 por tipo, 3 solo si es matemáticamente
// inevitable) antes de darlo por definitivo.
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

// =====================================================================
// INTERFAZ (ya implementada)
// =====================================================================

const el = {
  void: document.getElementById("phase-void"),
  reading: document.getElementById("phase-reading"),
  loaded: document.getElementById("phase-loaded"),
  readingLabel: document.getElementById("readingLabel"),
  fileInput: document.getElementById("fileInput"),
  demoBtn: document.getElementById("demoBtn"),
  legend: document.getElementById("legend"),
  trayWrap: document.getElementById("trayWrap"),
  tray: document.getElementById("tray"),
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

function setPhase(phase) {
  state.phase = phase;
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
    span.classList.add(TYPES[person.type].chip);
  }
  span.textContent = initials(person.name);
  return span;
}

function personRow(person, groupIndex) {
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
  short.textContent = person.mixed ? person.type + " · Mixto" : person.type + " · " + TYPES[person.type].short;
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
  row.addEventListener("mouseenter", () => showHoverCard(person, groupIndex));
  row.addEventListener("mouseleave", hideHoverCard);

  return row;
}

function showHoverCard(person, groupIndex) {
  const where = groupIndex === "tray" ? "Sin asignar" : "Grupo " + String(groupIndex + 1).padStart(2, "0");
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

function groupCard(members, index) {
  const card = document.createElement("section");
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  members.forEach((p) => (p.mixed ? p.type.split("/") : [p.type]).forEach((t) => (counts[t] += p.mixed ? 0.5 : 1)));
  const over = Object.values(counts).some((c) => c >= 3);

  card.className = `rounded-[18px] border p-4 flex flex-col gap-3.5 bg-white transition-shadow animate-rise ${over ? "border-[var(--color-warn-line)]" : "border-ink/10"}`;
  card.style.animationDelay = index * 60 + "ms";

  const head = document.createElement("div");
  head.className = "flex items-baseline justify-between gap-2";
  head.innerHTML = `
    <span class="font-display text-[22px] leading-none tracking-tight">Grupo ${String(index + 1).padStart(2, "0")}</span>
    <span class="text-[11px] tracking-wide uppercase" style="color:${over ? "var(--color-warn)" : "rgba(27,26,24,.36)"}">${over ? "3 iguales" : members.length + " personas"}</span>
  `;
  card.appendChild(head);

  const bars = document.createElement("div");
  bars.className = "flex gap-1";
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
  card.appendChild(bars);

  const list = document.createElement("div");
  list.className = "flex flex-col gap-1.5";
  members.forEach((p) => list.appendChild(personRow(p, index)));
  card.appendChild(list);

  card.addEventListener("dragover", (e) => e.preventDefault());
  card.addEventListener("drop", (e) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData("text/plain"));
    if (id) {
      state.assign[id] = index;
      render();
    }
  });

  return card;
}

function render() {
  // Leyenda
  el.legend.innerHTML = "";
  Object.entries(TYPES).forEach(([key, t]) => {
    const count = state.people.filter((p) => p.type === key).length;
    const item = document.createElement("div");
    item.className = "flex items-center gap-2.5";
    item.innerHTML = `
      <span class="w-[11px] h-[11px] rounded-[4px] ${t.dot}"></span>
      <span class="text-[13px] text-ink/70">${t.name}</span>
      <span class="text-[11.5px] text-ink/35">${count}</span>
    `;
    el.legend.appendChild(item);
  });

  // Bandeja de tipos mixtos sin asignar
  const trayPeople = state.people.filter((p) => state.assign[p.id] === "tray");
  el.trayWrap.classList.toggle("hidden", trayPeople.length === 0);
  el.tray.innerHTML = "";
  trayPeople.forEach((p) => el.tray.appendChild(personRow(p, "tray")));
  el.tray.ondragover = (e) => e.preventDefault();
  el.tray.ondrop = (e) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData("text/plain"));
    if (id) {
      state.assign[id] = "tray";
      render();
    }
  };

  // Tarjetas de grupo
  const groupCount = Math.max(0, ...Object.values(state.assign).filter((v) => v !== "tray"), -1) + 1;
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
    out.push([g === "tray" ? "Sin asignar" : "Grupo " + String(g + 1).padStart(2, "0"), p.name, p.mail, p.type]);
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

el.demoBtn.addEventListener("click", () => startLoading(buildDemoPeople()));

el.fileInput.addEventListener("change", () => {
  const file = el.fileInput.files[0];
  if (!file) return;
  // TODO: reemplazar por el resultado real de parseExcelFile(file)
  // una vez conectemos SheetJS de verdad.
  startLoading(parseExcelFile(file), `Leyendo ${file.name}…`);
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
