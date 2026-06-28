/* ===========================================================
   Drive Mode — hands-free audio study. Reads the question,
   pauses for you to answer aloud, reads the answer, advances.
   Keeps the screen awake. Built for studying during PT / driving.
   =========================================================== */
(function () {
  "use strict";

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  var timer = null, gen = 0, playing = false, wakeLock = null;
  function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } }

  function requestWake() {
    try {
      if (navigator.wakeLock && navigator.wakeLock.request)
        navigator.wakeLock.request("screen").then(function (w) { wakeLock = w; }).catch(function () {});
    } catch (e) {}
  }
  function releaseWake() { try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) {} }

  var Drive = {
    stop: function () { playing = false; gen++; clearTimer(); if (window.Speech) Speech.stop(); releaseWake(); },

    render: function (container, cards, title) {
      var deck = Store.buildQueue(cards);
      if (!deck.length) deck = cards.slice();
      if (!deck.length) { container.innerHTML = '<div class="empty">No cards to play here.</div>'; return; }
      var i = 0, loop = false;
      var gap = (Store.settings().driveGap | 0) || 6;

      if (!Speech.supported()) {
        container.innerHTML = '<div class="empty">Read-aloud isn\'t available in this browser, so Drive Mode can\'t run. Try Chrome on Android.</div>';
        return;
      }

      function paint(phase) {
        var c = deck[i];
        var p = STUDY.pubsById[c.pub];
        var phaseLabel = phase === "q" ? "&#128266; Question…" : phase === "listen" ? "&#127908; Your turn — answer aloud" : "&#9989; Answer";
        container.innerHTML =
          '<div class="flash-progress">Drive Mode • ' + esc(title) + ' • ' + (i + 1) + ' / ' + deck.length + '</div>' +
          '<div class="card drive-card"><div class="flash-tag">' + esc(p ? p.code : "") + (c.topic ? " • " + esc(c.topic) : "") + '</div>' +
            '<div class="phase" id="phase">' + phaseLabel + '</div>' +
            '<div class="flash-q" style="margin:10px 0;">' + esc(c.q) + '</div>' +
            (phase === "a" ? '<hr class="div"><div class="flash-a">' + esc(c.a).replace(/\n/g, "<br>") + '</div>' : '') +
          '</div>' +
          '<div class="btn-row">' +
            '<button class="btn ghost" id="dPause">' + (playing ? "&#10073;&#10073; Pause" : "&#9658; Resume") + '</button>' +
            '<button class="btn ghost" id="dNext">Next &#9197;</button>' +
          '</div><div class="spacer"></div>' +
          '<button class="btn green" id="dLoop">' + (loop ? "&#128257; Loop: ON" : "&#128257; Loop: off") + '</button>' +
          '<div class="spacer"></div><button class="btn gold" id="dStop">&#9209; Stop Drive Mode</button>';
        container.querySelector("#dPause").addEventListener("click", function () { playing ? pause() : resume(); });
        container.querySelector("#dNext").addEventListener("click", function () { skip(); });
        container.querySelector("#dLoop").addEventListener("click", function () { loop = !loop; container.querySelector("#dLoop").innerHTML = loop ? "&#128257; Loop: ON" : "&#128257; Loop: off"; });
        container.querySelector("#dStop").addEventListener("click", function () { Drive.stop(); App.go("#/"); });
      }

      function step() {
        if (!playing) return;
        var myGen = ++gen, c = deck[i];
        paint("q");
        Speech.speak(c.q, { onEnd: function () {
          if (!playing || myGen !== gen) return;
          paint("listen");
          timer = setTimeout(function () {
            if (!playing || myGen !== gen) return;
            paint("a");
            Speech.speak(c.a, { onEnd: function () {
              if (!playing || myGen !== gen) return;
              timer = setTimeout(function () { if (playing && myGen === gen) advance(); }, 1200);
            } });
          }, gap * 1000);
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
          '<button class="btn ghost" id="home">Home</button>';
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
