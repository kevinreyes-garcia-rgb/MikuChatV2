/* =========================================================
   MikuChat · js/main.js — arranque
   ========================================================= */
(function boot() {
  /* notas musicales flotantes en el login */
  const bg = document.getElementById("bg-notes");
  const notes = ["♪","♫","♬","💬","🎵","🎶","❤️"];
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("span");
    s.textContent = notes[i % notes.length];
    s.style.left = Math.random() * 100 + "vw";
    s.style.animationDuration = (12 + Math.random() * 16) + "s";
    s.style.animationDelay = (-Math.random() * 20) + "s";
    s.style.fontSize = (14 + Math.random() * 22) + "px";
    bg.appendChild(s);
  }

  initFirebase();
  ensureAdmins();

  /* sesión guardada */
  const saved = localStorage.getItem("mikuchat_user");
  if (saved) {
    fetchUsers().then(users => {
      if (users[saved]) startSession(saved);
    });
  }

  /* siempre que haya sesión, vigilar mensajes nuevos para sonar */
  const tryWatch = setInterval(() => {
    if (ME && FB_READY) { watchIncoming(); clearInterval(tryWatch); }
  }, 800);
})();
