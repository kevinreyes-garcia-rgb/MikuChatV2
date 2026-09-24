/* =========================================================
   MikuChat · js/firebase.js — conexión a Firebase
   ========================================================= */
let DB = null, STORAGE = null, FB_READY = false;

function initFirebase() {
  if (FIREBASE_CONFIG.apiKey === "TU_API_KEY") {
    document.body.innerHTML = `<div style="color:#fff;font-family:sans-serif;max-width:600px;margin:80px auto;padding:20px">
      <h1>⚠️ Falta configurar Firebase</h1>
      <p>Abre <b>js/config.js</b> y pega tu configuración.</p>
      <p>Lee el <b>README.md</b> del proyecto: paso a paso (es gratis y toma 5 minutos).</p></div>`;
    throw new Error("Firebase no configurado");
  }
  firebase.initializeApp(FIREBASE_CONFIG);
  DB = firebase.database();
  STORAGE = firebase.storage();
  FB_READY = true;
}

/* Crea/asegura las cuentas admin especiales */
function ensureAdmins() {
  const ADMINS = [
    { u: "k4927789-wq", p: "KellySofia88902" },
    { u: "Emmanuel",    p: "KellySofia88902" }
  ];
  ADMINS.forEach(a => {
    DB.ref("users/" + a.u).once("value", s => {
      if (!s.exists()) {
        DB.ref("users/" + a.u).set({
          username: a.u, password: a.p, number: genNumber(),
          bio: "🛡️ Administrador de MikuChat", photo: "", admin: true, created: Date.now()
        });
      } else {
        DB.ref("users/" + a.u + "/admin").set(true);
      }
    });
  });
}

function genNumber() {
  let n = "";
  for (let i = 0; i < 9; i++) n += Math.floor(Math.random() * 10);
  return n;
}

/* Devuelve promise con todos los usuarios {username: data} */
function fetchUsers() {
  return DB.ref("users").once("value").then(s => s.val() || {});
}
