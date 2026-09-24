/* =========================================================
   MikuChat · js/chat.js — chats, mensajes, grupos, bloqueos
   ========================================================= */
let CURRENT_CHAT = null;
let CHATS = {};
let msgListener = null, presenceListener = null;

function initChatModule() {
  /* nuevo chat */
  $("btn-new-chat").onclick = () => { $("newchat-user").value = ""; openModal("modal-newchat"); };
  $("btn-start-chat").onclick = startNewChat;

  /* nuevo grupo */
  $("btn-new-group").onclick = () => { $("group-name").value = ""; $("group-members").value = ""; openModal("modal-newgroup"); };
  $("btn-create-group").onclick = createGroup;

  /* composer */
  $("btn-send").onclick = () => {
    const t = $("composer-input").value.trim();
    if (!t) return;
    sendMessage({ type: "text", text: t });
    $("composer-input").value = "";
  };
  $("composer-input").addEventListener("keydown", e => { if (e.key === "Enter") $("btn-send").click(); });
  $("composer-input").addEventListener("input", () => {
    $("btn-send").classList.toggle("hidden", !$("composer-input").value.trim());
    $("btn-mic").classList.toggle("hidden", !!$("composer-input").value.trim());
  });

  $("btn-back").onclick = () => { $("chat-pane").classList.add("hidden-mobile"); };
  $("btn-block").onclick = toggleBlock;
  $("btn-add-member").onclick = addMemberToGroup;
  $("search-input").addEventListener("input", renderChatList);
}

/* ---------- LISTA DE CHATS ---------- */
function listenChats() {
  DB.ref("chats").on("value", s => {
    CHATS = s.val() || {};
    renderChatList();
    if (CURRENT_CHAT && CHATS[CURRENT_CHAT]) renderMessages(CHATS[CURRENT_CHAT].messages || {});
  });
}

function myChats() {
  return Object.entries(CHATS)
    .filter(([id, c]) => c.members && c.members[ME])
    .sort((a, b) => (b[1].lastMsg?.ts || 0) - (a[1].lastMsg?.ts || 0));
}

function isBlockedByMe(target) {
  return MY_DATA.blocked && MY_DATA.blocked[target];
}

function renderChatList() {
  const q = $("search-input").value.toLowerCase();
  const box = $("chat-list");
  const chats = myChats().filter(([id, c]) => {
    const name = chatDisplayName(c).toLowerCase();
    return name.includes(q);
  });
  box.innerHTML = chats.map(([id, c]) => {
    const name = chatDisplayName(c);
    const last = c.lastMsg;
    let prev = "Nuevo chat ✨";
    if (last) {
      if (last.deleted) prev = "🚫 Mensaje eliminado";
      else if (last.type === "image") prev = "📷 Foto";
      else if (last.type === "video") prev = "🎬 Video";
      else if (last.type === "audio") prev = "🎤 Audio";
      else if (last.type === "sticker") prev = "😜 Sticker";
      else prev = (last.from === ME ? "Tú: " : "") + last.text;
    }
    const unread = last && last.from !== ME && (MY_DATA.lastRead?.[id] || 0) < last.ts;
    return `<div class="chat-item ${id === CURRENT_CHAT ? "active" : ""}" data-id="${esc(id)}">
      ${avatarHtml(chatAvatarUser(c))}
      <div class="ci-info">
        <div class="ci-name">${esc(name)} ${isAdminUser(c) ? '<span class="tick">✔️</span>' : ""}</div>
        <div class="ci-prev">${esc(prev)}</div>
      </div>
      <div class="ci-side">
        <div class="ci-time">${last ? fmtTime(last.ts) : ""}</div>
        ${unread ? '<div class="ci-unread">●</div>' : ""}
      </div></div>`;
  }).join("") || `<div class="hint" style="padding:20px">Sin chats todavía.<br>Pica ✏️ para empezar 💬</div>`;

  box.querySelectorAll(".chat-item").forEach(el =>
    el.onclick = () => openChat(el.dataset.id));
}

function chatDisplayName(c) {
  if (c.type === "group") return c.name;
  const other = Object.keys(c.members).find(u => u !== ME);
  return other || "Chat";
}
function chatAvatarUser(c) {
  if (c.type === "group") return { username: c.name?.[0] || "G" };
  const other = Object.keys(c.members).find(u => u !== ME);
  return USERS[other] || { username: other || "?" };
}
function isAdminUser(c) {
  if (c.type === "group") return false;
  const other = Object.keys(c.members).find(u => u !== ME);
  return USERS[other] && USERS[other].admin;
}

/* ---------- ABRIR CHAT ---------- */
function openChat(id) {
  CURRENT_CHAT = id;
  const c = CHATS[id];
  if (!c) return;

  $("chat-placeholder").classList.add("hidden");
  $("chat-view").classList.remove("hidden");
  $("chat-pane").classList.remove("hidden-mobile");

  /* encabezado */
  const name = chatDisplayName(c);
  $("chat-header-avatar").outerHTML = avatarHtml(chatAvatarUser(c)).replace('class="avatar"', 'id="chat-header-avatar" class="avatar"');
  $("chat-header-name").textContent = name;
  $("chat-header-check").classList.toggle("hidden", !isAdminUser(c));
  $("btn-add-member").classList.toggle("hidden", c.type !== "group" || !(c.admins && c.admins[ME]));
  updateBlockButton();
  listenPresence(c);

  renderMessages(c.messages || {});
  renderChatList();

  /* marcar leído */
  const lastTs = c.lastMsg?.ts || Date.now();
  DB.ref(`users/${ME}/lastRead/${id}`).set(lastTs);
  MY_DATA.lastRead = MY_DATA.lastRead || {};
  MY_DATA.lastRead[id] = lastTs;
}

function listenPresence(c) {
  if (presenceListener) presenceListener.off();
  $("chat-header-status").textContent = c.type === "group"
    ? Object.keys(c.members).length + " miembros"
    : "";
  if (c.type === "dm") {
    const other = Object.keys(c.members).find(u => u !== ME);
    presenceListener = DB.ref("users/" + other + "/online");
    presenceListener.on("value", s => {
      $("chat-header-status").textContent = s.val() ? "🟢 en línea" : "última vez recientemente";
    });
  }
}

function updateBlockButton() {
  const c = CHATS[CURRENT_CHAT];
  if (!c || c.type !== "dm") { $("btn-block").classList.add("hidden"); return; }
  $("btn-block").classList.remove("hidden");
  const other = Object.keys(c.members).find(u => u !== ME);
  $("btn-block").textContent = isBlockedByMe(other) ? "✅ Desbloquear" : "🚫";
  $("btn-block").title = isBlockedByMe(other) ? "Desbloquear" : "Bloquear";
}

/* ---------- MENSAJES ---------- */
function renderMessages(messages) {
  const box = $("messages");
  box.innerHTML = Object.entries(messages)
    .sort((a, b) => a[1].ts - b[1].ts)
    .map(([id, m]) => {
      const mine = m.from === ME;
      if (m.deleted) return `<div class="msg ${mine ? "out" : "in"} deleted">
        🚫 Mensaje eliminado<div class="m-meta">${fmtTime(m.ts)}</div></div>`;
      let body = "";
      const c = CHATS[CURRENT_CHAT];
      const sender = (c && c.type === "group" && !mine)
        ? `<span class="m-from">${esc(m.from)}${USERS[m.from]?.admin ? " ✔️" : ""}</span>` : "";
      if (m.type === "image") body = `<img class="m-img" src="${esc(m.url)}" alt="foto">`;
      else if (m.type === "video") body = `<video controls src="${esc(m.url)}"></video>`;
      else if (m.type === "audio") body = `<audio controls src="${esc(m.url)}"></audio>`;
      else if (m.type === "sticker") body = `<span class="sticker">${esc(m.sticker)}</span>`;
      else body = esc(m.text);
      return `<div class="msg ${mine ? "out" : "in"}">${sender}${body}
        <div class="m-meta">${fmtTime(m.ts)}</div>
        ${mine ? `<button class="m-del" data-del="${esc(id)}" title="Borrar">🗑️</button>` : ""}</div>`;
    }).join("") || `<div class="hint" style="align-self:center;margin-top:30px">
      Sin mensajes todavía. ¡Saluda! 👋</div>`;

  box.querySelectorAll("[data-del]").forEach(b => b.onclick = () =>
    DB.ref(`chats/${CURRENT_CHAT}/messages/${b.dataset.del}/deleted`).set(true));

  box.scrollTop = box.scrollHeight;
}

/* sonido + notificación en mensajes nuevos */
let lastMsgSeen = {};
function watchIncoming() {
  DB.ref("chats").on("child_changed", s => {
    const c = s.val(); if (!c || !c.lastMsg) return;
    const id = s.key;
    const last = c.lastMsg;
    if (last.from === ME) return;
    if (!c.members || !c.members[ME]) return;
    if ((lastMsgSeen[id] || 0) >= last.ts) return;
    lastMsgSeen[id] = last.ts;
    if (CURRENT_CHAT === id) {
      sndReceive();
    } else {
      sndNotif();
      if (MY_DATA.lastRead) {} // se actualiza al abrir
      toast(`💬 ${last.from}: ${last.type === "text" ? last.text.slice(0, 30) : "[" + last.type + "]"}`);
    }
  });
}

/* ---------- ENVIAR ---------- */
async function sendMessage(data) {
  if (!CURRENT_CHAT) return;
  const c = CHATS[CURRENT_CHAT];

  /* bloqueo */
  if (c.type === "dm") {
    const other = Object.keys(c.members).find(u => u !== ME);
    if (isBlockedByMe(other)) return toast("Desbloquea a " + other + " para chatear ✅");
    const otherData = await DB.ref("users/" + other).once("value");
    if (otherData.val()?.blocked?.[ME]) return toast(other + " te tiene bloqueado 🚫");
  }

  const msg = { from: ME, ts: Date.now(), deleted: false, ...data };
  const ref = DB.ref(`chats/${CURRENT_CHAT}/messages`).push();
  const updates = {};
  updates[`chats/${CURRENT_CHAT}/messages/${ref.key}`] = msg;
  updates[`chats/${CURRENT_CHAT}/lastMsg`] = msg;
  await DB.ref().update(updates);
  sndSend();
}

/* ---------- NUEVO CHAT (DM) ---------- */
async function startNewChat() {
  const target = normUser($("newchat-user").value);
  if (!target) return;
  if (target.toLowerCase() === ME.toLowerCase()) return toast("No puedes chatear contigo mismo 😅");
  const users = await fetchUsers();
  const found = Object.values(users).find(x => x.username.toLowerCase() === target.toLowerCase());
  if (!found) return toast("Ese usuario no existe ❌");
  const pair = [ME, found.username].sort();
  const id = "dm_" + pair.join("__");
  if (!CHATS[id]) {
    await DB.ref("chats/" + id).set({
      type: "dm", members: { [pair[0]]: true, [pair[1]]: true }, created: Date.now()
    });
  }
  closeModal("modal-newchat");
  openChat(id);
}

/* ---------- GRUPOS ---------- */
async function createGroup() {
  const name = $("group-name").value.trim().slice(0, 40);
  const membersRaw = $("group-members").value.split(",").map(normUser).filter(Boolean);
  if (!name) return toast("Ponle nombre al grupo 👥");
  const users = await fetchUsers();
  const members = { [ME]: true };
  let bad = null;
  membersRaw.forEach(u => {
    const found = Object.values(users).find(x => x.username.toLowerCase() === u.toLowerCase());
    if (found) members[found.username] = true; else bad = u;
  });
  if (bad) toast("'" + bad + "' no existe (se omitió) ⚠️");
  const id = "group_" + Date.now();
  await DB.ref("chats/" + id).set({
    type: "group", name, members, admins: { [ME]: true }, created: Date.now(),
    lastMsg: { from: ME, type: "text", text: "🎉 Grupo creado", ts: Date.now() }
  });
  closeModal("modal-newgroup");
  toast("¡Grupo creado! 🎉");
  openChat(id);
}

async function addMemberToGroup() {
  const u = normUser(prompt("Username de la persona a agregar:"));
  if (!u) return;
  const users = await fetchUsers();
  const found = Object.values(users).find(x => x.username.toLowerCase() === u.toLowerCase());
  if (!found) return toast("Ese usuario no existe ❌");
  const c = CHATS[CURRENT_CHAT];
  if (c.members[found.username]) return toast("Ya está en el grupo 😉");
  await DB.ref(`chats/${CURRENT_CHAT}/members/${found.username}`).set(true);
  toast(found.username + " agregado al grupo ➕");
}

/* ---------- BLOQUEAR ---------- */
async function toggleBlock() {
  const c = CHATS[CURRENT_CHAT];
  if (!c || c.type !== "dm") return;
  const other = Object.keys(c.members).find(u => u !== ME);
  const now = !isBlockedByMe(other);
  await DB.ref(`users/${ME}/blocked/${other}`).set(now ? true : null);
  MY_DATA.blocked = MY_DATA.blocked || {};
  if (now) MY_DATA.blocked[other] = true; else delete MY_DATA.blocked[other];
  updateBlockButton();
  toast(now ? other + " bloqueado 🚫" : other + " desbloqueado ✅");
}
