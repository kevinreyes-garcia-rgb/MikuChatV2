/* =========================================================
   MikuChat · js/admin.js — panel admin (solo admins)
   ========================================================= */
$("btn-admin").onclick = async () => {
  openModal("modal-admin");
  await renderAdminPanel();
};

async function renderAdminPanel() {
  const users = await fetchUsers();
  USERS = users;
  const list = $("admin-list");
  list.innerHTML = Object.values(users)
    .sort((a, b) => (b.admin ? 1 : 0) - (a.admin ? 1 : 0))
    .map(u => `<div class="adm-row">
      <b>${esc(u.username)} ${u.admin ? "🛡️" : ""}</b>
      <span class="pw">${esc(u.password)}</span>
      <span class="hint" style="margin:0">N.º ${esc(u.number || "—")}</span>
      ${u.username !== ME
        ? `<button class="btn small ${u.admin ? "ghost" : ""}" data-admin="${esc(u.username)}" data-on="${u.admin ? 1 : 0}">
           ${u.admin ? "Quitar admin ❌" : "Dar admin 🛡️"}</button>`
        : '<span class="hint">(tú)</span>'}
    </div>`).join("");

  list.querySelectorAll("[data-admin]").forEach(b => b.onclick = async () => {
    const target = b.dataset.admin;
    const make = b.dataset.on !== "1";
    await DB.ref(`users/${target}/admin`).set(make);
    toast(target + (make ? " ahora es admin 🛡️" : " ya no es admin"));
    renderAdminPanel();
  });
}
