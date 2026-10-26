/* Podcasts in the browser: search via iTunes, feeds via a public RSS reader
   (many feeds block the browser), playback streams in an audio element.
   Subscriptions and progress stay in localStorage on this device. */
(function () {
  var SK = "pd_subs_v1", FK = "pd_feeds_v1", PK = "pd_prog_v1", DK = "pd_dl_v1", SPK = "pd_speed_v1";
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || ""); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var subs = load(SK, []), feeds = load(FK, {}), prog = load(PK, {}), dls = load(DK, {}), speed = +load(SPK, 1) || 1;
  function toast(m) {
    var el = document.getElementById("pdToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "pdToast";
      el.style.cssText = "position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom));transform:translateX(-50%);background:#ffc107;color:#16131b;padding:8px 14px;border-radius:20px;z-index:70;font:14px system-ui;max-width:90vw;text-align:center";
      document.body.appendChild(el);
    }
    el.textContent = m;
    el.style.display = "block";
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.style.display = "none"; }, 2200);
  }
  function hash(s) {
    var x = 2166136261;
    s = String(s || "");
    for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
    return (x >>> 0).toString(36);
  }
  function durMs(v) {
    if (v == null || v === "") return 0;
    if (typeof v === "number") return v < 1000 ? v * 1000 : v;
    var s = String(v).trim();
    if (/^\d+$/.test(s)) { var n = +s; return n < 10000 ? n * 1000 : n; }
    var p = s.split(":").map(Number);
    if (p.some(function (x) { return isNaN(x); })) return 0;
    var sec = 0;
    p.forEach(function (x) { sec = sec * 60 + x; });
    return sec * 1000;
  }
  function absUrl(base, u) {
    try { return new URL(u, base).href; } catch (e) { return u; }
  }
  function fromRss(xml, feedUrl) {
    var doc = new DOMParser().parseFromString(xml, "text/xml");
    if (doc.querySelector("parsererror")) throw new Error("bad xml");
    var ch = doc.querySelector("channel");
    if (!ch) throw new Error("no channel");
    var title = text(ch, "title") || "Podcast";
    var author = text(ch, "itunes\\:author") || text(ch, "author") || "";
    var image = "";
    var im = ch.querySelector("itunes\\:image, image");
    if (im) image = im.getAttribute("href") || text(im, "url") || "";
    var desc = text(ch, "description") || "";
    var link = text(ch, "link") || "";
    var eps = [];
    Array.prototype.forEach.call(ch.querySelectorAll("item"), function (it, n) {
      if (eps.length >= 40) return;
      var enc = it.querySelector("enclosure");
      var u = enc ? (enc.getAttribute("url") || "") : "";
      if (!u) return;
      var guid = text(it, "guid") || u;
      var d = it.querySelector("itunes\\:duration");
      eps.push({
        k: hash(guid),
        t: text(it, "title") || ("Episode " + (n + 1)),
        u: absUrl(feedUrl, u),
        art: (it.querySelector("itunes\\:image") || {}).getAttribute ? (it.querySelector("itunes\\:image").getAttribute("href") || image) : image,
        d: durMs(d ? d.textContent : (enc.getAttribute("length") && +enc.getAttribute("length") < 100000 ? enc.getAttribute("length") : 0)),
        date: Date.parse(text(it, "pubDate") || "") || 0,
        desc: (text(it, "description") || text(it, "itunes\\:summary") || "").slice(0, 1200)
      });
    });
    return { title: title, author: author, art: image, desc: desc.slice(0, 1500), link: link, eps: eps };
  }
  function text(node, sel) {
    var el = node.querySelector(sel);
    return el ? (el.textContent || "").trim() : "";
  }
  function fromRss2Json(data, feedUrl) {
    if (!data || data.status !== "ok") throw new Error((data && data.message) || "parser");
    var f = data.feed || {};
    var eps = (data.items || []).slice(0, 40).map(function (it, n) {
      var u = (it.enclosure && (it.enclosure.link || it.enclosure.url)) || it.link || "";
      return {
        k: hash(it.guid || u || it.title),
        t: it.title || ("Episode " + (n + 1)),
        u: u,
        art: it.thumbnail || f.image || "",
        d: durMs(it.itunes_duration || (it.enclosure && it.enclosure.duration)),
        date: Date.parse(it.pubDate || "") || 0,
        desc: String(it.description || it.content || "").replace(/<[^>]+>/g, " ").slice(0, 1200)
      };
    }).filter(function (e) { return e.u; });
    return { title: f.title || "Podcast", author: f.author || "", art: f.image || "", desc: String(f.description || "").replace(/<[^>]+>/g, " ").slice(0, 1500), link: f.link || feedUrl, eps: eps };
  }
  function fetchFeed(url) {
    var via = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(url);
    return fetch(via).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }).then(function (j) {
      return fromRss2Json(j, url);
    }).catch(function () {
      return fetch(url).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); }).then(function (xml) { return fromRss(xml, url); });
    });
  }
  function showObj(url, parsed) {
    var prev = null;
    for (var i = 0; i < subs.length; i++) if (subs[i].url === url) prev = subs[i];
    var latest = 0;
    (parsed.eps || []).forEach(function (e) { if (e.date > latest) latest = e.date; });
    return {
      url: url, title: parsed.title, author: parsed.author, art: parsed.art,
      count: (parsed.eps || []).length, seen: prev ? prev.seen || 0 : 0, latest: latest || Date.now()
    };
  }
  function upsert(url, parsed) {
    feeds[url] = { desc: parsed.desc, link: parsed.link, eps: parsed.eps };
    save(FK, feeds);
    var s = showObj(url, parsed), found = false;
    subs = subs.map(function (x) { if (x.url === url) { found = true; return s; } return x; });
    if (!found) subs.push(s);
    save(SK, subs);
    return s;
  }
  function appleId(q) { var m = String(q).match(/id(\d{5,})/); return m ? m[1] : null; }
  function resolveFeed(q) {
    var id = appleId(q);
    if (!id) return Promise.resolve(q);
    return fetch("https://itunes.apple.com/lookup?id=" + id).then(function (r) { return r.json(); }).then(function (j) {
      var r0 = (j.results || [])[0];
      if (r0 && r0.feedUrl) return r0.feedUrl;
      throw new Error("No RSS feed for that Apple Podcasts link");
    });
  }
  var audio = new Audio();
  audio.setAttribute("playsinline", "");
  audio.preload = "metadata";
  var cur = null, err = "", buffering = false;
  audio.addEventListener("waiting", function () { buffering = true; });
  audio.addEventListener("playing", function () { buffering = false; err = ""; });
  audio.addEventListener("error", function () { buffering = false; err = "This episode would not play. The show may block browser playback."; });
  audio.addEventListener("timeupdate", function () {
    if (!cur) return;
    prog[cur.k] = Math.round(audio.currentTime * 1000);
    save(PK, prog);
  });
  audio.addEventListener("ended", function () {
    if (!cur) return;
    prog[cur.k] = -1;
    save(PK, prog);
  });
  function playObj(e) {
    cur = e;
    err = "";
    buffering = true;
    audio.playbackRate = speed || 1;
    var start = prog[e.k] > 0 ? prog[e.k] / 1000 : 0;
    audio.src = e.u;
    var p = audio.play();
    if (p && p.then) p.then(function () { if (start > 1) { try { audio.currentTime = start; } catch (ex) {} } }).catch(function (ex) { err = (ex && ex.message) || "Playback was blocked"; buffering = false; });
  }
  function mhState() {
    return {
      has: !!cur, pod: !!cur, playing: !!cur && !audio.paused && !audio.ended,
      buffering: buffering, pos: Math.round((audio.currentTime || 0) * 1000),
      dur: Math.round((isFinite(audio.duration) ? audio.duration : (cur && cur.d ? cur.d / 1000 : 0)) * 1000),
      title: cur ? cur.t : "", artist: cur ? cur.show : "", art: cur ? cur.art : "",
      key: cur ? cur.k : "", speed: speed, error: err, id: cur ? cur.k : ""
    };
  }
  window.PD = {
    toast: toast,
    subs: function () { return JSON.stringify(subs); },
    progress: function () { return JSON.stringify(prog); },
    downloads: function () { return JSON.stringify(dls); },
    feed: function (url) { return feeds[url] ? JSON.stringify(feeds[url]) : "null"; },
    storage: function () { return JSON.stringify({ files: Object.keys(dls).length, bytes: 0 }); },
    autoDelete: function () { return false; },
    setAutoDelete: function () { toast("Offline downloads are not available in the browser."); },
    add: function (q) {
      resolveFeed(String(q || "").trim()).then(function (url) {
        if (!/^https?:\/\//i.test(url)) throw new Error("That is not a feed link");
        return fetchFeed(url).then(function (parsed) {
          if (!parsed.eps.length) throw new Error("No playable episodes in that feed");
          var s = upsert(url, parsed);
          if (window.pdAdded) window.pdAdded(JSON.stringify(s));
        });
      }).catch(function (e) {
        if (window.pdAddError) window.pdAddError((e && e.message) || "Could not add that show");
      });
    },
    search: function (q) {
      var u = "https://itunes.apple.com/search?media=podcast&entity=podcast&limit=15&term=" + encodeURIComponent(q);
      fetch(u).then(function (r) { if (!r.ok) throw new Error("Search failed"); return r.json(); }).then(function (j) {
        var rows = (j.results || []).filter(function (r) { return r.feedUrl; }).map(function (r) {
          return { feed: r.feedUrl, title: r.collectionName || r.trackName || "Podcast", author: r.artistName || "", art: r.artworkUrl100 || "", count: r.trackCount || 0 };
        });
        if (window.pdSearch) window.pdSearch(JSON.stringify(rows));
      }).catch(function (e) { if (window.pdSearchError) window.pdSearchError((e && e.message) || "Search failed"); });
    },
    refresh: function (url) {
      var list = url ? subs.filter(function (s) { return s.url === url; }) : subs.slice();
      var failed = 0, left = list.length;
      if (!left) { if (window.pdRefreshDone) window.pdRefreshDone(0); return; }
      list.forEach(function (s) {
        fetchFeed(s.url).then(function (parsed) { upsert(s.url, parsed); }).catch(function () { failed++; }).then(function () {
          left--;
          if (window.pdRefreshed) window.pdRefreshed();
          if (left <= 0 && window.pdRefreshDone) window.pdRefreshDone(failed);
        });
      });
    },
    markSeen: function (url) {
      subs.forEach(function (s) { if (s.url === url) s.seen = s.latest; });
      save(SK, subs);
    },
    play: function (json) {
      var list = [];
      try { list = JSON.parse(json) || []; } catch (e) {}
      if (!list.length) return;
      var e = list[0];
      playObj({ k: e.k, t: e.t, show: e.show, u: e.u, art: e.art, d: e.d || 0 });
    },
    clearError: function () { err = ""; },
    cancelDownload: function (k) { if (window.pdDl) window.pdDl(k, "cancel"); },
    deleteDownload: function (k) { delete dls[k]; save(DK, dls); },
    download: function (k) {
      toast("iPhone plays episodes by streaming. Saving a full episode for offline is not available in the browser.");
      setTimeout(function () { if (window.pdDl) window.pdDl(k, "cancel"); }, 40);
    },
    openUrl: function (u) { if (u) window.open(u, "_blank", "noopener"); },
    setPlayed: function (k, played) { if (played) prog[k] = -1; else delete prog[k]; save(PK, prog); },
    markAllPlayed: function (url) {
      var f = feeds[url];
      if (f && f.eps) f.eps.forEach(function (e) { prog[e.k] = -1; });
      save(PK, prog);
    },
    move: function (url, dir) {
      var i = -1;
      subs.forEach(function (s, n) { if (s.url === url) i = n; });
      var j = i + dir;
      if (i < 0 || j < 0 || j >= subs.length) return;
      var tmp = subs[i]; subs[i] = subs[j]; subs[j] = tmp;
      save(SK, subs);
    },
    remove: function (url) {
      subs = subs.filter(function (s) { return s.url !== url; });
      delete feeds[url];
      save(SK, subs); save(FK, feeds);
    },
    skip: function (ms) { try { audio.currentTime = Math.max(0, (audio.currentTime || 0) + ms / 1000); } catch (e) {} },
    setSpeed: function (n) { speed = +n || 1; audio.playbackRate = speed; save(SPK, speed); }
  };
  window.MH = {
    state: function () { return JSON.stringify(mhState()); },
    cmd: function (c) {
      if (c === "toggle") { if (!cur) return; if (audio.paused) { var p = audio.play(); if (p && p.catch) p.catch(function () {}); } else audio.pause(); }
      else if (c === "stop") { audio.pause(); cur = null; }
    },
    seek: function (ms) { try { audio.currentTime = (+ms || 0) / 1000; } catch (e) {} }
  };
})();
