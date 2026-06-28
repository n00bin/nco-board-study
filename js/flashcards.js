/* ===========================================================
   Flashcards — spaced repetition. Grade each card Again/Good/Easy;
   the schedule decides when you'll see it again. "Again" cards
   loop back within the same session until you get them.
   =========================================================== */
(function () {
  "use strict";

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  var Flashcards = {
    // cards = the deck for this session (already filtered by caller)
    render: function (container, cards, title) {
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
    }
  };

  window.Flashcards = Flashcards;
})();
