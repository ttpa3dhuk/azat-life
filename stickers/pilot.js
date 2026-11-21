const inviteStorage = "stickers.pilot.invite";
const fragment = location.hash.slice(1);
let pilotInvite = "";
if (/^[A-Za-z0-9_-]{43}$/.test(fragment)) {
  pilotInvite = fragment;
  try { sessionStorage.setItem(inviteStorage, fragment); } catch {}
} else {
  try { pilotInvite = sessionStorage.getItem(inviteStorage) || ""; } catch {}
}
async function stickerRequest(path, options = {}) {
  const headers = new Headers(options.headers);
  if (pilotInvite) headers.set("X-Pilot-Invite", pilotInvite);
  const r = await fetch("https://vdoh.net/stickers/api/" + path, {
    ...options, headers, credentials: "omit", referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(120000)
  });
  if (r.status === 403 && (path === "orders" || path === "check-photo")) {
    throw Error("Откройте личную ссылку-приглашение для загрузки фото.");
  }
  return r;
}
const strip = document.querySelector("#private-examples");
if (strip && pilotInvite) {
  Promise.all([...strip.querySelectorAll("img")].map(async img => {
    const r = await stickerRequest("examples/" + img.dataset.exampleFile);
    if (!r.ok) throw Error();
    img.src = URL.createObjectURL(await r.blob());
  })).then(() => strip.hidden = false).catch(() => {});
}
