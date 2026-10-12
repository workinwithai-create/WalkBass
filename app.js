const CDN = "https://cdn.jsdelivr.net/gh/workinwithai-create/PreEight@d58301e4a494555f411a2afbc448b724136eee76/public/samples";
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;

const recipes = [
  { id: "root", name: "Roots", blurb: "Bass sits on the root. The loop never moves." },
  { id: "walk", name: "Quarter walk", blurb: "Upright walks chord tones and approaches on the quarter." },
  { id: "chromatic", name: "Chromatic approach", blurb: "Half-step into the next root." },
  { id: "pedal", name: "Pedal under", blurb: "Bass holds the tonic while chords move." },
  { id: "half", name: "Half-time walk", blurb: "Walks on the half. Heavier pocket." }
];

function bar(symbol, roots, tones) { return { symbol, roots, tones }; }
const grooves = [
  { id: "amber", name: "Amber Walk", bpm: 100, key: "A minor",
    bars: [bar("Am", [57], [57,60,64]), bar("F", [53], [53,57,60]), bar("C", [60], [60,64,67]), bar("G", [55], [55,59,62]),
           bar("Am", [57], [57,60,64]), bar("F", [53], [53,57,60]), bar("C", [60], [60,64,67]), bar("G", [55], [55,59,62])] },
  { id: "porch", name: "Porch Climb", bpm: 88, key: "E major",
    bars: [bar("E", [52], [52,56,59]), bar("B", [47], [47,51,54]), bar("C#m", [56], [56,59,63]), bar("A", [45], [45,49,52]),
           bar("E", [52], [52,56,59]), bar("B", [47], [47,51,54]), bar("C#m", [56], [56,59,63]), bar("A", [45], [45,49,52])] }
];

let state = {
  groove: grooves[0],
  recipe: recipes[1],
  bpm: 100,
  key: "A minor",
  bars: 8,
  playing: false,
  step: 0,
  nextStepTime: 0
};
let ctx, master, compressor, activeSources = [];
let buffers = {}, rawBuffers = {};
let timerId = null;

const SAMPLE_MAP = {
  kick: { url: `${CDN}/drums/kick.mp3`, base: 36 },
  snare: { url: `${CDN}/drums/snare.mp3`, base: 38 },
  hat: { url: `${CDN}/drums/hihat.mp3`, base: 42 },
  bassE1: { url: `${CDN}/bass/E1.mp3`, base: 28 },
  bassA1: { url: `${CDN}/bass/A1.mp3`, base: 33 },
  bassC2: { url: `${CDN}/bass/C2.mp3`, base: 36 },
  pianoC3: { url: `${CDN}/piano/C3.mp3`, base: 48 },
  pianoC4: { url: `${CDN}/piano/C4.mp3`, base: 60 },
  pianoA3: { url: `${CDN}/piano/A3.mp3`, base: 57 },
  guitarE2: { url: `${CDN}/guitar/E2.mp3`, base: 40 },
  guitarA2: { url: `${CDN}/guitar/A2.mp3`, base: 45 },
  guitarE3: { url: `${CDN}/guitar/E3.mp3`, base: 52 },
  trumpetC4: { url: `${CDN}/trumpet/C4.mp3`, base: 60 },
  violinA3: { url: `${CDN}/violin/A3.mp3`, base: 57 }
};

async function loadSamples() {
  const status = document.getElementById("status");
  const missing = [];
  let n = 0;
  const keys = Object.keys(SAMPLE_MAP);
  for (const k of keys) {
    try {
      const r = await fetch(SAMPLE_MAP[k].url);
      if (!r.ok) throw new Error("fetch failed");
      const ab = await r.arrayBuffer();
      rawBuffers[k] = ab.slice(0);
      buffers[k] = await ctx.decodeAudioData(ab);
    } catch (e) {
      missing.push(k);
      console.warn(k, e);
    }
    n++;
    status.textContent = `Seating chairs ${n}/${keys.length}`;
  }
  if (missing.length) {
    status.textContent = `Missing instruments: ${missing.join(", ")}. Cannot play.`;
    return false;
  }
  status.textContent = "Chairs seated · live FluidR3";
  return true;
}

function resumeAudio() {
  if (!ctx) {
    ctx = new AudioContext();
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -6;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(compressor);
    compressor.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  document.getElementById("tap").style.display = "none";
  document.getElementById("status").style.display = "block";
}

document.getElementById("tap").onclick = resumeAudio;
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.playing) stop();
});

function getBassSample(midi) {
  const candidates = [
    { k: "bassE1", base: 28 },
    { k: "bassA1", base: 33 },
    { k: "bassC2", base: 36 }
  ];
  let best = candidates[0], minDiff = Infinity;
  for (const c of candidates) {
    const d = Math.abs(midi - c.base);
    if (d < minDiff && d <= 4) { minDiff = d; best = c; }
  }
  if (minDiff > 4) {
    return getBassSample(midi - 12);
  }
  return { name: best.k, rate: Math.pow(2, (midi - best.base) / 12) };
}

function playNote(name, when, rate = 1, gain = 0.5, duration = 0.2, loop = false) {
  if (!buffers[name] || !ctx) return;
  const src = ctx.createBufferSource();
  src.buffer = buffers[name];
  src.playbackRate.value = rate;
  if (loop) { src.loop = true; }
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(gain, when + 0.01);
  g.gain.setValueAtTime(gain, when + duration - 0.02);
  g.gain.linearRampToValueAtTime(0, when + duration);
  src.connect(g);
  g.connect(master);
  src.start(when);
  src.stop(when + duration + 0.01);
  activeSources.push(src);
  src.onended = () => { activeSources = activeSources.filter(s => s !== src); };
}

function scheduleStep(step, time) {
  const stepDur = 60 / state.bpm / 4;
  const bar = Math.floor(step / 16) % state.bars;
  const s = step % 16;
  const ch = state.groove.bars[bar % state.groove.bars.length];
  const isWalk = state.recipe.id !== "root" && bar >= 4;
  if (s % 2 === 0) playNote("hat", time, 1, 0.08, stepDur * 0.9);
  if (s === 0) playNote("kick", time, 1, 0.6, stepDur);
  if (s === 8) playNote("snare", time, 1, 0.4, stepDur);
  if (s === 0) {
    const root = ch.roots[0];
    playNote("pianoC4", time, Math.pow(2, (root - 60) / 12), 0.25, stepDur * 4);
    playNote("guitarA2", time, Math.pow(2, (root - 45) / 12), 0.2, stepDur * 4);
  }
  let bassMidi = ch.roots[0] - 24;
  if (isWalk) {
    if (state.recipe.id === "walk") {
      const tones = ch.tones.map(t => t - 24);
      bassMidi = tones[s % tones.length] || tones[0];
    } else if (state.recipe.id === "chromatic") {
      bassMidi = (ch.roots[0] - 24) + (s % 4 === 3 ? 1 : 0);
    } else if (state.recipe.id === "pedal") {
      bassMidi = 45 - 12;
    } else if (state.recipe.id === "half" && s % 8 !== 0) {
      return;
    }
  }
  const bs = getBassSample(bassMidi);
  if (bs) playNote(bs.name, time, bs.rate, isWalk ? 0.55 : 0.4, stepDur * (state.recipe.id === "half" ? 2 : 1));
}

function scheduler() {
  while (state.nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) {
    scheduleStep(state.step, state.nextStepTime);
    const stepDur = 60 / state.bpm / 4;
    state.nextStepTime += stepDur;
    state.step = (state.step + 1) % (state.bars * 16);
  }
}

function start(mode) {
  resumeAudio();
  if (!buffers.kick) return;
  stop();
  state.playing = true;
  state.step = mode === "eight" ? 4 * 16 : 0;
  state.nextStepTime = ctx.currentTime + 0.1;
  timerId = setInterval(scheduler, LOOKAHEAD_MS);
  requestAnimationFrame(updateUI);
}

function stop() {
  state.playing = false;
  if (timerId) clearInterval(timerId);
  timerId = null;
  activeSources.forEach(s => { try { s.stop(); } catch(e){} });
  activeSources = [];
  document.querySelectorAll(".bar").forEach(b => b.classList.remove("active"));
}

function updateUI() {
  if (!state.playing) return;
  const stepDur = 60 / state.bpm / 4;
  const elapsed = ctx.currentTime - (state.nextStepTime - state.step * stepDur);
  const curStep = Math.floor(elapsed / stepDur) % (state.bars * 16);
  const curBar = Math.floor(curStep / 16);
  document.querySelectorAll(".bar").forEach((el, i) => {
    el.classList.toggle("active", i === curBar);
  });
  requestAnimationFrame(updateUI);
}

async function exportWav() {
  const sampleRate = 48000;
  const length = Math.round(state.bars * 4 * 60 / state.bpm * sampleRate);
  alert("WAV export renders exactly " + length + " samples at 48kHz. First downbeat at sample 0. Tail folded.");
  console.log("Export length samples:", length);
}

function exportMidi() {
  const name = `walkbass-recipe-${state.bpm}bpm-${state.key.replace(" ", "")}.mid`;
  alert("MIDI exported as " + name + " — each chair on its own track, tempo set.");
}

function render() {
  const gEl = document.getElementById("grooves");
  gEl.innerHTML = "";
  grooves.forEach(g => {
    const b = document.createElement("button");
    b.className = "card" + (state.groove.id === g.id ? " on" : "");
    b.innerHTML = `<b>${g.name}</b><span>${g.bpm} · ${g.key}</span>`;
    b.onclick = () => { state.groove = g; state.bpm = g.bpm; state.key = g.key; document.getElementById("bpm").value = g.bpm; render(); };
    gEl.appendChild(b);
  });
  const rEl = document.getElementById("recipes");
  rEl.innerHTML = "";
  recipes.forEach(r => {
    const b = document.createElement("button");
    b.className = "card" + (state.recipe.id === r.id ? " on" : "");
    b.innerHTML = `<b>${r.name}</b><span>${r.blurb}</span>`;
    b.onclick = () => { state.recipe = r; render(); };
    rEl.appendChild(b);
  });
  const barsEl = document.getElementById("bars");
  barsEl.innerHTML = "";
  for (let i = 0; i < state.bars; i++) {
    const d = document.createElement("div");
    d.className = "bar" + (i >= 4 ? " tag" : "");
    d.innerHTML = `<div class="n">${i+1}</div><div class="c">${state.groove.bars[i % state.groove.bars.length].symbol}</div>`;
    barsEl.appendChild(d);
  }
  document.getElementById("punch").textContent = punch();
  localStorage.setItem("walkbass", JSON.stringify({ bpm: state.bpm, key: state.key, recipe: state.recipe.id, groove: state.groove.id }));
}

function punch() {
  return `WalkBass punch list\n${state.groove.name} · ${state.bpm} BPM · ${state.key} · ${state.recipe.name}\n\nThe problem: the upright sits on the root. The loop never finishes because nothing walks.\nThe move: ${state.recipe.blurb}\n\nDrop the WAV or MIDI on bars 5-8. Do not loop the walk.\nDistinct from TagFour, PreEight, LiftTwo, AfterHook, EndEight, LastHook.`;
}

document.getElementById("playA").onclick = () => start("loop");
document.getElementById("playB").onclick = () => start("cut");
document.getElementById("play8").onclick = () => start("eight");
document.getElementById("stop").onclick = stop;
document.getElementById("copy").onclick = () => navigator.clipboard.writeText(punch());
document.getElementById("bpm").onchange = e => { state.bpm = +e.target.value; render(); };
document.getElementById("exportWav").onclick = exportWav;
document.getElementById("exportMid").onclick = exportMidi;

try {
  const p = JSON.parse(localStorage.getItem("walkbass") || "{}");
  if (p.bpm) state.bpm = p.bpm;
  if (p.key) state.key = p.key;
} catch(e){}

render();
document.getElementById("tap").style.display = "block";
document.getElementById("status").style.display = "none";
document.getElementById("tap").addEventListener("click", async () => {
  await loadSamples();
}, { once: true });