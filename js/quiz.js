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
    // keep distractors close to the right answer's length so the longest choice isn't a giveaway
    var distract = [], seen = {}, L = correct.length;
    var fit = function (a) { return a.length >= L * 0.6 && a.length <= L * 1.4; };
    var cands = shuffle(sameP).concat(shuffle(other));
    cands.filter(fit).concat(cands.filter(function (a) { return !fit(a); }).sort(function (x, y) { return Math.abs(x.length - L) - Math.abs(y.length - L); }))
      .forEach(function (a) { if (distract.length >= 3 || seen[a]) return; seen[a] = true; distract.push(a); });
    // sometimes swap in a wrong choice as long as the right one, so length is no clue either way
    if (distract.length === 3 && Math.random() < 0.3 && distract.every(function (d) { return d.length < L; })) {
      var longer = cands.filter(function (a) { return !seen[a] && a.length >= L && a.length <= L * 1.8; })[0];
      if (longer) { distract.sort(function (x, y) { return x.length - y.length; }); distract[0] = longer; }
    }
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
        container.innerHTML = '<div class="empty">Not enough quiz questions here yet. Try Flashcards for this subject, or pick a bigger deck like Board Core.</div>';
        return;
      }
      length = Math.min(length || 10, usable.length);
      var picked = shuffle(usable).slice(0, length);
      // Distractors are drawn from ALL cards (same-publication preferred),
      // so even small topics get plausible wrong answers.
      var distractorPool = (window.App && App.allCards) ? App.allCards()
        : ((window.STUDY && window.STUDY.cards) ? window.STUDY.cards : cards);
      var questions = picked.map(function (c) { return buildQuestion(c, distractorPool); });

      var i = 0, score = 0, misses = [], res = [];

      var selected = null;

      function paintQuestion() {
        var item = questions[i];
        selected = null;
        container.innerHTML =
          '<div class="progress-bar"><span style="width:' + Math.round(100 * i / questions.length) + '%"></span></div><div class="q-count">Question ' + (i + 1) + " of " + questions.length +
            " • Score " + score + '</div>' +
          '<div class="card"><div class="q-text" style="margin:0;">' + esc(item.q) + '</div></div>' +
          '<div id="choices"></div>' +
          '<div id="verdict" class="verdict" role="status" aria-live="polite"></div>' +
          '<button class="btn gold lg" id="submitBtn" disabled>Submit answer</button>';
        var box = container.querySelector("#choices");
        item.options.forEach(function (opt) {
          var b = document.createElement("button");
          b.className = "choice";
          b.innerHTML = esc(opt.text).replace(/\n/g, "<br>");
          b._opt = opt;   // compare by option, not by text (safe for multi-line / duplicate text)
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
        // Right/wrong is shown by a mark and words, not color alone (colorblind + screen-reader friendly).
        function mark(b, ok) {
          var m = document.createElement("span"); m.className = "mark"; m.setAttribute("aria-hidden", "true");
          m.textContent = ok ? "✓" : "✗"; b.insertBefore(m, b.firstChild);
        }
        var verdict = container.querySelector("#verdict");
        if (opt.correct) {
          btn.classList.add("correct"); mark(btn, true);
          score++; res.push(1);
          if (verdict) { verdict.className = "verdict ok"; verdict.textContent = "✓ Correct"; }
        } else {
          btn.classList.add("wrong"); mark(btn, false); misses.push(item.card); res.push(0);
          all.forEach(function (b) { if (b._opt && b._opt.correct) { b.classList.add("correct"); mark(b, true); } });
          if (verdict) {
            verdict.className = "verdict no"; verdict.textContent = "\u2717 Not quite: the right answer is marked";
            var why = item.card.why || (String(item.card.a || "").length <= 240 ? item.card.a : "");
            if (why) { var w = document.createElement("div"); w.className = "verdict-why"; w.innerHTML = "<b>" + (item.card.why ? "Why it matters:" : "The answer:") + "</b> "; w.appendChild(document.createTextNode(why)); verdict.appendChild(w); }
          }
        }
        var nav = document.createElement("button");
        nav.className = "btn gold lg"; nav.id = "qNext";
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
        if (!(opts && opts.onDone)) Store.recordQuiz(title, score, questions.length);   // lesson practice is not a "quiz"
        if (opts && opts.onDone) return opts.onDone(score, questions.length);
        var pct = Math.round((score / questions.length) * 100);
        var missHtml = misses.length ? '<details class="set-fold"><summary>Review your ' + misses.length + ' miss' + (misses.length === 1 ? '' : 'es') + '</summary>' + misses.map(function (c) { return '<div class="chg"><div style="font-weight:600;margin-bottom:4px;">' + esc(c.q) + '</div><div>' + esc(c.a) + '</div></div>'; }).join("") + '</details>' : '';
        var dots = '<div class="dots" aria-hidden="true">' + res.map(function (x) { return '<span class="dot ' + (x ? 'g' : 'r') + '"></span>'; }).join("") + '</div>' +
          '<div class="dot-legend"><span><span class="dot g"></span>right</span><span><span class="dot r"></span>missed</span></div>';
        var byPub = {}; misses.forEach(function (c) { var p = window.STUDY && STUDY.pubsById[c.pub]; var k = c.label || (p ? p.code + (p.title && p.title !== p.code ? " \u2014 " + p.title : "") : c.pub || "Your cards"); byPub[k] = (byPub[k] || 0) + 1; });
        var weakK = Object.keys(byPub).sort(function (x, y) { return byPub[y] - byPub[x]; }).slice(0, 4);
        var weakHtml = weakK.length ? '<h2 class="section">Weakest subjects</h2><div class="lg">' + weakK.map(function (k) { return '<div class="li"><span class="grow"><span class="t" style="font-weight:600;">' + esc(k) + '</span></span><b class="badge-bad" style="white-space:nowrap;">missed ' + byPub[k] + '</b></div>'; }).join("") + '</div>' : '';
        var msg = pct >= 90 ? "Outstanding." : pct >= 75 ? "Solid. Keep drilling." :
                  pct >= 60 ? "Passing, but review the misses." : "Needs work. Run it again.";
        container.innerHTML =
          '<div class="ring-wrap"><div class="ring ' + (pct >= 75 ? 'good' : pct >= 50 ? 'mid' : 'bad') + '" style="--p:' + pct + ';"><div class="ring-in">' + pct + '%</div></div><small>' + score + " of " + questions.length + ' correct</small></div>' +
          dots + '<p class="center muted">' + msg + '</p>' +
          '<button class="btn gold lg" id="again">Try another quiz</button>' + weakHtml + missHtml +
          '<div class="spacer"></div>' +
          '<button class="btn ghost lg" id="home">Back to Home</button>';
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
