/* =========================================================
   MikuChat · js/auth.js — registro, login, sesión, perfil
   ========================================================= */
let ME = null;          // username actual
let MY_DATA = null;     // datos de mi usuario
let USERS = {};         // caché de usuarios

function normUser(u) { return String(u || "").trim(); }
function validUsername(u) { return /^[A-Za-z0-9_\-]{3,20}$/.test(u); }

/* ---------- PESTAÑAS ---------- */
$("tab-login").onclick = () => {
  $("tab-login").classList.add("on"); $("tab-register").classList.remove("on");
  $("login-form").classList.remove("hidden"); $("register-form").classList.add("hidden");
  authError("");
};
$("tab-register").onclick = () => {
  $("tab-register").classList.add("on"); $("tab-login").classList.remove("on");
  $("register-form").classList.remove("hidden"); $("login-form").classList.add("hidden");
  authError("");
};
function authError(msg) {
  $("auth-error").classList.toggle("hidden", !msg);
  $("auth-error").textContent = msg;
}

/* ---------- REGISTRO ---------- */
$("btn-register").onclick = async () => {
  const u = normUser($("reg-user").value);
  const p = $("reg-pass").value, p2 = $("reg-pass2").value;
  if (!validUsername(u)) return authError("Username de 3-20 caracteres: letras, números, - _");
  if (p.length < 4) return authError("La contraseña debe tener al menos 4 caracteres");
  if (p !== p2) return authError("Las contraseñas no coinciden");
  const users = await fetchUsers();
  if (Object.keys(users).some(k => k.toLowerCase() === u.toLowerCase()))
    return authError("Ese username ya existe 😅");
  const number = genNumber();
  await DB.ref("users/" + u).set({
    username: u, password: p, number, bio: "🎵 Usando MikuChat",
    photo: "", admin: false, created: Date.now()
  });
  toast("¡Cuenta creada! Tu número: " + number + " 📱");
  startSession(u);
};

/* ---------- LOGIN ---------- */
$("btn-login").onclick = async () => {
  const u = normUser($("login-user").value);
  const p = $("login-pass").value;
  const users = await fetchUsers();
  const found = Object.values(users).find(x => x.username.toLowerCase() === u.toLowerCase());
  if (!found) return authError("Ese username no existe ❌");
  if (found.password !== p) return authError("Contraseña incorrecta ❌");
  startSession(found.username);   // se carga TODO desde la base de datos
};

/* ---------- SESIÓN ---------- */
function startSession(username) {
  ME = username;
  localStorage.setItem("mikuchat_user", ME);
  enterApp();
}
function logout() {
  if (DB && ME) DB.ref("users/" + ME + "/online").set(false);
  localStorage.removeItem("mikuchat_user");
  ME = null; MY_DATA = null; USERS = {};
  $("app").classList.add("hidden");
  $("auth-screen").classList.remove("hidden");
  $("login-pass").value = "";
}
$("btn-logout").onclick = logout;

async function enterApp() {
  const users = await fetchUsers();
  USERS = users;
  MY_DATA = users[ME];
  if (!MY_DATA) { logout(); return; }

  $("auth-screen").classList.add("hidden");
  $("app").classList.remove("hidden");

  /* barra lateral */
  $("side-avatar").outerHTML = avatarHtml(MY_DATA, "avatar").replace('class="avatar"', 'id="side-avatar" class="avatar"');
  $("side-name").textContent = MY_DATA.username;
  $("side-check").classList.toggle("hidden", !MY_DATA.admin);
  $("side-number").textContent = "N.º de MikuChat: " + (MY_DATA.number || "—");
  $("btn-admin").classList.toggle("hidden", !MY_DATA.admin);

  /* presencia: en línea / desconectado */
  DB.ref(".info/connected").on("value", s => {
    if (s.val()) {
      DB.ref("users/" + ME + "/online").set(true);
      DB.ref("users/" + ME + "/online").onDisconnect().set(false);
    }
  });

  initChatModule();
  listenChats();
  renderStatuses();
}

/* ---------- EDITAR PERFIL ---------- */
$("btn-edit-profile").onclick = () => {
  $("profile-bio").value = MY_DATA.bio || "";
  $("profile-photo-preview").outerHTML = avatarHtml(MY_DATA, "avatar big").replace('class="avatar big"', 'id="profile-photo-preview" class="avatar big"');
  openModal("modal-profile");
};
$("btn-change-photo").onclick = () => $("profile-photo-input").click();
$("profile-photo-input").onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  toast("Subiendo foto... 📷");
  const url = await uploadToStorage(f, "avatars/" + ME);
  await DB.ref("users/" + ME + "/photo").set(url);
  MY_DATA.photo = url;
  $("profile-photo-preview").outerHTML = avatarHtml(MY_DATA, "avatar big").replace('class="avatar big"', 'id="profile-photo-preview" class="avatar big"');
  $("side-avatar").outerHTML = avatarHtml(MY_DATA, "avatar").replace('class="avatar"', 'id="side-avatar" class="avatar"');
  toast("¡Foto actualizada! ✨");
};
$("btn-save-profile").onclick = async () => {
  const bio = $("profile-bio").value.trim().slice(0, 60);
  await DB.ref("users/" + ME + "/bio").set(bio);
  MY_DATA.bio = bio;
  closeModal("modal-profile");
  toast("Perfil guardado 💾");
};
