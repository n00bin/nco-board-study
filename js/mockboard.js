/* ===========================================================
   Mock Board — simulates the oral board: mixed questions across
   subjects, a per-question timer, answer aloud, self-grade.
   Ends with a score and your weakest subjects.
   =========================================================== */
(function () {
  "use strict";

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  var timer = null;
  function clearTimer() { if (timer) { clearInterval(timer); timer = null; } }

  var MockBoard = {
    stop: function () { clearTimer(); if (window.Speech) Speech.stop(); },

    render: function (container, cards, length) {
      var pool = cards.filter(function (c) { return c.q && c.a; });
      if (pool.length < 3) { container.innerHTML = '<div class="empty">Need a few more cards to run a board.</div>'; return; }
      length = Math.min(length || 15, pool.length);
      var deck = shuffle(pool).slice(0, length);
      var i = 0, got = 0, missed = [];
      var perPub = {}; // pub -> {n, miss}
      var secs = (Store.settings().timer | 0);
      var autoRead = Store.settings().autoRead;

      function pubCode(c) { var p = STUDY.pubsById[c.pub]; return p ? p.code : c.pub; }

      function question() {
        clearTimer();
        var c = deck[i];
        var timed = secs > 0;
        container.innerHTML =
          '<div class="q-count">Question ' + (i + 1) + " of " + deck.length + "  •  Board score " + got + '</div>' +
          (timed ? '<div class="bar timer-bar"><span id="tBar" style="width:100%"></span></div><div class="center muted" id="tNum"></div>' : '') +
          '<div class="card"><div class="flash-toprow"><span class="flash-tag">' + esc(pubCode(c)) + (c.topic ? " • " + esc(c.topic) : "") + '</span>' +
            '<span><button class="mini" id="mSpeak" aria-label="Read aloud">&#128266;</button>' +
            '<button class="mini" id="mReport" aria-label="Report card">&#9873;</button></span></div>' +
            '<div class="q-text" style="margin-top:8px;">' + esc(c.q) + '</div></div>' +
          '<p class="center muted">Answer out loud, then reveal.</p>' +
          '<button class="btn gold lg" id="reveal">Reveal answer</button>';
        container.querySelector("#mSpeak").addEventListener("click", function () { Speech.speak(c.q); });
        container.querySelector("#mReport").addEventListener("click", function () { App.reportCard(c); });
        container.querySelector("#reveal").addEventListener("click", reveal);
        if (autoRead) Speech.speak(c.q);

        if (timed) {
          var left = secs, bar = container.querySelector("#tBar"), num = container.querySelector("#tNum");
          num.textContent = left + "s";
          timer = setInterval(function () {
            left--;
            if (!container.querySelector("#tBar")) { clearTimer(); return; } // navigated away
            bar.style.width = Math.max(0, (left / secs) * 100) + "%";
            num.textContent = Math.max(0, left) + "s";
            if (left <= 0) { clearTimer(); reveal(); }
          }, 1000);
        }
      }

      function reveal() {
        clearTimer();
        var c = deck[i];
        if (autoRead) Speech.speak(c.a);
        container.innerHTML =
          '<div class="q-count">Question ' + (i + 1) + " of " + deck.length + '</div>' +
          '<div class="card"><div class="flash-tag">' + esc(pubCode(c)) + '</div>' +
            '<div class="q-text" style="margin:6px 0 12px;">' + esc(c.q) + '</div>' +
            '<div class="flash-tag">Answer</div><div class="flash-a">' + esc(c.a).replace(/\n/g, "<br>") + '</div>' +
            (c.ref ? '<div class="flash-ref">Reference: ' + esc(c.ref) + '</div>' : '') + '</div>' +
          '<p class="center muted">How did you do?</p>' +
          '<div class="grade-row"><button class="btn grade-again" id="miss">Missed it</button>' +
            '<button class="btn grade-good" id="got">Got it</button></div>';
        container.querySelector("#got").addEventListener("click", function () { mark(true); });
        container.querySelector("#miss").addEventListener("click", function () { mark(false); });
      }

      function mark(ok) {
        var c = deck[i];
        Store.grade(c.id, ok ? "good" : "again");
        var pp = perPub[c.pub] || (perPub[c.pub] = { n: 0, miss: 0, code: pubCode(c) });
        pp.n++;
        if (ok) got++; else { pp.miss++; missed.push(c); }
        i++;
        if (i >= deck.length) return results();
        question();
      }

      function results() {
        clearTimer(); Speech.stop();
        Store.recordQuiz("Mock Board", got, deck.length);
        var pct = Math.round((got / deck.length) * 100);
        var weak = Object.keys(perPub).map(function (k) { return perPub[k]; })
          .filter(function (p) { return p.miss > 0; })
          .sort(function (a, b) { return b.miss - a.miss; }).slice(0, 5);
        var msg = pct >= 90 ? "Board-ready." : pct >= 75 ? "Strong — tighten the misses." : pct >= 60 ? "Passing. Keep drilling." : "Needs work — run it again.";
        var html =
          '<div class="ring-wrap"><div class="ring">' + pct + '%<small>' + got + " of " + deck.length + ' correct</small></div></div>' +
          '<p class="center muted">' + msg + '</p>';
        if (weak.length) {
          html += '<h2 class="section">Weakest subjects</h2>';
          weak.forEach(function (p) { html += '<div class="row"><div class="grow"><div class="code">' + esc(p.code) + '</div></div><div class="badge-bad" style="font-weight:700;">missed ' + p.miss + '/' + p.n + '</div></div>'; });
        }
        if (missed.length) {
          html += '<h2 class="section">Review your misses</h2>';
          missed.forEach(function (c) {
            html += '<div class="card"><div class="flash-tag">' + esc(pubCode(c)) + '</div><div style="font-weight:600;margin-bottom:6px;">' + esc(c.q) + '</div><div class="muted">' + esc(c.a) + '</div></div>';
          });
        }
        html += '<div class="spacer"></div><button class="btn gold lg" id="again">New board</button><div class="spacer"></div><button class="btn ghost" id="home">Home</button>';
        container.innerHTML = html;
        container.querySelector("#again").addEventListener("click", function () { MockBoard.render(container, cards, length); });
        container.querySelector("#home").addEventListener("click", function () { App.go("#/"); });
      }

      question();
    }
  };

  window.MockBoard = MockBoard;
})();
