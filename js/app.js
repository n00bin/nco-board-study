/* ===========================================================
   App — router + screens. Ties the modules together.
   =========================================================== */
(function () {
  "use strict";

  var mount = document.getElementById("app");
  var titleEl = document.getElementById("appTitle");
  var backBtn = document.getElementById("backBtn");

  // index publications by id for quick lookup everywhere
  STUDY.pubsById = {};
  STUDY.pubs.forEach(function (p) { STUDY.pubsById[p.id] = p; });

  function cardsForDeck(deck) {
    if (deck === "all") return STUDY.cards.slice();
    return STUDY.cards.filter(function (c) { return c.pub === deck; });
  }
  function deckTitle(deck) {
    if (deck === "all") return "All Publications";
    var p = STUDY.pubsById[deck];
    return p ? p.code : deck;
  }

  // ---------------- screens ----------------

  function screenHome() {
    setTitle("NCO Board", false);
    var all = STUDY.cards;
    var ids = all.map(function (c) { return c.id; });
    var m = Math.round(Store.mastery(ids) * 100);
    var counts = Store.counts(ids);
    var quizzes = Store.quizzes();
    var lastQuiz = quizzes[0];

    var html =
      '<div class="hero">' +
        '<div class="big">' + m + '%</div>' +
        '<div class="sub">mastered • ' + counts.known + " of " + all.length + ' cards known</div>' +
        '<div class="bar"><span style="width:' + m + '%"></span></div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<a class="btn gold lg" href="#/pick/flash">&#9632; Flashcards</a>' +
        '<a class="btn green lg" href="#/pick/quiz">&#10003; Quiz</a>' +
      '</div>' +
      '<div class="spacer"></div>' +
      '<a class="btn ghost" href="#/browse">&#9776; Browse by publication</a>';

    if (counts.review > 0) {
      html += '<div class="spacer"></div>' +
        '<a class="btn ghost" href="#/flash/review">&#8635; Review ' + counts.review + ' marked cards</a>';
    }

    html += '<h2 class="section">Subjects</h2>';
    // group pubs by category
    var cats = {};
    STUDY.pubs.forEach(function (p) { (cats[p.cat] = cats[p.cat] || []).push(p); });
    Object.keys(cats).forEach(function (cat) {
      html += '<div class="muted" style="margin:6px 4px;font-size:.8rem;">' + cat + '</div>';
      cats[cat].forEach(function (p) {
        var pc = cardsForDeck(p.id);
        var pm = Math.round(Store.mastery(pc.map(function (c) { return c.id; })) * 100);
        html +=
          '<a class="row" href="#/pub/' + p.id + '">' +
            '<div class="grow">' +
              '<div class="code">' + p.code + '</div>' +
              '<div class="ttl">' + p.title + '</div>' +
              '<div class="bar"><span style="width:' + pm + '%"></span></div>' +
            '</div>' +
            '<div class="pill">' + pc.length + '</div>' +
            '<div class="chev">&#8250;</div>' +
          '</a>';
      });
    });

    if (lastQuiz) {
      var pct = Math.round((lastQuiz.score / lastQuiz.total) * 100);
      html += '<p class="muted center" style="margin-top:18px;font-size:.8rem;">Last quiz: ' +
              pct + '% on ' + escAttr(lastQuiz.deck) + '</p>';
    }
    mount.innerHTML = html;
  }

  function screenBrowse() {
    setTitle("Browse", true);
    var html = "";
    var cats = {};
    STUDY.pubs.forEach(function (p) { (cats[p.cat] = cats[p.cat] || []).push(p); });
    Object.keys(cats).forEach(function (cat) {
      html += '<h2 class="section">' + cat + '</h2>';
      cats[cat].forEach(function (p) {
        var pc = cardsForDeck(p.id);
        html +=
          '<a class="row" href="#/pub/' + p.id + '">' +
            '<div class="grow"><div class="code">' + p.code + '</div>' +
            '<div class="ttl">' + p.title + '</div></div>' +
            '<div class="pill">' + pc.length + ' cards</div>' +
            '<div class="chev">&#8250;</div></a>';
      });
    });
    mount.innerHTML = html;
  }

  function screenPub(id) {
    var p = STUDY.pubsById[id];
    if (!p) return screenHome();
    setTitle(p.code, true);
    var pc = cardsForDeck(id);
    var ids = pc.map(function (c) { return c.id; });
    var m = Math.round(Store.mastery(ids) * 100);
    var counts = Store.counts(ids);
    mount.innerHTML =
      '<div class="hero"><div class="sub" style="color:var(--gold);font-weight:700;">' + p.code + '</div>' +
        '<div style="font-size:1.2rem;font-weight:700;margin:4px 0;">' + p.title + '</div>' +
        '<div class="sub">' + pc.length + ' cards • ' + m + '% mastered</div>' +
        '<div class="bar"><span style="width:' + m + '%"></span></div></div>' +
      '<div class="btn-row">' +
        '<a class="btn gold lg" href="#/flash/' + id + '">&#9632; Flashcards</a>' +
        '<a class="btn green lg" href="#/quiz/' + id + '">&#10003; Quiz</a>' +
      '</div>' +
      '<div class="card" style="margin-top:16px;">' +
        '<div class="muted" style="font-size:.85rem;">Known ' + counts.known +
        ' • Need review ' + counts.review + ' • New ' + counts.new + '</div></div>';
  }

  function screenPick(mode) {
    var isQuiz = mode === "quiz";
    setTitle(isQuiz ? "Pick a quiz" : "Pick a deck", true);
    var route = isQuiz ? "#/quiz/" : "#/flash/";
    var html = '<a class="row" href="' + route + 'all">' +
      '<div class="grow"><div class="code">All Publications</div>' +
      '<div class="ttl">Everything mixed together</div></div>' +
      '<div class="pill">' + STUDY.cards.length + '</div><div class="chev">&#8250;</div></a>' +
      '<h2 class="section">Or pick a subject</h2>';
    STUDY.pubs.forEach(function (p) {
      var n = cardsForDeck(p.id).length;
      html += '<a class="row" href="' + route + p.id + '">' +
        '<div class="grow"><div class="code">' + p.code + '</div>' +
        '<div class="ttl">' + p.title + '</div></div>' +
        '<div class="pill">' + n + '</div><div class="chev">&#8250;</div></a>';
    });
    mount.innerHTML = html;
  }

  function screenFlash(deck) {
    var cards;
    var title;
    if (deck === "review") {
      cards = STUDY.cards.filter(function (c) { return Store.statusOf(c.id) === "review"; });
      title = "Review";
    } else {
      cards = cardsForDeck(deck);
      title = deckTitle(deck);
    }
    setTitle("Flashcards", true);
    Flashcards.render(mount, cards, title);
  }

  function screenQuiz(deck) {
    setTitle("Quiz", true);
    var cards = cardsForDeck(deck);
    var title = deckTitle(deck);
    // length picker first
    mount.innerHTML =
      '<div class="card center"><div class="code" style="font-size:1.1rem;">' + title + '</div>' +
      '<div class="muted">' + cards.length + ' cards available</div></div>' +
      '<h2 class="section">How many questions?</h2>' +
      '<button class="btn gold lg" data-n="10">10 questions</button><div class="spacer"></div>' +
      '<button class="btn green lg" data-n="20">20 questions</button><div class="spacer"></div>' +
      '<button class="btn ghost" data-n="999">All ' + cards.length + ' questions</button>';
    mount.querySelectorAll("[data-n]").forEach(function (b) {
      b.addEventListener("click", function () {
        Quiz.render(mount, cards, title, parseInt(b.getAttribute("data-n"), 10));
      });
    });
  }

  function screenSearch() {
    setTitle("Search", true);
    mount.innerHTML =
      '<input class="input" id="q" placeholder="Search questions & answers..." autocomplete="off" />' +
      '<div id="results" class="spacer"></div>';
    var input = mount.querySelector("#q");
    var results = mount.querySelector("#results");
    function run() {
      var term = input.value.trim().toLowerCase();
      if (term.length < 2) { results.innerHTML = '<div class="empty">Type at least 2 letters.</div>'; return; }
      var hits = STUDY.cards.filter(function (c) {
        return (c.q + " " + c.a + " " + (c.topic || "")).toLowerCase().indexOf(term) >= 0;
      }).slice(0, 60);
      if (!hits.length) { results.innerHTML = '<div class="empty">No matches.</div>'; return; }
      results.innerHTML = hits.map(function (c) {
        var p = STUDY.pubsById[c.pub];
        return '<div class="card"><div class="flash-tag">' + (p ? p.code : "") +
          (c.topic ? " • " + c.topic : "") + '</div>' +
          '<div style="font-weight:600;margin-bottom:6px;">' + escHtml(c.q) + '</div>' +
          '<div class="muted">' + escHtml(c.a) + '</div></div>';
      }).join("");
    }
    input.addEventListener("input", run);
    input.focus();
  }

  function screenStats() {
    setTitle("Stats", true);
    var all = STUDY.cards.map(function (c) { return c.id; });
    var counts = Store.counts(all);
    var m = Math.round(Store.mastery(all) * 100);
    var quizzes = Store.quizzes();
    var html =
      '<div class="hero"><div class="big">' + m + '%</div><div class="sub">overall mastery</div></div>' +
      '<div class="card"><strong>Cards</strong><div class="muted" style="margin-top:6px;">' +
        '&#10003; Known: ' + counts.known + '<br>&#8635; Need review: ' + counts.review +
        '<br>&#9633; New / unseen: ' + counts.new + '</div></div>';
    html += '<h2 class="section">Recent quizzes</h2>';
    if (!quizzes.length) html += '<div class="empty">No quizzes yet.</div>';
    else html += quizzes.slice(0, 12).map(function (q) {
      var pct = Math.round((q.score / q.total) * 100);
      var cls = pct >= 75 ? "badge-good" : "badge-bad";
      return '<div class="row"><div class="grow"><div class="ttl">' + escHtml(q.deck) + '</div>' +
        '<div class="meta">' + q.score + "/" + q.total + ' correct</div></div>' +
        '<div class="' + cls + '" style="font-weight:700;">' + pct + '%</div></div>';
    }).join("");
    html += '<h2 class="section">Settings</h2>' +
      '<button class="btn ghost" id="resetCards">Reset card progress</button><div class="spacer"></div>' +
      '<button class="btn ghost" id="resetAll">Reset everything</button>';
    mount.innerHTML = html;
    mount.querySelector("#resetCards").addEventListener("click", function () {
      if (confirm("Reset known/review status on all cards?")) { Store.resetCards(); App.toast("Card progress reset"); screenStats(); }
    });
    mount.querySelector("#resetAll").addEventListener("click", function () {
      if (confirm("Erase ALL progress and quiz history?")) { Store.resetAll(); App.toast("All progress reset"); screenStats(); }
    });
  }

  // ---------------- router ----------------

  function route() {
    var hash = location.hash || "#/";
    var parts = hash.replace(/^#\//, "").split("/"); // ["pub","ar600-20"]
    var head = parts[0] || "";
    window.scrollTo(0, 0);

    if (head === "" ) return screenHome(), setActiveTab("home");
    if (head === "browse") return screenBrowse(), setActiveTab("browse");
    if (head === "search") return screenSearch(), setActiveTab("search");
    if (head === "stats") return screenStats(), setActiveTab("stats");
    if (head === "pub") return screenPub(parts[1]), setActiveTab("browse");
    if (head === "pick") return screenPick(parts[1]), setActiveTab("home");
    if (head === "flash") return screenFlash(parts[1]), setActiveTab("home");
    if (head === "quiz") return screenQuiz(parts[1]), setActiveTab("home");
    return screenHome(), setActiveTab("home");
  }

  function setActiveTab(name) {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-tab") === name);
    });
  }

  function setTitle(t, showBack) {
    titleEl.textContent = t;
    backBtn.hidden = !showBack;
  }

  // ---------------- helpers exposed to modules ----------------

  var App = {
    go: function (hash) { location.hash = hash; },
    toast: function (msg) {
      var t = document.createElement("div");
      t.className = "toast";
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 1800);
    }
  };
  window.App = App;

  function escHtml(s) {
    return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; });
  }
  function escAttr(s) { return escHtml(s).replace(/"/g, "&quot;"); }

  // back button -> browser history back, or home
  backBtn.addEventListener("click", function () {
    if (history.length > 1) history.back(); else App.go("#/");
  });

  // ---------------- install prompt (Android Chrome) ----------------
  var deferredPrompt = null;
  var installBtn = document.getElementById("installBtn");
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });
  installBtn.addEventListener("click", function () {
    if (!deferredPrompt) { App.toast("Use Chrome menu → Install app"); return; }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(function () { deferredPrompt = null; installBtn.hidden = true; });
  });
  window.addEventListener("appinstalled", function () { installBtn.hidden = true; });

  // ---------------- service worker (offline) ----------------
  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function () {});
    });
  }

  // ---------------- go ----------------
  window.addEventListener("hashchange", route);
  if (!STUDY || !STUDY.cards) {
    mount.innerHTML = '<div class="empty">Content failed to load.</div>';
  } else {
    route();
  }
})();
