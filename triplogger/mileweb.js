/* Trip Logger v1.0 - browser/desktop mileage bridge.
   The Android app provides a native MileBridge (background GPS foreground service).
   Everywhere else (desktop Flatpak, iPhone/Safari web app) this file provides the same
   interface using the browser Geolocation API. Miles only count while the app is open. */
(function(){
  "use strict";
  if(window.MileBridge) return; // native Android bridge present
  var K = "trip-logger-web-mile-v1";
  function load(){ try{ var v = JSON.parse(localStorage.getItem(K) || "{}"); return v && typeof v === "object" ? v : {}; }catch(e){ return {}; } }
  var S = load();
  S.days = S.days && typeof S.days === "object" ? S.days : {};
  var hasGeo = !!(navigator.geolocation && navigator.geolocation.watchPosition);
  if(!hasGeo) S.gps = "nogeo";
  function save(){ try{ localStorage.setItem(K, JSON.stringify(S)); }catch(e){} }
  var watchId = null, last = null, lastPush = 0, lastGps = S.gps;
  function push(force){
    var now = Date.now();
    if(!force && S.gps === lastGps && now - lastPush < 3000) return;
    lastGps = S.gps; lastPush = now;
    setTimeout(function(){ if(window.onMileState) window.onMileState(); }, 0);
  }
  function dayKey(t){ var d = new Date(t), m = d.getMonth()+1, dd = d.getDate(); return d.getFullYear() + "-" + (m<10?"0":"") + m + "-" + (dd<10?"0":"") + dd; }
  function rad(x){ return x * Math.PI / 180; }
  function dist(a, b){ var R = 6371008.8, dl = rad(b.lat-a.lat), dn = rad(b.lon-a.lon);
    var h = Math.sin(dl/2)*Math.sin(dl/2) + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dn/2)*Math.sin(dn/2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h))); }
  function onFix(p){
    var c = p.coords, acc = c.accuracy;
    if(S.paused){ last = null; S.gps = "ok"; save(); push(); return; }
    // Same filters as the Android service: ignore rough fixes, GPS jumps and jitter.
    if(!(acc > 0) || acc > 35){ S.gps = "rough"; save(); push(); return; }
    S.gps = "ok";
    var cur = {lat: c.latitude, lon: c.longitude, acc: acc, t: p.timestamp || Date.now()};
    if(!last){ last = cur; save(); push(); return; }
    var d = dist(last, cur), dt = (cur.t - last.t) / 1000;
    if(dt <= 0) return;
    if(d / dt > 45){ last = cur; return; }
    if(d < Math.max(15, acc)) { push(); return; }
    var k = dayKey(cur.t);
    S.days[k] = (S.days[k] || 0) + d;
    S.sessionMeters = (S.sessionMeters || 0) + d;
    last = cur; save(); push(true);
  }
  function onErr(e){
    S.gps = (e && e.code === 1) ? "denied" : "off";
    if(e && e.code === 1){ stopWatch(); S.tracking = false; }
    save(); push(true);
  }
  function startWatch(){
    if(!hasGeo || watchId !== null) return;
    try{ watchId = navigator.geolocation.watchPosition(onFix, onErr, {enableHighAccuracy: true, maximumAge: 0, timeout: 60000}); }
    catch(e){ onErr({code: 2}); }
  }
  function stopWatch(){ if(watchId !== null){ try{ navigator.geolocation.clearWatch(watchId); }catch(e){} watchId = null; } last = null; }
  window.MileBridge = {
    web: true,
    hasGeo: hasGeo,
    status: function(){
      return JSON.stringify({tracking: !!S.tracking, paused: !!S.tracking && !!S.paused, sessionStart: S.sessionStart || 0,
        sessionMeters: S.sessionMeters || 0, gps: S.gps || "", days: S.days, web: true});
    },
    start: function(){
      if(!hasGeo){ S.gps = "nogeo"; save(); push(true); return; }
      S.tracking = true; S.paused = false; S.sessionStart = Date.now(); S.sessionMeters = 0; S.gps = "searching";
      save(); startWatch(); push(true);
    },
    stop: function(){ stopWatch(); S.tracking = false; S.paused = false; save(); push(true); },
    pause: function(){ if(!S.tracking) return; S.paused = true; last = null; save(); push(true); },
    resume: function(){ if(!S.tracking) return; S.paused = false; last = null; save(); push(true); },
    importDays: function(json){
      try{ var o = JSON.parse(json); Object.keys(o).forEach(function(k){ if(/^\d{4}-\d{2}-\d{2}$/.test(k)){ var v = +o[k] || 0; if(v > (S.days[k] || 0)) S.days[k] = v; } }); save(); }catch(e){}
    },
    addManual: function(day, meters){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
      var v = (S.days[day] || 0) + meters; if(v < 0) v = 0;
      S.days[day] = v; save(); push(true); return true;
    }
  };
  // Keep counting after a reload if a shift was running.
  if(S.tracking && hasGeo){ S.gps = "searching"; startWatch(); }
})();
