/* =========================================================
   MikuChat · js/media.js — fotos, videos, audios, stickers
   ========================================================= */
function uploadToStorage(file, path) {
  const ref = STORAGE.ref(path);
  return ref.put(file).then(() => ref.getDownloadURL());
}

/* ---------- ARCHIVOS (foto / video) ---------- */
$("btn-attach").onclick = () => $("file-input").click();
$("file-input").onchange = async e => {
  const f = e.target.files[0];
  if (!f || !CURRENT_CHAT) return;
  toast("Enviando archivo... 📎");
  const isVideo = f.type.startsWith("video");
  const url = await uploadToStorage(f, `chats/${CURRENT_CHAT}/${Date.now()}_${f.name}`);
  sendMessage({ type: isVideo ? "video" : "image", url });
  e.target.value = "";
};

/* ver imagen en grande */
document.addEventListener("click", e => {
  const img = e.target.closest("img.m-img");
  if (img) { $("image-viewer-img").src = img.src; $("image-viewer").classList.remove("hidden"); }
});

/* ---------- AUDIO (mensaje de voz) ---------- */
let mediaRecorder = null, audioChunks = [], recTimer = null, recSeconds = 0;

$("btn-mic").onclick = async () => {
  if (!CURRENT_CHAT) return toast("Abre un chat primero 💬");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      $("btn-cancel-audio").classList.add("hidden");
      $("recording-indicator").classList.add("hidden");
      if (blob.size < 100) return;
      toast("Enviando audio... 🎤");
      const url = await uploadToStorage(blob, `chats/${CURRENT_CHAT}/${Date.now()}.webm`);
      sendMessage({ type: "audio", url });
    };
    mediaRecorder.start();
    recSeconds = 0;
    $("rec-time").textContent = "0s";
    $("recording-indicator").classList.remove("hidden");
    $("btn-cancel-audio").classList.remove("hidden");
    recTimer = setInterval(() => { recSeconds++; $("rec-time").textContent = recSeconds + "s"; }, 1000);
    sndSend();
  } catch (err) { toast("No se pudo acceder al micrófono 🎤❌"); }
};
$("btn-cancel-audio").onclick = () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.onstop = null;
    mediaRecorder.stop();
  }
  clearInterval(recTimer);
  $("recording-indicator").classList.add("hidden");
  $("btn-cancel-audio").classList.add("hidden");
};

/* ---------- STICKERS ---------- */
buildPopover($("sticker-popover"), e => sendMessage({ type: "sticker", sticker: e }));
$("btn-sticker").onclick = ev => {
  $("emoji-popover").classList.add("hidden");
  $("sticker-popover").classList.toggle("hidden");
  ev.stopPropagation();
};

/* ---------- EMOJIS en el texto ---------- */
buildPopover($("emoji-popover"), e => {
  $("composer-input").value += e;
  $("composer-input").focus();
});
$("btn-emoji").onclick = ev => {
  $("sticker-popover").classList.add("hidden");
  $("emoji-popover").classList.toggle("hidden");
  ev.stopPropagation();
};
document.addEventListener("click", () => {
  $("sticker-popover").classList.add("hidden");
  $("emoji-popover").classList.add("hidden");
});
