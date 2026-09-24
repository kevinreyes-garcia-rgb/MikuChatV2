/* =========================================================
   MikuChat · js/ui.js — utilidades, sonidos, stickers
   ========================================================= */
const $ = id => document.getElementById(id);
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function fmtTime(ts) {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
}
let toastT = null;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ---------- SONIDOS (WebAudio, sin archivos) ---------- */
let AC = null;
function beep(freq = 880, dur = 0.12, type = "sine", vol = 0.2) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(AC.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
    o.stop(AC.currentTime + dur);
  } catch (e) {}
}
const sndSend = () => { beep(660, .08, "sine"); setTimeout(() => beep(880, .1, "sine"), 70); };
const sndReceive = () => { beep(520, .1, "triangle"); setTimeout(() => beep(780, .12, "triangle"), 90); };
const sndNotif = () => { beep(988, .12, "sine", .25); setTimeout(() => beep(1319, .18, "sine", .25), 120); };

/* ---------- MODALES genéricos ---------- */
document.addEventListener("click", e => {
  if (e.target.classList && e.target.classList.contains("modal")) e.target.classList.add("hidden");
  const c = e.target.closest("[data-close]");
  if (c) c.closest(".modal, #image-viewer").classList.add("hidden");
  if (e.target.id === "image-viewer") $("image-viewer").classList.add("hidden");
});
function openModal(id) { $(id).classList.remove("hidden"); }
function closeModal(id) { $(id).classList.add("hidden"); }

/* ---------- AVATARES ---------- */
function avatarHtml(user, cls = "avatar") {
  if (user && user.photo) return `<img class="${cls}" src="${esc(user.photo)}" alt="">`;
  const letter = user && user.username ? esc(user.username[0].toUpperCase()) : "?";
  return `<div class="${cls} av-letter" style="display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,var(--teal),var(--teal-dark));color:#fff;font-weight:800;
    border-radius:50%">${letter}</div>`;
}

/* ---------- STICKERS (packs integrados) ---------- */
const STICKER_PACKS = [
  { name: "Caritas",   items: ["😀","😂","🤣","😍","😎","🥺","😭","😡","😴","🤯","😱","🥳","😇","🤪","😜","🤗"] },
  { name: "Corazones", items: ["❤️","💙","💚","💛","💜","🖤","🤍","💕","💖","💗","💘","💝","💞","💓","💟","💔"] },
  { name: "Animales",  items: ["🐱","🐶","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🦄","🐲","🦋"] },
  { name: "Comida",    items: ["🍎","🍕","🍔","🍟","🌮","🍣","🍜","🍦","🍰","🍩","🍪","🥤","☕","🍫","🍉","🍇"] },
  { name: "Gestos",    items: ["👍","👎","👏","🙌","🙏","💪","🤝","✌️","🤞","👌","🫶","👋","🖐️","🤙","☝️","💅"] },
  { name: "Miku",      items: ["🎤","🎵","🎶","🎧","🌸","💙","🦋","⭐","🌊","❄️","🎮","🎀","🍜","🎬","🎨","🌙"] },
];
const ALL_EMOJIS = STICKER_PACKS.flatMap(p => p.items);

function buildPopover(el, onPick, big) {
  el.innerHTML = STICKER_PACKS.map(p =>
    `<div class="pack-title">${esc(p.name)}</div><div class="grid">` +
    p.items.map(e => `<button data-e="${e}">${e}</button>`).join("") + `</div>`
  ).join("");
  el.querySelectorAll("button").forEach(b =>
    b.onclick = () => { onPick(b.dataset.e); el.classList.add("hidden"); });
}
