/* ===========================================================
   Quiz — multiple choice. Immediate feedback, scored summary.
   Uses a card's curated choices if provided; otherwise builds
   distractors from other answers (same publication preferred).
   =========================================================== */
(function () {
  "use strict";

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Build a 4-option question for a card.
  function buildQuestion(card, pool) {
    if (card.choices && card.choices.length >= 2 && typeof card.answer === "number") {
      var opts = card.choices.map(function (text, idx) {
        return { text: text, correct: idx === card.answer };
      });
      return { q: card.q, options: shuffle(opts), card: card };
    }
    // Auto-generate: gather distractor answers (short, discrete answers only)
    var correct = String(card.a);
    var sameP = [], other = [];
    pool.forEach(function (c) {
      if (c.id === card.id) return;
      var a = String(c.a);
      if (a === correct) return;
      if (a.length > 90) return; // skip long prose as a distractor
      if (c.pub === card.pub) sameP.push(a); else other.push(a);
    });
    var distract = [];
    var seen = {};
    shuffle(sameP).concat(shuffle(other)).forEach(function (a) {
      if (distract.length >= 3) return;
      if (seen[a]) return;
      // keep distractors a sensible length vs the answer
      seen[a] = true;
      distract.push(a);
    });
    var options = [{ text: correct, correct: true }];
    distract.forEach(function (d) { options.push({ text: d, correct: false }); });
    return { q: card.q, options: shuffle(options), card: card };
  }

  var Quiz = {
    // cards = candidate pool, length = how many questions, opts.onDone(score,total) for lesson practice
    render: function (container, cards, title, length, opts) {
      // Only quiz on discrete answers: curated multiple-choice, or short answers.
      // Long prose (creeds, the Code of Conduct, etc.) stays flashcard-only.
      var usable = cards.filter(function (c) {
        var curated = c.choices && c.choices.length >= 2 && typeof c.answer === "number";
        var shortAns = c.a && String(c.a).length <= 90;
        return !c.flashOnly && (curated || shortAns);
      });
      if (usable.length < 4) {
        container.innerHTML = '<div class="empty">Need at least 4 cards to build a quiz. Add more content for this topic.</div>';
        return;
      }
      length = Math.min(length || 10, usable.length);
      var picked = shuffle(usable).slice(0, length);
      // Distractors are drawn from ALL cards (same-publication preferred),
      // so even small topics get plausible wrong answers.
      var distractorPool = (window.App && App.allCards) ? App.allCards()
        : ((window.STUDY && window.STUDY.cards) ? window.STUDY.cards : cards);
      var questions = picked.map(function (c) { return buildQuestion(c, distractorPool); });

      var i = 0, score = 0;

      var selected = null;

      function paintQuestion() {
        var item = questions[i];
        selected = null;
        container.innerHTML =
          '<div class="q-count">Question ' + (i + 1) + " of " + questions.length +
            " • Score " + score + '</div>' +
          '<div class="q-text">' + esc(item.q) + '</div>' +
          '<div id="choices"></div>' +
          '<button class="btn gold lg" id="submitBtn" disabled>Submit answer</button>';
        var box = container.querySelector("#choices");
        item.options.forEach(function (opt) {
          var b = document.createElement("button");
          b.className = "choice";
          b.innerHTML = esc(opt.text).replace(/\n/g, "<br>");
          b.addEventListener("click", function () { select(b, opt); });
          box.appendChild(b);
        });
        container.querySelector("#submitBtn").addEventListener("click", function () {
          if (selected) submit(selected.btn, selected.opt, item);
        });
      }

      // First tap only HIGHLIGHTS the choice — you can change it until you press Submit.
      function select(btn, opt) {
        container.querySelectorAll(".choice").forEach(function (x) { x.classList.remove("selected"); });
        btn.classList.add("selected");
        selected = { btn: btn, opt: opt };
        var sb = container.querySelector("#submitBtn");
        if (sb) sb.disabled = false;
      }

      function submit(btn, opt, item) {
        var all = container.querySelectorAll(".choice");
        all.forEach(function (b) { b.disabled = true; b.classList.remove("selected"); });
        Store.recordAnswer(item.card.id, opt.correct);
        if (opt.correct) {
          btn.classList.add("correct");
          score++;
        } else {
          btn.classList.add("wrong");
          var match = item.options.filter(function (o) { return o.correct; })[0];
          all.forEach(function (b) { if (b.textContent === match.text) b.classList.add("correct"); });
        }
        var nav = document.createElement("button");
        nav.className = "btn gold";
        nav.style.marginTop = "12px";
        nav.textContent = (i + 1 >= questions.length) ? "See results" : "Next question";
        nav.addEventListener("click", function () {
          if (i + 1 >= questions.length) return showResults();
          i++; paintQuestion();
        });
        var sb = container.querySelector("#submitBtn");
        if (item.card.ref) {
          var ref = document.createElement("div");
          ref.className = "flash-ref";
          ref.textContent = "Reference: " + item.card.ref;
          if (sb) container.insertBefore(ref, sb); else container.appendChild(ref);
        }
        if (sb) sb.replaceWith(nav); else container.appendChild(nav);
      }

      function showResults() {
        Store.recordQuiz(title, score, questions.length);
        if (opts && opts.onDone) return opts.onDone(score, questions.length);
        var pct = Math.round((score / questions.length) * 100);
        var msg = pct >= 90 ? "Outstanding." : pct >= 75 ? "Solid — keep drilling." :
                  pct >= 60 ? "Passing, but review the misses." : "Needs work. Run it again.";
        container.innerHTML =
          '<div class="ring-wrap"><div class="ring">' + pct + '%' +
            '<small>' + score + " of " + questions.length + ' correct</small></div></div>' +
          '<p class="center muted">' + msg + '</p>' +
          '<div class="spacer"></div>' +
          '<button class="btn gold lg" id="again">Try another quiz</button>' +
          '<div class="spacer"></div>' +
          '<button class="btn ghost" id="home">Back to home</button>';
        container.querySelector("#again").addEventListener("click", function () {
          Quiz.render(container, cards, title, length);
        });
        container.querySelector("#home").addEventListener("click", function () { App.go("#/"); });
      }

      function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
      }

      paintQuestion();
    }
  };

  window.Quiz = Quiz;
})();
