/* ===========================================================
   Drive Mode — hands-free audio study. Reads the question,
   pauses for you to answer aloud, reads the answer, advances.
   Keeps the screen awake. Built for studying during PT / driving.
   =========================================================== */
(function () {
  "use strict";

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  var timer = null, gen = 0, playing = false;
  var wakeLock = null, wakeWanted = false, wakeGen = 0, visHooked = false;
  function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } }

  function dropLock() {
    var w = wakeLock; wakeLock = null;
    try { if (w) { var r = w.release(); if (r && r.catch) r.catch(function () {}); } } catch (e) {}
  }
  function requestWake() {
    wakeWanted = true;
    dropLock(); // never overwrite (and leak) a lock we already hold
    var myWake = ++wakeGen;
    try {
      if (navigator.wakeLock && navigator.wakeLock.request) {
        navigator.wakeLock.request("screen").then(function (w) {
          // Resolved late (Drive stopped, or a newer request superseded this one): let it go.
          if (!wakeWanted || !playing || myWake !== wakeGen) {
            try { var r = w.release(); if (r && r.catch) r.catch(function () {}); } catch (e) {}
            return;
          }
          wakeLock = w;
        }).catch(function () {});
      }
    } catch (e) {}
    if (!visHooked && typeof document !== "undefined" && document.addEventListener) {
      visHooked = true;
      // The browser drops the lock when the app is backgrounded; take it back on return.
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible" && playing && wakeWanted) requestWake();
      });
    }
  }
  function releaseWake() { wakeWanted = false; wakeGen++; dropLock(); }

  var Drive = {
    stop: function () { playing = false; gen++; clearTimer(); if (window.Speech) Speech.stop(); releaseWake(); },

    render: function (container, cards, title) {
      var deck = Store.buildQueue(cards), t0 = Date.now();
      if (!deck.length) deck = cards.slice();
      // mix the order so a hands-free session doesn't open on the same card every time (due cards still come first)
      var dueN = Store.isDue ? deck.filter(function (c) { return Store.isDue(c.id); }).length : 0;
      var tail = deck.slice(dueN);
      for (var k = tail.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)); var tmp = tail[k]; tail[k] = tail[j]; tail[j] = tmp; }
      // after the due cards, start with the highest-yield ones (Top 100) instead of a random niche card
      tail = tail.filter(function (c) { return c.top; }).concat(tail.filter(function (c) { return !c.top; }));
      deck = deck.slice(0, dueN).concat(tail);
      if (!deck.length) { container.innerHTML = '<div class="empty">No cards to play here.</div>'; return; }
      var i = 0, loop = false;
      var gap = (Store.settings().driveGap | 0) || 5;

      if (!Speech.supported()) {
        container.innerHTML = '<div class="empty">Read-aloud isn\'t available in this browser, so Drive Mode can\'t run. Try Chrome on Android.</div>';
        return;
      }

      var shown = "q";
      function paint(phase) {
        shown = phase;
        var c = deck[i];
        var p = STUDY.pubsById[c.pub];
        var phaseLabel = !playing ? "<svg class=ic aria-hidden=true><use href=#i-pause></use></svg> Paused" : phase === "q" ? "<svg class=ic aria-hidden=true><use href=#i-speaker></use></svg> Question…" : phase === "listen" ? "<svg class=ic aria-hidden=true><use href=#i-mic></use></svg> Your turn — answer aloud" : "<svg class=ic aria-hidden=true><use href=#i-check></use></svg> Answer";
        container.innerHTML =
          '<div class="q-count mb-head"><span>' + esc(title) + '</span><span class="pill">' + (i + 1) + ' of ' + deck.length + '</span></div><div class="progress-bar"><span style="width:' + Math.round(100 * i / Math.max(1, deck.length)) + '%"></span></div>' +
          '<div class="card drive-card"><div class="flash-tag">' + esc(p ? p.code : "") + '</div>' +
            '<div class="phase" id="phase">' + phaseLabel + '</div>' +
            '<div class="flash-q" style="margin:10px 0;font-size:1.3em;line-height:1.4;">' + esc(c.oral || c.q) + '</div>' +
            (phase === "a" ? '<hr class="div"><div class="flash-a" style="font-size:1.2em;line-height:1.4;">' + esc(c.a).replace(/\n/g, "<br>") + '</div>' : '') +
          '</div>' +
          '<div class="drive-ctl"><div class="drive-sub">' +
            '<button class="btn ghost sm' + (loop ? ' on' : '') + '" id="dLoop">' + (loop ? "<svg class=ic aria-hidden=true><use href=#i-refresh></use></svg> Repeat: on" : "<svg class=ic aria-hidden=true><use href=#i-refresh></use></svg> Repeat: off") + '</button>' +
            '<button class="btn ghost sm" id="dStop"><svg class=ic aria-hidden=true><use href=#i-stop></use></svg> Stop</button></div><div class="btn-row">' +
            '<button class="btn lg" id="dPause">' + (playing ? "<svg class=ic aria-hidden=true><use href=#i-pause></use></svg> Pause" : "<svg class=ic aria-hidden=true><use href=#i-play></use></svg> Resume") + '</button>' +
            '<button class="btn lg" id="dNext">Next <svg class=ic aria-hidden=true><use href=#i-next></use></svg></button>' +
          '</div></div>';
        container.querySelector("#dPause").addEventListener("click", function () { playing ? pause() : resume(); });
        container.querySelector("#dNext").addEventListener("click", function () { skip(); });
        container.querySelector("#dLoop").addEventListener("click", function () { loop = !loop; container.querySelector("#dLoop").className = "btn ghost sm" + (loop ? " on" : ""); container.querySelector("#dLoop").innerHTML = loop ? "<svg class=ic aria-hidden=true><use href=#i-refresh></use></svg> Repeat: on" : "<svg class=ic aria-hidden=true><use href=#i-refresh></use></svg> Repeat: off"; });
        container.querySelector("#dStop").addEventListener("click", function () { finish(i); });
      }

      function step() {
        if (!playing) return;
        var myGen = ++gen, c = deck[i];
        paint("q");
        Speech.speak(c.oral || c.q, { onEnd: function () {
          if (!playing || myGen !== gen) return;
          paint("listen");
          var wait = gap * ((c.pub === "sit" || c.pub === "personal" || String(c.a).length > 200) ? 3 : 1), t0 = Date.now();
          var tick = function () { var ph = container.querySelector("#phase"); if (!playing || myGen !== gen || !ph || shown !== "listen") return; var left = Math.max(0, Math.ceil(wait - (Date.now() - t0) / 1000)); ph.innerHTML = '<svg class=ic aria-hidden=true><use href=#i-mic></use></svg> Your turn: answer aloud <b class="cd">' + left + 's</b>'; if (left > 0) setTimeout(tick, 250); };
          tick();
          timer = setTimeout(function () {
            if (!playing || myGen !== gen) return;
            paint("a");
            Speech.speak(c.a, { onEnd: function () {
              if (!playing || myGen !== gen) return;
              timer = setTimeout(function () { if (playing && myGen === gen) advance(); }, 1200);
            } });
          }, gap * 1000 * ((c.pub === "sit" || c.pub === "personal" || String(c.a).length > 200) ? 3 : 1));   // scenarios need time to answer
        } });
      }

      function advance() {
        if (i + 1 >= deck.length) { if (loop) i = 0; else return finish(); }
        else i++;
        step();
      }
      function skip() { gen++; clearTimer(); Speech.stop(); if (!playing) { playing = true; container.querySelector && requestWake(); } if (i + 1 >= deck.length && !loop) return finish(); i = (i + 1) % deck.length; step(); }
      function pause() { playing = false; gen++; clearTimer(); Speech.stop(); paint(shown || "q"); }
      function resume() { playing = true; requestWake(); step(); }

      function finish(upTo) {
        Drive.stop();
        var n = upTo == null ? deck.length : upTo, p = Math.round(100 * n / Math.max(1, deck.length));
        container.innerHTML =
          (upTo == null ? '<div class="ring-wrap"><div class="ring good" style="--p:100;"><div class="ring-in">' + n + '</div></div><small>cards played</small></div>'
            : '<div class="stop-ic"><svg class=ic aria-hidden=true><use href=#i-headphones></use></svg></div>') +
          '<div class="done-h">' + (upTo == null ? 'Drive Mode done' : 'Stopped') + '</div><p class="center muted" style="margin-top:0;">' + (upTo == null ? 'You heard every card in this set.' : 'Stopped on card ' + (n + 1) + ' of ' + deck.length + ' after ' + (Date.now() - t0 < 60000 ? 'under a minute' : 'about ' + Math.round((Date.now() - t0) / 60000) + ' min') + '. Pick up again any time; due cards come first.') + '</p>' +
          '<div class="spacer"></div>' +
          '<button class="btn gold lg" id="again">' + (upTo == null ? 'Play again' : 'Pick up again') + '</button><div class="spacer"></div>' +
          '<button class="home-link" id="home">Back to Home</button>';
        container.querySelector("#again").addEventListener("click", function () { Drive.render(container, cards, title); });
        container.querySelector("#home").addEventListener("click", function () { App.go("#/"); });
      }

      // start
      playing = true;
      requestWake();
      step();
    }
  };

  window.Drive = Drive;
})();
