// BeatSketch — Tone.js
const STEPS = 16;
const TRACKS = [
  { name: "Kick",  synth: new Tone.MembraneSynth().toDestination(), note: "C2" },
  { name: "Snare", synth: new Tone.NoiseSynth({ volume: -6, envelope: { attack: 0.001, decay: 0.2, sustain: 0 } }).toDestination(), note: null },
  { name: "Clap",  synth: new Tone.NoiseSynth({ volume: -10, envelope: { attack: 0.001, decay: 0.13, sustain: 0 } }).toDestination(), note: null },
  { name: "Hihat", synth: new Tone.MetalSynth({ frequency: 250, envelope: { attack: 0.001, decay: 0.07, release: 0.01 }, volume: -8 }).toDestination(), note: "16n" }
];

const gridEl = document.getElementById("grid");
const startStopBtn = document.getElementById("startStop");
const bpmEl = document.getElementById("bpm");
const swingEl = document.getElementById("swing");
const clearBtn = document.getElementById("clear");
const exportBtn = document.getElementById("export");
const importFile = document.getElementById("importFile");

let pattern = Array.from({ length: TRACKS.length }, () => Array(STEPS).fill(false));
let playhead = -1;

// Build grid
function buildGrid() {
  gridEl.innerHTML = "";
  for (let r = 0; r < TRACKS.length; r++) {
    const label = document.createElement("div");
    label.textContent = TRACKS[r].name;
    label.className = "rowlabel";
    gridEl.appendChild(label);

    for (let c = 0; c < STEPS; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.addEventListener("click", (e) => {
        const rr = +e.currentTarget.dataset.r;
        const cc = +e.currentTarget.dataset.c;
        pattern[rr][cc] = !pattern[rr][cc];
        e.currentTarget.classList.toggle("active", pattern[rr][cc]);
      });
      gridEl.appendChild(cell);
    }
  }
}
buildGrid();

// Transport & scheduling
Tone.Transport.scheduleRepeat((time) => {
  playhead = (playhead + 1) % STEPS;

  // UI playhead
  document.querySelectorAll(".cell").forEach((el) => el.classList.remove("playhead"));
  for (let r = 0; r < TRACKS.length; r++) {
    const idx = r * (STEPS + 1) + 1 + playhead; // +1 for rowlabel
    const cell = gridEl.children[idx];
    cell && cell.classList.add("playhead");
  }

  // Trigger sounds
  TRACKS.forEach((t, r) => {
    if (pattern[r][playhead]) {
      if (t.name === "Snare" || t.name === "Clap") {
        t.synth.triggerAttackRelease("8n", time);
      } else if (t.name === "Hihat") {
        t.synth.triggerAttackRelease("16n", time);
      } else {
        t.synth.triggerAttackRelease(t.note, "8n", time);
      }
    }
  });
}, "16n");

// Controls
startStopBtn.addEventListener("click", async () => {
  await Tone.start();
  if (Tone.Transport.state !== "started") {
    Tone.Transport.start();
    startStopBtn.textContent = "⏸️ Pausar";
  } else {
    Tone.Transport.pause();
    startStopBtn.textContent = "▶️ Iniciar";
  }
});

bpmEl.addEventListener("input", () => {
  Tone.Transport.bpm.value = +bpmEl.value;
});

swingEl.addEventListener("input", () => {
  Tone.Transport.swing = (+swingEl.value) / 100;     // 0..1
  Tone.Transport.swingSubdivision = "8n";
});

clearBtn.addEventListener("click", () => {
  pattern = pattern.map(row => row.map(() => false));
  document.querySelectorAll(".cell").forEach(el => el.classList.remove("active"));
});

exportBtn.addEventListener("click", () => {
  const data = { bpm: +bpmEl.value, swing: +swingEl.value, pattern };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "beatsketch.json";
  a.click();
});

importFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    if (data.pattern?.length === TRACKS.length && data.pattern[0]?.length === STEPS) {
      pattern = data.pattern;
      bpmEl.value = data.bpm ?? bpmEl.value;
      swingEl.value = data.swing ?? swingEl.value;
      Tone.Transport.bpm.value = +bpmEl.value;
      Tone.Transport.swing = (+swingEl.value) / 100;
      // repaint
      document.querySelectorAll(".cell").forEach((el, idx) => {
        const r = Math.floor(idx / (STEPS + 1));
        const c = idx % (STEPS + 1) - 1;
        if (c >= 0) el.classList.toggle("active", pattern[r][c]);
      });
    } else {
      alert("JSON inválido para este projeto.");
    }
  } catch {
    alert("Falha ao ler o arquivo.");
  }
});

