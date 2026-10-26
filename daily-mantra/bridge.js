/* Web stand-in for the Android Daily Mantra bridge. */
(function () {
  function copyText(t) {
    var done = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () { banner("Copied"); }, function () { fallback(); });
      return;
    }
    fallback();
    function fallback() {
      try {
        var a = document.createElement("textarea");
        a.value = t;
        document.body.appendChild(a);
        a.select();
        done = document.execCommand("copy");
        a.remove();
      } catch (e) {}
      banner(done ? "Copied" : "Copy did not work — select the text and copy it");
    }
  }
  function banner(m) {
    var d = document.createElement("div");
    d.textContent = m;
    d.style.cssText = "position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom));transform:translateX(-50%);background:#e8a24a;color:#2a1a0e;padding:8px 14px;border-radius:20px;z-index:40;font:14px system-ui";
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 1600);
  }
  function download(text, name) {
    try {
      var blob = new Blob([text], { type: "application/json" });
      var file = new File([blob], name, { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: name }).catch(function (e) {
          if (!e || e.name !== "AbortError") anchor(blob, name);
        });
        return;
      }
    } catch (e) {}
    anchor(new Blob([text], { type: "application/json" }), name);
  }
  function anchor(blob, name) {
    try {
      var u = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = u;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      banner("Backup file ready — on iPhone use Save to Files");
    } catch (e) {
      banner("Could not save the backup file");
    }
  }
  var rem = { on: false, hh: 7, mm: 0 };
  function tick() {
    if (!rem.on) return;
    var d = new Date();
    if (d.getHours() !== rem.hh || d.getMinutes() !== rem.mm) return;
    var key = "dm-rem-" + d.toDateString();
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch (e) { return; }
    var title = "Daily Mantra";
    var body = "Your mantra and affirmation are ready.";
    try {
      if (window.Notification && Notification.permission === "granted") { new Notification(title, { body: body }); return; }
    } catch (e) {}
    banner(title + " — " + body);
  }
  setInterval(tick, 20000);
  window.Bridge = {
    copy: function (t) { copyText(String(t || "")); },
    share: function (t) {
      t = String(t || "");
      if (t.charAt(0) === "{") { download(t, "DailyMantra-backup.json"); return; }
      if (navigator.share) {
        navigator.share({ text: t }).catch(function (e) { if (!e || e.name !== "AbortError") copyText(t); });
      } else copyText(t);
    },
    status: function () {
      return "Reminders fire while Daily Mantra is open. If you added it to the Home Screen and allowed notifications, iPhone may also show them then. It will not alert you after the app is fully closed.";
    },
    setReminder: function (on, hh, mm) {
      rem.on = !!on;
      rem.hh = +hh || 0;
      rem.mm = +mm || 0;
      if (rem.on) {
        try {
          if (window.Notification && Notification.permission === "default") Notification.requestPermission().catch(function () {});
        } catch (e) {}
      }
    }
  };
  try {
    var saved = JSON.parse(localStorage.getItem("dm_state") || "{}");
    if (saved.rem && saved.rem.on && saved.rem.time) {
      var parts = String(saved.rem.time).split(":");
      window.Bridge.setReminder(true, +parts[0] || 0, +parts[1] || 0);
    }
  } catch (e) {}
})();
