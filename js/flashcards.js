/* ===========================================================
   Flashcards — spaced repetition. Grade each card Again/Good/Easy;
   the schedule decides when you'll see it again. "Again" cards
   loop back within the same session until you get them.
   =========================================================== */
(function () {
  "use strict";

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  function normA(s) { return String(s).toLowerCase().replace(/\b(a|an|the|and)\b/g, "").replace(/[^a-z0-9]/g, ""); }

  var EMPTY = "Nothing to study here right now. Nothing is due, or the deck is empty. Try Board Core, or pick a subject.";
  var GRADE_HINT = "Missed it: see it soon. Got it: see it later. Easy: see it much later.";
  var GRADE_BTNS =
    '<button class="btn grade-again" id="gAgain">Missed</button>' +
    '<button class="btn grade-good" id="gGood">Got it</button>' +
    '<button class="btn grade-easy" id="gEasy">Easy</button>';

  // what the session looked like, by each card's first grade
  function finishHtml(first) {
    var ids = Object.keys(first), n = ids.length, miss = 0, easy = 0;
    ids.forEach(function (k) { if (first[k] === "again") miss++; else if (first[k] === "easy") easy++; });
    var known = n - miss, p = n ? Math.round(100 * known / n) : 0;
    return '<div class="ring-wrap"><div class="ring ' + (p >= 75 ? 'good' : p >= 50 ? 'mid' : 'bad') + '" style="--p:' + p + ';"><div class="ring-in">' + p + '%</div></div><small>knew it the first time</small></div>' +
      '<div class="done-h">Session complete</div>' +
      '<div class="dots" aria-hidden="true">' + ids.slice(0, 80).map(function (k) { return '<span class="dot ' + (first[k] === "again" ? 'r' : 'g') + '"></span>'; }).join("") + '</div>' +
      '<p class="center muted">' + n + ' card' + (n === 1 ? '' : 's') + ' \u2022 ' + (known - easy) + ' got it' + (easy ? ' \u2022 ' + easy + ' easy' : '') + ' \u2022 ' + miss + ' missed</p>' +
      (miss ? (Store.setChainRole("last-misses", ids.filter(function (k) { return first[k] === "again"; }).slice(0, 40).join(",")), '<a class="btn gold lg" href="#/flash/misses"><svg class=ic aria-hidden=true><use href=#i-refresh></use></svg> Drill your ' + miss + ' miss' + (miss === 1 ? '' : 'es') + ' now</a>') : '');
  }
  function hasMiss(first) { return Object.keys(first).some(function (k) { return first[k] === "again"; }); }
  var Flashcards = {
    // cards = the deck for this session (already filtered by caller)
    render: function (container, cards, title, opts) {
      if (opts && opts.typed) return Flashcards.renderTyped(container, cards, title);
      if (!cards.length) { container.innerHTML = '<div class="empty">' + EMPTY + '</div>'; return; }

      // due first, then new; big decks only feed in 30 new cards per session so it stays doable
      var queue = Store.buildQueue(cards, (cards.length > 60 && !(opts && opts.noCap)) ? 30 : undefined).slice();
      if (!queue.length) queue = cards.slice();           // (deck with nothing due) study all
      var i = 0, reviewed = 0, passed = 0, conf, first = {};
      var autoRead = Store.settings().autoRead;
      var confRow;

      container.innerHTML =
        '<div class="flash-wrap">' +
          '<div class="q-count mb-head" id="fProg" aria-live="polite"></div><div class="progress-bar"><span id="fBar" style="width:0%"></span></div>' +
          '<div class="flashcard" id="fCard" role="button" tabindex="0" aria-label="Flashcard. Tap or press Enter to flip."><div class="flash-inner">' +
            '<div class="flash-face flash-front" id="fFront">' +
              '<div class="flash-toprow"><span class="flash-tag" id="fTagF"></span>' +
                '<span><button class="mini" id="fSpeak" aria-label="Read aloud"><svg class=ic aria-hidden=true><use href=#i-speaker></use></svg></button>' +
                '<button class="mini" id="fReport" aria-label="Report card"><svg class=ic aria-hidden=true><use href=#i-flag></use></svg></button></span></div>' +
              '<div class="flash-q" id="fQ"></div>' +
              '<div class="flash-hint" id="fHint">Tap card to flip</div>' +
              '<div class="flip-cue" aria-hidden="true">&#8635; tap the card to flip</div>' +
            '</div>' +
            '<div class="flash-face flash-back" id="fBack" aria-hidden="true">' +
              '<div class="flash-toprow"><span class="flash-tag" id="fTagB">Answer</span>' +
                '<span><button class="mini" id="fSpeakB" aria-label="Read the answer aloud"><svg class=ic aria-hidden=true><use href=#i-speaker></use></svg></button>' +
                '<button class="mini" id="fReportB" aria-label="Report card"><svg class=ic aria-hidden=true><use href=#i-flag></use></svg></button></span></div>' +
              '<div class="flash-a" id="fA"></div>' +
              '<div class="flash-ref" id="fRef"></div>' +
            '</div>' +
          '</div></div>' +
          '<div class="grade-row conf-row" id="fConf"><button class="btn ghost" id="cUnsure">Not sure</button><button class="btn gold" id="cSure">I know it</button></div>' +
          '<div class="grade-row" id="fGrades" hidden>' + GRADE_BTNS + '</div>' +
        '</div>';

      var cardEl = container.querySelector("#fCard");
      var grades = container.querySelector("#fGrades");
      var hint = container.querySelector("#fHint");
      confRow = container.querySelector("#fConf");
      var front = container.querySelector("#fFront"), back = container.querySelector("#fBack");

      function pubCode(c) { if (c.label) return c.label; var p = STUDY.pubsById[c.pub]; return p ? p.code : ""; }

      function setFaces(flipped) {
        front.setAttribute("aria-hidden", flipped ? "true" : "false");
        back.setAttribute("aria-hidden", flipped ? "false" : "true");
        grades.hidden = !flipped; confRow.hidden = flipped;
        hint.textContent = flipped ? "" : (queue[i] && queue[i].why ? "Say the answer and why it matters, then flip" : "Say the answer, then flip");
      }

      function paint() {
        var c = queue[i];
        var wasFlipped = cardEl.classList.contains("flipped");
        cardEl.classList.remove("flipped");
        setFaces(false);
        conf = undefined;
        var left = queue.length - i, mins = Math.max(1, Math.round(left * 15 / 60));
        container.querySelector("#fBar").style.width = Math.round(100 * passed / Math.max(1, passed + left)) + "%";
        container.querySelector("#fProg").innerHTML = '<span>' + passed + ' done' + (reviewed > passed ? ' \u2022 misses come back' : '') + '</span><span class="pill">' + left + ' to go \u2022 ~' + mins + ' min</span>';
        container.querySelector("#fTagF").textContent = pubCode(c) + (c.adv ? " \u2022 Advanced" : "");   // topic only on the back: it can give the answer away
        container.querySelector("#fTagB").textContent = "Answer" + (c.topic ? " • " + c.topic : "");
        container.querySelector("#fQ").textContent = c.q;
        // Wait for the flip-back animation before swapping in the next answer, so it never flashes.
        var fill = function () {
          // the question stays visible on the back, and the card grows to fit long answers instead of clipping them
          container.querySelector("#fA").style.fontSize = String(c.a).length > 220 ? "1rem" : "";   // long answers: calmer size
          container.querySelector("#fA").innerHTML = '<div class="muted" style="font-size:.85rem;margin-bottom:8px;">' + esc(c.q) + '</div>' +
            esc(c.a).replace(/\n/g, "<br>") +
            (c.changed ? '<div class="flash-ref" style="color:var(--gold);margin-top:10px;"><svg class=ic aria-hidden=true><use href=#i-alert></use></svg> ' + esc(c.changed) + '</div>' : "") +
            (c.why ? '<div class="flash-ref" style="color:var(--text);margin-top:12px;"><b>Why it matters:</b> ' + esc(c.why) + '</div>' : "") +
            (c.sample && c.pub === "personal" ? '<div class="flash-ref" style="color:var(--text);margin-top:12px;"><b>Example answer (fictional Soldier, make it yours):</b> ' + esc(c.sample) + '</div>' : "") +
            (c.points && c.points.length > 1 ? '<details class="fb-fold"><summary>Did you cover these? (' + c.points.length + ' key points)</summary>' + c.points.map(function (p) { return '<div style="margin-top:4px;">\u2022 ' + esc(p) + '</div>'; }).join("") + '</details>' : "") +
            (c.follow && c.follow.length ? '<details class="fb-fold"><summary>Board follow-ups (' + c.follow.length + ')</summary>' +
              c.follow.map(function (f) { return '<details class="follow-d" style="margin-top:8px;"><summary><b style="color:var(--text);">Q: ' + esc(f.q) + '</b> <span class="muted" style="font-size:.85rem;">(say it, then tap)</span></summary><span class="muted follow-a">A: ' + esc(f.a) + '</span></details>'; }).join("") + '</details>' : "");
          container.querySelector("#fRef").textContent = c.ref ? "Reference: " + c.ref : "";
          var inner = cardEl.querySelector(".flash-inner");
          inner.style.minHeight = ""; cardEl.style.minHeight = "";
          sizeTo(false);
        };
        if (wasFlipped) { container.querySelector("#fA").textContent = ""; setTimeout(function () { if (queue[i] === c) fill(); }, 300); }
        else fill();
        if (autoRead) Speech.speak(c.q);
      }

      // the card is as tall as the side you're looking at, so the buttons under it stay on screen
      function sizeTo(flipped) {
        var inner = cardEl.querySelector(".flash-inner");
        inner.style.minHeight = ""; cardEl.style.minHeight = "";
        var h = Math.max(260, (flipped ? back.scrollHeight : front.scrollHeight) + 6);
        inner.style.minHeight = h + "px"; cardEl.style.minHeight = h + "px";
      }
      function flip() {
        var flipped = cardEl.classList.toggle("flipped");
        setFaces(flipped); sizeTo(flipped);
        if (flipped && autoRead) Speech.speak(queue[i].a);
      }

      function grade(g) {
        var c = queue[i];
        Store.grade(c.id, g, conf);
        reviewed++; if (!(c.id in first)) first[c.id] = g;
        if (g === "again") queue.push(c);   // loop back later this session
        else passed++;
        i++;
        if (i >= queue.length) return done();
        paint();
      }

      function done() {
        Speech.stop();
        if (opts && opts.onDone) return opts.onDone(reviewed);
        container.innerHTML =
          finishHtml(first) + '<div class="spacer"></div>' + (window.App && App.sessionNextHtml ? App.sessionNextHtml() : '') +
          '<button class="btn ' + (hasMiss(first) ? 'ghost' : 'gold') + ' lg" id="again">Study more</button><div class="spacer"></div>' +
          '<button class="btn ghost lg" id="home">Back to Home</button>';
        container.querySelector("#again").addEventListener("click", function () { Flashcards.render(container, cards, title, opts); });
        container.querySelector("#home").addEventListener("click", function () { App.go("#/"); });
      }

      cardEl.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("details")) return; flip(); });
      cardEl.addEventListener("toggle", function () { if (cardEl.classList.contains("flipped")) sizeTo(true); }, true);   // a fold opened: grow the card
      cardEl.addEventListener("keydown", function (e) {
        if (e.target === cardEl && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); flip(); }
      });
      container.querySelector("#fSpeak").addEventListener("click", function (e) {
        e.stopPropagation(); var c = queue[i]; Speech.speak(cardEl.classList.contains("flipped") ? c.a : c.q);
      });
      container.querySelector("#fReport").addEventListener("click", function (e) { e.stopPropagation(); App.reportCard(queue[i]); });
      container.querySelector("#fSpeakB").addEventListener("click", function (e) { e.stopPropagation(); Speech.speak(queue[i].a); });
      container.querySelector("#fReportB").addEventListener("click", function (e) { e.stopPropagation(); App.reportCard(queue[i]); });
      container.querySelector("#cSure").addEventListener("click", function (e) { e.stopPropagation(); conf = "sure"; flip(); });
      container.querySelector("#cUnsure").addEventListener("click", function (e) { e.stopPropagation(); conf = "unsure"; flip(); });
      container.querySelector("#gAgain").addEventListener("click", function (e) { e.stopPropagation(); grade("again"); });
      container.querySelector("#gGood").addEventListener("click", function (e) { e.stopPropagation(); grade("good"); });
      container.querySelector("#gEasy").addEventListener("click", function (e) { e.stopPropagation(); grade("easy"); });

      paint();
    },

    // typed / fill-in-the-blank recall: type the answer, then self-grade
    renderTyped: function (container, cards, title) {
      if (!cards.length) { container.innerHTML = '<div class="empty">' + EMPTY + '</div>'; return; }
      var queue = Store.buildQueue(cards, cards.length > 60 ? 30 : undefined).slice();
      if (!queue.length) queue = cards.slice();
      var i = 0, reviewed = 0, first = {};

      function pubCode(c) { if (c.label) return c.label; var p = STUDY.pubsById[c.pub]; return p ? p.code : ""; }

      function ask() {
        var c = queue[i];
        container.innerHTML =
          '<div class="q-count mb-head"><span>' + reviewed + ' reviewed</span><span class="pill">' + (queue.length - i) + ' to go</span></div>' +
          '<div class="card"><div class="flash-toprow"><span class="flash-tag">' + esc(pubCode(c)) + '</span></div>' +
            '<div class="flash-q" style="margin-bottom:14px;">' + esc(c.q) + '</div>' +
            '<textarea class="input" id="tIn" rows="2" placeholder="Type your answer…"></textarea></div>' +
          '<button class="btn gold lg" id="tShow">Check answer</button>';
        var inp = container.querySelector("#tIn");
        inp.focus();
        inp.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) reveal(); });
        container.querySelector("#tShow").addEventListener("click", reveal);
      }

      function reveal() {
        var c = queue[i];
        var typed = (container.querySelector("#tIn").value || "").trim();
        var nt = normA(typed), na = normA(c.a);
        // "Looks right" only for a real match: exact, or a typed answer that covers at least half of
        // the official answer (so "of" or "ar" no longer counts), or that contains the whole answer.
        var close = nt.length >= 2 && (nt === na ||
          (nt.length >= 4 && nt.length >= 0.5 * na.length && na.indexOf(nt) >= 0) ||
          (na.length >= 3 && nt.indexOf(na) >= 0));
        var verdict = !typed ? "" : close ? '<div class="badge-good" style="font-weight:700;">&#10003; Looks right</div>' : '<div class="badge-bad" style="font-weight:700;">&#10007; Compare carefully</div>';
        container.innerHTML =
          '<div class="flash-progress">Reviewed ' + reviewed + '  •  Left ' + (queue.length - i) + '</div>' +
          '<div class="card"><div class="flash-tag">' + esc(pubCode(c)) + '</div>' +
            '<div class="flash-q" style="margin:6px 0 10px;">' + esc(c.q) + '</div>' +
            (typed ? '<div class="muted">You wrote: ' + esc(typed) + '</div>' + verdict + '<hr class="div">' : '') +
            '<div class="flash-tag">Answer</div><div class="flash-a">' + esc(c.a).replace(/\n/g, "<br>") + '</div>' +
            (c.ref ? '<div class="flash-ref">Reference: ' + esc(c.ref) + '</div>' : '') + '</div>' +
          '<div class="flash-hint">' + GRADE_HINT + '</div>' +
          '<div class="grade-row">' + GRADE_BTNS + '</div>';
        container.querySelector("#gAgain").addEventListener("click", function () { grade("again"); });
        container.querySelector("#gGood").addEventListener("click", function () { grade("good"); });
        container.querySelector("#gEasy").addEventListener("click", function () { grade("easy"); });
      }

      function grade(g) {
        var c = queue[i];
        Store.grade(c.id, g); reviewed++; if (!(c.id in first)) first[c.id] = g;
        if (g === "again") queue.push(c);
        i++;
        if (i >= queue.length) {
          container.innerHTML = finishHtml(first) + '<div class="spacer"></div>' +
            '<button class="btn ' + (hasMiss(first) ? 'ghost' : 'gold') + ' lg" id="again">Study more</button><div class="spacer"></div><button class="btn ghost lg" id="home">Back to Home</button>';
          container.querySelector("#again").addEventListener("click", function () { Flashcards.renderTyped(container, cards, title); });
          container.querySelector("#home").addEventListener("click", function () { App.go("#/"); });
          return;
        }
        ask();
      }

      ask();
    }
  };

  window.Flashcards = Flashcards;
})();
