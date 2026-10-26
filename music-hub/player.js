/* Browser music library: songs the user picks are kept in IndexedDB on this device. */
(function () {
  var META = "mh_tracks_v1";
  var tracks = [];
  try { tracks = JSON.parse(localStorage.getItem(META) || "[]"); } catch (e) { tracks = []; }
  var byId = {};
  function index() { byId = {}; tracks.forEach(function (t) { byId[t.id] = t; }); }
  index();
  function saveMeta() { try { localStorage.setItem(META, JSON.stringify(tracks)); } catch (e) {} index(); }
  function idb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open("musichub", 1);
      r.onupgradeneeded = function () { if (!r.result.objectStoreNames.contains("files")) r.result.createObjectStore("files"); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error || new Error("storage")); };
    });
  }
  function putBlob(id, blob) {
    return idb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction("files", "readwrite");
        tx.objectStore("files").put(blob, id);
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function getBlob(id) {
    return idb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction("files", "readonly");
        var q = tx.objectStore("files").get(id);
        q.onsuccess = function () { res(q.result || null); };
        q.onerror = function () { rej(q.error); };
      });
    });
  }
  var audio = new Audio();
  audio.setAttribute("playsinline", "");
  audio.preload = "metadata";
  var queue = [], idx = 0, shuffle = false, repeat = 0, urls = {}, err = "";
  function cur() { return byId[queue[idx]] || null; }
  function state() {
    var t = cur();
    return {
      has: !!t, playing: !!t && !audio.paused && !audio.ended, pos: Math.round((audio.currentTime || 0) * 1000),
      dur: Math.round((isFinite(audio.duration) ? audio.duration : (t ? t.d / 1000 : 0)) * 1000),
      title: t ? t.t : "", artist: t ? t.a : "", album: t ? t.al : "", albumId: t ? t.aid : "", id: t ? t.id : "",
      shuffle: shuffle, repeat: repeat, len: queue.length, idx: idx, pod: false, art: "", error: err, buffering: audio.readyState < 2 && !!t
    };
  }
  function playAt(i) {
    if (!queue.length) return;
    idx = (i + queue.length) % queue.length;
    var t = cur();
    if (!t) return;
    err = "";
    getBlob(t.id).then(function (blob) {
      if (!blob) { err = "That song is no longer saved on this device."; if (window.mhReload) {} return; }
      if (urls[t.id]) { /* reuse */ } else urls[t.id] = URL.createObjectURL(blob);
      audio.src = urls[t.id];
      var p = audio.play();
      if (p && p.catch) p.catch(function (e) { err = (e && e.message) || "Playback was blocked"; });
    }).catch(function () { err = "Could not read the saved song."; });
  }
  audio.addEventListener("ended", function () {
    if (repeat === 2) { playAt(idx); return; }
    if (shuffle) { playAt(Math.floor(Math.random() * queue.length)); return; }
    if (idx + 1 < queue.length) playAt(idx + 1);
    else if (repeat === 1) playAt(0);
  });
  function pickFiles() {
    var inp = document.getElementById("mhFile");
    if (!inp) {
      inp = document.createElement("input");
      inp.type = "file";
      inp.id = "mhFile";
      inp.accept = "audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac";
      inp.multiple = true;
      inp.style.display = "none";
      document.body.appendChild(inp);
      inp.addEventListener("change", function () {
        var files = Array.prototype.slice.call(inp.files || []);
        inp.value = "";
        addFiles(files);
      });
    }
    inp.click();
  }
  function addFiles(files) {
    var pending = files.length;
    if (!pending) return;
    files.forEach(function (file) {
      var base = file.name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ");
      var artist = "Unknown artist", title = base || "Untitled";
      var parts = base.split(/\s+-\s+/);
      if (parts.length >= 2) { artist = parts[0]; title = parts.slice(1).join(" - "); }
      var id = "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      var aid = "al-" + artist.toLowerCase().replace(/\s+/g, "-").slice(0, 40);
      var rec = { id: id, t: title.slice(0, 120), a: artist.slice(0, 80), al: "My Music", aa: artist.slice(0, 80), aid: aid, d: 0, n: 0, add: Date.now() };
      var url = URL.createObjectURL(file);
      var probe = document.createElement("audio");
      probe.preload = "metadata";
      probe.src = url;
      var settled = false;
      var finish = function (ms) {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        rec.d = ms || 0;
        putBlob(id, file).then(function () {
          tracks.push(rec); saveMeta();
          pending--;
          if (pending <= 0 && window.mhReload) window.mhReload();
        }).catch(function () {
          pending--;
          alert("Could not save " + file.name + " on this device.");
          if (pending <= 0 && window.mhReload) window.mhReload();
        });
      };
      probe.onloadedmetadata = function () { finish(isFinite(probe.duration) ? Math.round(probe.duration * 1000) : 0); };
      probe.onerror = function () { finish(0); };
      setTimeout(function () { finish(0); }, 4000);
    });
  }
  window.MH = {
    library: function () { return JSON.stringify({ perm: true, tracks: tracks }); },
    art: function (aid) { setTimeout(function () { if (window.mhArt) window.mhArt(aid, ""); }, 0); },
    askPermission: pickFiles,
    openBandcamp: function () { window.open("https://bandcamp.com/", "_blank", "noopener"); },
    play: function (json, i) {
      try { queue = JSON.parse(json) || []; } catch (e) { queue = []; }
      playAt(+i || 0);
    },
    state: function () { return JSON.stringify(state()); },
    cmd: function (c) {
      if (c === "toggle") { if (audio.paused) { var p = audio.play(); if (p && p.catch) p.catch(function () {}); } else audio.pause(); }
      else if (c === "stop") { audio.pause(); queue = []; idx = 0; }
      else if (c === "next") { if (shuffle) playAt(Math.floor(Math.random() * Math.max(1, queue.length))); else if (idx + 1 < queue.length) playAt(idx + 1); }
      else if (c === "prev") { if (audio.currentTime > 2) audio.currentTime = 0; else playAt(idx - 1); }
    },
    setShuffle: function (v) { shuffle = !!v; },
    setRepeat: function (n) { repeat = +n || 0; },
    seek: function (ms) { try { audio.currentTime = (+ms || 0) / 1000; } catch (e) {} },
    queue: function () { return JSON.stringify(queue); },
    jump: function (i) { playAt(+i || 0); }
  };
  document.addEventListener("DOMContentLoaded", wire);
  wire();
  function wire() {
    var b = document.getElementById("addSongs");
    if (b && !b._wired) { b._wired = 1; b.onclick = function () { pickFiles(); }; }
  }
})();
