/* ===========================================================
   App — router + screens. Ties the modules together.
   =========================================================== */
(function () {
  "use strict";

  var REPO = "n00bin/nco-board-study";
  var APP_URL = "https://n00bin.github.io/nco-board-study/";

  var mount = document.getElementById("app");
  var titleEl = document.getElementById("appTitle");
  var backBtn = document.getElementById("backBtn");

  // index publications by id; add a synthetic "My Cards" publication for user content
  if (!STUDY.pubs.some(function (p) { return p.id === "mine"; }))
    STUDY.pubs.push({ id: "mine", code: "My Cards", title: "My Smart Book (your own cards)", cat: "My Cards" });
  STUDY.pubsById = {};
  STUDY.pubs.forEach(function (p) { STUDY.pubsById[p.id] = p; });

  function allCards() { return STUDY.cards.concat(Store.userCards()); }
  function cardsForDeck(deck) {
    var all = allCards();
    if (deck === "all") return all;
    if (deck === "mine") return all.filter(function (c) { return c.custom; });
    if (deck === "due") {
      var now = Date.now();
      return all.filter(function (c) { var r = Store.recOf(c.id); return r && r.reps > 0 && r.due <= now; });
    }
    return all.filter(function (c) { return c.pub === deck; });
  }
  function deckTitle(deck) {
    if (deck === "all") return "All Publications";
    if (deck === "due") return "Due Review";
    var p = STUDY.pubsById[deck];
    return p ? p.code : deck;
  }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function escAttr(s) { return esc(s).replace(/"/g, "&quot;"); }

  // ---------------- screens ----------------

  function screenHome() {
    setTitle("NCO Board", false);
    var all = allCards();
    var ids = all.map(function (c) { return c.id; });
    var m = Math.round(Store.mastery(ids) * 100);
    var counts = Store.counts(ids);
    var daily = Store.daily(), streak = Store.streak(), dueN = Store.dueCount(ids);

    var html =
      '<div class="hero">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-end;">' +
          '<div><div class="big">' + m + '%</div><div class="sub">mastered • ' + counts.known + '/' + all.length + ' cards</div></div>' +
          '<div style="text-align:right;"><div style="font-size:1.5rem;font-weight:800;">&#128293; ' + streak + '</div><div class="sub">day streak</div></div>' +
        '</div>' +
        '<div class="bar"><span style="width:' + m + '%"></span></div>' +
        '<div class="sub" style="margin-top:8px;">Today: ' + daily.count + ' / ' + daily.goal + ' cards' + (daily.count >= daily.goal ? ' &#10003;' : '') + '</div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<a class="btn gold lg" href="#/pick/flash">Flashcards</a>' +
        '<a class="btn green lg" href="#/pick/quiz">Quiz</a>' +
      '</div>' +
      '<div class="spacer"></div>' +
      '<a class="btn lg board-btn" href="#/pick/board">&#127894; Mock Board</a>';
    if (dueN > 0)
      html += '<div class="spacer"></div><a class="btn ghost" href="#/flash/due">&#8635; Review ' + dueN + ' due now</a>';

    html += '<h2 class="section">Subjects</h2>';
    var cats = {};
    STUDY.pubs.forEach(function (p) {
      if (p.id === "mine" && !cardsForDeck("mine").length) return; // hide empty My Cards
      (cats[p.cat] = cats[p.cat] || []).push(p);
    });
    Object.keys(cats).forEach(function (cat) {
      html += '<div class="muted" style="margin:10px 4px 4px;font-size:.8rem;">' + cat + '</div>';
      cats[cat].forEach(function (p) {
        var pc = cardsForDeck(p.id);
        var pm = Math.round(Store.mastery(pc.map(function (c) { return c.id; })) * 100);
        html +=
          '<a class="row" href="#/pub/' + p.id + '">' +
            '<div class="grow"><div class="code">' + esc(p.code) + '</div><div class="ttl">' + esc(p.title) + '</div>' +
            '<div class="bar"><span style="width:' + pm + '%"></span></div></div>' +
            '<div class="pill">' + pc.length + '</div><div class="chev">&#8250;</div></a>';
      });
    });
    mount.innerHTML = html;
  }

  function screenBrowse() {
    setTitle("Browse", true);
    var html = "", cats = {};
    STUDY.pubs.forEach(function (p) {
      if (p.id === "mine" && !cardsForDeck("mine").length) return;
      (cats[p.cat] = cats[p.cat] || []).push(p);
    });
    Object.keys(cats).forEach(function (cat) {
      html += '<h2 class="section">' + cat + '</h2>';
      cats[cat].forEach(function (p) {
        var n = cardsForDeck(p.id).length;
        html += '<a class="row" href="#/pub/' + p.id + '"><div class="grow"><div class="code">' + esc(p.code) +
          '</div><div class="ttl">' + esc(p.title) + '</div></div><div class="pill">' + n + ' cards</div><div class="chev">&#8250;</div></a>';
      });
    });
    mount.innerHTML = html;
  }

  function screenPub(id) {
    var p = STUDY.pubsById[id];
    if (!p) return screenHome();
    setTitle(p.code, true);
    var pc = cardsForDeck(id), ids = pc.map(function (c) { return c.id; });
    var m = Math.round(Store.mastery(ids) * 100), counts = Store.counts(ids);
    mount.innerHTML =
      '<div class="hero"><div class="sub" style="color:var(--gold);font-weight:700;">' + esc(p.code) + '</div>' +
        '<div style="font-size:1.2rem;font-weight:700;margin:4px 0;">' + esc(p.title) + '</div>' +
        '<div class="sub">' + pc.length + ' cards • ' + m + '% mastered</div>' +
        '<div class="bar"><span style="width:' + m + '%"></span></div></div>' +
      '<div class="btn-row">' +
        '<a class="btn gold lg" href="#/flash/' + id + '">Flashcards</a>' +
        '<a class="btn green lg" href="#/quiz/' + id + '">Quiz</a></div>' +
      '<div class="spacer"></div><a class="btn ghost" href="#/board/' + id + '">&#127894; Mock Board on this subject</a>' +
      '<div class="card" style="margin-top:16px;"><div class="muted" style="font-size:.85rem;">Known ' + counts.known +
        ' • Review ' + counts.review + ' • New ' + counts.new + '</div></div>';
  }

  function screenPick(mode) {
    var titles = { flash: "Pick a deck", quiz: "Pick a quiz", board: "Pick a board" };
    var routes = { flash: "#/flash/", quiz: "#/quiz/", board: "#/board/" };
    setTitle(titles[mode] || "Pick", true);
    var route = routes[mode] || "#/flash/";
    var html = '<a class="row" href="' + route + 'all"><div class="grow"><div class="code">All Publications</div>' +
      '<div class="ttl">Everything mixed together</div></div><div class="pill">' + allCards().length + '</div><div class="chev">&#8250;</div></a>' +
      '<h2 class="section">Or pick a subject</h2>';
    STUDY.pubs.forEach(function (p) {
      var n = cardsForDeck(p.id).length;
      if (p.id === "mine" && !n) return;
      html += '<a class="row" href="' + route + p.id + '"><div class="grow"><div class="code">' + esc(p.code) +
        '</div><div class="ttl">' + esc(p.title) + '</div></div><div class="pill">' + n + '</div><div class="chev">&#8250;</div></a>';
    });
    mount.innerHTML = html;
  }

  function screenFlash(deck) {
    setTitle("Flashcards", true);
    Flashcards.render(mount, cardsForDeck(deck), deckTitle(deck));
  }

  function screenQuiz(deck) {
    setTitle("Quiz", true);
    var cards = cardsForDeck(deck), title = deckTitle(deck);
    mount.innerHTML =
      '<div class="card center"><div class="code" style="font-size:1.1rem;">' + esc(title) + '</div>' +
      '<div class="muted">' + cards.length + ' cards available</div></div>' +
      '<h2 class="section">How many questions?</h2>' +
      '<button class="btn gold lg" data-n="10">10 questions</button><div class="spacer"></div>' +
      '<button class="btn green lg" data-n="20">20 questions</button><div class="spacer"></div>' +
      '<button class="btn ghost" data-n="999">All ' + cards.length + ' questions</button>';
    mount.querySelectorAll("[data-n]").forEach(function (b) {
      b.addEventListener("click", function () { Quiz.render(mount, cards, title, parseInt(b.getAttribute("data-n"), 10)); });
    });
  }

  function screenBoard(deck) {
    setTitle("Mock Board", true);
    var cards = cardsForDeck(deck), title = deckTitle(deck);
    var timer = Store.settings().timer;
    mount.innerHTML =
      '<div class="card center"><div class="code" style="font-size:1.1rem;">&#127894; ' + esc(title) + '</div>' +
        '<div class="muted">Answer out loud, like the real board. Timer: ' + (timer > 0 ? timer + 's/question' : 'off') + ' (change in Settings)</div></div>' +
      '<h2 class="section">How many questions?</h2>' +
      '<button class="btn gold lg" data-n="10">10 questions</button><div class="spacer"></div>' +
      '<button class="btn green lg" data-n="15">15 questions</button><div class="spacer"></div>' +
      '<button class="btn ghost" data-n="25">25 questions</button>';
    mount.querySelectorAll("[data-n]").forEach(function (b) {
      b.addEventListener("click", function () { MockBoard.render(mount, cards, parseInt(b.getAttribute("data-n"), 10)); });
    });
  }

  function screenSearch() {
    setTitle("Search", true);
    mount.innerHTML = '<input class="input" id="q" placeholder="Search questions & answers..." autocomplete="off" /><div id="results" class="spacer"></div>';
    var input = mount.querySelector("#q"), results = mount.querySelector("#results");
    function run() {
      var term = input.value.trim().toLowerCase();
      if (term.length < 2) { results.innerHTML = '<div class="empty">Type at least 2 letters.</div>'; return; }
      var hits = allCards().filter(function (c) {
        return (c.q + " " + c.a + " " + (c.topic || "")).toLowerCase().indexOf(term) >= 0;
      }).slice(0, 80);
      results.innerHTML = hits.length ? hits.map(function (c) {
        var p = STUDY.pubsById[c.pub];
        return '<div class="card"><div class="flash-tag">' + esc(p ? p.code : "") + (c.topic ? " • " + esc(c.topic) : "") + '</div>' +
          '<div style="font-weight:600;margin-bottom:6px;">' + esc(c.q) + '</div><div class="muted">' + esc(c.a) + '</div></div>';
      }).join("") : '<div class="empty">No matches.</div>';
    }
    input.addEventListener("input", run); input.focus();
  }

  // ---- More menu (stats + links) ----
  function screenMore() {
    setTitle("More", true);
    var ids = allCards().map(function (c) { return c.id; });
    var m = Math.round(Store.mastery(ids) * 100), counts = Store.counts(ids);
    var quizzes = Store.quizzes();
    var html =
      '<div class="hero"><div class="big">' + m + '%</div><div class="sub">overall mastery • ' + counts.known + ' known, ' + counts.review + ' to review, ' + counts.new + ' new</div></div>' +
      '<a class="row" href="#/pick/board"><div class="grow"><div class="code">&#127894; Mock Board</div><div class="ttl">Simulate the oral board</div></div><div class="chev">&#8250;</div></a>' +
      '<a class="row" href="#/mycards"><div class="grow"><div class="code">&#128221; My Cards</div><div class="ttl">Add your unit\'s smart-book questions</div></div><div class="chev">&#8250;</div></a>' +
      '<a class="row" href="#/share"><div class="grow"><div class="code">&#128279; Share &amp; QR code</div><div class="ttl">Send the app to other Soldiers</div></div><div class="chev">&#8250;</div></a>' +
      '<a class="row" href="#/settings"><div class="grow"><div class="code">&#9881;&#65039; Settings</div><div class="ttl">Daily goal, board timer, read-aloud</div></div><div class="chev">&#8250;</div></a>' +
      '<a class="row" href="#/backup"><div class="grow"><div class="code">&#128190; Backup &amp; restore</div><div class="ttl">Save or move your progress</div></div><div class="chev">&#8250;</div></a>';
    html += '<h2 class="section">Recent quizzes &amp; boards</h2>';
    html += quizzes.length ? quizzes.slice(0, 10).map(function (q) {
      var pct = Math.round((q.score / q.total) * 100), cls = pct >= 75 ? "badge-good" : "badge-bad";
      return '<div class="row"><div class="grow"><div class="ttl">' + esc(q.deck) + '</div><div class="meta">' + q.score + "/" + q.total + ' correct</div></div><div class="' + cls + '" style="font-weight:700;">' + pct + '%</div></div>';
    }).join("") : '<div class="empty">No quizzes yet.</div>';
    mount.innerHTML = html;
  }

  // ---- Settings ----
  function screenSettings() {
    setTitle("Settings", true);
    var s = Store.settings(), daily = Store.daily();
    var timers = [0, 20, 30, 45, 60];
    var html =
      '<h2 class="section">Daily goal</h2>' +
      '<div class="card"><div class="stepper"><button class="mini big" id="gMinus">&#8722;</button>' +
        '<span id="goalVal">' + daily.goal + '</span><button class="mini big" id="gPlus">+</button>' +
        '<span class="muted" style="margin-left:8px;">cards / day</span></div></div>' +
      '<h2 class="section">Mock Board timer</h2><div class="chip-row" id="timerChips">' +
        timers.map(function (t) { return '<button class="chip' + (t === s.timer ? ' on' : '') + '" data-t="' + t + '">' + (t === 0 ? 'Off' : t + 's') + '</button>'; }).join("") +
      '</div>';
    if (Speech.supported())
      html += '<h2 class="section">Read-aloud</h2><div class="card"><label class="switch"><input type="checkbox" id="autoRead"' + (s.autoRead ? ' checked' : '') + '> <span>Automatically read questions &amp; answers aloud</span></label></div>';
    html += '<div class="spacer"></div><button class="btn ghost" id="speakTest">&#128266; Test the voice</button>';
    mount.innerHTML = html;

    mount.querySelector("#gMinus").addEventListener("click", function () { Store.setGoal(Store.daily().goal - 5); mount.querySelector("#goalVal").textContent = Store.daily().goal; });
    mount.querySelector("#gPlus").addEventListener("click", function () { Store.setGoal(Store.daily().goal + 5); mount.querySelector("#goalVal").textContent = Store.daily().goal; });
    mount.querySelectorAll("#timerChips .chip").forEach(function (b) {
      b.addEventListener("click", function () {
        Store.setSetting("timer", parseInt(b.getAttribute("data-t"), 10));
        mount.querySelectorAll("#timerChips .chip").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      });
    });
    var ar = mount.querySelector("#autoRead");
    if (ar) ar.addEventListener("change", function () { Store.setSetting("autoRead", ar.checked); });
    mount.querySelector("#speakTest").addEventListener("click", function () {
      if (Speech.supported()) Speech.speak("No one is more professional than I."); else App.toast("Read-aloud isn't available in this browser.");
    });
  }

  // ---- Backup & restore ----
  function screenBackup() {
    setTitle("Backup & restore", true);
    mount.innerHTML =
      '<div class="card"><p>Your progress is stored only on this device. Export a backup so it survives clearing your browser or moving to a new phone.</p></div>' +
      '<button class="btn gold lg" id="exp">&#11015; Export my progress</button>' +
      '<div class="spacer"></div>' +
      '<label class="btn green lg" for="impFile">&#11014; Import a backup</label>' +
      '<input type="file" id="impFile" accept="application/json,.json" hidden>' +
      '<h2 class="section">Danger zone</h2>' +
      '<button class="btn ghost" id="resetCards">Reset card progress only</button><div class="spacer"></div>' +
      '<button class="btn ghost" id="resetAll">Erase everything (progress + my cards)</button>';
    mount.querySelector("#exp").addEventListener("click", function () {
      var d = new Date(), name = "nco-board-progress-" + d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + ".json";
      download(name, Store.exportData()); App.toast("Backup downloaded");
    });
    mount.querySelector("#impFile").addEventListener("change", function (e) {
      var f = e.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        if (!confirm("Import this backup? It replaces your current progress and cards.")) return;
        try { Store.importData(r.result); App.toast("Progress restored"); App.go("#/"); }
        catch (err) { App.toast("That file isn't a valid backup."); }
      };
      r.readAsText(f);
    });
    mount.querySelector("#resetCards").addEventListener("click", function () { if (confirm("Reset all card progress (keeps your custom cards)?")) { Store.resetCards(); App.toast("Card progress reset"); } });
    mount.querySelector("#resetAll").addEventListener("click", function () { if (confirm("Erase ALL progress AND your custom cards? This cannot be undone.")) { Store.resetAll(); App.toast("Everything reset"); App.go("#/"); } });
  }

  // ---- Share + QR ----
  function screenShare() {
    setTitle("Share & QR", true);
    mount.innerHTML =
      '<div class="card center"><p>Share this app with other Soldiers — it works on any phone, free.</p>' +
        '<img src="./icons/qr.png" alt="QR code to open the app" style="width:200px;height:200px;border-radius:12px;background:#fff;padding:8px;" />' +
        '<div class="muted" style="margin-top:10px;word-break:break-all;">' + APP_URL + '</div></div>' +
      '<button class="btn gold lg" id="share">&#128279; Share link</button>' +
      '<div class="spacer"></div><button class="btn ghost" id="copy">Copy link</button>' +
      '<h2 class="section">Spot an error?</h2>' +
      '<a class="btn ghost" href="https://github.com/' + REPO + '/issues/new" target="_blank" rel="noopener">&#9873; Report a problem with a card</a>';
    mount.querySelector("#share").addEventListener("click", function () {
      if (navigator.share) navigator.share({ title: "NCO Board Study Guide", text: "Study for the E-5/E-6 board:", url: APP_URL }).catch(function () {});
      else copyLink();
    });
    mount.querySelector("#copy").addEventListener("click", copyLink);
    function copyLink() {
      if (navigator.clipboard) navigator.clipboard.writeText(APP_URL).then(function () { App.toast("Link copied"); }, function () { App.toast(APP_URL); });
      else App.toast(APP_URL);
    }
  }

  // ---- My Cards (custom deck) ----
  function screenMyCards() {
    setTitle("My Cards", true);
    var cards = Store.userCards();
    var html = '<a class="btn gold lg" href="#/mycards/new">&#43; Add a card</a>' +
      '<div class="card" style="margin-top:12px;"><div class="muted">Add your unit\'s smart-book items — chain of command, command policies, local SOPs — anything your board might ask that isn\'t in the manuals.</div></div>';
    if (cards.length) {
      html += '<h2 class="section">' + cards.length + ' custom card' + (cards.length > 1 ? "s" : "") + '</h2>';
      cards.forEach(function (c) {
        var p = STUDY.pubsById[c.pub];
        html += '<div class="row" data-edit="' + c.id + '"><div class="grow"><div class="code">' + esc(p ? p.code : "My Cards") + '</div>' +
          '<div class="ttl">' + esc(c.q) + '</div></div><button class="mini" data-del="' + c.id + '" aria-label="Delete">&#128465;</button><div class="chev">&#8250;</div></div>';
      });
    } else html += '<div class="empty">No custom cards yet.</div>';
    mount.innerHTML = html;
    mount.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); if (confirm("Delete this card?")) { Store.deleteUserCard(b.getAttribute("data-del")); screenMyCards(); } });
    });
    mount.querySelectorAll("[data-edit]").forEach(function (r) {
      r.addEventListener("click", function () { App.go("#/mycards/edit/" + r.getAttribute("data-edit")); });
    });
  }

  function screenMyCardForm(id) {
    var editing = id ? Store.userCards().filter(function (c) { return c.id === id; })[0] : null;
    setTitle(editing ? "Edit card" : "New card", true);
    var pubsOpts = STUDY.pubs.map(function (p) {
      return '<option value="' + p.id + '"' + ((editing ? editing.pub : "mine") === p.id ? " selected" : "") + '>' + esc(p.code) + " — " + esc(p.title) + '</option>';
    }).join("");
    var hasMC = editing && editing.choices;
    var w = hasMC ? editing.choices.filter(function (x, i) { return i !== editing.answer; }) : [];
    mount.innerHTML =
      '<label class="lbl">Question</label><textarea class="input" id="fq" rows="2" placeholder="e.g. Who is the Command Sergeant Major?">' + (editing ? esc(editing.q) : "") + '</textarea>' +
      '<label class="lbl">Answer</label><textarea class="input" id="fa" rows="2" placeholder="e.g. CSM Smith">' + (editing ? esc(editing.a) : "") + '</textarea>' +
      '<label class="lbl">Subject</label><select class="input" id="fp">' + pubsOpts + '</select>' +
      '<label class="lbl">Topic (optional)</label><input class="input" id="ft" placeholder="e.g. Chain of Command" value="' + (editing && editing.topic ? escAttr(editing.topic) : "") + '">' +
      '<div class="card" style="margin-top:12px;"><label class="switch"><input type="checkbox" id="mc"' + (hasMC ? " checked" : "") + '> <span>Make it a multiple-choice quiz question</span></label>' +
        '<div id="mcWrap"' + (hasMC ? "" : ' hidden') + '><label class="lbl">Wrong answers (for the quiz)</label>' +
          '<input class="input wrong" placeholder="Wrong answer 1" value="' + (w[0] ? escAttr(w[0]) : "") + '">' +
          '<input class="input wrong" placeholder="Wrong answer 2" value="' + (w[1] ? escAttr(w[1]) : "") + '">' +
          '<input class="input wrong" placeholder="Wrong answer 3" value="' + (w[2] ? escAttr(w[2]) : "") + '"></div></div>' +
      '<div class="spacer"></div><button class="btn gold lg" id="save">' + (editing ? "Save changes" : "Add card") + '</button>';
    var mc = mount.querySelector("#mc"), mcWrap = mount.querySelector("#mcWrap");
    mc.addEventListener("change", function () { mcWrap.hidden = !mc.checked; });
    mount.querySelector("#save").addEventListener("click", function () {
      var q = mount.querySelector("#fq").value.trim(), a = mount.querySelector("#fa").value.trim();
      if (!q || !a) { App.toast("Please fill in the question and answer."); return; }
      var card = { pub: mount.querySelector("#fp").value, topic: mount.querySelector("#ft").value.trim(), q: q, a: a };
      if (mc.checked) {
        var wrongs = Array.prototype.map.call(mount.querySelectorAll(".wrong"), function (i) { return i.value.trim(); }).filter(Boolean);
        if (wrongs.length >= 1) { card.choices = [a].concat(wrongs.slice(0, 3)); card.answer = 0; }
      }
      if (editing) { Store.updateUserCard(id, card); App.toast("Card updated"); }
      else { Store.addUserCard(card); App.toast("Card added"); }
      App.go("#/mycards");
    });
  }

  // ---------------- router ----------------
  function route() {
    if (window.MockBoard) MockBoard.stop();
    if (window.Speech) Speech.stop();
    var hash = location.hash || "#/";
    var parts = hash.replace(/^#\//, "").split("/");
    var head = parts[0] || "";
    window.scrollTo(0, 0);

    if (head === "") return screenHome(), tab("home");
    if (head === "browse") return screenBrowse(), tab("browse");
    if (head === "search") return screenSearch(), tab("search");
    if (head === "more") return screenMore(), tab("more");
    if (head === "settings") return screenSettings(), tab("more");
    if (head === "backup") return screenBackup(), tab("more");
    if (head === "share") return screenShare(), tab("more");
    if (head === "mycards") {
      if (parts[1] === "new") return screenMyCardForm(null), tab("more");
      if (parts[1] === "edit") return screenMyCardForm(parts.slice(2).join("/")), tab("more");
      return screenMyCards(), tab("more");
    }
    if (head === "pub") return screenPub(parts[1]), tab("browse");
    if (head === "pick") return screenPick(parts[1]), tab("home");
    if (head === "flash") return screenFlash(parts[1]), tab("home");
    if (head === "quiz") return screenQuiz(parts[1]), tab("home");
    if (head === "board") return screenBoard(parts[1]), tab("home");
    return screenHome(), tab("home");
  }
  function tab(name) { document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("active", t.getAttribute("data-tab") === name); }); }
  function setTitle(t, showBack) { titleEl.textContent = t; backBtn.hidden = !showBack; }

  function download(filename, text) {
    var a = document.createElement("a");
    a.href = "data:application/json;charset=utf-8," + encodeURIComponent(text);
    a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------------- public helpers ----------------
  var App = {
    go: function (h) { location.hash = h; },
    allCards: allCards,
    toast: function (msg) {
      var t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 1800);
    },
    reportCard: function (card) {
      if (card.custom) { App.toast("That's your own card — edit it under My Cards."); return; }
      var title = encodeURIComponent("Card issue: " + String(card.q || "").slice(0, 60));
      var body = encodeURIComponent("Card ID: " + card.id + "\nPublication: " + (card.pub || "") + "\nQuestion: " + card.q + "\nListed answer: " + card.a + "\n\nWhat's wrong / the correct answer:\n");
      window.open("https://github.com/" + REPO + "/issues/new?title=" + title + "&body=" + body, "_blank");
    }
  };
  window.App = App;

  backBtn.addEventListener("click", function () { if (history.length > 1) history.back(); else App.go("#/"); });

  // ---------------- install prompt (Android Chrome) ----------------
  var deferredPrompt = null, installBtn = document.getElementById("installBtn");
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredPrompt = e; installBtn.hidden = false; });
  installBtn.addEventListener("click", function () {
    if (!deferredPrompt) { App.toast("Use Chrome menu → Install app"); return; }
    deferredPrompt.prompt(); deferredPrompt.userChoice.finally(function () { deferredPrompt = null; installBtn.hidden = true; });
  });
  window.addEventListener("appinstalled", function () { installBtn.hidden = true; });

  // ---------------- service worker ----------------
  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0)
    window.addEventListener("load", function () { navigator.serviceWorker.register("./sw.js").catch(function () {}); });

  // ---------------- go ----------------
  window.addEventListener("hashchange", route);
  if (!STUDY || !STUDY.cards) mount.innerHTML = '<div class="empty">Content failed to load.</div>';
  else route();
})();
