/* ===========================================================
   App — router + screens. Ties the modules together.
   =========================================================== */
(function () {
  "use strict";

  var REPO = "n00bin/nco-board-study";
  var APP_URL = "https://n00bin.github.io/nco-board-study/";

  var mount = document.getElementById("app");
  var titleEl = document.getElementById("appTitle");
  var splash = document.getElementById("splash");
  // test/screenshot helper: ?nosplash skips the launch screen (timers are frozen in headless frames)
  if (splash && /[?&]nosplash/.test(location.search)) { splash.remove(); splash = null; }
  function hideSplash(delay) {
    if (!splash) return;
    setTimeout(function () { splash.classList.add("hide"); setTimeout(function () { if (splash) { splash.remove(); splash = null; } }, 400); }, delay || 0);
  }
  if (!window.STUDY || !window.STUDY.cards) {
    hideSplash(0);
    mount.innerHTML = '<div class="empty">The study cards did not load. Check your connection, then close and reopen the app.</div>';
    return;
  }
  var backBtn = document.getElementById("backBtn");

  // index publications by id; add synthetic publications for user + chain-of-command content
  if (!STUDY.pubs.some(function (p) { return p.id === "mine"; }))
    STUDY.pubs.push({ id: "mine", code: "My Cards", title: "My Smart Book (your own cards)", cat: "My Cards" });
  if (!STUDY.pubs.some(function (p) { return p.id === "chain"; }))
    STUDY.pubs.push({ id: "chain", code: "Chain of Command", title: "Your leaders (board day)", cat: "Board Day" });
  // "Version 3.0.0 · Updated 31 Oct 2026 · 1,556 cards" (from data/content.js meta)
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function versionLine() {
    var m = STUDY.meta || {}, d = String(m.updated || "").split("-"), out = "Version " + (m.version || "?");
    if (d.length === 3) out += " \u00b7 Updated " + parseInt(d[2], 10) + " " + MON[parseInt(d[1], 10) - 1] + " " + d[0];
    return out + " \u00b7 " + STUDY.cards.length.toLocaleString() + " cards";
  }
  var splashVer = document.getElementById("splashVer");
  if (splashVer) splashVer.textContent = versionLine();

  STUDY.pubsById = {};
  STUDY.pubs.forEach(function (p) { STUDY.pubsById[p.id] = p; });

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // chain-of-command roster: roles the board commonly asks about
  var CHAIN_ROLES = [
    { k: "teamleader", label: "Team Leader", your: true },
    { k: "squadleader", label: "Squad Leader", your: true },
    { k: "pltsgt", label: "Platoon Sergeant", your: true },
    { k: "pltldr", label: "Platoon Leader", your: true },
    { k: "firstsgt", label: "First Sergeant", your: true },
    { k: "cocdr", label: "Company Commander", your: true },
    { k: "bncsm", label: "Battalion CSM", your: true },
    { k: "bncdr", label: "Battalion Commander", your: true },
    { k: "bdecsm", label: "Brigade CSM", your: true },
    { k: "bdecdr", label: "Brigade Commander", your: true },
    { k: "divcsm", label: "Division CSM", your: true },
    { k: "divcdr", label: "Division Commander", your: true },
    { k: "sma", label: "Sergeant Major of the Army", your: false },
    { k: "csa", label: "Chief of Staff of the Army", your: false },
    { k: "secarmy", label: "Secretary of the Army", your: false },
    { k: "secdef", label: "Secretary of War (Secretary of Defense; secondary title since Sept 2025)", your: false },
    { k: "cjcs", label: "Chairman of the Joint Chiefs of Staff", your: false },
    { k: "potus", label: "Commander in Chief (the President)", your: false }
  ];

  // turn the filled-in roster into study cards (with sensible quiz distractors)
  function chainCards() {
    var chain = Store.chain();
    var filled = CHAIN_ROLES.filter(function (r) { return chain[r.k]; });
    var names = filled.map(function (r) { return chain[r.k]; });
    return filled.map(function (r) {
      var card = { id: "chain-" + r.k, pub: "chain", topic: "Chain of Command", custom: true,
        q: (r.your ? "Who is your " : "Who is the ") + r.label + "?", a: chain[r.k] };
      var others = names.filter(function (n, i) { return n !== chain[r.k] && names.indexOf(n) === i; });
      if (others.length >= 3) { card.choices = [chain[r.k]].concat(shuffle(others).slice(0, 3)); card.answer = 0; }
      else card.flashOnly = true;
      return card;
    });
  }

  // Cards tagged rank:"SGT"/"SSG" only show if they match the board you're going to (Settings > Which board?).
  function rankOk(c) { var bf = Store.settings().boardFor; return !c.rank || !bf || bf === "BOTH" || c.rank === bf; }
  // After the board date: one tap to log how it went, and an optional anonymous share to help improve the app
  function boardResultAsk(rs) {
    var d = daysToBoard(), br = Store.settings().boardResult;
    if (d == null || d >= 0) return "";
    var AFTER = {
      "Recommended": "Congratulations, Sergeant-to-be. Your name goes on the promotion recommended list, and you're promoted when your promotion points meet the monthly cutoff score for your MOS. Keep your records and points current (new AFT, weapons, schools, college), and get ready for BLC.",
      "Not recommended": "It happens to good Soldiers, and it isn't the end. Your first-line leader must counsel you in writing on what to improve, with a development plan, and keep counseling you at least every 3 months (AR 600-8-19, para 1-33). Ask the board's feedback, fix those areas, and go back better.",
      "Board postponed": "Use the extra time: set the new date in Settings and the plan will pace you to it." };
    if (br) { var r = br.split("|")[1] || ""; return '<div class="card"><div class="flash-tag">Your board result: ' + esc(r) + '</div><div class="muted">' + esc(AFTER[r] || "") + '</div>' +
      '<button class="btn ghost" id="brShare" style="margin-top:8px;">Share it (anonymous) to help other Soldiers</button></div>'; }
    return '<div class="card" style="border-color:var(--gold);"><div class="flash-tag">How did your board go?</div><div class="chip-row" id="brAsk">' +
      ["Recommended", "Not recommended", "Board postponed"].map(function (t) { return '<button class="chip" data-r="' + t + '">' + t + '</button>'; }).join("") + '</div>' +
      '<div class="muted" style="font-size:.8rem;margin-top:6px;">Saved on this phone only. You can choose to share it after.</div></div>';
  }
  function wireBoardResult(rs) {
    mount.querySelectorAll("#brAsk .chip").forEach(function (b) {
      b.addEventListener("click", function () { var t = new Date(); Store.setSetting("boardResult", t.toISOString().slice(0, 10) + "|" + b.getAttribute("data-r")); screenHome(); });
    });
    var sh = mount.querySelector("#brShare");
    if (sh) sh.addEventListener("click", function () {
      var br = Store.settings().boardResult.split("|"), boards = Store.quizzes().filter(function (q) { return /^Mock Board/.test(q.deck); }).length;
      var text = "NCO Board app result (anonymous): " + br[1] + ". Board: " + (Store.settings().boardFor || "not set") + ". Board-ready score before the board: " + rs.ready + "%. Board Core cards studied: " + rs.seen + ". Mock Boards run: " + boards + ". App " + (STUDY.meta.version || "") + ".";
      if (navigator.share) navigator.share({ title: "NCO Board app result", text: text }).catch(function () {});
      else window.open("https://github.com/" + REPO + "/issues/new?title=" + encodeURIComponent("Board result: " + br[1]) + "&body=" + encodeURIComponent(text), "_blank");
    });
  }

  // First run: ask which board before showing anything rank-specific
  function rankAsk() {
    if (Store.settings().boardFor) return "";
    return '<div class="card" style="border-color:var(--gold);"><div class="flash-tag">First, which board are you going to?</div>' +
      '<div class="muted" style="font-size:.85rem;margin-bottom:8px;">So the app only shows the numbers for your rank. You can change it in Settings.</div>' +
      '<div class="chip-row" id="rankAsk"><button class="chip" data-r="SGT">Sergeant (E-5)</button><button class="chip" data-r="SSG">Staff Sergeant (E-6)</button><button class="chip" data-r="BOTH">Not sure</button></div></div>';
  }
  function allCards() { return STUDY.cards.filter(rankOk).concat(Store.userCards()).concat(chainCards()); }
  function daysToBoard() {
    var bd = Store.settings().boardDate; if (!bd) return null;
    var p = bd.split("-"), t = new Date();
    return Math.round((new Date(+p[0], +p[1] - 1, +p[2]) - new Date(t.getFullYear(), t.getMonth(), t.getDate())) / 86400000);
  }
  function seenOf(id) { var r = Store.recOf(id); return !!(r && r.seen > 0); }
  function cardsForDeck(deck) {
    var all = allCards();
    // "All" skips staff-level trivia (court-martial administration, open-sea survival); it stays in its own subject.
    if (deck === "all") return all.filter(function (c) { return !c.deep; });
    // Top 100: the highest-yield Board Core cards, for a late start. Not-yet-studied and missed cards first.
    if (deck === "top") {
      var tops = all.filter(function (c) { return c.top; });
      var weakTop = tops.filter(function (c) { var r = Store.recOf(c.id); return !r || !(r.seen > 0) || r.reps === 0; });
      return weakTop.concat(tops.filter(function (c) { return weakTop.indexOf(c) < 0; }));
    }
    // Board Core: the tagged must-know cards, plus your own cards and chain-of-command roster
    if (deck === "core") return all.filter(function (c) { return c.core || c.custom; });
    // Final-week review: Board Core cards you've studied, weakest first (most misses, then soonest due), then the rest
    if (deck === "final") {
      var core = all.filter(function (c) { return c.core; });
      var seen = core.filter(function (c) { var r = Store.recOf(c.id); return r && r.seen > 0; });
      seen.sort(function (a, b) { var ra = Store.recOf(a.id), rb = Store.recOf(b.id); return (rb.lapses - ra.lapses) || (ra.due - rb.due); });
      return seen.concat(core.filter(function (c) { var r = Store.recOf(c.id); return !r || !(r.seen > 0); }));
    }
    if (deck === "due") { var now = Date.now(); return all.filter(function (c) { return Store.isDue(c.id, now); }); }
    if (deck === "leeches") { var set = {}; Store.leeches(all.map(function (c) { return c.id; })).forEach(function (id) { set[id] = 1; }); return all.filter(function (c) { return set[c.id]; }); }
    if (deck === "cram") return cramDeck(all.filter(function (c) { return c.core || c.custom || Store.recOf(c.id); }));
    return all.filter(function (c) { return c.pub === deck; });
  }
  function cramDeck(all) {
    var now = Date.now(), weak = [], fresh = [];
    all.forEach(function (c) {
      var r = Store.recOf(c.id), s = Store.statusOf(c.id);
      if (r && (s === "review" || r.lapses > 0 || (r.reps > 0 && r.due <= now))) weak.push(c);
      else if (!r || r.reps === 0) fresh.push(c);
    });
    weak.sort(function (a, b) { return (Store.recOf(b.id).lapses || 0) - (Store.recOf(a.id).lapses || 0); });
    var out = weak.slice(0, 60);
    if (out.length < 20) out = out.concat(shuffle(fresh).slice(0, 40 - out.length));
    return out;
  }
  function deckTitle(deck) {
    if (deck === "all") return "All Publications";
    if (deck === "core") return "Board Core";
    if (deck === "final") return "Final-Week Review";
    if (deck === "top") return "Top 100 (late start)";
    if (deck === "due") return "Ready to Repeat";
    if (deck === "leeches") return "Cards You Keep Missing";
    if (deck === "cram") return "Night-before Cram";
    var p = STUDY.pubsById[deck];
    return p ? p.code : deck;
  }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function escAttr(s) { return esc(s).replace(/"/g, "&quot;"); }

  // ---------------- screens ----------------

  // One daily plan so Learn, reviews, and Mock Board stop competing.
  // One daily plan so Learn, reviews, and Mock Board stop competing. It changes as the board gets close:
  // the last day is about calm and bearing (no new material), the last week is review, a late start gets the Top 100.
  function todayPlan(coreIds, dueN) {
    var days = daysToBoard(), items = [];
    var seenN = coreIds.filter(seenOf).length, unseen = coreIds.length - seenN, seenPct = coreIds.length ? seenN / coreIds.length : 0;
    var lateStart = days != null && days >= 2 && days <= 10 && seenPct < 0.5;
    var title = "Today's plan";
    if (days != null && days < 0) {
      var br = (Store.settings().boardResult || "").split("|")[1] || "";
      title = br === "Recommended" ? "Next steps after your board" : br === "Not recommended" ? "Your plan for the next board" : "After your board";
      if (br === "Not recommended") items.push('<a href="#/flash/leeches">&#9888;&#65039; Work on the cards you kept missing</a>', '<a href="#/board/core">&#127894; Run a Mock Board each week until your next board</a>');
      else if (br === "Recommended") items.push('<a href="#/pub/ar600-8-19">&#128200; How points and cutoff scores work (AR 600-8-19)</a>', '<a href="#/pub/ar350-1">&#127891; Get ready for BLC: NCO professional development (AR 350-1)</a>');
      items.push('<a href="#/settings">&#128197; Set your next board date</a>');
    } else if (days === 0) {
      title = "Board day: no new studying";
      items.push('<a href="#/reporting">&#127894; Walk through reporting in, out loud</a>',
        '<a href="#/uniform">&#129509; Final uniform check</a>',
        '<a href="#/statement">&#128221; Say your opening statement twice</a>',
        '<a href="#/board/core">&#9749; Optional warm-up: a short Mock Board (5 to 10 questions)</a>');
    } else if (days === 1) {
      title = "Tonight: light review, then sleep";
      items.push('<a href="#/flash/cram">&#128367;&#65039; Night-before cram: just your misses (about 20 minutes)</a>',
        '<a href="#/board/core">&#127894; One Full board Mock Board, out loud</a>',
        '<a href="#/uniform">&#129509; Lay out and inspect your uniform</a>',
        '<a href="#/statement">&#128221; Run your opening statement</a>');
    } else {
      if (lateStart) {
        var lp0 = window.Learn && Learn.nextBoardLesson ? Learn.nextBoardLesson() : null;
        if (lp0 && lp0.next && /^board101/.test(lp0.next.id)) items.push('<a href="#/lesson/' + escAttr(lp0.next.id) + '">&#128214; First, 5 minutes on what a board is: ' + esc(lp0.next.title) + '</a>');
        items.push('<a href="#/flash/top">&#127919; Top 100: the highest-yield Board Core cards first (late start)</a>');
      }
      else if (days != null && days >= 2 && days <= 7) items.push('<a href="#/flash/final">&#127919; Final-Week Review: your weakest Board Core cards first</a>');
      else {
        var lp = window.Learn && Learn.nextBoardLesson ? Learn.nextBoardLesson() : null;
        if (lp && lp.next) items.push('<a href="#/lesson/' + escAttr(lp.next.id) + '">&#128214; 1 lesson: ' + esc(lp.next.title) + '</a>');
        if (dueN > 0) items.push('<a href="#/flash/due">&#8635; Review ' + Math.min(dueN, 40) + (dueN > 40 ? ' of ' + dueN : '') + ' card' + (dueN > 1 ? "s" : "") + ' ready to repeat</a>');
        if (unseen) items.push('<a href="#/flash/core">&#11088; New Board Core cards (' + unseen + ' left)</a>');
      }
      items.push('<a href="#/board/core">&#127894; One 10-question Mock Board</a>');
      // once a week, a real person: a sponsor board beats any app
      var weekAgo = Date.now() - 7 * 86400000;
      var sponsored = Store.quizzes().some(function (q) { return /with sponsor/.test(q.deck) && q.date > weekAgo; });
      if (!sponsored && (days == null || days >= 2)) items.push('<a href="#/board/core">&#129309; This week: ask your sponsor to run a board with you (sponsor mode)</a>');
    }
    // style each item as a full-width button (default links are unreadable dark blue on this background)
    items = items.map(function (h) { return h.replace('<a href=', '<a class="btn ghost plan-item" href='); });
    var sponsorNote = items.some(function (h) { return /sponsor/.test(h); }) ? '<div class="muted" style="font-size:.8rem;margin-top:8px;">Your board sponsor is the NCO who gets you ready, usually your first-line leader. Not sure who yours is? Ask your squad leader. <a href="#/pub/boardskills">More in Board Know-How</a>.</div>' : '';
    return '<div class="card"><div class="flash-tag">' + esc(title) + '</div><div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">' + items.join("") + '</div>' + sponsorNote + '</div>';
  }
  // "Ready?" check: based on what you actually REMEMBERED (last grade was a hit), plus recent Mock Boards.
  // Cards merely seen don't count. Shows the weakest subjects by misses.
  function readyScore(coreIds) {
    var seen = 0, recalled = 0, lapsesByPub = {};
    var pubOf = {}; STUDY.cards.forEach(function (c) { if (c.core) pubOf[c.id] = c.pub; });
    coreIds.forEach(function (id) { var r = Store.recOf(id); if (r && r.seen > 0) { seen++; if (r.reps > 0) recalled++; if (r.lapses) lapsesByPub[pubOf[id]] = (lapsesByPub[pubOf[id]] || 0) + r.lapses; } });
    var boards = Store.quizzes().filter(function (q) { return /^Mock Board/.test(q.deck) && q.total; }).slice(0, 3);
    var mockAvg = boards.length ? Math.round(100 * boards.reduce(function (s, q) { return s + q.score / q.total; }, 0) / boards.length) : null;
    var recallPct = coreIds.length ? Math.round(100 * recalled / coreIds.length) : 0;
    // Mock Board scores only count in proportion to how much of Board Core you've covered (acing 10 cards isn't readiness).
    var coverage = Math.min(1, seen / (0.5 * Math.max(1, coreIds.length)));
    var ready = Math.round(0.6 * recallPct + 0.4 * (mockAvg == null ? 0 : mockAvg) * coverage);
    var weak = Object.keys(lapsesByPub).sort(function (a, b) { return lapsesByPub[b] - lapsesByPub[a]; }).slice(0, 3)
      .map(function (k) { var p = STUDY.pubsById[k]; return p ? (p.code === p.title ? p.code : p.title) : k; });
    return { ready: ready, seen: seen, recalled: recalled, mockAvg: mockAvg, weak: weak };
  }
  // The "how it's figured" card under the plan. The one number lives in the hero at the top of Home.
  function readyCheck(coreIds, rs) {
    var dd = daysToBoard(); if (!rs.seen || dd === 0 || dd === 1) return "";
    return '<div class="card"><div class="flash-tag">How your board-ready score is figured</div>' +
      '<div class="muted" style="font-size:.85rem;">Board Core cards you got right the last time you saw them: ' + rs.recalled + ' of ' + coreIds.length +
      (rs.mockAvg == null ? ' \u2022 no Mock Boards yet' : ' \u2022 your last Mock Boards: ' + rs.mockAvg + '%') + '</div>' +
      '<div class="muted" style="font-size:.8rem;margin-top:4px;">The score is 60% Board Core cards you got right the last time you saw them, plus 40% your last three Mock Boards (that part grows as you cover more of Board Core).</div>' +
      (rs.weak.length ? '<div class="muted" style="font-size:.85rem;margin-top:4px;">Work on: ' + esc(rs.weak.join(", ")) + '</div>' : '') + '</div>';
  }

  // Board-date countdown + a simple daily pace for Board Core (set the date under More > Settings).
  function boardCountdown(coreIds) {
    var bd = Store.settings().boardDate;
    if (!bd) return '<a class="row" href="#/settings"><div class="grow"><div class="code">&#128197; Set your board date</div>' +
      '<div class="ttl">Get a countdown and a daily study pace</div></div><div class="chev">&#8250;</div></a>';
    var days = daysToBoard();
    var unseen = coreIds.filter(function (id) { return !seenOf(id); }).length;
    var head, tip;
    if (days < 0) { head = "Your board date has passed"; tip = Store.settings().boardResult ? "Result saved. Set a new date in Settings if you have another board." : "How did it go? Tell the app below, then set a new date in Settings if you have another board."; }
    else if (days === 0) {
      head = "Board day";
      var seenPct = coreIds.length ? Math.round(100 * (coreIds.length - unseen) / coreIds.length) : 0;
      tip = "Check your uniform, review your reporting steps and opening statement, and report in calm and confident." +
        (seenPct >= 80 ? " You've studied " + seenPct + "% of Board Core. Trust your preparation." : " No cramming today: a short Mock Board to warm up is plenty.");
    }
    else if (days === 1) { head = "Board tomorrow"; tip = "Tonight: lay out and inspect your uniform, run one Full board Mock Board, review your reporting steps and opening statement, then get a full night's sleep."; }
    else if (days <= 10 && unseen > coreIds.length / 2) { head = "Board in " + days + " days"; tip = "Late start? Don't try to see everything. Drill the Top 100 highest-yield cards and run a Mock Board every day."; }
    else if (days <= 7) { head = "Board in " + days + " days"; tip = "Board week: run a Mock Board every day and do the Final-Week Review (your weakest Board Core cards first)."; }
    else {
      head = "Board in " + days + " days";
      var perDay = Math.ceil(unseen / Math.max(1, days - 7));   // leave the final week for review + mock boards
      tip = unseen ? "Learn about " + perDay + " new Board Core card" + (perDay > 1 ? "s" : "") + " a day to see all " + coreIds.length + " with a week to spare." :
        "You've seen every Board Core card. Keep up your reviews and run Mock Boards.";
    }
    return '<a class="row board-row" href="' + (days >= 0 && days <= 7 ? "#/boardday" : "#/settings") + '"><div class="grow"><div class="code">&#128197; ' + esc(head) + '</div>' +
      '<div class="ttl">' + esc(tip) + '</div></div><div class="chev">&#8250;</div></a>';
  }

  function screenHome() {
    setTitle("NCO Board", false);
    var all = allCards();
    var ids = all.map(function (c) { return c.id; });
    var counts = Store.counts(ids);
    var daily = Store.daily(), streak = Store.streak(), dueN = Store.dueCount(ids);
    // Lead with Board Core (what the board asks most), not the whole 1,500-card library.
    var coreIds = STUDY.cards.filter(function (c) { return c.core && rankOk(c); }).map(function (c) { return c.id; });
    var rs = readyScore(coreIds), dToB = daysToBoard();

    var html =
      '<div class="hero">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-end;">' +
          (dToB === 0 || dToB === 1 ? '<div><div class="big" style="font-size:1.6rem;">' + (dToB === 0 ? "Board day" : "Board tomorrow") + '</div><div class="sub">You\'ve studied ' + rs.seen + ' Board Core card' + (rs.seen === 1 ? '' : 's') + '. Stay calm and report in sharp.</div></div>'
            : '<div><div class="big">' + rs.ready + '%</div><div class="sub">board-ready</div></div>') +
          '<div style="text-align:right;white-space:nowrap;"><div style="font-size:1.5rem;font-weight:800;">&#128293; ' + streak + '</div><div class="sub">day streak</div></div>' +
        '</div>' +
        (dToB === 0 || dToB === 1 ? '' : '<div class="bar"><span style="width:' + rs.ready + '%"></span></div>') +
        '<div class="sub" style="margin-top:6px;font-size:.8rem;">Board Core studied: ' + rs.seen + ' of ' + coreIds.length + '</div>' +
        '<div class="sub" style="margin-top:8px;">Today: ' + daily.count + ' / ' + daily.goal + ' cards' + (daily.count >= daily.goal ? ' &#10003;' : '') + '</div>' +
      '</div>' +
      rankAsk() + boardCountdown(coreIds) + boardResultAsk(rs) + todayPlan(coreIds, dueN) + readyCheck(coreIds, rs) +
      // the "start from scratch" nudge is for the early weeks, not board week
      ((dToB == null || dToB > 7) ? '<a class="btn lg learn-cta" href="#/learn">&#128214; Learn Mode — start from scratch</a>' +
      '<div class="muted center" style="font-size:.8rem;margin:6px 0 12px;">New to this? Learn Mode teaches you first. Already know it? Drill below. <b>Your goal for a ' + (Store.settings().boardFor || "SGT/SSG") + ' board: Board Core.</b> Everything else is extra depth.</div>' : '<div class="spacer"></div>') +
      '<div class="btn-row">' +
        '<a class="btn gold lg" href="#/pick/flash">Flashcards</a>' +
        '<a class="btn green lg" href="#/pick/quiz">Quiz</a>' +
      '</div>' +
      '<div class="spacer"></div>' +
      '<div class="btn-row">' +
        '<a class="btn lg board-btn" href="#/board/core">&#127894; Mock Board</a>' +
        '<a class="btn lg drive-btn" href="#/pick/drive">&#128663; Drive Mode</a>' +
      '</div>';
    var extras = [], calm = dToB === 0 || dToB === 1;   // board day / night before: no pile of reviews on Home
    if (false && dueN > 0 && !calm) extras.push('<a class="btn ghost" href="#/flash/due">&#8635; Review ' + dueN + ' card' + (dueN > 1 ? "s" : "") + ' ready to repeat</a>');
    var leechN = Store.leeches(ids).length;
    if (leechN > 0 && !calm) extras.push('<a class="btn ghost" href="#/flash/leeches">&#9888;&#65039; Practice ' + leechN + ' card' + (leechN > 1 ? "s" : "") + ' you keep missing</a>');
    if (dToB != null && dToB >= 1 && dToB <= 3) extras.push('<a class="btn ghost" href="#/flash/cram">&#128367;&#65039; Night-before cram</a>');
    if (dToB != null && dToB >= 2 && dToB <= 14) extras.push('<a class="btn ghost" href="#/flash/top">&#127919; Top 100: highest-yield cards</a>');
    if (!Store.settings().remindersAdded && (dToB == null || dToB > 1)) extras.push('<a class="btn ghost" href="#/settings">&#128276; Add daily study reminders to your calendar</a>');
    extras.forEach(function (e) { html += '<div class="spacer"></div>' + e; });
    html += '<div class="spacer"></div><a class="row board-row" href="#/boardday"><div class="grow"><div class="code">&#127894; Board Day Prep</div><div class="ttl">Chain of command, uniform check, how to report</div></div><div class="chev">&#8250;</div></a>';

    html += '<h2 class="section">Subjects</h2>';
    var cats = {};
    STUDY.pubs.forEach(function (p) {
      if ((p.id === "mine" || p.id === "chain") && !cardsForDeck(p.id).length) return; // hide if empty
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
    wireBoardResult(rs);
    mount.querySelectorAll("#rankAsk .chip").forEach(function (b) {
      b.addEventListener("click", function () { Store.setSetting("boardFor", b.getAttribute("data-r")); screenHome(); });
    });
  }

  function screenBrowse() {
    setTitle("Browse", true);
    var html = "", cats = {};
    STUDY.pubs.forEach(function (p) {
      if ((p.id === "mine" || p.id === "chain") && !cardsForDeck(p.id).length) return;
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
    var titles = { flash: "Pick a subject", quiz: "Pick a quiz", board: "Pick a board", drive: "Drive Mode" };
    var routes = { flash: "#/flash/", quiz: "#/quiz/", board: "#/board/", drive: "#/drive/" };
    setTitle(titles[mode] || "Pick", true);
    var route = routes[mode] || "#/flash/";
    var html = "";
    if (mode === "flash")
      html += '<div class="chip-row" id="modeToggle" style="margin-bottom:12px;">' +
        '<button class="chip on" data-r="#/flash/">&#128196; Flip cards</button>' +
        '<button class="chip" data-r="#/type/">&#9000;&#65039; Type answers</button></div>';
    if (mode === "drive")
      html += '<div class="card"><div class="muted">Hands-free: the app reads each question, pauses for you to answer aloud, then reads the answer. Great for PT or the drive in — keep the screen on.</div></div>';
    html += '<a class="row deck board-row" data-deck="core" href="' + route + 'core"><div class="grow"><div class="code">&#11088; Board Core (recommended)</div>' +
      '<div class="ttl">The must-know questions boards ask most</div></div><div class="pill">' + cardsForDeck("core").length + '</div><div class="chev">&#8250;</div></a>' +
      '<a class="row deck" data-deck="all" href="' + route + 'all"><div class="grow"><div class="code">All Publications</div>' +
      '<div class="ttl">Everything, including deep reference detail</div></div><div class="pill">' + allCards().length + '</div><div class="chev">&#8250;</div></a>' +
      '<h2 class="section">Or pick a subject</h2>';
    STUDY.pubs.forEach(function (p) {
      var n = cardsForDeck(p.id).length;
      if ((p.id === "mine" || p.id === "chain") && !n) return;
      html += '<a class="row deck" data-deck="' + p.id + '" href="' + route + p.id + '"><div class="grow"><div class="code">' + esc(p.code) +
        '</div><div class="ttl">' + esc(p.title) + '</div></div><div class="pill">' + n + '</div><div class="chev">&#8250;</div></a>';
    });
    mount.innerHTML = html;
    if (mode === "flash")
      mount.querySelectorAll("#modeToggle .chip").forEach(function (b) {
        b.addEventListener("click", function () {
          mount.querySelectorAll("#modeToggle .chip").forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
          var pre = b.getAttribute("data-r");
          mount.querySelectorAll(".deck").forEach(function (r) { r.setAttribute("href", pre + r.getAttribute("data-deck")); });
        });
      });
  }

  function screenDrive(deck) { setTitle("Drive Mode", true); Drive.render(mount, cardsForDeck(deck), deckTitle(deck)); }
  function screenType(deck) { setTitle("Type answers", true); Flashcards.render(mount, cardsForDeck(deck), deckTitle(deck), { typed: true }); }

  function screenLearn() { setTitle("Learn", false); Learn.hub(mount); }
  function screenTrack(id) { setTitle("Learn", true); Learn.track(mount, id); }
  function screenLesson(id) { setTitle("Lesson", true); Learn.lesson(mount, id); }

  function screenFlash(deck) {
    setTitle(deckTitle(deck), true);
    // Top 100 and Final-Week Review are meant to be done whole: no 30-new-card session cap
    Flashcards.render(mount, cardsForDeck(deck), deckTitle(deck), (deck === "top" || deck === "final") ? { noCap: true } : undefined);
  }

  function screenQuiz(deck) {
    setTitle("Quiz", true);
    var cards = cardsForDeck(deck), title = deckTitle(deck);
    // same rule quiz.js uses: long-answer and flash-only cards are not quizzed
    var quizN = cards.filter(function (c) { return !c.flashOnly && ((c.choices && c.choices.length >= 2) || (c.a && String(c.a).length <= 90)); }).length;
    mount.innerHTML =
      '<div class="card center"><div class="code" style="font-size:1.1rem;">' + esc(title) + '</div>' +
      '<div class="muted">' + quizN + ' quiz questions available</div></div>' +
      '<h2 class="section">How many questions?</h2>' +
      '<button class="btn gold lg" data-n="10">10 questions</button><div class="spacer"></div>' +
      '<button class="btn green lg" data-n="20">20 questions</button><div class="spacer"></div>' +
      '<button class="btn ghost" data-n="999">All ' + quizN + ' questions</button>';
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
      '<div class="card"><label class="switch"><input type="checkbox" id="fullBoard"' + (Store.settings().fullBoard !== false ? " checked" : "") + '> <span><b>Full board</b>: report in, "tell us about yourself," board members in turn, then report out. Turn off for a quick, quiet board (just the questions).</span></label>' +
        '<label class="switch" style="margin-top:12px;"><input type="checkbox" id="sponsorMode"> <span><b>My sponsor is holding the phone</b>: they read each question, see the answer, and grade you</span></label></div>' +
      '<h2 class="section">How many questions?</h2>' +
      '<div class="muted" style="font-size:.85rem;margin:0 4px 8px;" id="lenNote"></div>' +
      '<button class="btn gold lg" data-n="10">10 questions</button><div class="spacer"></div>' +
      '<button class="btn green lg" data-n="15">15 questions</button><div class="spacer"></div>' +
      '<button class="btn ghost" data-n="25">25 questions</button>' +
      (/^(core|top|final)$/.test(deck) ? '<div class="spacer"></div><button class="btn ghost" id="sendSponsor">&#128228; Send a 10-question board to my sponsor\'s phone</button>' +
        '<div class="muted center" style="font-size:.8rem;margin-top:6px;">Your sponsor opens the link and runs the same board on their phone, with the answers and checklists to grade you.</div>' : '');
    var lenNote = function () { mount.querySelector("#lenNote").textContent = mount.querySelector("#fullBoard").checked ? "A Full board adds reporting in, drill, \"tell us about yourself\" and follow-up questions: 10 questions takes about 15 to 20 minutes. On a bus ride, turn Full board off." : "Quick board: just the questions, about 5 to 8 minutes for 10."; };
    mount.querySelector("#fullBoard").addEventListener("change", lenNote); lenNote();
    var ss = mount.querySelector("#sendSponsor");
    if (ss) ss.addEventListener("click", function () {
      var url = APP_URL + "#/sponsor/" + MockBoard.drawIds(cards, 10).join(",");
      var text = "Can you run a practice board for me? Open this on your phone. It shows you each question with the answer so you can grade me: " + url;
      if (navigator.share) navigator.share({ title: "Practice board", text: text }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { App.toast("Link copied: text it to your sponsor", 3500); }, function () { App.toast(url, 6000); });
      else App.toast(url, 6000);
    });
    mount.querySelectorAll("[data-n]").forEach(function (b) {
      b.addEventListener("click", function () {
        var full = mount.querySelector("#fullBoard").checked, sponsor = mount.querySelector("#sponsorMode").checked;
        Store.setSetting("fullBoard", full);
        MockBoard.render(mount, cards, parseInt(b.getAttribute("data-n"), 10), { full: full, sponsor: sponsor });
      });
    });
  }

  function screenSearch() {
    setTitle("Search", true);
    mount.innerHTML = '<input class="input" id="q" type="search" aria-label="Search questions and answers" placeholder="Search questions & answers..." autocomplete="off" /><div id="results" class="spacer" aria-live="polite"></div>';
    var input = mount.querySelector("#q"), results = mount.querySelector("#results");
    function run() {
      var term = input.value.trim().toLowerCase();
      if (term.length < 2) { results.innerHTML = '<div class="empty">Type at least 2 letters.</div>'; return; }
      var all = allCards().filter(function (c) {
        return (c.q + " " + c.a + " " + (c.topic || "")).toLowerCase().indexOf(term) >= 0;
      });
      // best matches first: the word in the topic or subject name, then in the question, then Board Core
      var safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), rx = new RegExp("\\b" + safe, "i");
      var rank = function (c) { var p = STUDY.pubsById[c.pub] || {}; return (rx.test((c.topic || "") + " " + (p.code || "") + " " + (p.title || "")) ? 4 : 0) + (rx.test(c.q) ? 2 : 0) + (c.core ? 1 : 0); };
      all.sort(function (a, b) { return rank(b) - rank(a); });
      var hits = all.slice(0, 80);
      var note = all.length > hits.length ? '<div class="muted center" style="margin-bottom:8px;">Showing the first 80 of ' + all.length + ' matches. Type more to narrow it down.</div>' : '';
      results.innerHTML = hits.length ? note + hits.map(function (c) {
        var p = STUDY.pubsById[c.pub];
        return '<a class="card" style="display:block;text-decoration:none;color:inherit;" href="#/pub/' + escAttr(c.pub) + '"><div class="flash-tag">' + esc(p ? p.code : "") + (c.topic ? " • " + esc(c.topic) : "") + (c.core ? " • &#11088; core" : "") + '</div>' +
          '<div style="font-weight:600;margin-bottom:6px;">' + esc(c.q) + '</div><div class="muted">' + esc(c.a) + '</div></a>';
      }).join("") : '<div class="empty">No matches. Try a shorter word, like "counsel" or "SHARP".</div>';
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
      '<div class="hero"><div class="big">' + readyScore(STUDY.cards.filter(function (c) { return c.core && rankOk(c); }).map(function (c) { return c.id; })).ready + '%</div><div class="sub">board-ready (same score as Home) • all cards: ' + counts.known + ' known, ' + counts.review + ' to review, ' + counts.new + ' new</div></div>' +
      '<a class="row" href="#/learn"><div class="grow"><div class="code">&#128214; Learn Mode</div><div class="ttl">Guided lessons — learn it from scratch</div></div><div class="chev">&#8250;</div></a>' +
      '<a class="row" href="#/pick/board"><div class="grow"><div class="code">&#127894; Mock Board</div><div class="ttl">Simulate the oral board</div></div><div class="chev">&#8250;</div></a>' +
      '<a class="row" href="#/boardday"><div class="grow"><div class="code">&#128203; Board Day Prep</div><div class="ttl">Chain of command, uniform, reporting</div></div><div class="chev">&#8250;</div></a>' +
      '<a class="row" href="#/mycards"><div class="grow"><div class="code">&#128221; My Cards</div><div class="ttl">Add your unit\'s smart-book questions</div></div><div class="chev">&#8250;</div></a>' +
      '<a class="row" href="#/share"><div class="grow"><div class="code">&#128279; Share &amp; QR code</div><div class="ttl">Send the app to other Soldiers</div></div><div class="chev">&#8250;</div></a>' +
      '<a class="row" href="#/settings"><div class="grow"><div class="code">&#9881;&#65039; Settings</div><div class="ttl">Daily goal, board timer, read-aloud</div></div><div class="chev">&#8250;</div></a>' +
      '<a class="row" href="#/backup"><div class="grow"><div class="code">&#128190; Backup &amp; restore</div><div class="ttl">Save or move your progress</div></div><div class="chev">&#8250;</div></a>' +
      '<div class="muted center" style="font-size:.8rem;margin-top:18px;">NCO Board Study Guide<br>' + esc(versionLine()) + '</div>';
    html += '<h2 class="section">Recent quizzes &amp; boards</h2>';
    html += quizzes.length ? quizzes.slice(0, 10).map(function (q) {
      var pct = Math.round((q.score / q.total) * 100), cls = pct >= 75 ? "badge-good" : pct >= 60 ? "" : "badge-bad";
      var nm = STUDY.pubsById[q.deck] ? STUDY.pubsById[q.deck].code : q.deck;
      return '<div class="row"><div class="grow"><div class="ttl">' + esc(nm) + '</div><div class="meta">' + (Math.round(q.score * 10) / 10) + "/" + q.total + ' correct</div></div><div class="' + cls + '" style="font-weight:700;' + (cls ? '' : 'color:var(--gold);') + '">' + pct + '%</div></div>';
    }).join("") : '<div class="empty">No quizzes yet.</div>';
    mount.innerHTML = html;
  }

  // ---- Settings ----
  function screenSettings() {
    setTitle("Settings", true);
    var s = Store.settings(), daily = Store.daily();
    var timers = [0, 20, 30, 45, 60];
    var html =
      '<h2 class="section">Board date</h2>' +
      '<div class="card"><label class="lbl" for="bDate" style="margin-top:0;">When is your board? (from your board memo)</label>' +
        '<input class="input" type="date" id="bDate" value="' + escAttr(s.boardDate || "") + '" />' +
        '<div class="muted" style="font-size:.85rem;margin-top:8px;">Home shows a countdown and how many new Board Core cards to learn each day.</div>' +
        (s.boardDate ? '<button class="btn ghost" id="bClear" style="margin-top:10px;">Clear board date</button>' : '') + '</div>' +
      '<h2 class="section">Which board?</h2><div class="muted" style="font-size:.85rem;margin:0 4px 8px;">Hides the few facts that only apply to the other rank (like SSG time-in-service numbers).</div><div class="chip-row" id="rankChips">' +
        [["SGT", "Sergeant (E-5)"], ["SSG", "Staff Sergeant (E-6)"], ["BOTH", "Not sure / both"]].map(function (r) { return '<button class="chip' + ((s.boardFor || "BOTH") === r[0] ? ' on' : '') + '" data-r="' + r[0] + '">' + r[1] + '</button>'; }).join("") +
      '</div>' +
      '<h2 class="section">Daily reminder</h2><div class="card"><div class="muted" style="font-size:.85rem;">Add a daily study reminder' + (s.boardDate ? ' (until your board)' : '') + ' and a weekly "sponsor board" reminder to your phone\'s calendar.</div>' +
        '<label class="lbl" for="remT">Remind me at</label><input class="input" type="time" id="remT" value="19:00" />' +
        '<button class="btn green" id="remIcs" style="margin-top:10px;">&#128197; Add reminders to my calendar</button>' +
        '<div class="muted" style="font-size:.8rem;margin-top:6px;">Downloads a calendar file. Open it and your calendar app adds the reminders. Nothing is sent anywhere.</div></div>' +
      '<h2 class="section">Daily goal</h2>' +
      '<div class="card"><div class="stepper"><button class="mini big" id="gMinus">&#8722;</button>' +
        '<span id="goalVal">' + daily.goal + '</span><button class="mini big" id="gPlus">+</button>' +
        '<span class="muted" style="margin-left:8px;">cards / day</span></div>' +
        '<div class="muted" style="font-size:.85rem;margin-top:8px;">Every card you grade or answer counts toward today. Hit it each day to build your streak.</div></div>' +
      '<h2 class="section">Mock Board timer</h2><div class="muted" style="font-size:.85rem;margin:0 4px 8px;">Seconds you get to answer out loud before the answer is shown.</div><div class="chip-row" id="timerChips">' +
        timers.map(function (t) { return '<button class="chip' + (t === s.timer ? ' on' : '') + '" data-t="' + t + '">' + (t === 0 ? 'Off' : t + 's') + '</button>'; }).join("") +
      '</div>' +
      '<h2 class="section">Drive Mode answer pause</h2><div class="muted" style="font-size:.85rem;margin:0 4px 8px;">How long Drive Mode waits for you to answer before it reads the answer.</div><div class="chip-row" id="gapChips">' +
        [3, 5, 8, 12].map(function (t) { return '<button class="chip' + (t === s.driveGap ? ' on' : '') + '" data-g="' + t + '">' + t + 's</button>'; }).join("") +
      '</div>';
    if (Speech.supported())
      html += '<h2 class="section">Read-aloud</h2><div class="card"><label class="switch"><input type="checkbox" id="autoRead"' + (s.autoRead ? ' checked' : '') + '> <span>Automatically read questions &amp; answers aloud</span></label></div>';
    html += '<div class="spacer"></div><button class="btn ghost" id="speakTest">&#128266; Test the voice</button>';
    if (window.SpeechRecognition || window.webkitSpeechRecognition)
      html += '<h2 class="section">Mock Board voice check</h2><div class="card"><label class="switch"><input type="checkbox" id="voiceAuto"' + (s.voiceAuto ? ' checked' : '') + '> <span>Listen to every answer automatically and pre-tick the key points I said (turns on the first time you use it)</span></label></div>';
    mount.innerHTML = html;

    mount.querySelector("#bDate").addEventListener("change", function (e) {
      var v = e.target.value;
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { Store.setSetting("boardDate", v); App.toast("Board date saved"); screenSettings(); }
    });
    var bc = mount.querySelector("#bClear");
    if (bc) bc.addEventListener("click", function () { Store.setSetting("boardDate", ""); App.toast("Board date cleared"); screenSettings(); });
    mount.querySelectorAll("#rankChips .chip").forEach(function (b) {
      b.addEventListener("click", function () {
        Store.setSetting("boardFor", b.getAttribute("data-r"));
        mount.querySelectorAll("#rankChips .chip").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      });
    });
    mount.querySelector("#remIcs").addEventListener("click", function () {
      var tm = (mount.querySelector("#remT").value || "19:00").replace(":", "") + "00";
      download("ncoboard-reminders.ics", reminderIcs(tm, Store.settings().boardDate), "text/calendar");
      Store.setSetting("remindersAdded", true);
      App.toast("Calendar file downloaded: open it to add the reminders", 4000);
    });
    mount.querySelector("#gMinus").addEventListener("click", function () { Store.setGoal(Store.daily().goal - 5); mount.querySelector("#goalVal").textContent = Store.daily().goal; });
    mount.querySelector("#gPlus").addEventListener("click", function () { Store.setGoal(Store.daily().goal + 5); mount.querySelector("#goalVal").textContent = Store.daily().goal; });
    mount.querySelectorAll("#timerChips .chip").forEach(function (b) {
      b.addEventListener("click", function () {
        Store.setSetting("timer", parseInt(b.getAttribute("data-t"), 10));
        mount.querySelectorAll("#timerChips .chip").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      });
    });
    mount.querySelectorAll("#gapChips .chip").forEach(function (b) {
      b.addEventListener("click", function () {
        Store.setSetting("driveGap", parseInt(b.getAttribute("data-g"), 10));
        mount.querySelectorAll("#gapChips .chip").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
      });
    });
    var va = mount.querySelector("#voiceAuto");
    if (va) va.addEventListener("change", function () { Store.setSetting("voiceAuto", va.checked); });
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
      '<button class="btn danger" id="resetCards">Reset card progress only</button><div class="spacer"></div>' +
      '<button class="btn danger" id="resetAll">Erase everything (progress + my cards)</button>';
    mount.querySelector("#exp").addEventListener("click", function () {
      var d = new Date(), name = "nco-board-progress-" + d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + ".json";
      download(name, Store.exportData()); App.toast("Backup downloaded");
    });
    mount.querySelector("#impFile").addEventListener("change", function (e) {
      var input = e.target, f = input.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        input.value = "";   // so picking the same file again still triggers a restore
        if (!confirm("Import this backup? It replaces your current progress and cards.")) return;
        try { Store.importData(r.result); App.toast("Progress restored"); App.go("#/"); }
        catch (err) { App.toast("That file isn't a valid backup from this app.", 4000); }
      };
      r.readAsText(f);
    });
    mount.querySelector("#resetCards").addEventListener("click", function () { if (confirm("Reset all card progress? Your custom cards stay, but every card goes back to new. Tip: tap Export first so you can undo this.")) { Store.resetCards(); App.toast("Card progress reset"); } });
    mount.querySelector("#resetAll").addEventListener("click", function () { if (confirm("Erase ALL progress AND your custom cards? This cannot be undone. Tip: tap Export first to keep a backup.")) { Store.resetAll(); App.toast("Everything reset"); App.go("#/"); } });
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
      '<h2 class="section">Install it on your phone</h2>' +
      '<div class="card"><div class="ttl"><b>Android (Chrome):</b> tap the Install button at the top, or Chrome menu &#8942; &#8594; Install app / Add to Home screen.</div>' +
        '<div class="ttl" style="margin-top:8px;"><b>iPhone (Safari):</b> open the link in Safari, tap Share &#11014;&#65039;, then Add to Home Screen, then Add. Open it from the new icon; it works offline after the first visit.</div></div>' +
      '<h2 class="section">Spot an error?</h2>' +
      '<div class="card"><div class="muted">Tap the &#9873; flag on any card. You can send the report from your phone (text, email, chat) or copy it. No account needed.</div></div>' +
      '<a class="btn ghost" href="https://github.com/' + REPO + '/issues/new" target="_blank" rel="noopener">Or report on GitHub (needs a free account)</a>';
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
        html += '<div class="row" data-edit="' + escAttr(c.id) + '"><div class="grow"><div class="code">' + esc(p ? p.code : "My Cards") + '</div>' +
          '<div class="ttl">' + esc(c.q) + '</div></div><button class="mini" data-del="' + escAttr(c.id) + '" aria-label="Delete">&#128465;</button><div class="chev">&#8250;</div></div>';
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

  // ---- Board Day content ----
  var UNIFORM_CHECKS = [
    { id: "u1", t: "Haircut neat & tapered within AR 670-1; clean-shaven (mustache OK); sideburns trimmed above the ear-canal opening (AD 2026-09). Beard only with a signed medical ETP or approved religious accommodation, and carry the signed copy (AD 2025-13)" },
    { id: "u1b", t: "Grooming per AD 2025-18: men's hair at most 2 in on top and 1 in on the sides; buns at most 3 in; nails square or rounded (women at most 1/4 in, men not past the fingertip); no lipstick; men wear no earrings, women plain matched studs only" },
    { id: "u0", t: "Confirm WHICH uniform your board memo calls for (often the AGSU) and inspect that one" },
    { id: "u2", t: "Headgear per the memo, shaped and worn correctly: with the AGSU, the garrison cap (never the black beret, AD 2025-18); with the OCP, the patrol cap" },
    { id: "u3", t: "Nametapes (US ARMY / last name) correct, even, and properly placed" },
    { id: "u4", t: "Rank / grade insignia centered and correct" },
    { id: "u5", t: "Skill badges, tabs, and patches placed per regulation; not faded or frayed" },
    { id: "u6", t: "Boots clean and serviceable; no excessive wear" },
    { id: "u7", t: "Uniform clean, serviceable, correct size; no fraying, stains, or missing buttons" },
    { id: "u8", t: "ID tags worn; ID card and any required documents on hand" },
    { id: "u9", t: "Jewelry / eyewear / cosmetics within standards; nothing unauthorized" },
    { id: "u10", t: "Pockets flat; nothing bulky or visible (pens, phone, etc.)" },
    { id: "u11", t: "AGSU (or ASU): nameplate (last name only) placed correctly, ribbons in order of precedence, badges and DUI/RDI placed per AR 670-1 and AD 2025-18" },
    { id: "u12", t: "Service uniform pressed with sharp creases; gig line straight; shoes polished" }
  ];
  // Labeled sketch of the AGSU coat front (viewer's view). Placements match the pam670-1 cards.
  var UNIFORM_SVG = '<svg viewBox="0 0 320 300" role="img" aria-label="AGSU coat placement sketch" style="width:100%;height:auto;margin-top:8px;">' +
    '<g fill="#5b4a3a" stroke="#c9a227" stroke-width="1.5">' +
      '<path d="M110 30 L160 50 L210 30 L270 60 L300 230 L262 236 L246 120 L240 280 L80 280 L74 120 L58 236 L20 230 L50 60 Z"/>' +
      '<path d="M160 50 L140 140 L160 280 L180 140 Z" fill="#4a3c2f"/>' +
      '<rect x="92" y="118" width="44" height="34" rx="3" fill="#4a3c2f"/><rect x="184" y="118" width="44" height="34" rx="3" fill="#4a3c2f"/>' +
    '</g>' +
    '<rect x="98" y="124" width="32" height="8" fill="#e8e0c8"/>' +                              // nameplate on the wearer's right pocket flap
    '<g fill="#b22234"><rect x="186" y="104" width="12" height="6"/><rect x="199" y="104" width="12" height="6"/><rect x="212" y="104" width="12" height="6"/>' +
      '<rect x="192" y="97" width="12" height="6"/><rect x="205" y="97" width="12" height="6"/></g>' +   // ribbons above the wearer's left pocket
    '<g fill="#ffcc33"><rect x="30" y="214" width="22" height="3"/><rect x="30" y="219" width="22" height="3"/></g>' +   // overseas bars, wearer's right sleeve
    '<g stroke="#ffcc33" stroke-width="3"><line x1="268" y1="222" x2="288" y2="208"/><line x1="268" y1="228" x2="288" y2="214"/></g>' +   // service stripes, wearer's left sleeve
    '<g font-size="11" fill="#f2efe4" font-family="sans-serif">' +
      '<text x="4" y="112">Nameplate: centered</text><text x="4" y="125">on right pocket flap</text><line x1="96" y1="122" x2="80" y2="118" stroke="#f2efe4"/>' +
      '<text x="196" y="70">Ribbons: centered 1/8"</text><text x="196" y="82">above left pocket</text>' +
      '<text x="4" y="254">Overseas bars: right</text><text x="4" y="266">sleeve, 4" from bottom</text>' +
      '<text x="196" y="254">Service stripes: left</text><text x="196" y="266">sleeve, 4" from bottom</text>' +
    '</g></svg>';
  var REPORTING_STEPS = [
    "Arrive early. Know each board member's name, rank, and position.",
    "Wait to be called. When directed, approach the door and knock if your SOP requires it.",
    "Enter when told. Move to a position centered in front of the board president and halt about two steps away.",
    "Render the hand salute and report — e.g. \"Sergeant Major, Specialist (Last Name) reports to the President of the Board.\" Use YOUR current rank (a Specialist says Specialist), and follow the exact wording in your board memo/SOP. Hold the salute until it is returned.",
    "Some boards give you a few facing movements first (Left, FACE; About, FACE). Then take your seat only when directed. Sit at attention: back straight, feet flat, hands on thighs, eyes on the questioner.",
    "Answer the board member who asked. If you don't know: \"I do not know, Sergeant Major, but I will find out.\" Never guess.",
    "Keep your bearing and eye contact. Speak clearly and with confidence; address members by rank.",
    "When dismissed, stand at attention, render the hand salute, hold until returned, face about, and march out."
  ];
  function menuRow(href, code, ttl) { return '<a class="row" href="' + href + '"><div class="grow"><div class="code">' + code + '</div><div class="ttl">' + ttl + '</div></div><div class="chev">&#8250;</div></a>'; }

  function screenBoardDay() {
    setTitle("Board Day Prep", true);
    mount.innerHTML =
      '<div class="card"><div class="muted">Everything beyond the flashcards. Protocols vary by board and installation — always follow your local board SOP and appointment memo.</div></div>' +
      menuRow("#/room", "&#127963;&#65039; What the Board Room Is Like", "Who sits on it, what happens, how they decide") +
      menuRow("#/chain", "&#129333; Chain of Command", "Fill in your leaders — then quiz yourself") +
      menuRow("#/uniform", "&#129509; Uniform Inspection", "Check your uniform before you walk in") +
      menuRow("#/records", "&#128193; Records & What to Bring", "Check your SRB, points, and board memo; what goes in your pockets") +
      menuRow("#/reporting", "&#127894; How to Report to the Board", "Reporting sequence & bearing") +
      menuRow("#/statement", "&#128221; Opening Statement", "Draft and save your self-introduction") +
      menuRow("#/pub/boardskills", "&#129504; Board Know-How", "If you freeze, asking for a repeat, what to bring, how to answer") +
      menuRow("#/changes", "&#128260; What Changed Recently", "AFT, waist-to-height, grooming, and other 2025-2026 changes boards ask about") +
      menuRow("#/knowledge", "&#127758; Know Your Army & Your Job", "Current leaders, your unit, your MOS, and current events");
  }

  // ---- What changed recently: built from the cards, so the page and the cards always agree ----
  var CHANGES = [
    { h: "Fitness: the AFT replaced the ACFT (1 June 2025)", test: function (c) { return /^(fm722-04|fm722-06|ar350-1-d072|ar350-1-d073)$/.test(c.id); } },
    { h: "Combat Field Test (AD 2026-07)", test: function (c) { return c.core && /Combat Field Test/.test(c.topic || ""); } },
    { h: "Body fat: waist-to-height ratio replaced the tape test (AD 2026-13)", test: function (c) { return c.core && /AD 2026-13/.test(c.topic || ""); } },
    { h: "Grooming and appearance (AD 2025-13, AD 2025-18, AD 2026-09)", test: function (c) { return c.core && (/\(AD 2025-1[38]\)|\(AD 2026-09\)/.test(c.topic || "") || c.id === "pam670-1-g01"); } },
    { h: "Tattoos (AD 2022-09)", test: function (c) { return c.core && /AD 2022-09/.test(c.topic || ""); } },
    { h: "Equal opportunity (AR 600-20, April 2026)", test: function (c) { return c.core && c.pub === "ar600-20" && /sexual orientation/i.test(c.a); } },
    { h: "Promotions (AR 600-8-19, March 2026)", test: function (c) { return /^(ar600-8-19-15|ar600-8-19-16|ar600-8-19-32)$/.test(c.id); } },
    { h: "Operations doctrine (ADP 3-0, March 2025)", test: function (c) { return /^(adp3-0-n08|adp30-03|stp21-24-d043)$/.test(c.id); } },
    { h: "Marksmanship (TC 3-22.9)", test: function (c) { return c.id === "weapons-m4-11"; } },
    { h: "Safety (AR 385-10, July 2023)", test: function (c) { return /^(ar385-10-01|ar385-10-06)$/.test(c.id); } },
    { h: "Orders: paragraph 4 is Sustainment", test: function (c) { return c.id === "tc7-22-7-opord"; } },
    { h: "TRADOC is now T2COM (Army General Order 2025-23)", test: function (c) { return c.id === "ar600-20-t2com"; } },
    { h: "Kratom is banned for Soldiers (AD 2026-14, June 2026)", test: function (c) { return c.id === "ar600-85-k01" || c.id === "ar600-85-k03"; } },
    { h: "Maintenance policy updated (AR 750-1, April 2026)", test: function (c) { return c.id === "ar750-1-01" || c.id === "ar750-1-02"; } },
    { h: "SGLI maximum is $500,000 (since March 2023)", test: function (c) { return c.id === "sgli-01"; } },
    { h: "Army Community Service is now Soldier and Family Readiness (AR 608-1, May 2026)", test: function (c) { return c.id === "ar6081-02" || c.id === "ar608-1-d050"; } }
  ];
  // A board sent from a Soldier's phone: same questions, run here in sponsor mode (answers + checklists shown to the sponsor).
  function screenSponsorBoard(list) {
    setTitle("Sponsor Board", true);
    var want = list.split(",").filter(Boolean), byId = {};
    allCards().forEach(function (c) { byId[c.id] = c; });
    var cards = want.map(function (id) { return byId[id]; }).filter(Boolean);
    if (cards.length < 3) { mount.innerHTML = '<div class="empty">This board link is incomplete. Ask the Soldier to send it again.</div>'; return; }
    mount.innerHTML = '<div class="card"><div class="flash-tag">You are the board</div><div class="muted">A Soldier asked you to run a practice board. You\'ll see each question with its answer and a checklist of key points. ' +
      'Read the question aloud, listen, then grade what they actually said. At the end, read them their score and their weakest subjects.</div></div>' +
      '<label class="switch card"><input type="checkbox" id="sbFull" checked> <span><b>Full board</b>: reporting in, drill, "tell us about yourself," then the questions</span></label>' +
      '<button class="btn gold lg" id="sbGo">Start the board (' + cards.length + ' questions)</button>';
    mount.querySelector("#sbGo").addEventListener("click", function () {
      MockBoard.render(mount, cards, cards.length, { full: mount.querySelector("#sbFull").checked, sponsor: true, fixed: true });
    });
  }

  // Results sent back from a sponsor's phone: saved once, missed cards come back sooner.
  function screenSponsorResult(p) {
    setTitle("Sponsor Board Results", true);
    var got = parseFloat(p[0]), total = parseInt(p[1], 10), token = String(p[2] || "").replace(/[^a-z0-9]/g, ""), ids = String(p[3] || "").split(",").filter(Boolean);
    var note = ""; try { note = decodeURIComponent(p.slice(4).join("/") || "").slice(0, 300); } catch (e) { note = ""; }
    if (!(total > 0) || !(got >= 0) || got > total || !token) { mount.innerHTML = '<div class="empty">This results link is incomplete.</div>'; return; }
    var seenKey = "sbr-" + token, fresh = !Store.chain()[seenKey];
    var byId = {}; STUDY.cards.forEach(function (c) { byId[c.id] = c; });
    if (fresh) {
      Store.recordQuiz("Mock Board with sponsor", got, total);
      ids.forEach(function (id) { if (byId[id]) Store.grade(id, "again"); });
      Store.setChainRole(seenKey, "1");
    }
    var pct = Math.round(100 * got / total);
    mount.innerHTML = '<div class="ring-wrap"><div class="ring">' + pct + '%<small>from your sponsor\'s board</small></div></div>' +
      (note ? '<div class="card" style="border-color:var(--gold);"><div class="flash-tag">Your sponsor\'s notes</div><div style="white-space:pre-wrap;">' + esc(note) + '</div></div>' : '') +
      '<p class="center muted">' + (fresh ? "Saved to your history. " : "Already saved. ") + (ids.length ? "The questions you missed will come back sooner in your reviews:" : "No misses. Nice work.") + '</p>' +
      ids.map(function (id) { var c = byId[id]; return c ? '<div class="card"><div style="font-weight:600;margin-bottom:6px;">' + esc(c.q) + '</div><div class="muted">' + esc(c.a) + '</div></div>' : ""; }).join("") +
      '<div class="spacer"></div><a class="btn gold lg" href="#/">Home</a>';
  }

  function screenChanges() {
    setTitle("What Changed Recently", true);
    var all = allCards();
    var html = '<div class="card"><div class="muted">Boards like to check that you know the current rule, not the one your unit used a few years ago. Each item is a card from the app, with its source.</div></div>';
    CHANGES.forEach(function (sec) {
      var cs = all.filter(sec.test); if (!cs.length) return;
      html += '<h2 class="section">' + esc(sec.h) + '</h2>';
      cs.forEach(function (c) {
        html += '<div class="card"><div style="font-weight:600;margin-bottom:4px;">' + esc(c.q) + '</div><div>' + esc(c.a) + '</div>' + (c.ref ? '<div class="flash-ref">' + esc(c.ref) + '</div>' : '') + '</div>';
      });
    });
    mount.innerHTML = html;
  }

  function screenChain() {
    setTitle("Chain of Command", true);
    var chain = Store.chain();
    var filledN = CHAIN_ROLES.filter(function (r) { return chain[r.k]; }).length;
    var html = '<div class="card"><div class="muted">Fill in your leaders. Saved entries become flashcards &amp; quiz questions automatically — boards almost always ask these.</div></div>';
    [["Your unit", true], ["Army & national", false]].forEach(function (g) {
      html += '<h2 class="section">' + g[0] + '</h2>';
      CHAIN_ROLES.filter(function (r) { return r.your === g[1]; }).forEach(function (r) {
        html += '<label class="lbl">' + esc(r.label) + '</label><input class="input chainin" data-k="' + r.k + '" placeholder="RANK Last Name" value="' + (chain[r.k] ? escAttr(chain[r.k]) : "") + '">';
      });
    });
    html += '<div class="spacer"></div><button class="btn gold lg" id="saveChain">Save roster</button>';
    if (filledN) html += '<div class="spacer"></div><a class="btn green" href="#/flash/chain">Study these ' + filledN + ' as flashcards</a>';
    mount.innerHTML = html;
    mount.querySelector("#saveChain").addEventListener("click", function () {
      mount.querySelectorAll(".chainin").forEach(function (inp) { Store.setChainRole(inp.getAttribute("data-k"), inp.value.trim()); });
      App.toast("Roster saved"); screenChain();
    });
  }

  function screenUniform() {
    setTitle("Uniform Inspection", true);
    var checks = Store.checks();
    var html = '<div class="card"><div class="muted">Tap each item once you\'ve verified it. Standards summarized from AR 670-1 / DA PAM 670-1 — verify exact measurements there and follow local guidance.</div></div>' +
      '<div class="card"><div class="flash-tag">AGSU coat: where the main items go (enlisted)</div>' + UNIFORM_SVG +
        '<div class="muted" style="font-size:.8rem;margin-top:6px;">Simple sketch, not to scale, shown as you face the Soldier (their right is on your left). From DA PAM 670-1 and AD 2025-18; your board memo and local SOP have the final say.</div></div>';
    UNIFORM_CHECKS.forEach(function (u) {
      var on = !!checks[u.id];
      html += '<button class="row check' + (on ? " checked" : "") + '" data-id="' + u.id + '"><div class="checkbox">' + (on ? "&#10003;" : "") + '</div><div class="grow"><div class="ttl">' + esc(u.t) + '</div></div></button>';
    });
    html += '<div class="spacer"></div><a class="btn green" href="#/flash/pam670-1">Exact placement and measurements: study the DA PAM 670-1 cards</a>' +
      '<div class="spacer"></div><button class="btn ghost" id="clear">Reset checklist</button>';
    mount.innerHTML = html;
    mount.querySelectorAll(".check").forEach(function (b) { b.addEventListener("click", function () { Store.toggleCheck(b.getAttribute("data-id")); screenUniform(); }); });
    mount.querySelector("#clear").addEventListener("click", function () { UNIFORM_CHECKS.forEach(function (u) { if (Store.checks()[u.id]) Store.toggleCheck(u.id); }); screenUniform(); });
  }

  // One list for the week before: records, the board memo, and what to carry. Ticks are saved like the uniform checklist.
  var RECORD_CHECKS = [
    { id: "r1", t: "Review your Soldier Record Brief (SRB) in IPPS-A with your S-1 or records manager: personal data, awards, schools, civilian education" },
    { id: "r2", t: "Promotion point items are current: latest record AFT, weapons qualification (within 24 months), BLC/college credits posted" },
    { id: "r3", t: "Fix anything wrong now: corrections only count going forward (AR 600-8-19)" },
    { id: "r4", t: "Read your board memo: date, time, place, uniform, and the exact reporting wording" },
    { id: "r5", t: "Know your sponsor and run at least one practice board with them" },
    { id: "r6", t: "Fill in your chain of command (Board Day Prep) and check the names are current" },
    { id: "r7", t: "Carry only what the memo requires (usually your ID card). Phone left outside, pockets flat" },
    { id: "r8", t: "Arrive early; know the board members' names and ranks" }
  ];
  function screenRecords() {
    setTitle("Records & What to Bring", true);
    var checks = Store.checks();
    var html = '<div class="card"><div class="muted">Do this the week before your board. Your board memo and local SOP always come first.</div></div>';
    RECORD_CHECKS.forEach(function (u) {
      var on = !!checks[u.id];
      html += '<button class="row check' + (on ? " checked" : "") + '" data-id="' + u.id + '"><div class="checkbox">' + (on ? "&#10003;" : "") + '</div><div class="grow"><div class="ttl">' + esc(u.t) + '</div></div></button>';
    });
    html += '<div class="spacer"></div><a class="btn ghost" href="#/pub/boardskills">Board Know-How cards</a>';
    mount.innerHTML = html;
    mount.querySelectorAll(".check").forEach(function (b) { b.addEventListener("click", function () { Store.toggleCheck(b.getAttribute("data-id")); screenRecords(); }); });
  }

  function screenReporting() {
    setTitle("Report to the Board", true);
    var html = '<div class="card"><div class="muted">A general sequence — boards differ. Follow your local board SOP and appointment memo exactly.</div></div>';
    REPORTING_STEPS.forEach(function (s, i) { html += '<div class="row"><div class="numbubble">' + (i + 1) + '</div><div class="grow"><div class="ttl">' + esc(s) + '</div></div></div>'; });
    html += '<h2 class="section">Bearing tips</h2><div class="card"><div class="muted">Stand and sit at attention. Make eye contact. Speak loudly and clearly. Don\'t fidget. If you don\'t know an answer, say so honestly — never bluff.</div></div>';
    mount.innerHTML = html;
  }

  var SAMPLE_STATEMENT = "Good morning, Sergeant Major and members of the board.\n" +
    "I am Specialist Jordan Avery, a signal support systems specialist in Headquarters Company of my battalion.\n" +
    "I have three years in service and have served as my company's communications NCO in a specialist's slot for the last eight months.\n" +
    "In that time I trained eight Soldiers to operate and troubleshoot our radios, and our section passed its last command inspection with no deficiencies.\n" +
    "Off duty, I'm working on my associate degree and I volunteer with our unit's BOSS program.\n" +
    "I'm ready to be a sergeant because I already take care of Soldiers' training and welfare, and I want the responsibility that comes with the stripes.\n" +
    "My goal is to graduate BLC near the top of my class and lead a team that is the first one my platoon sergeant calls on.\n" +
    "Thank you.";
  function screenStatement() {
    setTitle("Opening Statement", true);
    var skeleton = "Good (morning/afternoon), Sergeant Major and members of the board.\nI am (Rank Last Name), serving as (duty position) in (unit).\nI have (X) years in service and (Y) time in grade.\nSome of my accomplishments include ...\nI am prepared for promotion because ...\nMy goals as an NCO are ...\nThank you.";
    var cur = Store.statement();
    mount.innerHTML =
      '<div class="card"><div class="muted">Some boards ask for a brief self-introduction. Draft yours here — it saves on this device.</div></div>' +
      '<label class="lbl">Your opening statement</label>' +
      '<textarea class="input" id="stmt" rows="12" placeholder="Write your statement...">' + (cur ? esc(cur) : "") + '</textarea>' +
      '<div class="btn-row" style="margin-top:10px;"><button class="btn gold" id="save">Save</button><button class="btn ghost" id="tmpl">Insert template</button></div>' +
      '<div class="spacer"></div><button class="btn ghost" id="ex">Show an example</button>' +
      '<div id="exBox" hidden><div class="card" style="margin-top:10px;"><div class="flash-tag">Example (fictional Soldier: write your own)</div><div style="white-space:pre-wrap;margin-top:6px;">' +
        esc(SAMPLE_STATEMENT) + '</div><div class="muted" style="font-size:.85rem;margin-top:8px;">Keep yours about a minute. Say it, don\'t read it. Be specific: real duties, real accomplishments, real goals.</div></div></div>';
    mount.querySelector("#save").addEventListener("click", function () { Store.setStatement(mount.querySelector("#stmt").value); App.toast("Saved"); });
    mount.querySelector("#ex").addEventListener("click", function () { var b = mount.querySelector("#exBox"); b.hidden = !b.hidden; });
    mount.querySelector("#tmpl").addEventListener("click", function () { var t = mount.querySelector("#stmt"); if (!t.value.trim() || confirm("Replace current text with the template?")) t.value = skeleton; });
  }

  // ---- What the board room is like: assembled from the AR 600-8-19 (Mar 2026) cards so the page and cards always agree ----
  var ROOM_SECTIONS = [
    { h: "Who sits on the board", ids: ["ar600-8-19-08", "ar600-8-19-09", "ar600-8-19-11", "ar600-8-19-13"] },
    { h: "What happens in the room", ids: ["ar600-8-19-24", "ar600-8-19-26", "ar600-8-19-27", "ar600-8-19-25"] },
    { h: "How they decide", ids: ["ar600-8-19-28", "ar600-8-19-30"] },
    { h: "If you're not recommended", ids: ["ar600-8-19-29", "ar600-8-19-31"] }
  ];
  function screenRoom() {
    setTitle("What the Board Room Is Like", true);
    var byId = {}; STUDY.cards.forEach(function (c) { byId[c.id] = c; });
    var html = '<div class="card"><div class="muted">What AR 600-8-19 (March 2026) says about the board itself, then a step-by-step walk-through. Your board memo and local SOP have the details for your board: time, place, uniform, and the exact reporting wording.</div></div>' +
      '<h2 class="section">Step by step</h2>';
    [ "Before: check your records and points are current, confirm the uniform and time in your board memo, and arrive early.",
      "When called: knock if your SOP says so, enter, halt about two steps in front of the president, salute, and report: \"Sergeant Major, (your rank and last name) reports to the President of the Board.\"",
      "Some boards have you do a few facing movements first. Then sit only when directed, at attention. The president may ask you to tell the board about yourself.",
      "Each board member asks questions in turn: leadership, Army programs, basic Soldiering, world affairs, and required situational questions on things like harassment, assault, abuse, and suicide.",
      "The president asks last and closes the board. When dismissed: stand, salute, hold until returned, face about, and march out.",
      "After: each voting member votes yes or no and the majority decides. The promotion authority makes the final call. If you aren't recommended, your first-line leader counsels you in writing on how to improve (AR 600-8-19, para 1-33)." ]
      .forEach(function (t, i) { html += '<div class="row"><div class="numbubble">' + (i + 1) + '</div><div class="grow"><div class="ttl">' + esc(t) + '</div></div></div>'; });
    ROOM_SECTIONS.forEach(function (sec) {
      html += '<h2 class="section">' + esc(sec.h) + '</h2>';
      sec.ids.forEach(function (id) {
        var c = byId[id]; if (!c) return;
        html += '<div class="card"><div style="font-weight:600;margin-bottom:4px;">' + esc(c.q) + '</div><div>' + esc(c.a) + '</div>' +
          (c.ref ? '<div class="flash-ref">' + esc(c.ref) + '</div>' : '') + '</div>';
      });
    });
    html += '<div class="spacer"></div><a class="btn gold lg" href="#/reporting">How to report to the board</a><div class="spacer"></div>' +
      '<a class="btn green lg" href="#/pick/board">Rehearse it: Full board Mock Board</a>';
    mount.innerHTML = html;
  }

  // ---- Know your Army & your job: things boards ask that depend on YOUR unit and the news (not flashcard facts) ----
  var KNOW_PROMPTS = [
    { id: "unit", t: "Your unit", h: "Battalion, brigade, and division: name, motto, what the patch means, mission, and a little history." },
    { id: "job", t: "Your job", h: "Your MOS title and main duties, and a few of the individual tasks you perform. Boards can check your job proficiency: look up your MOS Soldier's Manual (STP) and your individual critical task list on the Central Army Registry or your Digital Job Book, and ask your squad leader which tasks your board likes to ask." },
    { id: "post", t: "Your installation", h: "Installation commander and CSM; where ACS, AER, the SHARP office, and behavioral health are; the SHARP and suicide hotlines." },
    { id: "army", t: "What's changing in the Army", h: "Recent changes you should be able to talk about: the AFT and Combat Field Test, waist-to-height ratio, grooming rules. See What Changed Recently for the details and sources." },
    { id: "news", t: "Current events", h: "A few national and world headlines from this month, from a reliable news source, and how they could affect the Army or your unit." }
  ];
  function screenKnowledge() {
    setTitle("Know Your Army & Your Job", true);
    var notes = Store.chain();
    var chainNow = Store.chain();
    var todo = CHAIN_ROLES.filter(function (r) { return !chainNow[r.k]; }).map(function (r) { return r.label; })
      .concat(KNOW_PROMPTS.filter(function (k) { return !notes["know-" + k.id]; }).map(function (k) { return k.t; }));
    var html = '<div class="card"><div class="muted">Boards often ask about your own unit, your job, and current events. These answers are yours to look up, so write them here (saved on this phone). For your leaders up to the Sergeant Major of the Army and the President, fill in the Chain of Command roster.</div></div>' +
      (todo.length ? '<div class="card"><div class="flash-tag">Still to look up (' + todo.length + ')</div><div class="muted" style="font-size:.9rem;">' + todo.map(esc).join(" • ") +
        '</div><div class="muted" style="font-size:.8rem;margin-top:6px;">Names change: check army.mil, your unit\'s page, or your chain of command. Don\'t trust an old smart book.</div></div>'
        : '<div class="card"><div class="badge-good" style="font-weight:700;">&#10003; Everything filled in. Re-check names the week of your board.</div></div>') +
      '<a class="btn ghost" href="#/chain">&#129333; Open the Chain of Command roster</a><div class="spacer"></div>' +
      '<a class="btn ghost" href="#/changes">&#128260; What changed recently (AFT, waist-to-height, grooming)</a>';
    KNOW_PROMPTS.forEach(function (k) {
      html += '<label class="lbl" for="kn-' + k.id + '"><b>' + esc(k.t) + '</b>: ' + esc(k.h) + '</label>' +
        '<textarea class="input" id="kn-' + k.id + '" rows="3" placeholder="Your notes...">' + esc(notes["know-" + k.id] || "") + '</textarea>';
    });
    html += '<div class="spacer"></div><button class="btn gold lg" id="knSave">Save notes</button>';
    mount.innerHTML = html;
    mount.querySelector("#knSave").addEventListener("click", function () {
      KNOW_PROMPTS.forEach(function (k) { Store.setChainRole("know-" + k.id, mount.querySelector("#kn-" + k.id).value.trim()); });
      App.toast("Notes saved");
    });
  }

  // ---------------- router ----------------
  function route() {
    if (window.MockBoard) MockBoard.stop();
    if (window.Drive) Drive.stop();
    if (window.Speech) Speech.stop();
    var hash = location.hash || "#/";
    var parts = hash.replace(/^#\//, "").split("/");
    var head = parts[0] || "";
    window.scrollTo(0, 0);

    if (head === "") return screenHome(), tab("home");
    if (head === "learn") return screenLearn(), tab("learn");
    if (head === "track") return screenTrack(parts[1]), tab("learn");
    if (head === "lesson") return screenLesson(parts.slice(1).join("/")), tab("learn");
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
    if (head === "boardday") return screenBoardDay(), tab("home");
    if (head === "chain") return screenChain(), tab("home");
    if (head === "uniform") return screenUniform(), tab("home");
    if (head === "reporting") return screenReporting(), tab("home");
    if (head === "statement") return screenStatement(), tab("home");
    if (head === "knowledge") return screenKnowledge(), tab("home");
    if (head === "room") return screenRoom(), tab("home");
    if (head === "records") return screenRecords(), tab("home");
    if (head === "changes") return screenChanges(), tab("home");
    if (head === "sponsor") return screenSponsorBoard(parts[1] || ""), tab("home");
    if (head === "sbresult") return screenSponsorResult(parts.slice(1)), tab("home");
    if (head === "pub") return screenPub(parts[1]), tab("browse");
    if (head === "pick") return screenPick(parts[1]), tab("home");
    if (head === "flash") return screenFlash(parts[1]), tab("home");
    if (head === "type") return screenType(parts[1]), tab("home");
    if (head === "quiz") return screenQuiz(parts[1]), tab("home");
    if (head === "board") return screenBoard(parts[1]), tab("home");
    if (head === "drive") return screenDrive(parts[1]), tab("home");
    return screenHome(), tab("home");
  }
  function tab(name) { document.querySelectorAll(".tab").forEach(function (t) { var on = t.getAttribute("data-tab") === name; t.classList.toggle("active", on); if (on) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current"); }); }
  function setTitle(t, showBack) { titleEl.textContent = t; backBtn.hidden = !showBack; }

  // Calendar file with a daily study reminder (until the board date, if set) and a weekly sponsor-board reminder.
  function reminderIcs(hhmmss, boardDate) {
    var d = new Date(), pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var day = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    var until = boardDate ? ";UNTIL=" + boardDate.replace(/-/g, "") + "T235959" : "";
    var stamp = day + "T000000Z";
    function ev(uid, rule, summary, desc, mins) {
      return ["BEGIN:VEVENT", "UID:" + uid + "-" + day + "@ncoboard", "DTSTAMP:" + stamp, "DTSTART:" + day + "T" + hhmmss, "DURATION:PT" + mins + "M",
        "RRULE:" + rule + until, "SUMMARY:" + summary, "DESCRIPTION:" + desc + " " + APP_URL,
        "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + summary, "TRIGGER:PT0M", "END:VALARM", "END:VEVENT"].join("\r\n");
    }
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NCO Board Study Guide//EN", "CALSCALE:GREGORIAN",
      ev("daily", "FREQ=DAILY", "NCO board: 15 minutes of study", "Open the app and do Today's plan.", 15),
      ev("sponsor", "FREQ=WEEKLY", "NCO board: mock board with your sponsor", "Ask your sponsor to run a Mock Board in sponsor mode.", 30),
      "END:VCALENDAR"].join("\r\n") + "\r\n";
  }

  function download(filename, text, mime) {
    var a = document.createElement("a");
    a.href = "data:" + (mime || "application/json") + ";charset=utf-8," + encodeURIComponent(text);
    a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------------- public helpers ----------------
  var App = {
    go: function (h) { location.hash = h; },
    appUrl: APP_URL,
    allCards: allCards,
    reportingSteps: REPORTING_STEPS,
    toast: function (msg, ms) {
      var t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
      t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite");
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, ms || 2500);
    },
    reportCard: function (card) {
      if (card.custom) { App.toast("That's your own card — edit it under My Cards."); return; }
      // No account needed: hand the report to the phone's share sheet (text, email, chat), or copy it.
      var text = "NCO Board app card issue\nCard ID: " + card.id + "\nSubject: " + (card.pub || "") + "\nQuestion: " + card.q + "\nListed answer: " + card.a +
        "\nReference: " + (card.ref || "") + "\n\nWhat's wrong / the correct answer (with the reference):\n";
      var gh = "https://github.com/" + REPO + "/issues/new?title=" + encodeURIComponent("Card issue: " + String(card.q || "").slice(0, 60)) + "&body=" + encodeURIComponent(text);
      if (navigator.share) { navigator.share({ title: "Card issue: " + card.id, text: text }).catch(function () {}); return; }
      var done = function () { App.toast("Report copied. Paste it to your sponsor, or on the GitHub page that just opened.", 4500); window.open(gh, "_blank"); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { window.open(gh, "_blank"); });
      else window.open(gh, "_blank");
    }
  };
  window.App = App;

  // storage.js emits this when the phone refuses to save (storage full / blocked)
  window.addEventListener("ncoboard:savefailed", function () {
    App.toast("Could not save your progress: phone storage may be full. Export a backup from More.", 5000);
  });

  backBtn.addEventListener("click", function () { if (history.length > 1) history.back(); else App.go("#/"); });

  // ---------------- install prompt (Android Chrome) ----------------
  var deferredPrompt = null, installBtn = document.getElementById("installBtn");
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredPrompt = e; installBtn.hidden = false; });
  installBtn.addEventListener("click", function () {
    if (!deferredPrompt) { App.toast("Android: Chrome menu → Install app. iPhone: Safari Share → Add to Home Screen.", 4500); return; }
    deferredPrompt.prompt(); deferredPrompt.userChoice.finally(function () { deferredPrompt = null; installBtn.hidden = true; });
  });
  window.addEventListener("appinstalled", function () { installBtn.hidden = true; });

  // ---------------- service worker ----------------
  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0)
    window.addEventListener("load", function () { navigator.serviceWorker.register("./sw.js").catch(function () {}); });

  // ---------------- go ----------------
  window.addEventListener("hashchange", route);
  route();
  hideSplash(900);   // long enough to read the version, short enough not to annoy
})();
