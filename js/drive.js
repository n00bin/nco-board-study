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
      var deck = Store.buildQueue(cards);
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

      function paint(phase) {
        var c = deck[i];
        var p = STUDY.pubsById[c.pub];
        var phaseLabel = !playing ? "&#10073;&#10073; Paused" : phase === "q" ? "&#128266; Question…" : phase === "listen" ? "&#127908; Your turn — answer aloud" : "&#9989; Answer";
        container.innerHTML =
          '<div class="flash-progress">Drive Mode • ' + esc(title) + ' • ' + (i + 1) + ' / ' + deck.length + (i === 0 ? '<br><span style="font-size:.8rem;">Cards due for review play first, then new ones. Stop any time.</span>' : '') + '</div>' +
          '<div class="card drive-card"><div class="flash-tag">' + esc(p ? p.code : "") + '</div>' +
            '<div class="phase" id="phase">' + phaseLabel + '</div>' +
            '<div class="flash-q" style="margin:10px 0;font-size:1.3em;line-height:1.4;">' + esc(c.oral || c.q) + '</div>' +
            (phase === "a" ? '<hr class="div"><div class="flash-a" style="font-size:1.2em;line-height:1.4;">' + esc(c.a).replace(/\n/g, "<br>") + '</div>' : '') +
          '</div>' +
          '<div class="btn-row">' +
            '<button class="btn lg" id="dPause">' + (playing ? "&#10073;&#10073; Pause" : "&#9658; Resume") + '</button>' +
            '<button class="btn lg" id="dNext">Next &#9197;</button>' +
          '</div><div class="spacer"></div>' +
          '<button class="btn green" id="dLoop">' + (loop ? "&#128257; Repeat: on" : "&#128257; Repeat: off") + '</button>' +
          '<div class="spacer"></div><button class="btn ghost" id="dStop">&#9209; Stop Drive Mode</button>';
        container.querySelector("#dPause").addEventListener("click", function () { playing ? pause() : resume(); });
        container.querySelector("#dNext").addEventListener("click", function () { skip(); });
        container.querySelector("#dLoop").addEventListener("click", function () { loop = !loop; container.querySelector("#dLoop").innerHTML = loop ? "&#128257; Repeat: on" : "&#128257; Repeat: off"; });
        container.querySelector("#dStop").addEventListener("click", function () { Drive.stop(); App.go("#/"); });
      }

      function step() {
        if (!playing) return;
        var myGen = ++gen, c = deck[i];
        paint("q");
        Speech.speak(c.oral || c.q, { onEnd: function () {
          if (!playing || myGen !== gen) return;
          paint("listen");
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
      function pause() { playing = false; gen++; clearTimer(); Speech.stop(); paint("a"); }
      function resume() { playing = true; requestWake(); step(); }

      function finish() {
        Drive.stop();
        container.innerHTML =
          '<div class="ring-wrap"><div class="ring">&#9989;<small>Played ' + deck.length + ' cards</small></div></div>' +
          '<p class="center muted">Drive Mode complete.</p><div class="spacer"></div>' +
          '<button class="btn gold lg" id="again">Play again</button><div class="spacer"></div>' +
          '<button class="btn ghost" id="home">Back to Home</button>';
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
