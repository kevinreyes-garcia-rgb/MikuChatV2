/* =========================================================
   MikuChat · js/status.js — estados (visibles para todos)
   ========================================================= */
const STATUS_TTL = 24 * 60 * 60 * 1000;

$("btn-status").onclick = () => { renderStatusModal(); openModal("modal-status"); };
$("btn-status-text").onclick = postTextStatus;
$("btn-status-photo").onclick = () => $("status-photo-input").click();
$("status-photo-input").onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  toast("Subiendo estado... 📷");
  const url = await uploadToStorage(f, "status/" + ME + "/" + Date.now());
  await DB.ref(`status/${ME}`).push({ type: "image", url, ts: Date.now() });
  e.target.value = "";
  toast("¡Estado publicado! 🟢");
};

function postTextStatus() {
  const text = $("status-text").value.trim();
  if (!text) return;
  DB.ref(`status/${ME}`).push({ type: "text", text, ts: Date.now() });
  $("status-text").value = "";
  toast("¡Estado publicado! 🟢");
}

/* lista de estados de TODOS los usuarios registrados */
function renderStatuses() {
  DB.ref("status").on("value", s => {
    const all = s.val() || {};
    const now = Date.now();
    STATUS_DATA = Object.entries(all)
      .map(([user, items]) => ({
        user,
        items: Object.values(items).filter(i => now - i.ts < STATUS_TTL).sort((a, b) => a.ts - b.ts)
      }))
      .filter(x => x.items.length > 0);
    renderStatusModal();
    if (CURRENT_CHAT) {} // noop
  });
}
let STATUS_DATA = [];

function renderStatusModal() {
  const box = $("status-list");
  if (!box) return;
  box.innerHTML = STATUS_DATA.map((st, idx) => {
    const u = USERS[st.user] || { username: st.user };
    const isAdmin = u.admin;
    return `<div class="st-item" data-idx="${idx}">
      ${avatarHtml(u)}
      <div class="ci-info">
        <div class="ci-name">${esc(st.user)} ${isAdmin ? '<span class="tick">✔️</span>' : ""}
          ${st.user === ME ? "(tú)" : ""}</div>
        <div class="ci-prev">${st.items.length} estado(s) · ${fmtTime(st.items[0].ts)}</div>
      </div>
      ${st.user === ME ? '<button class="btn small danger" data-delst>🗑️</button>' : ""}
    </div>`;
  }).join("") || `<div class="hint">Aún no hay estados. ¡Publica el primero! 🟢</div>`;

  box.querySelectorAll(".st-item").forEach(el => {
    el.onclick = e => {
      if (e.target.closest("[data-delst]")) {
        DB.ref("status/" + ME).remove().then(() => toast("Estados eliminados 🗑️"));
        return;
      }
      openStatusViewer(+el.dataset.idx);
    };
  });
}

/* visor de estados estilo WhatsApp */
let svTimer = null;
function openStatusViewer(idx) {
  const st = STATUS_DATA[idx];
  if (!st) return;
  openModal("modal-statusview");
  let i = 0;
  const show = () => {
    const item = st.items[i];
    $("sv-name").textContent = st.user;
    const content = $("sv-content");
    if (item.type === "image") {
      content.style.backgroundImage = `url(${item.url})`;
      content.textContent = "";
    } else {
      content.style.backgroundImage = "none";
      content.textContent = item.text;
    }
    const bar = $("sv-bar");
    bar.style.transition = "none"; bar.style.width = "0";
    void bar.offsetWidth;
    bar.style.transition = "width 5s linear";
    bar.style.width = "100%";
    clearTimeout(svTimer);
    svTimer = setTimeout(() => {
      i++;
      if (i < st.items.length) show();
      else closeModal("modal-statusview");
    }, 5000);
  };
  show();
}
