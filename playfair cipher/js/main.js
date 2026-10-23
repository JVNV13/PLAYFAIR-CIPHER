import { run, cleanText } from "./cipher.js";
import "./rain.js";

const $ = id => document.getElementById(id);
const state = { mode: "encrypt", steps: [], index: -1, playing: false, timer: null, data: null };
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const colors = r => cssVar({ row: "--row", column: "--col", rectangle: "--rect" }[r]);
const GLYPHS = "ABCDEFGHKLMNOPQRSTUVWXYZ0123456789□ÀÉÑ$%#@";
const svg = d3.select("#matrix");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

function drawMatrix(matrix) {
  const size = Math.min(68, Math.max(43, (window.innerWidth < 700 ? window.innerWidth - 100 : 430) / 5 - 10)), gap = 9, total = 5 * size + 4 * gap;
  svg.attr("viewBox", `0 0 ${total} ${total}`).attr("preserveAspectRatio", "xMidYMid meet");
  const groups = svg.selectAll("g.cell").data(matrix, d => d.ch).join(enter => {
    const g = enter.append("g").attr("class", "cell");
    g.append("rect").attr("rx", 12).attr("width", size).attr("height", size);
    g.append("text").attr("x", size / 2).attr("y", size / 2).attr("text-anchor", "middle").attr("dominant-baseline", "central");
    g.append("text").attr("class", "cell-coord").attr("x", size - 8).attr("y", 12).attr("text-anchor", "end"); return g;
  }).attr("transform", d => `translate(${d.col * (size + gap)},${d.row * (size + gap)})`)
    .classed("key-letter", d => d.fromKey).attr("data-letter", d => d.ch);
  groups.select("rect").attr("width", size).attr("height", size);
  groups.select("text:not(.cell-coord)").text(d => d.ch);
  if (!reducedMotion.matches) groups.select("text:not(.cell-coord)").transition().duration(650).delay((d, i) => d.fromKey ? i * 24 : 160 + i * 12)
    .tween("decode", function (d) { return t => { this.textContent = t < .8 ? GLYPHS[Math.random() * GLYPHS.length | 0] : d.ch; }; });
  groups.select(".cell-coord").text(d => `${d.row + 1}.${d.col + 1}`);
  if (reducedMotion.matches) groups.attr("opacity", 1);
  else groups.attr("opacity", 0).transition().duration(360).delay((d, i) => d.fromKey ? i * 24 : 160 + i * 12).ease(d3.easeCubicOut).attr("opacity", 1);
  return { size, gap, total };
}

function clearEffects() { svg.selectAll(".effect-layer").interrupt().remove(); svg.selectAll(".cell").classed("active-cell output-cell dimmed", false).select("rect").style("stroke", null).style("filter", null); }
function showEffects(step) {
  clearEffects(); if (!step) return;
  const active = new Set([step.A.ch, step.B.ch, step.outA.ch, step.outB.ch]);
  svg.selectAll(".cell").classed("dimmed", d => !active.has(d.ch)).classed("active-cell", d => d.ch === step.A.ch || d.ch === step.B.ch).classed("output-cell", d => d.ch === step.outA.ch || d.ch === step.outB.ch);
  const { size, gap, total } = drawGeometry; const color = colors(step.rule), layer = svg.append("g").attr("class", "effect-layer").attr("pointer-events", "none");
  if (step.rule === "row") layer.append("rect").attr("class", "sweep-effect").attr("x", 0).attr("y", step.A.row * (size + gap)).attr("width", 0).attr("height", size).attr("rx", 10).attr("fill", color).attr("opacity", .16).transition().duration(reducedMotion.matches ? 0 : 560).ease(d3.easeCubicInOut).attr("width", total).transition().duration(260).attr("opacity", 0).remove();
  if (step.rule === "column") layer.append("rect").attr("class", "sweep-effect").attr("x", step.A.col * (size + gap)).attr("y", 0).attr("width", size).attr("height", 0).attr("rx", 10).attr("fill", color).attr("opacity", .16).transition().duration(reducedMotion.matches ? 0 : 560).ease(d3.easeCubicInOut).attr("height", total).transition().duration(260).attr("opacity", 0).remove();
  if (step.rule === "rectangle") {
    const x1 = Math.min(step.A.col, step.B.col) * (size + gap), y1 = Math.min(step.A.row, step.B.row) * (size + gap), x2 = Math.max(step.A.col, step.B.col) * (size + gap) + size, y2 = Math.max(step.A.row, step.B.row) * (size + gap) + size;
    const p = layer.append("path").attr("d", `M${x1},${y1} H${x2} V${y2} H${x1} Z`).attr("fill", "none").attr("stroke", color).attr("stroke-width", 2.2).attr("rx", 10);
    const len = p.node().getTotalLength(); p.attr("stroke-dasharray", len).attr("stroke-dashoffset", reducedMotion.matches ? 0 : len).transition().duration(reducedMotion.matches ? 0 : 560).attr("stroke-dashoffset", 0);
  }
  const center = p => [p.col * (size + gap) + size / 2, p.row * (size + gap) + size / 2];
  [[step.A, step.outA], [step.B, step.outB]].forEach(([from, to], i) => {
    const [x1, y1] = center(from), [x2, y2] = center(to), curve = Math.max(-34, Math.min(34, (x2 - x1) * .18 || 22)) * (i ? -1 : 1);
    const p = layer.append("path").attr("d", `M${x1},${y1} Q${(x1 + x2) / 2 + curve},${(y1 + y2) / 2 - 18} ${x2},${y2}`).attr("fill", "none").attr("stroke", color).attr("stroke-width", 2).attr("marker-end", "url(#arrowhead)").attr("opacity", .92);
    const len = p.node().getTotalLength(); p.attr("stroke-dasharray", len).attr("stroke-dashoffset", reducedMotion.matches ? 0 : len).transition().duration(reducedMotion.matches ? 0 : 500).attr("stroke-dashoffset", 0);
  });
}
let drawGeometry = { size: 60, gap: 9, total: 336 };

function caption(s) {
  const dir = state.mode === "encrypt" ? { row: "right", col: "below" } : { row: "left", col: "above" };
  if (s.rule === "row") return `${s.a} and ${s.b} share a row. Move each one cell ${dir.row}: ${s.a} → ${s.outA.ch}, ${s.b} → ${s.outB.ch}.`;
  if (s.rule === "column") return `${s.a} and ${s.b} share a column. Move each one cell ${dir.col}: ${s.a} → ${s.outA.ch}, ${s.b} → ${s.outB.ch}.`;
  return `${s.a} and ${s.b} make the corners of a rectangle. Keep each letter in its own row and switch columns: ${s.a} → ${s.outA.ch}, ${s.b} → ${s.outB.ch}.`;
}
function renderSteps() {
  const rows = d3.select("#stepRows").selectAll("tr").data(state.steps, (d, i) => `${i}-${d.a}${d.b}`).join("tr").attr("class", (d, i) => `step-row rule-${d.rule}${i === state.index ? " selected" : ""}`).on("click", (_, d) => goTo(state.steps.indexOf(d)));
  rows.html((d, i) => `<td class="step-num">${String(i + 1).padStart(2, "0")}</td><td class="pair-cell">${d.a}${d.b}</td><td><span class="rule-tag"><i>${d.rule === "row" ? "↔" : d.rule === "column" ? "↕" : "⌑"}</i>${d.rule}</span></td><td class="out-cell">${d.result}</td>`);
  $("emptySteps").hidden = state.steps.length > 0;
}
function renderPairs() {
  const chips = d3.select("#pairs").selectAll(".pair-chip").data(state.steps).join("div").attr("class", (d, i) => `pair-chip rule-${d.rule}${i === state.index ? " selected" : ""}`).attr("title", d => d.reason || `${d.rule} rule`).html(d => `<span>${d.a}</span><span class="${d.inserted?.includes("b") ? "inserted" : ""}" ${d.reason ? `aria-label="${d.reason}"` : ""}>${d.b}</span>`).on("click", (_, d) => goTo(state.steps.indexOf(d)));
  chips.attr("aria-label", d => `${d.a}${d.b}${d.reason ? `, ${d.reason}` : ""}`);
  d3.select("#pairs .pairs-placeholder").remove();
}
function goTo(index) {
  if (!state.steps.length) return;
  state.index = Math.max(-1, Math.min(index, state.steps.length - 1)); const s = state.steps[state.index];
  showEffects(s); renderSteps(); renderPairs(); $("stepCount").textContent = `${Math.max(0, state.index + 1)} / ${state.steps.length}`;
  $("caption").textContent = s ? caption(s) : "Ready when you are. Start with the first pair.";
  $("output").textContent = state.steps.slice(0, state.index + 1).map(x => x.result).join("") || "";
  $("progressBar").style.width = `${state.steps.length ? Math.max(0, state.index + 1) / state.steps.length * 100 : 0}%`;
  if (state.index === state.steps.length - 1) stopPlaying();
}
function stopPlaying() { state.playing = false; clearInterval(state.timer); state.timer = null; $("playIcon").textContent = "▶"; $("playButton").setAttribute("aria-label", "Play walkthrough"); }
function togglePlay() {
  if (!state.steps.length) return;
  if (state.playing) { stopPlaying(); return; }
  if (state.index >= state.steps.length - 1) goTo(-1);
  state.playing = true; $("playIcon").textContent = "Ⅱ"; $("playButton").setAttribute("aria-label", "Pause walkthrough");
  state.timer = setInterval(() => goTo(state.index + 1), 1600 / Number($("speedInput").value));
}
function updateMessageCount() { const n = cleanText($("messageInput").value).length; $("charCount").textContent = `${n} letter${n === 1 ? "" : "s"}`; }
function build() {
  stopPlaying(); const rawKey = $("keyInput").value, rawMessage = $("messageInput").value, cleaned = cleanText(rawMessage);
  if (!cleaned) { $("inputNotice").textContent = "Add a message with at least one letter to begin."; return; }
  state.data = run(rawKey, rawMessage, state.mode); state.steps = state.data.steps; state.index = -1;
  drawGeometry = drawMatrix(state.data.matrix); clearEffects(); renderSteps(); renderPairs(); goTo(-1);
  $("resultMode").textContent = state.mode === "encrypt" ? "ENCRYPTED MESSAGE" : "DECRYPTED MESSAGE";
  $("copyButton").disabled = false;
  const notes = [];
  if (/[Jj]/.test(rawKey + rawMessage)) notes.push("J was mapped to I.");
  if (rawKey && cleanText(rawKey).length !== rawKey.replace(/[^a-z]/gi, "").length) notes.push("Non-letters in the key were removed.");
  if (state.mode === "decrypt" && cleaned.length % 2) notes.push("Odd ciphertext length: a final X partner is shown so the walkthrough can continue; the source text is incomplete.");
  if (state.data.truncated) notes.push(`Showing the first 40 pairs. Full result: ${state.data.output}.`);
  $("inputNotice").textContent = notes.join(" ");
  const inserted = state.data.pairs.filter(p => p.reason && state.mode === "encrypt").length;
  $("resultNote").textContent = state.mode === "decrypt" ? "Decryption keeps possible filler letters in place; review Xs in context." : inserted ? `${inserted} possible filler letter${inserted === 1 ? "" : "s"} added. Dashed pair letters mark inserted fillers.` : "No filler letters were needed for this message.";
  $("output").innerHTML = '<span class="result-placeholder">Press play or step through the pairs to reveal the result.</span>';
}

$("runButton").addEventListener("click", build);
document.querySelectorAll(".mode").forEach(button => button.addEventListener("click", () => { document.querySelectorAll(".mode").forEach(b => b.classList.toggle("active", b === button)); state.mode = button.dataset.mode; build(); }));
$("backButton").addEventListener("click", () => goTo(state.index - 1)); $("nextButton").addEventListener("click", () => goTo(state.index + 1)); $("restartButton").addEventListener("click", () => goTo(-1)); $("playButton").addEventListener("click", togglePlay);
$("speedInput").addEventListener("input", e => { $("speedValue").textContent = `${e.target.value}×`; if (state.playing) { clearInterval(state.timer); state.timer = setInterval(() => goTo(state.index + 1), 1600 / Number(e.target.value)); } });
$("messageInput").addEventListener("input", updateMessageCount); $("keyInput").addEventListener("keydown", e => { if (e.key === "Enter") build(); });
$("copyButton").addEventListener("click", async () => { await navigator.clipboard.writeText(state.data?.output || ""); const button = $("copyButton"); button.classList.add("copied"); button.querySelector("span").textContent = "Copied"; setTimeout(() => { button.classList.remove("copied"); button.querySelector("span").textContent = "Copy result"; }, 1400); });
const glossary = $("glossary"); $("glossaryButton").addEventListener("click", () => glossary.showModal()); glossary.querySelector(".close-dialog").addEventListener("click", () => glossary.close());
document.addEventListener("keydown", e => { if (/INPUT|TEXTAREA/.test(e.target.tagName) || glossary.open) return; if (e.code === "Space") { e.preventDefault(); togglePlay(); } else if (e.key === "ArrowRight") goTo(state.index + 1); else if (e.key === "ArrowLeft") goTo(state.index - 1); else if (e.key.toLowerCase() === "r") goTo(-1); });
let resizeTimer; window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (state.data) { drawGeometry = drawMatrix(state.data.matrix); if (state.index >= 0) showEffects(state.steps[state.index]); } }, 120); });
svg.append("defs").append("marker").attr("id", "arrowhead").attr("viewBox", "0 0 10 10").attr("refX", 8).attr("refY", 5).attr("markerWidth", 5).attr("markerHeight", 5).attr("orient", "auto-start-reverse").append("path").attr("d", "M0,0 L10,5 L0,10 z").attr("fill", "context-stroke");
updateMessageCount(); build();


