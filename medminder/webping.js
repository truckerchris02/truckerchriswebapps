/* In-page reminder fallback. iPhone only delivers Notification when this
   app is installed to the Home Screen and the system allows it. Otherwise
   a banner shows while the page is open. */
function webPing(title, body) {
  try {
    if (window.Notification && Notification.permission === "granted") {
      new Notification(title, { body: body });
      return;
    }
  } catch (e) {}
  var d = document.createElement("div");
  d.setAttribute("role", "status");
  d.textContent = title + (body ? " — " + body : "");
  d.style.cssText = "position:fixed;left:12px;right:12px;top:calc(12px + env(safe-area-inset-top));z-index:80;background:#111;color:#fff;padding:12px 14px;border-radius:12px;font:15px/1.35 system-ui,sans-serif;box-shadow:0 8px 24px #0008";
  document.body.appendChild(d);
  setTimeout(function () { if (d.parentNode) d.remove(); }, 6000);
}
function webAskNotif() {
  try {
    if (!window.Notification) {
      webPing("Reminders", "This browser will not post notifications. Leave the app open and a banner still shows at the time you picked.");
      return;
    }
    if (Notification.permission === "granted") return;
    Notification.requestPermission().catch(function () {});
  } catch (e) {}
}
function webOnce(key, fn) {
  try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch (e) { return; }
  fn();
}
function webWatch(fn) {
  try { fn(); } catch (e) {}
  setInterval(function () { try { fn(); } catch (e) {} }, 20000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { try { fn(); } catch (e) {} } });
}
