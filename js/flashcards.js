/* ===========================================================
   Flashcards — spaced repetition. Grade each card Again/Good/Easy;
   the schedule decides when you'll see it again. "Again" cards
   loop back within the same session until you get them.
   =========================================================== */
(function () {
  "use strict";

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  function normA(s) { return String(s).toLowerCase().replace(/\b(a|an|the|and)\b/g, "").replace(/[^a-z0-9]/g, ""); }

  var Flashcards = {
    // cards = the deck for this session (already filtered by caller)
    render: function (container, cards, title, opts) {
      if (opts && opts.typed) return Flashcards.renderTyped(container, cards, title);
      if (!cards.length) { container.innerHTML = '<div class="empty">No cards to study here yet.</div>'; return; }

      var queue = Store.buildQueue(cards).slice();      // due first, then new
      if (!queue.length) queue = cards.slice();           // (deck with nothing due) study all
      var i = 0, reviewed = 0;
      var autoRead = Store.settings().autoRead;

      container.innerHTML =
        '<div class="flash-wrap">' +
          '<div class="flash-progress" id="fProg"></div>' +
          '<div class="flashcard" id="fCard"><div class="flash-inner">' +
            '<div class="flash-face flash-front">' +
              '<div class="flash-toprow"><span class="flash-tag" id="fTagF"></span>' +
                '<span><button class="mini" id="fSpeak" aria-label="Read aloud">&#128266;</button>' +
                '<button class="mini" id="fReport" aria-label="Report card">&#9873;</button></span></div>' +
              '<div class="flash-q" id="fQ"></div>' +
            '</div>' +
            '<div class="flash-face flash-back">' +
              '<div class="flash-tag">Answer</div>' +
              '<div class="flash-a" id="fA"></div>' +
              '<div class="flash-ref" id="fRef"></div>' +
            '</div>' +
          '</div></div>' +
          '<div class="flash-hint" id="fHint">Tap card to flip</div>' +
          '<div class="grade-row" id="fGrades" hidden>' +
            '<button class="btn grade-again" id="gAgain">Again</button>' +
            '<button class="btn grade-good" id="gGood">Good</button>' +
            '<button class="btn grade-easy" id="gEasy">Easy</button>' +
          '</div>' +
        '</div>';

      var cardEl = container.querySelector("#fCard");
      var grades = container.querySelector("#fGrades");
      var hint = container.querySelector("#fHint");

      function pubCode(c) { var p = STUDY.pubsById[c.pub]; return p ? p.code : ""; }

      function paint() {
        var c = queue[i];
        cardEl.classList.remove("flipped");
        grades.hidden = true; hint.style.visibility = "visible";
        container.querySelector("#fProg").textContent = "Reviewed " + reviewed + "  •  Left " + (queue.length - i);
        container.querySelector("#fTagF").textContent = pubCode(c) + (c.topic ? " • " + c.topic : "");
        container.querySelector("#fQ").textContent = c.q;
        container.querySelector("#fA").innerHTML = esc(c.a).replace(/\n/g, "<br>");
        container.querySelector("#fRef").textContent = c.ref ? "Reference: " + c.ref : "";
        if (autoRead) Speech.speak(c.q);
      }

      function flip() {
        var flipped = cardEl.classList.toggle("flipped");
        if (flipped) { grades.hidden = false; hint.style.visibility = "hidden"; if (autoRead) Speech.speak(queue[i].a); }
        else { grades.hidden = true; hint.style.visibility = "visible"; }
      }

      function grade(g) {
        var c = queue[i];
        Store.grade(c.id, g);
        reviewed++;
        if (g === "again") queue.push(c);   // loop back later this session
        i++;
        if (i >= queue.length) return done();
        paint();
      }

      function done() {
        Speech.stop();
        if (opts && opts.onDone) return opts.onDone(reviewed);
        container.innerHTML =
          '<div class="ring-wrap"><div class="ring">&#10003;<small>' + reviewed + ' cards reviewed</small></div></div>' +
          '<p class="center muted">Session complete — nicely done.</p><div class="spacer"></div>' +
          '<button class="btn gold lg" id="again">Study more</button><div class="spacer"></div>' +
          '<button class="btn ghost" id="home">Back to home</button>';
        container.querySelector("#again").addEventListener("click", function () { Flashcards.render(container, cards, title); });
        container.querySelector("#home").addEventListener("click", function () { App.go("#/"); });
      }

      cardEl.addEventListener("click", flip);
      container.querySelector("#fSpeak").addEventListener("click", function (e) {
        e.stopPropagation(); var c = queue[i]; Speech.speak(cardEl.classList.contains("flipped") ? c.a : c.q);
      });
      container.querySelector("#fReport").addEventListener("click", function (e) { e.stopPropagation(); App.reportCard(queue[i]); });
      container.querySelector("#gAgain").addEventListener("click", function (e) { e.stopPropagation(); grade("again"); });
      container.querySelector("#gGood").addEventListener("click", function (e) { e.stopPropagation(); grade("good"); });
      container.querySelector("#gEasy").addEventListener("click", function (e) { e.stopPropagation(); grade("easy"); });

      paint();
    },

    // typed / fill-in-the-blank recall: type the answer, then self-grade
    renderTyped: function (container, cards, title) {
      if (!cards.length) { container.innerHTML = '<div class="empty">No cards to study here yet.</div>'; return; }
      var queue = Store.buildQueue(cards).slice();
      if (!queue.length) queue = cards.slice();
      var i = 0, reviewed = 0;

      function pubCode(c) { var p = STUDY.pubsById[c.pub]; return p ? p.code : ""; }

      function ask() {
        var c = queue[i];
        container.innerHTML =
          '<div class="flash-progress">Reviewed ' + reviewed + '  •  Left ' + (queue.length - i) + '</div>' +
          '<div class="card"><div class="flash-toprow"><span class="flash-tag">' + esc(pubCode(c)) + (c.topic ? " • " + esc(c.topic) : "") + '</span></div>' +
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
        var close = nt.length >= 2 && (nt === na || (na.length >= 3 && na.indexOf(nt) >= 0) || (nt.length >= 3 && nt.indexOf(na) >= 0));
        var verdict = !typed ? "" : close ? '<div class="badge-good" style="font-weight:700;">&#10003; Looks right</div>' : '<div class="badge-bad" style="font-weight:700;">&#10007; Compare carefully</div>';
        container.innerHTML =
          '<div class="flash-progress">Reviewed ' + reviewed + '  •  Left ' + (queue.length - i) + '</div>' +
          '<div class="card"><div class="flash-tag">' + esc(pubCode(c)) + '</div>' +
            '<div class="flash-q" style="margin:6px 0 10px;">' + esc(c.q) + '</div>' +
            (typed ? '<div class="muted">You wrote: ' + esc(typed) + '</div>' + verdict + '<hr class="div">' : '') +
            '<div class="flash-tag">Answer</div><div class="flash-a">' + esc(c.a).replace(/\n/g, "<br>") + '</div>' +
            (c.ref ? '<div class="flash-ref">Reference: ' + esc(c.ref) + '</div>' : '') + '</div>' +
          '<div class="grade-row"><button class="btn grade-again" id="gAgain">Again</button>' +
            '<button class="btn grade-good" id="gGood">Good</button>' +
            '<button class="btn grade-easy" id="gEasy">Easy</button></div>';
        container.querySelector("#gAgain").addEventListener("click", function () { grade("again"); });
        container.querySelector("#gGood").addEventListener("click", function () { grade("good"); });
        container.querySelector("#gEasy").addEventListener("click", function () { grade("easy"); });
      }

      function grade(g) {
        var c = queue[i];
        Store.grade(c.id, g); reviewed++;
        if (g === "again") queue.push(c);
        i++;
        if (i >= queue.length) {
          container.innerHTML = '<div class="ring-wrap"><div class="ring">&#10003;<small>' + reviewed + ' cards reviewed</small></div></div>' +
            '<p class="center muted">Session complete.</p><div class="spacer"></div>' +
            '<button class="btn gold lg" id="again">Study more</button><div class="spacer"></div><button class="btn ghost" id="home">Home</button>';
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
