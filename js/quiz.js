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
      document.body.classList.add("session");
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
        if (window.App && !(opts && opts.onDone)) App.busy = function () { return (i > 0 || !!container.querySelector("#qNext")) && container.isConnected; };
        selected = null;
        container.innerHTML =
          '<div class="q-count mb-head"><span>' + (opts && opts.onDone ? 'Practice \u2022 question ' : 'Question ') + (i + 1) + '</span><span class="pills"><span class="pill score-pill" id="qScore"' + (i >= 2 ? '' : ' style="visibility:hidden;"') + '>' + (i >= 2 ? 'Score ' + Math.round(100 * score / i) + '%' : 'Score 0%') + '</span><span class="pill">' + (i + 1) + ' / ' + questions.length + '</span></span></div><div class="progress-bar"><span style="width:' + Math.round(100 * i / questions.length) + '%"></span></div>' +
          '<div class="card">' + (function () { var p = window.STUDY && STUDY.pubsById[item.card.pub]; var t = /\b(which|what) (regulation|publication|pamphlet|field manual|manual|AR|FM|ADP|ADRP|ATP|TC|DA PAM)\b|\b(regulation|publication|pamphlet|manual) (covers|prescribes|governs|sets)\b/i.test(item.q) ? "Name the publication" : item.card.label || (p ? p.code : ""); return '<div class="flash-toprow"><span class="flash-tag">' + esc(t || "") + '</span><span><button class="mini" id="qSpeak" aria-label="Read aloud"><svg class=ic aria-hidden=true><use href=#i-speaker></use></svg></button><button class="mini" id="qReport" aria-label="Report a problem with this card"><svg class=ic aria-hidden=true><use href=#i-flag></use></svg></button></span></div>'; })() + '<div class="q-text" style="margin:0;">' + esc(item.q) + '</div></div>' +
          '<div id="choices"></div>' +
          '<div id="verdict" class="verdict" role="status" aria-live="polite"></div>' +
          '<button class="btn gold lg" id="submitBtn" disabled>Submit answer</button>';
        var qsp = container.querySelector("#qSpeak"); if (qsp) qsp.addEventListener("click", function () { if (window.Speech) Speech.speak(item.q); });
        var qrp = container.querySelector("#qReport"); if (qrp) qrp.addEventListener("click", function () { if (window.App && App.reportCard) App.reportCard(item.card); });
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
          var qc = container.querySelector("#qScore");
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
        var qs = container.querySelector("#qScore"); if (qs && i + 1 >= 2) { qs.hidden = false; qs.style.visibility = ""; qs.textContent = "Score " + Math.round(100 * score / (i + 1)) + "%"; }
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
        setTimeout(function () { if (verdict && verdict.getBoundingClientRect().bottom > window.innerHeight - 100 && !nav.querySelector(".nv")) (verdict.style.visibility = "hidden", nav.insertAdjacentHTML("afterbegin", '<span class="nv">' + (/\u2713/.test(verdict.textContent) ? '\u2713 Correct' : '\u2717 Not quite') + ' \u00b7 </span>')); }, 450);
        var last = container.querySelector(".flash-ref") || verdict;
        if (last) setTimeout(function () { var why = container.querySelector(".verdict-why"), tgt = why || last, over = tgt.getBoundingClientRect().bottom - (window.innerHeight - 112), cd = container.querySelector(".card"), hd = container.querySelector(".mb-head"), room = cd ? cd.getBoundingClientRect().top - ((hd ? hd.getBoundingClientRect().bottom : 66) + 10) : over; if (!why) over = Math.min(over, Math.max(0, room)); if (over > 0) window.scrollBy({ top: over, behavior: "smooth" }); }, 30);
      }

      function showResults() {
        if (!(opts && opts.onDone)) Store.recordQuiz(title, score, questions.length);   // lesson practice is not a "quiz"
        if (opts && opts.onDone) return opts.onDone(score, questions.length);
        window.scrollTo(0, 0); if (window.App) App.busy = null;
        var pct = Math.round((score / questions.length) * 100);
        var missHtml = misses.length ? '<details class="set-fold"><summary>Review your ' + misses.length + ' miss' + (misses.length === 1 ? '' : 'es') + '</summary>' + misses.map(function (c) { return '<div class="chg"><div style="font-weight:600;margin-bottom:4px;">' + esc(c.q) + '</div><div>' + esc(c.a) + '</div></div>'; }).join("") + '</details>' : '';
        var dots = '<div class="dots" aria-hidden="true">' + res.map(function (x) { return '<span class="dot ' + (x ? 'g' : 'r') + '"></span>'; }).join("") + '</div>' +
          '<div class="dot-legend"><span><span class="dot g"></span>right</span><span><span class="dot r"></span>missed</span></div>';
        var nOfK = {}; questions.forEach(function (it) { var c = it.card, p = window.STUDY && STUDY.pubsById[c.pub]; var k = c.label || (p ? p.code + (p.title && p.title !== p.code ? " \u2014 " + p.title : "") : c.pub || "Your cards"); nOfK[k] = (nOfK[k] || 0) + 1; });
        var byPub = {}, pubOfK = {}; misses.forEach(function (c) { var p = window.STUDY && STUDY.pubsById[c.pub]; var k = c.label || (p ? p.code + (p.title && p.title !== p.code ? " \u2014 " + p.title : "") : c.pub || "Your cards"); byPub[k] = (byPub[k] || 0) + 1; pubOfK[k] = c.pub; });
        var weakK = Object.keys(byPub).sort(function (x, y) { return byPub[y] - byPub[x]; }).slice(0, 4);
        if (weakK.every(function (k) { return byPub[k] < 2; })) weakK = [];   // one miss each: the miss list says it better
        var weakHtml = weakK.length ? '<h2 class="section">Weakest subjects</h2><div class="lg">' + weakK.map(function (k) { return '<a class="li" href="#/flash/' + encodeURIComponent(pubOfK[k] || "") + '"><span class="grow">' + (function () { var x = k.split(" \u2014 "); return '<span class="t" style="font-weight:700;">' + esc(x[0]) + '</span>' + (x.length > 1 ? '<span class="s">' + esc(x.slice(1).join(" \u2014 ")) + '</span>' : ''); })() + '<span class="s badge-bad">Missed ' + byPub[k] + ' of ' + (nOfK[k] || byPub[k]) + '</span></span><span class="chev" aria-hidden="true"><svg class=ic aria-hidden=true><use href=#i-chev></use></svg></span></a>'; }).join("") + '</div>' : '';
        var msg = pct >= 90 ? "Outstanding. You know this set cold." : pct >= 75 ? "Solid. Drill the few misses and it sticks." :
                  pct >= 60 ? "Passing. Review the misses below, then go again." : "Needs work. Drill the misses, then take another quiz.";
        container.innerHTML =
          '<div class="ring-wrap"><div class="ring ' + (pct >= 75 ? 'good' : pct >= 50 ? 'mid' : 'bad') + '" style="--p:' + pct + ';"><div class="ring-in">' + pct + '%</div></div><small>' + score + " of " + questions.length + ' correct</small></div>' +
          '<div class="done-h">' + msg.split(". ")[0].replace(/\.$/, "") + '</div><p class="center muted" style="margin-top:0;">' + (msg.split(". ").slice(1).join(". ") || "Run it again to lock it in.") + '</p>' + dots +
          (misses.length ? '<button class="btn gold lg" id="drillQ"><svg class=ic aria-hidden=true><use href=#i-refresh></use></svg> Drill your ' + misses.length + ' miss' + (misses.length === 1 ? '' : 'es') + ' now</button>' : '') +
          weakHtml + missHtml + '<div class="spacer"></div><button class="btn ' + (misses.length ? 'ghost' : 'gold') + ' lg" id="again">Try another quiz</button>' +
          '<div class="spacer"></div>' +
          '<button class="home-link" id="home">Back to Home</button>';
        container.querySelector("#again").addEventListener("click", function () {
          Quiz.render(container, cards, title, length);
        });
        var dq = container.querySelector("#drillQ");
        if (dq) dq.addEventListener("click", function () { Store.setChainRole("last-misses", misses.map(function (c) { return c.id; }).join(",")); App.go("#/flash/misses"); });
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
