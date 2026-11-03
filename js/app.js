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
  if (!STUDY.pubs.some(function (p) { return p.id === "sgtdeck"; })) {
    STUDY.pubs.push({ id: "sgtdeck", code: "Sergeant scenarios", title: "Sergeant / team leader scenarios (SGT board)", cat: "Board Skills" });
    STUDY.pubs.push({ id: "ssgdeck", code: "Staff Sergeant scenarios", title: "Staff Sergeant / squad leader scenarios (SSG board)", cat: "Board Skills" });
  }
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
    { k: "secdef", label: "Secretary of War (Defense)", your: false },
    { k: "cjcs", label: "Chairman of the Joint Chiefs of Staff", your: false },
    { k: "potus", label: "Commander in Chief (the President)", your: false }
  ];

  // turn the filled-in roster into study cards (with sensible quiz distractors)
  var EXAMPLE_NAME = { teamleader: "e.g. SGT Diaz", squadleader: "e.g. SSG Lee", pltsgt: "e.g. SFC Moore", pltldr: "e.g. 2LT Patel", firstsgt: "e.g. 1SG Grant",
    cocdr: "e.g. CPT Ortiz", bncsm: "e.g. CSM Hall", bncdr: "e.g. LTC Brooks", bdecsm: "e.g. CSM Reed", bdecdr: "e.g. COL Kim", divcsm: "e.g. CSM Ward", divcdr: "e.g. MG Price",
    sma: "SGM of the Army", csa: "GEN ...", secarmy: "Secretary ...", secdef: "Secretary ...", cjcs: "GEN ...", potus: "President ..." };
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
      "Recommended": (Store.settings().boardFor === "SSG" ? "Congratulations, Staff Sergeant-to-be." : "Congratulations, Sergeant-to-be.") + " Your name goes on the promotion recommended list, and you're promoted when your promotion points meet the monthly cutoff score for your MOS. Keep your records and points current (new AFT, weapons, schools, college), and get ready for " + (Store.settings().boardFor === "SSG" ? "ALC" : "BLC") + ".",
      "Not recommended": "It happens to good Soldiers, and it isn't the end. Your first-line leader must counsel you in writing on what to improve, with a development plan, and keep counseling you at least every 3 months (AR 600-8-19, para 1-33). Ask the board's feedback, fix those areas, and go back better.",
      "Board postponed": "Use the extra time: set the new date in Settings and the plan will pace you to it." };
    if (br) { var r = br.split("|")[1] || ""; return '<div class="card"><div class="flash-tag">Your board result: ' + esc(r) + '</div><div class="muted">' + esc(AFTER[r] || "") + '</div>' +
      '<button class="btn ghost" id="brShare" style="margin-top:8px;">Share it with your sponsor</button></div>'; }
    return '<div class="card" style="border-color:var(--gold);"><div class="flash-tag">How did your board go?</div><div class="chip-row" id="brAsk">' +
      ["Recommended", "Not recommended", "Board postponed"].map(function (t) { return '<button class="chip" data-r="' + t + '">' + t + '</button>'; }).join("") + '</div>' +
      '<div class="muted" style="font-size:.85rem;margin-top:6px;">Saved on this phone only. You can choose to share it after.</div></div>';
  }
  function wireBoardResult(rs) {
    mount.querySelectorAll("#brAsk .chip").forEach(function (b) {
      b.addEventListener("click", function () { var t = new Date(); Store.setSetting("boardResult", t.toISOString().slice(0, 10) + "|" + b.getAttribute("data-r")); screenHome(); });
    });
    var sh = mount.querySelector("#brShare");
    if (sh) sh.addEventListener("click", function () {
      var br = Store.settings().boardResult.split("|"), boards = Store.quizzes().filter(function (q) { return /^Mock Board/.test(q.deck); }).length;
      var text = "My board result: " + br[1] + ". Board: " + (Store.settings().boardFor || "not set") + ". Board-ready score before the board: " + rs.ready + "%. Board Core cards studied: " + rs.seen + ". Mock Boards run: " + boards + ".";
      if (navigator.share) navigator.share({ title: "My board result", text: text }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { App.toast("Result copied", 3000); }, function () { App.toast(text, 6000); });
      else App.toast(text, 6000);
    });
  }

  // First run: ask which board before showing anything rank-specific
  function rankAsk() {
    if (Store.settings().boardFor) return "";
    return '<div class="card" style="border-color:var(--gold);"><div class="flash-tag">First, which board are you going to?</div>' +
      '<div class="muted" style="font-size:.85rem;margin-bottom:8px;">So the app only shows the numbers for your rank. You can change it in Settings.</div>' +
      '<div class="chip-row seg3" id="rankAsk"><button class="chip" data-r="SGT">SGT (E-5)</button><button class="chip" data-r="SSG">SSG (E-6)</button><button class="chip" data-r="BOTH">Not sure</button></div></div>';
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
    if (deck === "misses") { var want = (Store.chain()["last-misses"] || "").split(",").filter(Boolean); return all.filter(function (c) { return want.indexOf(c.id) >= 0; }); }
    // Top 100: the highest-yield Board Core cards, for a late start. Not-yet-studied and missed cards first.
    if (deck === "top") {
      var tops = all.filter(function (c) { return c.top; });
      var weakTop = tops.filter(function (c) { var r = Store.recOf(c.id); return !r || !(r.seen > 0) || r.reps === 0; });
      return weakTop.concat(tops.filter(function (c) { return weakTop.indexOf(c) < 0; }));
    }
    // Board Core: the tagged must-know cards, plus your own cards and chain-of-command roster
    if (deck === "core") return all.filter(function (c) { return c.core || c.custom; });
    // 10-minute review: up to 30 Board Core cards, the ones due (confident misses first) before new ones
    if (deck === "ten") {
      var coreT = all.filter(function (c) { return c.core && rankOk(c); }), nowT = Date.now();
      var dueT = coreT.filter(function (c) { return Store.isDue(c.id, nowT); }).sort(function (x, y) { var rx = Store.recOf(x.id), ry = Store.recOf(y.id); return ((ry.cw || 0) - (rx.cw || 0)) || (rx.due - ry.due); });
      var newT = coreT.filter(function (c) { var r = Store.recOf(c.id); return !r || !(r.seen > 0); });
      return dueT.concat(newT).slice(0, 30);
    }
    if (deck === "sgtdeck") return all.filter(function (c) { return c.rank === "SGT"; });
    if (deck === "ssgdeck") return all.filter(function (c) { return c.rank === "SSG"; });
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
    if (deck === "all") return "Everything (all subjects)";
    if (deck === "core") return "Board Core";
    if (deck === "final") return "Final-Week Review";
    if (deck === "top") return "Top 100 cards";
    if (deck === "misses") return "Your Mock Board misses";
    if (deck === "ten") return "10-minute review";
    if (deck === "due") return "Due for review";
    if (deck === "leeches") return "Cards you keep missing";
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
  var lastPlan = [], planExtras = "";
  // ---- today's session: run the plan in order; each finished screen offers the next step ----
  function startSession() {
    if (!lastPlan.length) return;
    try { sessionStorage.setItem("ncob-sess", JSON.stringify({ items: lastPlan, i: 0 })); } catch (e) {}
    App.go(lastPlan[0].href);
  }
  function sessionNextHtml() {
    var s; try { s = JSON.parse(sessionStorage.getItem("ncob-sess") || "null"); } catch (e) { s = null; }
    if (!s || !s.items || s.i >= s.items.length) return "";
    var cur = s.items[s.i];
    if (location.hash.indexOf(cur.href) !== 0) return "";
    s.i++; try { sessionStorage.setItem("ncob-sess", JSON.stringify(s)); } catch (e) {}
    if (s.i >= s.items.length) { try { sessionStorage.removeItem("ncob-sess"); } catch (e) {} return '<div class="card center" style="border-color:var(--gold);"><b>&#10003; Today&#39;s session is done.</b> <span class="muted">Nice work. Come back tomorrow.</span></div><div class="spacer"></div>'; }
    var nx = s.items[s.i];
    return '<button class="btn gold lg" data-sessnext="' + escAttr(nx.href) + '">Next in today&#39;s session: ' + esc(nx.label) + ' &#8594;</button><div class="spacer"></div>';
  }
  // while today's session runs, each step shows where you are in it
  function sessionBanner() {
    var s; try { s = JSON.parse(sessionStorage.getItem("ncob-sess") || "null"); } catch (e) { s = null; }
    if (!s || !s.items || s.i >= s.items.length || mount.querySelector(".sess-banner")) return;
    if (location.hash.indexOf(s.items[s.i].href) !== 0) return;
    var b = document.createElement("div"); b.className = "sess-banner";
    b.textContent = "Today\u2019s session \u2022 step " + (s.i + 1) + " of " + s.items.length;
    mount.insertBefore(b, mount.firstChild);
  }
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-sessnext]"); if (b) App.go(b.getAttribute("data-sessnext")); });
  // New cards a day to see all of Board Core a week before the board, capped at 20 so a late start stays doable.
  var NEW_CAP = 20;
  function pacePlan(unseen, days) {
    if (days == null || days <= 7 || !unseen) return { pace: 0, triage: false };
    var need = Math.ceil(unseen / Math.max(1, days - 7));
    return { pace: Math.min(need, NEW_CAP), triage: need > NEW_CAP, need: need, reach: NEW_CAP * (days - 7) };
  }
  function topLeft() { return STUDY.cards.filter(function (c) { return c.top && rankOk(c) && !seenOf(c.id); }).length; }
  function todayPlan(coreIds, dueN, leechN) {
    var days = daysToBoard(), items = [];
    var seenN = coreIds.filter(seenOf).length, unseen = coreIds.length - seenN, seenPct = coreIds.length ? seenN / coreIds.length : 0;
    var lateStart = days != null && days >= 2 && days <= 10 && seenPct < 0.5;
    var title = "Today's plan";
    if (days != null && days < 0) {
      var br = (Store.settings().boardResult || "").split("|")[1] || "";
      title = br === "Recommended" ? "Next steps after your board" : br === "Not recommended" ? "Your plan for the next board" : "After your board";
      if (br === "Not recommended") items.push('<a href="#/flash/leeches"><svg class=ic aria-hidden=true><use href=#i-alert></use></svg> Work on the cards you kept missing</a>', '<a href="#/board/core"><svg class=ic aria-hidden=true><use href=#i-users></use></svg> Run a Mock Board each week until your next board</a>');
      else if (br === "Recommended") items.push('<a href="#/points"><svg class=ic aria-hidden=true><use href=#i-chart></use></svg> Estimate your promotion points against the cutoff</a>', '<a href="#/pub/ar350-1"><svg class=ic aria-hidden=true><use href=#i-cap></use></svg> Get ready for ' + (Store.settings().boardFor === "SSG" ? "ALC" : "BLC") + ': NCO professional development (AR 350-1)</a>');
      items.push('<a href="#/settings"><svg class=ic aria-hidden=true><use href=#i-calendar></use></svg> Set your next board date</a>');
    } else if (days === 0) {
      title = "Board day: no new studying";
      items.push('<a href="#/reporting"><svg class=ic aria-hidden=true><use href=#i-flag></use></svg> Walk through reporting in, out loud</a>',
        '<a href="#/uniform"><svg class=ic aria-hidden=true><use href=#i-shirt></use></svg> Final uniform check</a>',
        '<a href="#/statement"><svg class=ic aria-hidden=true><use href=#i-quote></use></svg> Say your opening statement twice</a>',
        '<a href="#/board/core"><svg class=ic aria-hidden=true><use href=#i-coffee></use></svg> Optional warm-up: a short Mock Board (5 to 10 questions)</a>');
    } else if (days === 1) {
      title = "Tonight: light review, then sleep";
      items.push('<a href="#/flash/cram"><svg class=ic aria-hidden=true><use href=#i-moon></use></svg> Night-before cram: just your misses (about 20 minutes)</a>',
        '<a href="#/board/core"><svg class=ic aria-hidden=true><use href=#i-users></use></svg> Optional: one quick Mock Board (turn Full board off)</a>',
        '<a href="#/uniform"><svg class=ic aria-hidden=true><use href=#i-shirt></use></svg> Lay out and inspect your uniform</a>',
        '<a href="#/statement"><svg class=ic aria-hidden=true><use href=#i-quote></use></svg> Run your opening statement</a>');
    } else {
      if (lateStart) {
        var lp0 = window.Learn && Learn.nextBoardLesson ? Learn.nextBoardLesson() : null;
        if (lp0 && lp0.next && /^board101/.test(lp0.next.id)) items.push('<a href="#/lesson/' + escAttr(lp0.next.id) + '"><svg class=ic aria-hidden=true><use href=#i-book></use></svg> First, 5 minutes on what a board is: ' + esc(lp0.next.title.replace(/^.*:\s*/, "")) + '</a>');
        items.push('<a href="#/flash/top"><svg class=ic aria-hidden=true><use href=#i-target></use></svg> Top 100: the highest-yield Board Core cards first (late start)</a>');
      }
      else if (days != null && days >= 2 && days <= 7) items.push('<a href="#/flash/final"><svg class=ic aria-hidden=true><use href=#i-target></use></svg> Final-Week Review: your weakest Board Core cards first</a>');
      else {
        var lp = window.Learn && Learn.nextBoardLesson ? Learn.nextBoardLesson() : null;
        if (lp && lp.next) items.push('<a href="#/lesson/' + escAttr(lp.next.id) + '"><svg class=ic aria-hidden=true><use href=#i-book></use></svg> Lesson: ' + esc(lp.next.title.replace(/^.*:\s*/, "")) + '</a>');
        if (dueN > 0) items.push('<a href="#/flash/due"><svg class=ic aria-hidden=true><use href=#i-refresh></use></svg> Review ' + Math.min(dueN, 20) + (dueN > 20 ? ' of ' + dueN : '') + ' card' + (dueN > 1 ? "s" : "") + ' due today</a>');
        if (unseen) { var pp = pacePlan(unseen, days), tl = pp.triage ? topLeft() : 0;
          if (pp.triage && tl) items.push('<a href="#/flash/top"><svg class=ic aria-hidden=true><use href=#i-target></use></svg> Learn ' + pp.pace + ' new cards from the Top 100 first (' + tl + ' left)</a>');
          else items.push('<a href="#/flash/core"><svg class=ic aria-hidden=true><use href=#i-star></use></svg> ' + (pp.pace ? 'Learn ' + pp.pace + ' new Board Core cards' : 'New Board Core cards') + ' (' + unseen + ' left)</a>'); }
      }
      if (leechN > 0) items.push('<a href="#/flash/leeches"><svg class=ic aria-hidden=true><use href=#i-alert></use></svg> Practice ' + leechN + ' card' + (leechN > 1 ? "s" : "") + ' you keep missing</a>');
      items.push('<a href="#/board/core"><svg class=ic aria-hidden=true><use href=#i-users></use></svg> One Mock Board (the 5-minute one is fine on a busy day)</a>');
      // once a week, a real person: a sponsor board beats any app
      var weekAgo = Date.now() - 7 * 86400000;
      var sponsored = Store.quizzes().some(function (q) { return /with sponsor/.test(q.deck) && q.date > weekAgo; });
      if (!sponsored && (days == null || days > 7)) items.push('<a href="#/board/core"><svg class=ic aria-hidden=true><use href=#i-handshake></use></svg> This week: ask your sponsor to run a board with you (sponsor mode)</a>');
      var sentAt = +(Store.chain()["sent-progress"] || 0);
      if (sponsored && Date.now() - sentAt > 7 * 86400000 && (days == null || days > 1)) items.push('<a href="#/sendprogress"><svg class=ic aria-hidden=true><use href=#i-send></use></svg> Send your sponsor this week\u2019s progress</a>');
    }
    // remember today's plan for the one-button session (skip the sponsor/settings nudges)
    lastPlan = items.map(function (h) { var mm = h.match(/href="([^"]+)">([\s\S]*?)<\/a>/); return mm ? { href: mm[1], label: mm[2].replace(/<[^>]+>/g, "").replace(/&[#\w]+;/g, "").trim() } : null; })
      .filter(function (x) { return x && !/sponsor|sendprogress|settings/.test(x.href + x.label); });
    // style each item as a full-width button (default links are unreadable dark blue on this background)
    items = items.map(function (h) { return h.replace('<a href=', '<a class="btn ghost plan-item" href='); });
    var sponsorNote = items.some(function (h) { return /sponsor/.test(h); }) ? '<div class="muted" style="font-size:.85rem;margin-top:8px;">Your sponsor is the NCO who preps you, usually your first-line leader. <a href="#/pub/boardskills">More</a></div>' : '';
    var bk = (days === 0 || days === 1) ? STUDY.cards.filter(function (c) { return c.id === "bk-01"; })[0] : null;
    var blank = bk ? '<div class="card" style="margin:10px 0 0;border-color:var(--gold);"><div class="flash-tag">If you go blank or don&#39;t know</div><div style="font-size:1rem;">' + esc(bk.a) + '</div></div>' : '';
    var pp2 = pacePlan(unseen, days);
    var triageNote = (pp2.triage && days > 7) ? '<div class="muted" style="font-size:.85rem;margin-top:8px;">Short on time: at ' + NEW_CAP + ' a day you\u2019ll reach about ' + pp2.reach + ' of ' + unseen + ' new cards before board week. That\u2019s OK. Top 100 and the scenarios first; skip cards marked Advanced.</div>' : '';
    var remind = (!Store.settings().remindersAdded && (days == null || days > 1)) ? '<div style="margin-top:8px;font-size:.85rem;"><a href="#/settings"><svg class=ic aria-hidden=true><use href=#i-bell></use></svg> Add study reminders to my calendar</a></div>' : '';
    planExtras = (sponsorNote || remind) ? '<div class="card">' + sponsorNote.replace("margin-top:8px;", "") + remind + '</div>' : '';
    var startBtn = lastPlan.length >= 2 ? '<button class="btn gold lg" id="startSess" style="margin-top:8px;"><svg class=ic aria-hidden=true><use href=#i-play></use></svg> Start today&#39;s session</button>' +
      '<button class="home-link" id="tenMin" style="margin-top:4px;">Only have 10 minutes?</button>' : '';
    var inS = items.filter(function (h) { return !/sponsor|sendprogress|settings/.test(h); }), outS = items.filter(function (h) { return /sponsor|sendprogress|settings/.test(h); });
    var steps = '<div class="plan-steps">' + inS.map(function (h, k) { return h.replace('plan-item" href=', 'plan-item" data-n="' + (k + 1) + '" href='); }).join("") + '</div>' +
      (outS.length ? '<div class="lg-h" style="margin-top:10px;">Also this week</div><div class="plan-steps">' + outS.join("") + '</div>' : '');
    return '<div class="card"><div class="flash-tag">' + esc(title) + '</div>' + startBtn +
      (startBtn ? '<details class="plan-more"><summary>See today\u2019s steps</summary>' + steps + '</details>' : steps) + blank + triageNote + '</div>';
  }
  // "Ready?" check: based on what you actually REMEMBERED (last grade was a hit), plus recent Mock Boards.
  // Cards merely seen don't count. Shows the weakest subjects by misses.
  function readyScore(coreIds) {
    var seen = 0, recalled = 0, lapsesByPub = {};
    var pubOf = {}; STUDY.cards.forEach(function (c) { if (c.core) pubOf[c.id] = c.pub; });
    coreIds.forEach(function (id) { var r = Store.recOf(id); if (r && r.seen > 0) { seen++; if (r.reps > 0) recalled++; if (r.lapses) lapsesByPub[pubOf[id]] = (lapsesByPub[pubOf[id]] || 0) + r.lapses; } });
    var boards = Store.quizzes().filter(function (q) { return /^Mock Board/.test(q.deck) && q.total; }).slice(0, 3);
    var wsum = 0, wtot = 0;
    boards.forEach(function (q) { var w = /with sponsor/.test(q.deck) ? 2 : 1; wsum += w * q.score / q.total; wtot += w; });   // a sponsor's grading counts double
    var mockAvg = boards.length ? Math.round(100 * wsum / wtot) : null;
    var recallPct = coreIds.length ? Math.round(100 * recalled / coreIds.length) : 0;
    // Mock Board scores only count in proportion to how much of Board Core you've covered (acing 10 cards isn't readiness).
    var coverage = Math.min(1, seen / (0.5 * Math.max(1, coreIds.length)));
    var boardWeight = Math.min(1, boards.length / 3);   // one great board shouldn't swing the score
    var ready = Math.round(0.6 * recallPct + 0.4 * (mockAvg == null ? 0 : mockAvg) * coverage * boardWeight);
    var weak = Object.keys(lapsesByPub).sort(function (a, b) { return lapsesByPub[b] - lapsesByPub[a]; }).slice(0, 3)
      .map(function (k) { var p = STUDY.pubsById[k]; return p ? (p.code === p.title ? p.code : p.title) : k; });
    return { ready: ready, seen: seen, recalled: recalled, mockAvg: mockAvg, weak: weak };
  }
  // The "how it's figured" card under the plan. The one number lives in the hero at the top of Home.
  function readyCheck(coreIds, rs) {
    var dd = daysToBoard(); if (!rs.seen || dd === 0 || dd === 1) return "";
    if (dd != null && dd < 0 && /Recommended$/.test(Store.settings().boardResult || "") && !/Not recommended/.test(Store.settings().boardResult)) return "";
    return '<div class="card">' + (rs.weak.length ? '<div class="flash-tag">Work on</div><div style="font-weight:600;">' + esc(rs.weak.join(", ")) + '</div>' : '<div class="flash-tag">Your score</div>') +
      '<details style="margin-top:6px;"><summary class="muted" style="font-size:.85rem;">How is board-ready figured?</summary><div class="muted" style="font-size:.85rem;margin-top:4px;">60% Board Core cards you got right last time (' + rs.recalled + ' of ' + coreIds.length + ') + 40% your last 3 Mock Boards (' +
      (rs.mockAvg == null ? 'none yet' : rs.mockAvg + '%') + '). The Mock Board part counts fully once you have run 3 boards and covered half of Board Core.</div></details></div>';
  }

  // Board-date countdown + a simple daily pace for Board Core (set the date under More > Settings).
  function boardCountdown(coreIds) {
    var bd = Store.settings().boardDate;
    if (!bd) return '<a class="row" href="#/settings"><div class="grow"><div class="code"><svg class=ic aria-hidden=true><use href=#i-calendar></use></svg> Set your board date</div>' +
      '<div class="ttl">Get a countdown and a daily study pace</div></div><div class="chev" aria-hidden="true"><svg class=ic aria-hidden=true><use href=#i-chev></use></svg></div></a>';
    var days = daysToBoard();
    var unseen = coreIds.filter(function (id) { return !seenOf(id); }).length;
    var head, tip;
    if (days < 0) { head = "Your board date has passed"; tip = Store.settings().boardResult ? "Result saved. Set a new date in Settings if you have another board." : "How did it go? Tell the app below, then set a new date in Settings if you have another board."; }
    else if (days === 0) {
      head = "Board day";
      var seenPct = coreIds.length ? Math.round(100 * (coreIds.length - unseen) / coreIds.length) : 0;
      tip = "Check your uniform, practice reporting in, and walk in calm. No cramming today." + (seenPct >= 80 ? " Trust your preparation." : "");
    }
    else if (days === 1) { head = "Board tomorrow"; tip = "Tonight: lay out your uniform, do the cram cards (about 20 minutes), then get a full night's sleep."; }
    else if (days <= 10 && unseen > coreIds.length / 2) { head = "Board in " + days + " days"; tip = "Late start? Don't try to see everything. Drill the Top 100 highest-yield cards and run a Mock Board every day."; }
    else if (days <= 7) { head = "Board in " + days + " days"; tip = "Board week: run a Mock Board every day and do the Final-Week Review (your weakest Board Core cards first)."; }
    else {
      head = "Board in " + days + " days";
      var pc = pacePlan(unseen, days), perDay = pc.pace;   // leave the final week for review + mock boards
      tip = unseen ? (pc.triage ? "Learn " + perDay + " new cards a day, highest-yield first. You won't see every card, and that's OK." :
        "Learn about " + perDay + " new Board Core card" + (perDay > 1 ? "s" : "") + " a day to see all " + coreIds.length + " with a week to spare.") :
        "You've seen every Board Core card. Keep up your reviews and run Mock Boards.";
    }
    return '<a class="row board-row" href="' + (days >= 0 && days <= 7 ? "#/boardday" : "#/settings") + '"><div class="grow"><div class="code"><svg class=ic aria-hidden=true><use href=#i-calendar></use></svg> ' + esc(head) + '</div>' +
      '<div class="ttl">' + esc(tip) + '</div></div><div class="chev" aria-hidden="true"><svg class=ic aria-hidden=true><use href=#i-chev></use></svg></div></a>';
  }

  // Home = five things: where you stand, what to do today, the four tools, board-day prep, your week.
  function screenHome() {
    setTitle("NCO Board", false);
    var all = allCards();
    var ids = all.map(function (c) { return c.id; });
    var daily = Store.daily(), streak = Store.streak(), dueN = Store.dueCount(ids);
    var coreIds = STUDY.cards.filter(function (c) { return c.core && rankOk(c); }).map(function (c) { return c.id; });
    var rs = readyScore(coreIds), dToB = daysToBoard(), calm = dToB === 0 || dToB === 1;
    // today's target = the plan (reviews due + paced new cards), never less than the daily goal
    var unseenN = coreIds.length - rs.seen, paceN = pacePlan(unseenN, dToB).pace;
    var dayTarget = Math.max(daily.goal, Math.min(dueN, 20) + paceN);
    var recommended = dToB != null && dToB < 0 && /\|Recommended$/.test(Store.settings().boardResult || "");

    // 1) where you stand
    var notRec = dToB != null && dToB < 0 && /\|Not recommended$/.test(Store.settings().boardResult || "");
    var head = notRec ? '<div class="big" style="font-size:1.6rem;">Next board: you\u2019ve got this</div><div class="sub">Your plan for the next board is below. Board-ready now: ' + rs.ready + '%.</div>' : recommended ? '<div class="big" style="font-size:1.6rem;">Board result: Recommended</div><div class="sub">Keep your records and points current while you wait for the cutoff.</div>'
      : calm ? '<div class="big" style="font-size:1.6rem;">' + (dToB === 0 ? "Board day" : "Board tomorrow") + '</div><div class="sub">' + rs.seen + ' Board Core card' + (rs.seen === 1 ? '' : 's') + ' studied. Stay calm and report in sharp.</div>'
      : (rs.seen === 0 && !streak) ? '<div class="big" style="font-size:1.6rem;">Welcome</div><div class="sub">Your board-ready score starts with your first cards.</div>'
      : '<div class="big">' + rs.ready + '%</div><div class="sub">board-ready</div>';
    var freshBadges = checkBadges(coreIds, rs);
    var html = rankAsk() +
      '<div class="hero">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-end;"><div>' + head + '</div>' +
          (streak ? '' : '<!--') + '<div style="text-align:right;white-space:nowrap;"><div style="font-size:1.6rem;font-weight:800;"><svg class=ic aria-hidden=true><use href=#i-flame></use></svg> ' + streak + '</div><div class="sub">day streak' + (Store.saverUsed() && Date.now() - Store.saverUsed() < 2 * 86400000 ? ' (1 missed day forgiven)' : '') + '</div></div>' + (streak ? '' : '-->') + '</div>' +
        (calm || recommended || notRec ? '' : (rs.seen === 0 && !streak ? '' : '<div class="bar"><span style="width:' + rs.ready + '%"></span></div>') +
          '<div class="sub" style="margin-top:6px;font-size:.85rem;">' + (dToB != null && dToB > 7 ? 'Board in ' + dToB + ' days \u2022 ' : '') + (daily.count >= dayTarget ? 'Today\u2019s cards done &#10003;' : 'Today: ' + daily.count + ' of ' + dayTarget + ' cards') + '</div>' +
          '<details class="hero-more"><summary class="sub">' + (rs.weak.length ? 'Work on: ' + esc(rs.weak[0]) + (rs.weak.length > 1 ? ' +' + (rs.weak.length - 1) : '') : 'How your score works') + '</summary>' +
          (function () {
            var q = Store.quizzes(), sp = q.filter(function (x) { return /with sponsor/.test(x.deck) && x.total; })[0], me = q.filter(function (x) { return /^Mock Board/.test(x.deck) && !/with sponsor/.test(x.deck) && x.total; }).slice(0, 5);
            if (!sp || !me.length) return '';
            var gap = Math.round(me.reduce(function (s, x) { return s + 100 * x.score / x.total; }, 0) / me.length - 100 * sp.score / sp.total);
            return gap >= 10 ? '<div class="sub" style="margin-top:4px;font-size:.85rem;">You grade yourself about ' + gap + ' points higher than your sponsor does. Tick only what you said out loud.</div>' : '';
          })() +
          (rs.mockAvg == null && rs.seen >= 30 ? '<div class="sub" style="margin-top:4px;font-size:.85rem;">No Mock Boards yet: they are 40% of this score. <a href="#/board/core" style="color:inherit;text-decoration:underline;">Run one</a> to raise it.</div>' : '') +
          (rs.weak.length > 1 ? '<div class="sub" style="margin-top:4px;font-size:.85rem;">Also: <b>' + esc(rs.weak.slice(1).join(", ")) + '</b></div>' : '') +
          (dayTarget > daily.goal ? '<div class="sub" style="margin-top:4px;font-size:.85rem;">Today&#39;s ' + dayTarget + ' cards = reviews due + new cards to stay on pace' + (dToB != null && dToB > 0 ? ' for your board' : '') + '. Your minimum goal is ' + daily.goal + '.</div>' : '') +
          (rs.seen ? '<div class="sub" style="font-size:.85rem;margin-top:6px;">Board Core studied: ' + rs.seen + ' of ' + coreIds.length + '.<br><b>How it\u2019s figured:</b> 60% Board Core cards you got right last time (' + rs.recalled + ' of ' + coreIds.length + ') + 40% your last 3 Mock Boards (' + (rs.mockAvg == null ? 'none yet' : rs.mockAvg + '%') + '), counted fully once you have 3 Mock Boards and have covered half of Board Core.</div>' : '') + '</details>') +
      '</div>' +
      ((/iPhone|iPad|iPod/.test(navigator.userAgent) && !navigator.standalone && !Store.settings().iosTipDone) ? '<div class="card" id="iosTip" style="border-color:var(--gold);"><div class="flash-tag">Put it on your home screen</div><div style="font-size:1rem;">In Safari, tap Share (the square with the arrow), then <b>Add to Home Screen</b>, then <b>Add</b>. It opens like an app and works offline.</div><button class="btn ghost" id="iosOk" style="margin-top:8px;">Got it</button></div>' : '') +
      (dToB != null && dToB > 7 || !Store.settings().boardFor ? '' : boardCountdown(coreIds)) + boardResultAsk(rs) +
      // 2) what to do today (one list; board-week extras are folded in)
      todayPlan(coreIds, dueN, Store.leeches(ids).length) +
      // 3) the four tools
      '<div class="tool-grid">' +
        '<a class="btn gold" href="#/pick/flash"><span class="ic"><svg class=ic aria-hidden=true><use href=#i-cards></use></svg></span> Flashcards</a>' +
        '<a class="btn green" href="#/pick/quiz"><span class="ic"><svg class=ic aria-hidden=true><use href=#i-check></use></svg></span> Quiz</a>' +
        '<a class="btn board-btn" href="#/board/core"><span class="ic"><svg class=ic aria-hidden=true><use href=#i-users></use></svg></span> Mock Board</a>' +
        '<a class="btn drive-btn" href="#/pick/drive"><span class="ic"><svg class=ic aria-hidden=true><use href=#i-headphones></use></svg></span> Drive Mode</a>' +
      '</div>' +
      // 4) everything else, in one short list
      // 4) new badges and board week stay in view; the rest folds into one row
      (freshBadges.length || (dToB != null && dToB >= 0 && dToB <= 7) ? group("", (dToB != null && dToB >= 0 && dToB <= 7 ? [li("#/boardday", "<svg class=ic aria-hidden=true><use href=#i-clipboard></use></svg>", "Board Day Prep", "Room, reporting, uniform, records, your memo")] : [])
        .concat(freshBadges.length ? [li("#/badges", "<svg class=ic aria-hidden=true><use href=#i-medal></use></svg>", "New badge" + (freshBadges.length > 1 ? "s" : ""), esc(freshBadges.length > 2 ? freshBadges.slice(0, 2).join(", ") + " and " + (freshBadges.length - 2) + " more" : freshBadges.join(" and ")))] : [])) : '') +
      '<details class="set-fold home-more"><summary>More: your week, board prep, subjects</summary>' + weeklyRecap() +
      group("", (dToB != null && dToB >= 0 && dToB <= 7 ? [] : [li("#/boardday", "<svg class=ic aria-hidden=true><use href=#i-clipboard></use></svg>", "Board Day Prep", "Room, reporting, uniform, records, your memo")]).concat([li("#/browse", "<svg class=ic aria-hidden=true><use href=#i-books></use></svg>", "All subjects", "Every publication and topic")])
        .concat(!Store.settings().remindersAdded && (dToB == null || dToB > 1) ? [li("#/settings", "<svg class=ic aria-hidden=true><use href=#i-bell></use></svg>", "Study reminders", "Add them to your calendar")] : [])) + '</details>';
    mount.innerHTML = html;
    wireBoardResult(rs);
    var ss0 = mount.querySelector("#startSess"); if (ss0) ss0.addEventListener("click", startSession);
    var tm0 = mount.querySelector("#tenMin"); if (tm0) tm0.addEventListener("click", function () {
      lastPlan = [{ href: "#/flash/ten", label: "10-minute review" }, { href: "#/board/core", label: "if you have 5 more minutes: a 5-minute Mock Board" }];
      startSession();
    });
    var iok = mount.querySelector("#iosOk"); if (iok) iok.addEventListener("click", function () { Store.setSetting("iosTipDone", true); mount.querySelector("#iosTip").remove(); });
    mount.querySelectorAll("#rankAsk .chip").forEach(function (b) {
      b.addEventListener("click", function () { Store.setSetting("boardFor", b.getAttribute("data-r")); screenHome(); });
    });
  }

  function screenBrowse() {
    setTitle("Browse", true);
    var html = "", cats = {};
    STUDY.pubs.forEach(function (p) {
      if ((p.id === "mine" || p.id === "chain" || p.id === "sgtdeck" || p.id === "ssgdeck") && !cardsForDeck(p.id).length) return;
      (cats[p.cat] = cats[p.cat] || []).push(p);
    });
    html += jumpChips(Object.keys(cats));
    Object.keys(cats).forEach(function (cat, k) {
      html += group(esc(cat), cats[cat].map(function (p) { return liDeck("#/pub/" + p.id, esc(p.code), p.code === p.title ? "" : esc(p.title), cardsForDeck(p.id).length, ""); }), "cat" + k);
    });
    mount.innerHTML = html; wireJumps();
  }

  function screenPub(id) {
    var p = STUDY.pubsById[id];
    if (!p) return screenHome();
    setTitle(p.code, true);
    var pc = cardsForDeck(id), ids = pc.map(function (c) { return c.id; });
    var m = Math.round(Store.mastery(ids) * 100), counts = Store.counts(ids);
    mount.innerHTML =
      '<div class="hero">' + (p.title !== p.code ? '<div style="font-size:1.15rem;font-weight:700;margin:0 0 4px;">' + esc(p.title) + '</div>' : '') +
        '<div class="sub">' + pc.length + ' cards • ' + m + '% mastered</div>' +
        '<div class="bar"><span style="width:' + m + '%"></span></div></div>' +
      '<a class="btn gold lg" href="#/flash/' + id + '"><svg class=ic aria-hidden=true><use href=#i-cards></use></svg> Study with flashcards</a>' +
      group("", [(pc.filter(function (c) { return !c.flashOnly && ((c.choices && c.choices.length >= 2) || (c.a && String(c.a).length <= 90)); }).length >= 4 ? li("#/quiz/" + id, "<svg class=ic aria-hidden=true><use href=#i-check></use></svg>", "Quiz", "Multiple choice on this subject") : ''), li("#/board/" + id, "<svg class=ic aria-hidden=true><use href=#i-users></use></svg>", "Mock Board", "Answer out loud, like the real board"), li("#/read/" + id, "<svg class=ic aria-hidden=true><use href=#i-book></use></svg>", "Read all " + pc.length + " cards", "One long list, Board Core first")].filter(Boolean)) +
      '<h2 class="section">Your progress here</h2><div class="stat3"><div><b>' + counts.known + '</b><span>known</span></div><div><b>' + counts.review + '</b><span>to review</span></div><div><b>' + counts.new + '</b><span>new</span></div></div>';
  }

  // ---- read every card in a subject as a list (for reading, not drilling) ----
  function screenRead(id, focus) {
    var p = STUDY.pubsById[id]; if (!p) return screenHome();
    setTitle(p.code, true);
    var pc = cardsForDeck(id).slice().sort(function (x, y) { return (y.core ? 1 : 0) - (x.core ? 1 : 0); }), shownCoreH = false, shownMoreH = false;
    mount.innerHTML = '<div class="card"><div class="muted">All ' + pc.length + ' cards in ' + esc(p.title) + ', Board Core first. Reading helps you learn it; saying the answer before you look (Flashcards) helps you remember it.</div></div>' +
      pc.map(function (c) { return (c.core && !shownCoreH ? (shownCoreH = true, '<div class="lg-h">Board Core</div>') : !c.core && !shownMoreH ? (shownMoreH = true, '<div class="lg-h">More detail</div>') : '') + '<div class="card" data-cid="' + escAttr(c.id) + '"><div style="font-weight:600;">' + esc(c.q) + '</div>' +
        '<div style="margin-top:6px;">' + esc(c.a).replace(/\n/g, "<br>") + '</div>' + (c.changed ? '<div class="flash-ref" style="color:var(--gold);"><svg class=ic aria-hidden=true><use href=#i-alert></use></svg> ' + esc(c.changed) + '</div>' : '') +
        (c.ref ? '<div class="flash-ref">' + esc(c.ref) + '</div>' : '') + '</div>'; }).join("");
    if (focus) { var fc = mount.querySelector('[data-cid="' + String(focus).replace(/"/g, "") + '"]'); if (fc) { fc.classList.add("focus-card"); setTimeout(function () { fc.scrollIntoView({ block: "center" }); }, 30); } }
  }

  function screenPick(mode) {
    var titles = { flash: "Flashcards", quiz: "Quiz", board: "Mock Board", drive: "Drive Mode" };
    var routes = { flash: "#/flash/", quiz: "#/quiz/", board: "#/board/", drive: "#/drive/" };
    setTitle(titles[mode] || "Pick", true);
    var route = routes[mode] || "#/flash/";
    var html = '<h2 class="section" style="margin-top:2px;">Pick a subject</h2>';
    if (mode === "flash")
      html += '<div class="chip-row" id="modeToggle" style="margin-bottom:12px;">' +
        '<button class="chip on" data-r="#/flash/" aria-pressed="true"><svg class=ic aria-hidden=true><use href=#i-cards></use></svg> Flip cards</button>' +
        '<button class="chip" data-r="#/type/" aria-pressed="false"><svg class=ic aria-hidden=true><use href=#i-keyboard></use></svg> Type answers</button></div>' +
        '<div class="muted" style="font-size:.85rem;margin:0 4px 8px;">Flip cards: tap to see the answer. Type answers: write it first, then check.</div>';
    if (mode === "drive")
      html += '<div class="card"><div class="muted">Hands-free: the app reads each question, pauses for you to answer aloud, then reads the answer. Great for PT or the drive in — keep the screen on.</div></div>';
    var quizOk = function (c) { return !c.flashOnly && ((c.choices && c.choices.length >= 2) || (c.a && String(c.a).length <= 90)); };
    var cnt = function (cs) { var n = mode === "quiz" ? cs.filter(quizOk).length : mode === "drive" ? (Store.buildQueue(cs).length || cs.length) : cs.length; return n ? n + (mode === "quiz" ? " Qs" : mode === "drive" ? " to play" : "") : 0; };
    html += '<div class="muted" style="font-size:.85rem;margin:0 4px 8px;">' + (mode === "quiz" ? "Numbers are quiz questions (cards with a short answer)." : mode === "drive" ? "Numbers are cards due or new for you today." : "Numbers are cards in each set.") + '</div>';
    html += '<div class="lg pick-top">' + liDeck(route + "core", "<svg class=ic aria-hidden=true><use href=#i-star></use></svg> Board Core", "Recommended: the must-know questions boards ask most", cnt(cardsForDeck("core")), "core") +
      liDeck(route + "all", "Everything", "All subjects, including deep detail", cnt(cardsForDeck("all")), "all") + '</div>';
    var pcats = {};
    STUDY.pubs.forEach(function (p) {
      var n = cnt(cardsForDeck(p.id));
      if (!n) return;
      (pcats[p.cat] = pcats[p.cat] || []).push(liDeck(route + p.id, esc(p.code), p.code === p.title ? "" : esc(p.title), n, p.id));
    });
    html += '<details class="set-fold"><summary>Or pick one subject</summary>';
    Object.keys(pcats).forEach(function (cat) { html += group(esc(cat), pcats[cat]); });
    html += '</details>';
    mount.innerHTML = html;
    if (mode === "flash")
      mount.querySelectorAll("#modeToggle .chip").forEach(function (b) {
        b.addEventListener("click", function () {
          mount.querySelectorAll("#modeToggle .chip").forEach(function (x) { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); });
          b.setAttribute("aria-pressed", "true");
          b.classList.add("on");
          var pre = b.getAttribute("data-r");
          mount.querySelectorAll(".deck").forEach(function (r) { r.setAttribute("href", pre + r.getAttribute("data-deck")); });
        });
      });
  }

  function screenDrive(deck) { setTitle("Drive Mode", true); Drive.render(mount, cardsForDeck(deck), deckTitle(deck)); }
  function screenType(deck) { setTitle("Type answers", true); Flashcards.render(mount, cardsForDeck(deck), deckTitle(deck), { typed: true }); }

  function screenLearn() { setTitle("Learn", false); Learn.hub(mount); }
  function screenTrack(id) { var TT = { board101: "Board 101", fundamentals: "Fundamentals", core: "Board Core", sit: "Scenarios", personal: "Personal Questions" }; var p = STUDY.pubsById[id]; setTitle(TT[id] || (p ? p.code : "Learn"), true); Learn.track(mount, id); }
  function screenLesson(id) { var tr = String(id).split("-")[0]; var TT = { board101: "Board 101", fundamentals: "Fundamentals", core: "Board Core", sit: "Scenarios", personal: "Personal Questions" }; var p = STUDY.pubsById[tr]; setTitle(TT[tr] || (p ? p.code : "Lesson"), true); Learn.lesson(mount, id); }

  function screenFlash(deck) {
    setTitle(deckTitle(deck), true);
    // Top 100 and Final-Week Review are meant to be done whole: no 30-new-card session cap
    Flashcards.render(mount, cardsForDeck(deck), deckTitle(deck), (deck === "top" || deck === "final" || deck === "ten") ? { noCap: true } : undefined);
  }

  function screenQuiz(deck) {
    setTitle("Quiz", true);
    var cards = cardsForDeck(deck), title = deckTitle(deck);
    // same rule quiz.js uses: long-answer and flash-only cards are not quizzed
    var quizN = cards.filter(function (c) { return !c.flashOnly && ((c.choices && c.choices.length >= 2) || (c.a && String(c.a).length <= 90)); }).length;
    mount.innerHTML =
      '<div class="setup-head"><div class="t"><svg class=ic aria-hidden=true><use href=#i-check></use></svg> ' + esc(title) + '</div><div class="muted">' + quizN + ' quiz questions</div></div>' +
      '<button class="btn gold lg" data-n="10"><svg class=ic aria-hidden=true><use href=#i-play></use></svg> Start 10 questions</button>' +
      '<div class="len-row" style="grid-template-columns:1fr 1fr;margin-top:10px;"><button class="chip" data-n="20">20 questions</button><button class="chip" data-n="999">All ' + quizN + '</button></div>' +
      (function () {
        var past = Store.quizzes().filter(function (x) { return x.deck === title && x.total; }).slice(0, 3);
        return '<h2 class="section">What&#39;s in this quiz</h2><div class="card"><div class="muted" style="font-size:.92rem;">' + quizN + ' of the ' + cards.length + ' cards in ' + esc(title) + ' have a short answer you can pick from four choices. Long answers (creeds, scenarios) stay in Flashcards and the Mock Board.</div></div>' +
          (past.length ? '<h2 class="section">Your last quizzes here</h2><div class="lg">' + past.map(function (x) { var p = Math.round(100 * x.score / x.total); return '<div class="li"><span class="grow"><span class="t">' + niceDate(x.date) + '</span></span><b style="color:' + (p >= 75 ? 'var(--good)' : 'var(--gold)') + ';">' + p + '%</b></div>'; }).join("") + '</div>' : '');
      })();
    mount.querySelectorAll("[data-n]").forEach(function (b) {
      b.addEventListener("click", function () { Quiz.render(mount, cards, title, parseInt(b.getAttribute("data-n"), 10)); });
    });
  }

  function screenBoard(deck) {
    setTitle("Mock Board", true);
    var cards = cardsForDeck(deck), title = deckTitle(deck);
    var timer = Store.settings().timer;
    mount.innerHTML =
      '<div class="setup-head"><div class="t"><svg class=ic aria-hidden=true><use href=#i-users></use></svg> ' + esc(title) + '</div><div class="muted">Answer out loud, like the real board</div></div>' +
      '<div class="lg opts">' +
        '<a class="li" href="#/settings/timer"><span class="grow"><span class="t">Timer: ' + (timer > 0 ? timer + ' seconds a question' : 'off') + '</span><span class="s">' + (timer > 0 ? 'Double for long answers and scenarios' : 'Answer at your own pace') + '</span></span><span class="pill">Change</span></a>' +
        '<label class="switch li"><input type="checkbox" id="fullBoard"' + (Store.settings().fullBoard !== false ? " checked" : "") + '> <span class="grow"><span class="t">Full board</span><span class="s">Report in, drill, introduce yourself</span></span></label>' +
        (window.speechSynthesis ? '<label class="switch li"><input type="checkbox" id="listenOnly"' + (Store.settings().listenOnly ? " checked" : "") + '> <span class="grow"><span class="t">Listen-only</span><span class="s">Hear each question, don\u2019t read it</span></span></label>' : '') +
        '<label class="switch li"><input type="checkbox" id="sponsorMode"> <span class="grow"><span class="t">Sponsor holds this phone</span><span class="s">They read, see the answer, and grade you</span></span></label>' +
      '</div>' +
      '<button class="btn gold lg" data-n="10"><svg class=ic aria-hidden=true><use href=#i-play></use></svg> Start a 10-question board</button>' +
      '<div class="muted center" style="font-size:.85rem;margin:6px 0 10px;" id="lenNote"></div>' +
      '<div class="lg-h" style="margin-top:2px;">Other lengths</div><div class="len-row"><button class="chip" data-n="5" data-quick="1"><b>5</b><small>quick</small></button><button class="chip" data-n="15"><b>15</b><small>longer</small></button><button class="chip" data-n="25"><b>25</b><small>full-length</small></button></div>' +
      (/^(core|top|final)$/.test(deck) ? '<details class="set-fold" style="margin-top:14px;"><summary>Send or print a board for your sponsor</summary>' +
        '<button class="btn ghost" id="sendSponsor" style="margin-top:8px;"><svg class=ic aria-hidden=true><use href=#i-send></use></svg> Send a board to my sponsor</button>' +
        '<div class="muted center" style="font-size:.85rem;margin:6px 0;">They open the link and run the same board on their phone, with the answers and checklists.</div>' +
        '<button class="btn ghost" id="printSheet"><svg class=ic aria-hidden=true><use href=#i-print></use></svg> Print a paper board instead</button></details>' : '');
    var lenNote = function () { mount.querySelector("#lenNote").textContent = mount.querySelector("#fullBoard").checked ? "Full board, 10 questions: about 15 to 20 minutes. On a bus? Turn Full board off." : "Questions only: about 5 to 8 minutes for 10."; };
    mount.querySelector("#fullBoard").addEventListener("change", lenNote); lenNote();
    var ps = mount.querySelector("#printSheet");
    if (ps) ps.addEventListener("click", function () { App.go("#/sheet/" + MockBoard.drawIds(cards, 10).join(",")); });
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
        var quick = b.getAttribute("data-quick") === "1";
        var full = !quick && mount.querySelector("#fullBoard").checked, sponsor = mount.querySelector("#sponsorMode").checked;
        if (!quick) Store.setSetting("fullBoard", full);
        var lo = mount.querySelector("#listenOnly"), listen = !!(lo && lo.checked); Store.setSetting("listenOnly", listen);
        MockBoard.render(mount, cards, parseInt(b.getAttribute("data-n"), 10), { full: full, sponsor: sponsor, quick: quick, listen: listen });
      });
    });
  }

  function screenSearch() {
    setTitle("Search", true);
    mount.innerHTML = '<div class="search-wrap"><span class="search-ic" aria-hidden="true"><svg class=ic aria-hidden=true><use href=#i-search></use></svg></span><input class="input" id="q" type="search" aria-label="Search questions and answers" placeholder="Search questions & answers..." autocomplete="off" /><button class="search-x" id="qx" aria-label="Clear search" hidden>&#10005;</button></div><div id="results" class="spacer" aria-live="polite"></div>';
    var input = mount.querySelector("#q"), results = mount.querySelector("#results");
    function run() {
      var term = input.value.trim().toLowerCase();
      mount.querySelector("#qx").hidden = !input.value;
      try { sessionStorage.setItem("ncob-q", input.value); } catch (e) {}
      if (term.length < 2) { results.innerHTML = '<div class="muted" style="font-size:.85rem;margin:10px 4px 6px;">Try one of these:</div>' + tryChips(); return; }
      var all = allCards().filter(function (c) {
        return (c.q + " " + c.a + " " + (c.topic || "")).toLowerCase().indexOf(term) >= 0;
      });
      // best matches first: the word in the topic or subject name, then in the question, then Board Core
      var safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), rx = new RegExp("\\b" + safe, "i");
      var rank = function (c) { var p = STUDY.pubsById[c.pub] || {}; return (rx.test((c.topic || "") + " " + (p.code || "") + " " + (p.title || "")) ? 4 : 0) + (rx.test(c.q) ? 2 : 0) + (c.core ? 1 : 0); };
      all.sort(function (a, b) { return rank(b) - rank(a); });
      var hits = all.slice(0, 80);
      var note = all.length > hits.length ? '<div class="muted center" style="margin-bottom:8px;">Showing the first 80 of ' + all.length + ' matches. Type more to narrow it down.</div>' : '';
      var hl = function (s) { return esc(s).replace(new RegExp("(" + safe + ")", "ig"), "<mark>$1</mark>"); };
      results.innerHTML = hits.length ? '<div class="muted" style="font-size:.85rem;margin:4px 4px 8px;">' + all.length + ' result' + (all.length === 1 ? '' : 's') + '</div>' + note + hits.map(function (c) {
        var p = STUDY.pubsById[c.pub];
        return '<a class="card" style="display:block;text-decoration:none;color:inherit;" href="#/read/' + escAttr(c.pub) + '/' + escAttr(c.id) + '"><div class="flash-tag tag-row">' + esc(p ? p.code : "") + (c.topic ? " • " + esc(c.topic) : "") + (c.core ? '<span class="pill core-pill inline">Core</span>' : '') + '</div>' +
          '<div style="font-weight:600;margin-bottom:6px;">' + hl(c.q) + '</div><div class="muted">' + hl(c.a) + '</div><div class="open-hint">Open in ' + esc(p ? p.code : "its subject") + ' <svg class=ic aria-hidden=true><use href=#i-chev></use></svg></div></a>';
      }).join("") : '<div class="empty">No matches. Try a shorter word, or one of these:</div>' + tryChips();
    }
    try { var q0 = sessionStorage.getItem("ncob-q"); if (q0) input.value = q0; } catch (e) {}
    function tryChips() { return '<div class="chip-row">' + ["SHARP", "AFT", "hazing", "counseling", "NCOER", "Article 15", "waist-to-height", "kratom", "land navigation", "Army Values"].map(function (w) { return '<button class="chip" data-try="' + w + '">' + w + '</button>'; }).join("") + '</div>'; }
    results.addEventListener("click", function (e) { var b = e.target.closest("[data-try]"); if (b) { input.value = b.getAttribute("data-try"); run(); } });
    mount.querySelector("#qx").addEventListener("click", function () { input.value = ""; run(); input.focus(); });
    results.addEventListener("click", function (e) { if (e.target.closest("a.card")) try { sessionStorage.setItem("ncob-qy", String(window.scrollY)); } catch (x) {} });
    input.addEventListener("input", run); run();
    var y0 = 0; try { y0 = +sessionStorage.getItem("ncob-qy") || 0; sessionStorage.removeItem("ncob-qy"); } catch (e) {}
    if (y0 && input.value) setTimeout(function () { window.scrollTo(0, y0); }, 30); else input.focus();
  }

  // ---- More menu (stats + links) ----
  function screenMore() {
    setTitle("More", true);
    var quizzes = Store.quizzes();
    var html =
      group("Study", [li("#/pick/board", "<svg class=ic aria-hidden=true><use href=#i-users></use></svg>", "Mock Board", "Practice the oral board"), li("#/boardday", "<svg class=ic aria-hidden=true><use href=#i-clipboard></use></svg>", "Board Day Prep", "Room, uniform, reporting, memo")]) +
      group("You and your sponsor", [li("#/sendprogress", "<svg class=ic aria-hidden=true><use href=#i-send></use></svg>", "Send my progress", "Your sponsor sees your weak spots"), li("#/mycards", "<svg class=ic aria-hidden=true><use href=#i-pen></use></svg>", "My Cards", "Your unit's smart book, your MOS"), li("#/badges", "<svg class=ic aria-hidden=true><use href=#i-medal></use></svg>", "Badges", "Milestones you've earned")]) +
      group("App", (deferredPrompt ? ['<a class="li" href="#/more" id="installRow"><span class="li-ic" aria-hidden="true"><svg class=ic aria-hidden=true><use href=#i-install></use></svg></span><span class="grow"><span class="t">Install the app</span><span class="s">Opens like an app and works offline</span></span><span class="chev" aria-hidden="true"><svg class=ic aria-hidden=true><use href=#i-chev></use></svg></span></a>'] : []).concat([li("#/settings", "<svg class=ic aria-hidden=true><use href=#i-sliders></use></svg>", "Settings", "Board date, goal, timer, reminders"), li("#/share", "<svg class=ic aria-hidden=true><use href=#i-share></use></svg>", "Share &amp; QR code", "Send the app to a friend or your squad"), li("#/backup", "<svg class=ic aria-hidden=true><use href=#i-download></use></svg>", "Backup &amp; restore", "Save your progress to a file"), li("#/sources", "<svg class=ic aria-hidden=true><use href=#i-bookmark></use></svg>", "Sources &amp; editions", "Which regulation each card comes from")]));
    html += '<details class="set-fold"><summary>Recent quizzes &amp; boards (' + Math.min(10, quizzes.length) + ')</summary>' + (quizzes.length ? quizzes.slice(0, 10).map(function (q) {
      var pct = Math.round((q.score / q.total) * 100), cls = pct >= 75 ? "badge-good" : pct >= 60 ? "" : "badge-bad";
      var nm = STUDY.pubsById[q.deck] ? STUDY.pubsById[q.deck].code : q.deck === "core" ? "Board Core" : q.deck;
      return '<div class="qrow"><span class="grow">' + esc(nm) + ' <span class="muted">' + (Math.round(q.score * 10) / 10) + '/' + q.total + '</span></span><b class="' + cls + '"' + (cls ? '' : ' style="color:var(--gold);"') + '>' + pct + '%</b></div>';
    }).join("") : '<div class="muted" style="padding:8px 4px;">Nothing yet. Finish a quiz or Mock Board and it shows up here.</div>') + '</details>';
    html += '<div class="muted center" style="font-size:.85rem;margin-top:18px;">NCO Board Study Guide • ' + esc(versionLine()) + '<br>Unofficial study aid. Not endorsed by the U.S. Army or the Department of Defense. Your board memo and local SOP come first.</div>';
    mount.innerHTML = html;
    var ir = mount.querySelector("#installRow"); if (ir) ir.addEventListener("click", function (e) { e.preventDefault(); installBtn.click(); });
  }

  // ---- Settings ----
  function screenSettings(focus) {
    setTitle("Settings", true);
    var s = Store.settings(), daily = Store.daily();
    var timers = [0, 20, 30, 45, 60];
    var html =
      '<h2 class="section">Board date</h2>' +
      '<div class="card"><label class="lbl" for="bDate" style="margin-top:0;">When is your board? (from your board memo)</label>' +
        '<input class="input" type="date" id="bDate" value="' + escAttr(s.boardDate || "") + '" />' +
        '<div class="muted" style="font-size:.85rem;margin-top:8px;">Home shows a countdown and how many new Board Core cards to learn each day.</div>' +
        (s.boardDate ? '<button class="btn ghost sm" id="bClear" style="margin-top:10px;">Clear board date</button>' : '') + '</div>' +
      '<h2 class="section">Which board are you going to?</h2><div class="card"><div class="muted" style="font-size:.85rem;margin:0 0 8px;">Hides the few facts that only apply to the other rank (like SSG time-in-service numbers).</div><div class="chip-row seg3" id="rankChips">' +
        [["SGT", "SGT (E-5)"], ["SSG", "SSG (E-6)"], ["BOTH", "Not sure"]].map(function (r) { return '<button class="chip' + ((s.boardFor || "BOTH") === r[0] ? ' on' : '') + '" data-r="' + r[0] + '">' + r[1] + '</button>'; }).join("") +
      '</div></div>' +
      '<h2 class="section">Study reminders</h2><div class="card"><div class="muted" style="font-size:.85rem;">Add a daily study reminder' + (s.boardDate ? ' (until your board)' : '') + ' and a weekly "sponsor board" reminder to your phone\'s calendar.</div>' +
        '<label class="lbl" for="remT">Remind me at</label><input class="input" type="time" id="remT" value="19:00" />' +
      (('Notification' in window) ? '<div class="spacer"></div><button class="btn ghost" id="notifyOn">' + (s.notify ? '<svg class=ic aria-hidden=true><use href=#i-bell></use></svg> Daily reminder is on' : '<svg class=ic aria-hidden=true><use href=#i-bell></use></svg> Turn on a daily reminder') + '</button><div class="muted" style="font-size:.85rem;margin-top:4px;">Notifications work in the installed Android app.</div>' : '') +
        '<button class="btn ghost" id="remIcs" style="margin-top:10px;"><svg class=ic aria-hidden=true><use href=#i-calendar></use></svg> Add reminders to my calendar</button>' +
        '<div class="muted" style="font-size:.85rem;margin-top:6px;">Downloads a calendar file. Open it and your calendar app adds the reminders. Nothing is sent anywhere.</div></div>' +
      '<h2 class="section">Daily goal (minimum)</h2>' +
      '<div class="card"><div class="stepper"><button class="mini big" id="gMinus" aria-label="Lower daily goal">&#8722;</button>' +
        '<span id="goalVal" aria-live="polite">' + daily.goal + '</span><button class="mini big" id="gPlus" aria-label="Raise daily goal">+</button>' +
        '<span class="muted" style="margin-left:8px;">cards / day</span></div>' +
        '<div class="muted" style="font-size:.85rem;margin-top:8px;">Every card you grade or answer counts. Home can ask for more on days you have reviews due or a board coming up, so it may show a bigger number.</div></div>' +
      '<h2 class="section">Mock Board timer</h2><div class="muted" style="font-size:.85rem;margin:0 4px 8px;">Seconds you get to answer out loud before the answer is shown.</div><div class="chip-row seg5" id="timerChips">' +
        timers.map(function (t) { return '<button class="chip' + (t === s.timer ? ' on' : '') + '" data-t="' + t + '">' + (t === 0 ? 'Off' : t + 's') + '</button>'; }).join("") +
      '</div>' +
      '<h2 class="section">Drive Mode answer pause</h2><div class="muted" style="font-size:.85rem;margin:0 4px 8px;">How long Drive Mode waits for you to answer before it reads the answer.</div><div class="chip-row" id="gapChips">' +
        [3, 5, 8, 12].map(function (t) { return '<button class="chip' + (t === s.driveGap ? ' on' : '') + '" data-g="' + t + '">' + t + 's</button>'; }).join("") +
      '</div>';
    if (Speech.supported())
      html += '<h2 class="section">Read-aloud</h2><div class="card"><label class="switch"><input type="checkbox" id="autoRead"' + (s.autoRead ? ' checked' : '') + '> <span>Automatically read questions &amp; answers aloud</span></label></div>';
    if (Speech.supported()) html += '<div class="spacer"></div><button class="btn ghost" id="speakTest"><svg class=ic aria-hidden=true><use href=#i-speaker></use></svg> Test the voice</button>';
    if (window.SpeechRecognition || window.webkitSpeechRecognition)
      html += '<h2 class="section">Mock Board voice check</h2><div class="card"><label class="switch"><input type="checkbox" id="voiceAuto"' + (!s.voiceOff ? ' checked' : '') + '> <span>Listen to my answers and pre-tick the key points I said (needs the microphone; may need a connection)</span></label><div class="muted" style="font-size:.85rem;margin-top:6px;">Voice check uses your phone\u2019s speech service (Google or Apple), so your spoken answer leaves the phone while it listens. It stays off for personal and your-unit questions. Record my answer stays on the phone.</div></div>';
    // fold the sections people rarely change, so the page isn't one long scroll
    var r0 = html.indexOf('<h2 class="section">Study reminders</h2>'), r1 = html.indexOf('<h2 class="section">Daily goal (minimum)</h2>');
    if (r0 > 0 && r1 > r0) html = html.slice(0, r0) + '<h2 class="section">Reminders</h2><details class="set-fold" style="margin-top:0;"><summary>Calendar &amp; notification reminders</summary>' + html.slice(r0, r1).replace('<h2 class="section">Study reminders</h2>', '') + '</details>' + html.slice(r1);
    var t0 = html.indexOf('<h2 class="section">Mock Board timer</h2>');
    if (t0 > 0) html = html.slice(0, t0) + '<h2 class="section">Practice</h2><details class="set-fold" style="margin-top:0;"' + (focus === "timer" ? ' open' : '') + '><summary>Mock Board timer, Drive pause &amp; voice</summary>' + html.slice(t0) + '</details>';
    mount.innerHTML = html;
    if (focus === "timer") setTimeout(function () { var tc = mount.querySelector("#timerChips"); if (tc) tc.scrollIntoView({ block: "center" }); }, 30);

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
    var nb = mount.querySelector("#notifyOn");
    if (nb) nb.addEventListener("click", function () {
      if (!("Notification" in window) || !navigator.serviceWorker) { App.toast("This phone's browser can't show reminders. Use the calendar reminders instead.", 4000); return; }
      Notification.requestPermission().then(function (p) {
        if (p !== "granted") { App.toast("Notifications are off for this app. Use the calendar reminders instead.", 4000); return; }
        navigator.serviceWorker.ready.then(function (reg) {
          var done = function (ok) { Store.setSetting("notify", ok); App.toast(ok ? "Daily reminder on" : "Reminders need the installed app on Android. Use the calendar reminders instead.", 4000); screenSettings(); };
          if (reg.periodicSync) reg.periodicSync.register("ncoboard-daily", { minInterval: 20 * 3600 * 1000 }).then(function () { done(true); }, function () { done(false); });
          else done(false);
        });
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
    if (va) va.addEventListener("change", function () { Store.setSetting("voiceOff", !va.checked); });
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
      '<div class="card"><div class="muted">Your progress is stored only on this device. Export a backup so it survives clearing your browser or moving to a new phone.</div></div>' +
      '<button class="btn gold lg" id="exp"><svg class=ic aria-hidden=true><use href=#i-download></use></svg> Export my progress</button>' +
      '<div class="spacer"></div>' +
      '<label class="btn ghost lg" for="impFile"><svg class=ic aria-hidden=true><use href=#i-upload></use></svg> Import a backup</label>' +
      '<input type="file" id="impFile" accept="application/json,.json" hidden>' +
      '<h2 class="section">Reset</h2>' +
      '<button class="btn danger" id="resetCards">Reset card progress only</button><div class="muted" style="font-size:.85rem;margin:6px 2px 0;">Clears what you&#39;ve studied and when cards are due. Keeps your notes, chain of command, memo and settings.</div><div class="spacer"></div>' +
      '<button class="btn danger" id="resetAll">Erase everything</button><div class="muted" style="font-size:.85rem;margin:6px 2px 0;">Deletes your progress and your own cards on this phone.</div>';
    mount.querySelector("#exp").addEventListener("click", function () {
      var d = new Date(), name = "nco-board-progress-" + d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + ".json";
      download(name, Store.exportData()); App.toast("Backup downloaded");
    });
    mount.querySelector("#impFile").addEventListener("change", function (e) {
      var input = e.target, f = input.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        input.value = "";   // so picking the same file again still triggers a restore
        if (!confirm("Replace everything on this phone with this backup? OK to continue, Cancel to keep what you have.")) return;
        try { Store.importData(r.result); App.toast("Progress restored"); App.go("#/"); }
        catch (err) { App.toast("That file isn't a backup from this app. Pick the file you exported (it starts with nco-board).", 5000); }
      };
      r.readAsText(f);
    });
    mount.querySelector("#resetCards").addEventListener("click", function () { if (confirm("Reset all card progress? Your own cards stay, but every card goes back to new. Export first if you want to be able to restore it.")) { Store.resetCards(); App.toast("Card progress reset"); } });
    mount.querySelector("#resetAll").addEventListener("click", function () { if (confirm("Erase ALL progress AND your own cards? This cannot be undone. Export first if you want a backup.")) { Store.resetAll(); App.toast("Everything reset"); App.go("#/"); } });
  }

  // ---- Share + QR ----
  // ---- one-page share kit: QR, link, install steps, and a note for the sponsor (print or save as PDF) ----
  function screenKit() {
    setTitle("Share Kit", true);
    mount.innerHTML = '<div class="card no-print"><div class="muted">Print this page (or save it as a PDF) for your squad, your sponsor, or a board-prep table.</div><div class="spacer"></div><button class="btn gold lg" id="kPrint"><svg class=ic aria-hidden=true><use href=#i-print></use></svg> Print or save as PDF</button></div>' +
      '<div class="sheet center"><h2 style="margin:6px 0;">NCO Board Study Guide</h2><div class="muted">Free E-5/E-6 promotion board prep. Works offline. No account.</div>' +
      '<img src="./icons/qr.png" alt="QR code to open the app" style="width:180px;height:180px;background:#fff;padding:8px;border-radius:8px;margin:12px auto;display:block;">' +
      '<div class="url-line" style="font-weight:700;">' + esc(APP_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")) + '</div></div>' +
      '<div class="sheet"><h3>Install it</h3><div><b>Android (Chrome):</b> open the link, then menu &#8942; &#8594; Install app (or Add to Home screen).</div>' +
      '<div style="margin-top:6px;"><b>iPhone (Safari):</b> open the link in Safari, tap Share, then Add to Home Screen, then Add.</div>' +
      '<h3>First five minutes</h3><div>1. Pick your board (SGT or SSG). 2. Set your board date in Settings. 3. Do Today\'s plan on Home.</div>' +
      '<h3>For your sponsor</h3><div>Your Soldier can send you a progress link or a practice board. Open it on your phone: you\'ll see each question with the answer and a checklist, and you can send the results back. No install needed. Prefer paper? Ask them to print the board sheet.</div>' +
      '<div class="muted" style="font-size:.85rem;margin-top:10px;">Unofficial study aid. Not endorsed by the U.S. Army or DoD. The board memo and local SOP come first.</div></div>';
    mount.querySelector("#kPrint").addEventListener("click", function () { window.print(); });
  }

  function screenShare() {
    setTitle("Share & QR code", true);
    mount.innerHTML =
      '<div class="card center"><p>Share this app with other Soldiers — it works on any phone, free.</p>' +
        '<img src="./icons/qr.png" alt="QR code to open the app" style="width:200px;height:200px;border-radius:12px;background:#fff;padding:8px;" />' +
        '<div class="muted url-line">' + esc(APP_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")) + '</div></div>' +
      '<div class="btn-row"><button class="btn gold lg" id="share"><svg class=ic aria-hidden=true><use href=#i-share></use></svg> Share</button><button class="btn ghost lg" id="copy"><svg class=ic aria-hidden=true><use href=#i-copy></use></svg> Copy</button></div>' +
      '<div class="spacer"></div><a class="btn ghost lg" href="#/kit"><svg class=ic aria-hidden=true><use href=#i-print></use></svg> Print a share kit</a>' +
      '<h2 class="section">Install it on your phone</h2>' +
      '<div class="card"><div class="ttl"><b>Android (Chrome):</b> Chrome menu &#8942; &#8594; Install app (or Add to Home screen). Or use More &#8594; Install the app.</div>' +
        '<div class="ttl" style="margin-top:8px;"><b>iPhone (Safari):</b> open the link in Safari, tap Share <svg class=ic aria-hidden=true><use href=#i-upload></use></svg>, then Add to Home Screen, then Add. Open it from the new icon; it works offline after the first visit.</div></div>' +
      '<h2 class="section">Spot an error?</h2>' +
      '<div class="card"><div class="muted">Tap the <svg class=ic aria-hidden=true><use href=#i-flag></use></svg> flag on any card. You can send the report from your phone (text, email, chat) or copy it. No account needed.</div></div>' +
      '<a class="btn ghost" href="https://github.com/' + REPO + '/issues/new" target="_blank" rel="noopener">Or report it online (needs a free GitHub account)</a>';
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
    var html = '<a class="btn gold lg" href="#/mycards/new"><svg class=ic aria-hidden=true><use href=#i-plus></use></svg> Add a card</a>' +
      group("", [li("#/mos", "<svg class=ic aria-hidden=true><use href=#i-wrench></use></svg>", "Start my MOS cards", "Your job questions")]) +
      (cards.length ? '<div class="card" style="margin-top:12px;"><div class="muted">Add your unit\'s smart-book items — chain of command, command policies, local SOPs — anything your board might ask that isn\'t in the manuals.</div></div>' : '');
    if (cards.length) {
      html += '<h2 class="section">' + cards.length + ' custom card' + (cards.length > 1 ? "s" : "") + '</h2>';
      cards.forEach(function (c) {
        var p = STUDY.pubsById[c.pub];
        html += '<div class="row" data-edit="' + escAttr(c.id) + '"><div class="grow"><div class="code">' + esc(p ? p.code : "My Cards") + '</div>' +
          '<div class="ttl">' + esc(c.q) + '</div></div><button class="mini" data-del="' + escAttr(c.id) + '" aria-label="Delete card: ' + escAttr(String(c.q).slice(0, 60)) + '"><svg class=ic aria-hidden=true><use href=#i-trash></use></svg></button><div class="chev" aria-hidden="true"><svg class=ic aria-hidden=true><use href=#i-chev></use></svg></div></div>';
      });
    } else html += '<div class="empty-state"><svg class=ic aria-hidden=true><use href=#i-pen></use></svg><div class="t">No cards of your own yet</div><div class="muted">Add your unit&#39;s smart-book questions, your MOS tasks, or anything your board likes to ask.</div></div>';
    if (cards.length) html += '<div class="spacer"></div><button class="btn ghost" id="shareCards"><svg class=ic aria-hidden=true><use href=#i-send></use></svg> Share my cards (send a link)</button>' +
      '<div class="muted center" style="font-size:.85rem;margin-top:6px;">Anyone with the app can open the link and add your cards to theirs. Up to 60 cards.</div>';
    mount.innerHTML = html;
    var shc = mount.querySelector("#shareCards");
    if (shc) shc.addEventListener("click", function () {
      var pack = cards.slice(0, 60).map(function (c) { return { q: c.q, a: c.a, t: c.topic || "", p: c.pub || "mine" }; });
      var url = APP_URL + "#/takecards/" + b64e(pack);
      var text = "My board study cards (" + pack.length + "). Open to add them to your NCO Board app: " + url;
      if (navigator.share) navigator.share({ title: "Board study cards", text: text }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { App.toast("Link copied", 3000); }, function () { App.toast(url, 6000); });
      else App.toast(url, 6000);
    });
    mount.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); if (confirm("Delete this card? This can't be undone.")) { Store.deleteUserCard(b.getAttribute("data-del")); screenMyCards(); } });
    });
    mount.querySelectorAll("[data-edit]").forEach(function (r) {
      r.addEventListener("click", function () { App.go("#/mycards/edit/" + r.getAttribute("data-edit")); });
    });
  }

  // ---- My MOS starter: turns a few answers into your own study cards (boards can ask about your job) ----
  function screenMos() {
    setTitle("Start My MOS Cards", true);
    var F = [["code", "Your MOS (code and title)", "e.g. 25U, Signal Support Systems Specialist"], ["duties", "Your main duties, in a sentence or two", "e.g. what you do day to day, in your own words"],
      ["t1", "An individual critical task from your STP (task name, then its standard)", "e.g. (task name): (its standard, copied from your STP)"], ["t2", "Another critical task and its standard", "e.g. (task name): (its standard)"], ["t3", "One more (optional)", "e.g. (task name): (its standard)"],
      ["eq", "The main equipment you work on", "e.g. the radios, vehicles, or systems you operate or maintain"]];
    mount.innerHTML = '<div class="card"><div class="muted">Boards can check your job. Fill in what you know and the app turns it into study cards.</div></div>' +
      F.map(function (f) { return '<label class="lbl" for="mos-' + f[0] + '">' + esc(f[1]) + '</label><textarea class="input" id="mos-' + f[0] + '" rows="2" placeholder="' + escAttr(f[2]) + '"></textarea>'; }).join("") +
      '<div class="spacer"></div><button class="btn gold lg" id="mosGo">Make my MOS cards</button>';
    mount.querySelector("#mosGo").addEventListener("click", function () {
      var v = {}; F.forEach(function (f) { v[f[0]] = (mount.querySelector("#mos-" + f[0]).value || "").trim().slice(0, 600); });
      var made = [];
      if (v.code) made.push({ q: "What is your MOS?", a: v.code });
      if (v.duties) made.push({ q: "What are your main duties in your MOS?", a: v.duties });
      ["t1", "t2", "t3"].forEach(function (k) { if (v[k]) { var parts = v[k].split(/:\s*/); made.push({ q: "Walk the board through this task from your MOS: " + parts[0] + ". What is the standard?", a: v[k] }); } });
      if (v.eq) made.push({ q: "What equipment do you work on in your job?", a: v.eq });
      if (!made.length) { App.toast("Fill in at least one box."); return; }
      made.forEach(function (c) { Store.addUserCard({ q: c.q, a: c.a, topic: "My MOS", pub: "mine" }); });
      App.toast("Made " + made.length + " MOS cards"); App.go("#/mycards");
    });
  }

  function screenTakeCards(data) {
    setTitle("Add Shared Cards", true);
    var pack; try { pack = b64d(data); } catch (e) { pack = null; }
    if (!Array.isArray(pack) || !pack.length) { mount.innerHTML = badLink('The cards link is incomplete. Ask for it again.'); return; }
    var have = {}; Store.userCards().forEach(function (c) { have[String(c.q).trim().toLowerCase()] = 1; });
    var list = pack.slice(0, 60).filter(function (x) { return x && typeof x.q === "string" && typeof x.a === "string" && x.q.trim() && x.a.trim(); })
      .map(function (x) { return { q: x.q.slice(0, 500), a: x.a.slice(0, 1500), topic: String(x.t || "").slice(0, 80), pub: STUDY.pubsById[x.p] ? x.p : "mine", dup: !!have[x.q.trim().toLowerCase()] }; });
    var fresh = list.filter(function (x) { return !x.dup; });
    mount.innerHTML = '<div class="card"><div class="muted">Someone shared ' + list.length + ' study card' + (list.length === 1 ? '' : 's') + ' with you. Check them: they come from another Soldier, not from the Army publications.</div></div>' +
      list.map(function (x) { return '<div class="card"' + (x.dup ? ' style="opacity:.55;"' : '') + '><div style="font-weight:600;">' + esc(x.q) + '</div><div class="muted" style="margin-top:4px;">' + esc(x.a) + '</div>' + (x.dup ? '<div class="muted" style="font-size:.85rem;">Already in your cards</div>' : '') + '</div>'; }).join("") +
      (fresh.length ? '<button class="btn gold lg" id="takeAll">Add ' + fresh.length + ' card' + (fresh.length === 1 ? '' : 's') + ' to My Cards</button>' : '<div class="empty">You already have all of these.</div>');
    var t = mount.querySelector("#takeAll");
    if (t) t.addEventListener("click", function () {
      fresh.forEach(function (x) { Store.addUserCard({ q: x.q, a: x.a, topic: x.topic, pub: x.pub }); });
      App.toast("Added " + fresh.length + " cards"); App.go("#/mycards");
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
      '<label class="lbl" for="fq">Question</label><textarea class="input" id="fq" rows="2" placeholder="e.g. Who is the Command Sergeant Major?">' + (editing ? esc(editing.q) : "") + '</textarea>' +
      '<label class="lbl" for="fa">Answer</label><textarea class="input" id="fa" rows="2" placeholder="e.g. CSM Smith">' + (editing ? esc(editing.a) : "") + '</textarea>' +
      '<label class="lbl" for="fp">Subject</label><select class="input" id="fp">' + pubsOpts + '</select>' +
      '<label class="lbl" for="ft">Topic (optional)</label><input class="input" id="ft" placeholder="e.g. Chain of Command" value="' + (editing && editing.topic ? escAttr(editing.topic) : "") + '">' +
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
    '<line x1="60" y1="128" x2="98" y2="128" stroke="#ffcc33" stroke-width="1.5"/><circle cx="60" cy="128" r="13" fill="#ffcc33"/><text x="60" y="133" text-anchor="middle" font-size="15" font-weight="800" fill="#1a1a0e" font-family="sans-serif">1</text>' +
    '<line x1="262" y1="92" x2="224" y2="100" stroke="#ffcc33" stroke-width="1.5"/><circle cx="262" cy="92" r="13" fill="#ffcc33"/><text x="262" y="97" text-anchor="middle" font-size="15" font-weight="800" fill="#1a1a0e" font-family="sans-serif">2</text>' +
    '<line x1="22" y1="188" x2="40" y2="214" stroke="#ffcc33" stroke-width="1.5"/><circle cx="22" cy="188" r="13" fill="#ffcc33"/><text x="22" y="193" text-anchor="middle" font-size="15" font-weight="800" fill="#1a1a0e" font-family="sans-serif">3</text>' +
    '<line x1="298" y1="188" x2="280" y2="210" stroke="#ffcc33" stroke-width="1.5"/><circle cx="298" cy="188" r="13" fill="#ffcc33"/><text x="298" y="193" text-anchor="middle" font-size="15" font-weight="800" fill="#1a1a0e" font-family="sans-serif">4</text>' +
    '</svg>' +
    '<ol class="uni-legend"><li><b>1</b><span><b>Nameplate:</b> centered on the right pocket flap.</span></li><li><b>2</b><span><b>Ribbons:</b> centered 1/8 inch above the left pocket.</span></li>' +
    '<li><b>3</b><span><b>Overseas bars:</b> right sleeve, 4 inches from the bottom.</span></li><li><b>4</b><span><b>Service stripes:</b> left sleeve, 4 inches from the bottom.</span></li></ol>';
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
  // grouped list: one card, divided rows (icon, title, one short line)
  function li(href, ic, t, s) { return '<a class="li" href="' + href + '"><span class="li-ic" aria-hidden="true">' + ic + '</span><span class="grow"><span class="t">' + t + '</span>' + (s ? '<span class="s">' + s + '</span>' : '') + '</span><span class="chev" aria-hidden="true"><svg class=ic aria-hidden=true><use href=#i-chev></use></svg></span></a>'; }
  function liDeck(href, code, title, n, deck, extra) { return '<a class="li deck" ' + (deck ? 'data-deck="' + deck + '" ' : '') + 'href="' + href + '"' + (extra || '') + '><span class="grow"><span class="t" style="color:var(--gold);">' + code + '</span>' + (title ? '<span class="s">' + title + '</span>' : '') + '</span><span class="pill">' + n + '</span><span class="chev" aria-hidden="true"><svg class=ic aria-hidden=true><use href=#i-chev></use></svg></span></a>'; }
  // autosave feedback: a small "Saved" line that fades
  function flashSaved() { var s = document.getElementById("savedTick"); if (!s) { s = document.createElement("div"); s.id = "savedTick"; s.className = "saved-tick"; document.body.appendChild(s); } s.textContent = "Saved \u2713"; s.classList.add("on"); clearTimeout(flashSaved.t); flashSaved.t = setTimeout(function () { s.classList.remove("on"); }, 1200); }
  // "Haircut neat; clean-shaven..." -> bold first clause, the rest smaller
  function checkText(t) {
    var m = String(t).match(/^([^;:]{6,60}?)([;:])\s*([\s\S]+)$/) || String(t).match(/^([^,.(]{6,48}?)([,(.])\s*([\s\S]+)$/);
    return m ? '<b>' + esc(m[1]) + '</b><span class="ck-d">' + esc((m[2] === "(" ? "(" : "") + m[3]) + '</span>' : '<b>' + esc(t) + '</b>';
  }
  function niceDate(ms) { var d = new Date(ms); return d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear(); }
  function group(title, rows, id) { return (title ? '<div class="lg-h"' + (id ? ' id="' + id + '"' : '') + '>' + title + '</div>' : '') + '<div class="lg">' + rows.join("") + '</div>'; }
  function jumpChips(cats) { return '<div class="jump-wrap"><div class="chip-row jump-row">' + cats.map(function (c, k) { return '<button class="chip" data-jump="cat' + k + '">' + esc(c.replace(/ &amp; .*| & .*/, "")) + '</button>'; }).join("") + '</div></div>'; }
  function wireJumpSpy() {
    var chips = mount.querySelectorAll("[data-jump]"); if (!chips.length) return;
    var row0 = chips[0].parentElement, edge = function () { row0.classList.toggle("fade-l", row0.scrollLeft > 4); row0.classList.toggle("fade-r", row0.scrollLeft + row0.clientWidth < row0.scrollWidth - 4); };
    row0.addEventListener("scroll", edge, { passive: true }); edge();
    if (!window.IntersectionObserver) return;
    var mark = function (id) { chips.forEach(function (b) { var on = b.getAttribute("data-jump") === id; b.classList.toggle("on", on); if (on && b.scrollIntoView) { var row = b.parentElement; row.scrollTo({ left: b.offsetLeft - 24, behavior: "smooth" }); } }); };
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); }); }, { rootMargin: "-130px 0px -60% 0px" });
    chips.forEach(function (b) { var t = document.getElementById(b.getAttribute("data-jump")); if (t) io.observe(t); });
  }
  function wireJumps() { setTimeout(wireJumpSpy, 0); mount.querySelectorAll("[data-jump]").forEach(function (b) { b.addEventListener("click", function () { var t = document.getElementById(b.getAttribute("data-jump")); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); }); }); }

  function screenBoardDay() {
    setTitle("Board Day Prep", true);
    mount.innerHTML =
      '<div class="muted" style="font-size:.85rem;margin:2px 4px 6px;">Your board memo and local SOP always come first.</div>' +
      group("The board itself", [li("#/room", "<svg class=ic aria-hidden=true><use href=#i-building></use></svg>", "Board Room", "What it&#39;s like, who sits on it, how they decide"), li("#/reporting", "<svg class=ic aria-hidden=true><use href=#i-flag></use></svg>", "Report to the Board", "The sequence and your bearing"), li("#/statement", "<svg class=ic aria-hidden=true><use href=#i-quote></use></svg>", "Opening Statement", "Draft your “tell us about yourself”"), li("#/pub/boardskills", "<svg class=ic aria-hidden=true><use href=#i-brain></use></svg>", "Board Know-How", "If you freeze, how to answer")]) +
      group("Get ready", [li("#/memo", "<svg class=ic aria-hidden=true><use href=#i-doc></use></svg>", "My Board Memo", "Reporting wording, uniform, time"), li("#/uniform", "<svg class=ic aria-hidden=true><use href=#i-shirt></use></svg>", "Uniform Inspection", "Check it before you walk in"), li("#/records", "<svg class=ic aria-hidden=true><use href=#i-folder></use></svg>", "Records", "What to bring: SRB, points, pockets"), li("#/points", "<svg class=ic aria-hidden=true><use href=#i-chart></use></svg>", "Points", "Where you stand on promotion points")]) +
      group("Know your Army", [li("#/chain", "<svg class=ic aria-hidden=true><use href=#i-sitemap></use></svg>", "Chain of Command", "Fill it in, then quiz yourself"), li("#/knowledge", "<svg class=ic aria-hidden=true><use href=#i-globe></use></svg>", "Know Your Army", "Notes for the questions about you"), li("#/changes", "<svg class=ic aria-hidden=true><use href=#i-spark></use></svg>", "What's new", "AFT, waist-to-height, grooming")]);
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
  // ---- printable sponsor sheet: the same board on paper (print or save as PDF from the phone) ----
  function screenSheet(list) {
    setTitle("Board Sheet for Your Sponsor", true);
    var want = String(list || "").split(",").filter(Boolean), byId = {};
    allCards().forEach(function (c) { byId[c.id] = c; });
    var cards = want.map(function (id) { return byId[id]; }).filter(Boolean);
    if (cards.length < 3) { mount.innerHTML = badLink('The sheet link is incomplete.'); return; }
    var box = '<span class="sheet-box"></span>';
    var html = '<div class="card no-print"><div class="muted">Print this (or save it as a PDF) and hand it to your sponsor. They read each question aloud, tick what you said, and grade your bearing. No app needed on their side.</div>' +
      '<div class="spacer"></div><button class="btn gold lg" id="doPrint"><svg class=ic aria-hidden=true><use href=#i-print></use></svg> Print or save as PDF</button>' +
      '<div class="spacer"></div><a class="btn ghost" href="#/sheetin/' + escAttr(want.join(",")) + '"><svg class=ic aria-hidden=true><use href=#i-pen></use></svg> Enter paper results</a></div>' +
      '<div class="sheet"><h2 style="margin:6px 0;">Practice Promotion Board</h2><div class="muted"><div>Soldier: ______________________</div><div>Sponsor: ______________________</div><div>Date: ____________</div></div>' +
      '<h3>Bearing (tick if clean)</h3>' + ["Reporting in", "Facing movements", "Tell us about yourself (about 90 seconds)", "Reporting out"].map(function (b) { return '<div class="sheet-ck">' + box + '<span>' + esc(b) + '</span></div>'; }).join("");
    cards.forEach(function (c, k) {
      html += '<div class="card sheet-q"><div><b>' + (k + 1) + '. ' + esc(c.oral || c.q) + '</b></div>' +
        '<div class="muted" style="margin-top:4px;">Answer: ' + esc(c.a) + '</div>' +
        (c.points && c.points.length ? '<div style="margin-top:4px;">' + c.points.map(function (p) { return '<div class="sheet-ck">' + box + '<span>' + esc(p) + '</span></div>'; }).join("") + '</div>' : '<div style="margin-top:4px;">' + box + ' Correct</div>') +
        (c.follow && c.follow.length ? '<div class="muted" style="margin-top:4px;font-size:.85rem;">If they get it, follow up: ' + esc(c.follow[0].q) + ' (' + esc(c.follow[0].a) + ')</div>' : '') +
        '<div class="muted" style="font-size:.85rem;margin-top:4px;">' + esc(c.ref || "") + '</div></div>';
    });
    html += '<div style="margin-top:10px;font-weight:700;">Questions correct: ______ of ' + cards.length + '</div><h3>Notes for the Soldier</h3><div class="sheet-lines"></div><div class="muted" style="font-size:.85rem;">From the NCO Board Study Guide app. The board memo and local SOP come first.</div></div>';
    mount.innerHTML = html;
    mount.querySelector("#doPrint").addEventListener("click", function () { window.print(); });
  }

  // ---- type the paper board's results back in: same save path as a sponsor's results link ----
  function screenSheetIn(list) {
    setTitle("Enter Paper Board Results", true);
    var want = String(list || "").split(",").filter(Boolean), byId = {};
    allCards().forEach(function (c) { byId[c.id] = c; });
    var cards = want.map(function (id) { return byId[id]; }).filter(Boolean);
    if (cards.length < 3) { mount.innerHTML = badLink('The link is incomplete.'); return; }
    var B = [["R", "Reporting in"], ["D", "Facing movements"], ["I", "Tell us about yourself"], ["O", "Reporting out"]];
    mount.innerHTML = '<div class="card"><div class="muted">Copy what your sponsor marked on the paper sheet. Tap each question you got right.</div></div>' +
      cards.map(function (c, k) { return '<label class="switch card"><input type="checkbox" class="pq" data-id="' + escAttr(c.id) + '"> <span>' + (k + 1) + '. ' + esc(c.oral || c.q) + '</span></label>'; }).join("") +
      '<h2 class="section">Bearing (tick if clean)</h2>' + B.map(function (b) { return '<label class="switch card"><input type="checkbox" class="pb" data-b="' + b[0] + '"> <span>' + esc(b[1]) + '</span></label>'; }).join("") +
      '<label class="lbl" for="pNote">Your sponsor\'s notes (optional)</label><textarea class="input" id="pNote" rows="3" maxlength="300"></textarea>' +
      '<div class="spacer"></div><button class="btn gold lg" id="pSave">Save these results</button>';
    mount.querySelector("#pSave").addEventListener("click", function () {
      var got = 0, missed = [];
      mount.querySelectorAll(".pq").forEach(function (x) { if (x.checked) got++; else missed.push(x.getAttribute("data-id")); });
      var bcode = "b-" + Array.prototype.map.call(mount.querySelectorAll(".pb"), function (x) { return x.getAttribute("data-b") + (x.checked ? 1 : 0); }).join("");
      var note = (mount.querySelector("#pNote").value || "").trim().slice(0, 300);
      App.go("#/sbresult/" + got + "/" + cards.length + "/" + Date.now().toString(36) + "/" + missed.join(",") + "/" + bcode + (note ? "/" + encodeURIComponent(note) : ""));
    });
  }

  // A board sent from a Soldier's phone: same questions, run here in sponsor mode (answers + checklists shown to the sponsor).
  function screenSponsorBoard(list) {
    setTitle("Sponsor Board", true);
    var want = list.split(",").filter(Boolean), byId = {};
    allCards().forEach(function (c) { byId[c.id] = c; });
    var cards = want.map(function (id) { return byId[id]; }).filter(Boolean);
    if (cards.length < 3) { mount.innerHTML = badLink('The board link is incomplete. Ask the Soldier to send it again.'); return; }
    mount.innerHTML = '<div class="card"><div class="flash-tag">You are the board</div><div class="muted">A Soldier asked you to run a practice board. Read each question aloud, listen, then tick what they actually said.</div></div>' +
      '<label class="switch card"><input type="checkbox" id="sbFull" checked> <span><b>Full board</b>: reporting in, drill, "tell us about yourself," then the questions</span></label>' +
      '<button class="btn gold lg" id="sbGo"><svg class=ic aria-hidden=true><use href=#i-play></use></svg> Start the board</button><div class="muted center" style="font-size:.85rem;margin:-4px 0 8px;">' + cards.length + ' questions</div>' +
      '<div class="spacer"></div><a class="btn ghost" href="#/sheet/' + escAttr(want.join(",")) + '"><svg class=ic aria-hidden=true><use href=#i-print></use></svg> Print a paper board</a>';
    mount.querySelector("#sbGo").addEventListener("click", function () {
      MockBoard.render(mount, cards, cards.length, { full: mount.querySelector("#sbFull").checked, sponsor: true, fixed: true });
    });
  }

  // Results sent back from a sponsor's phone: saved once, missed cards come back sooner.
  function screenSponsorResult(p) {
    setTitle("Sponsor Board Results", true);
    var got = parseFloat(p[0]), total = parseInt(p[1], 10), token = String(p[2] || "").replace(/[^a-z0-9]/g, ""), ids = String(p[3] || "").split(",").filter(Boolean);
    var bear = [], rest = p.slice(4);
    if (/^b-/.test(rest[0] || "")) {
      var NAMES = { R: "Reporting in", D: "Facing movements", I: "Tell us about yourself", O: "Reporting out" };
      (rest.shift().slice(2).match(/[RDIO][01]/g) || []).forEach(function (t) { bear.push({ label: NAMES[t[0]], ok: t[1] === "1" }); });
    }
    var note = ""; try { note = decodeURIComponent(rest.join("/") || "").slice(0, 300); } catch (e) { note = ""; }
    if (!(total > 0) || !(got >= 0) || got > total || !token) { mount.innerHTML = badLink('The results link is incomplete. Ask your sponsor to send it again.'); return; }
    var seenKey = "sbr-" + token, fresh = !Store.chain()[seenKey];
    var selfB = Store.quizzes().filter(function (q) { return /^Mock Board/.test(q.deck) && !/with sponsor/.test(q.deck) && q.total; }).slice(0, 5);
    var selfPct = selfB.length ? Math.round(selfB.reduce(function (s, q) { return s + 100 * q.score / q.total; }, 0) / selfB.length) : null;
    var byId = {}; STUDY.cards.forEach(function (c) { byId[c.id] = c; });
    if (fresh) {
      Store.recordQuiz("Mock Board with sponsor", got, total);
      ids.forEach(function (id) { if (byId[id]) Store.grade(id, "again"); });
      Store.setChainRole(seenKey, "1");
    }
    var pct = Math.round(100 * got / total);
    mount.innerHTML = '<div class="ring-wrap"><div class="ring ' + (pct >= 75 ? 'good' : pct >= 50 ? 'mid' : 'bad') + '" style="--p:' + pct + ';"><div class="ring-in">' + pct + '%</div></div><small>from your sponsor\'s board</small></div>' +
      (function () {
        var V = MockBoard.verdict(pct, bear.filter(function (b) { return !b.ok; }).map(function (b) { return b.label.toLowerCase(); }), ids.filter(function (id) { return byId[id] && byId[id].pub === "sit"; }).length);
        if (total < 8 && V.level !== "work") V = { level: "work", title: "Good practice", msg: pct + "% on a short board. Board-ready takes a full board of 10 or more questions." };
        var line = (V.msg.indexOf(V.title + ".") === 0 ? V.msg.slice(V.title.length + 1).trim() : V.msg).replace(/^(Your|Their) answers scored \d+%\. /, "");
        return '<div class="done-h">' + esc(V.title) + '</div><p class="center muted" style="margin-top:0;">' + esc(line) + '</p>' +
          (ids.length ? (Store.setChainRole("last-misses", ids.join(",")), '<a class="btn gold lg" href="#/flash/misses"><svg class=ic aria-hidden=true><use href=#i-refresh></use></svg> Drill your ' + ids.length + ' miss' + (ids.length === 1 ? '' : 'es') + ' now</a>') : '<a class="btn gold lg" href="#/board/core">Run a Mock Board on your own</a>');
      })() +
      (selfPct != null ? '<div class="card"><div class="flash-tag">You vs. your sponsor</div><div class="muted">Your own Mock Boards average <b>' + selfPct + '%</b>. Your sponsor scored you <b>' + pct + '%</b>. ' +
        (selfPct - pct >= 10 ? 'You grade yourself about ' + (selfPct - pct) + ' points higher than your sponsor does. Next time, only give yourself a key point if you said it out loud, clearly.' : selfPct - pct <= -10 ? 'Your sponsor scored you higher than you score yourself. You know more than you think.' : 'Your own grading is close to your sponsor&#39;s. You can trust your practice scores.') + '</div></div>' : '') +
      (bear.length ? '<h2 class="section">Bearing (your sponsor\'s grades)</h2>' + '<div class="lg">' + bear.map(function (b) { return '<div class="li"><span class="grow"><span class="t" style="font-weight:600;">' + esc(b.label) + '</span></span><b class="' + (b.ok ? "badge-good" : "badge-bad") + '">' + (b.ok ? "\u2713 clean" : "\u2717 needs work") + '</b></div>'; }).join("") + '</div>' : '') +
      (note ? '<div class="card" style="border-color:var(--gold);"><div class="flash-tag">Your sponsor\'s notes</div><div style="white-space:pre-wrap;">' + esc(note) + '</div></div>' : '') +
      '<p class="center muted">' + (fresh ? "Saved to your history. " : "Already saved. ") + (ids.length ? "The questions you missed will come back sooner in your reviews:" : "No misses. Nice work.") + '</p>' +
      ids.map(function (id) { var c = byId[id]; return c ? '<details class="set-fold"><summary>' + esc(c.q) + '</summary><div style="padding:0 2px 10px;">' + esc(c.a) + '</div></details>' : ""; }).join("") +
      '<div class="spacer"></div><a class="home-link" href="#/">Back to Home</a>';
  }


  // ---------------- motivation: badges, weekly recap, progress links ----------------
  var BADGES = [
    { ic: "<svg class=ic aria-hidden=true><use href=#i-books></use></svg>", id: "first-card", t: "First steps", d: "Studied your first card", test: function (x) { return x.seen >= 1; } },
    { ic: "<svg class=ic aria-hidden=true><use href=#i-star></use></svg>", id: "core-50", t: "50 Board Core cards", d: "Studied 50 Board Core cards", test: function (x) { return x.seen >= 50; } },
    { ic: "<svg class=ic aria-hidden=true><use href=#i-star></use></svg>", id: "core-150", t: "150 Board Core cards", d: "Studied 150 Board Core cards", test: function (x) { return x.seen >= 150; } },
    { ic: "<svg class=ic aria-hidden=true><use href=#i-trophy></use></svg>", id: "core-all", t: "All of Board Core", d: "Studied every Board Core card", test: function (x) { return x.total && x.seen >= x.total; } },
    { ic: "<svg class=ic aria-hidden=true><use href=#i-cap></use></svg>", id: "board101", t: "Board 101", d: "Finished the Board 101 lessons", test: function (x) { return x.b101; } },
    { ic: "<svg class=ic aria-hidden=true><use href=#i-users></use></svg>", id: "first-board", t: "First Mock Board", d: "Ran your first Mock Board", test: function (x) { return x.boards >= 1; } },
    { ic: "<svg class=ic aria-hidden=true><use href=#i-medal></use></svg>", id: "boards-5", t: "Five Mock Boards", d: "Ran five Mock Boards", test: function (x) { return x.boards >= 5; } },
    { ic: "<svg class=ic aria-hidden=true><use href=#i-handshake></use></svg>", id: "sponsor-board", t: "Sponsor board", d: "Ran a board with your sponsor", test: function (x) { return x.sponsored; } },
    { ic: "<svg class=ic aria-hidden=true><use href=#i-flame></use></svg>", id: "streak-7", t: "7-day streak", d: "Studied seven days in a row", test: function (x) { return x.streak >= 7; } },
    { ic: "<svg class=ic aria-hidden=true><use href=#i-chart></use></svg>", id: "ready-50", t: "Halfway ready", d: "Board-ready score of 50%", test: function (x) { return x.ready >= 50; } },
    { ic: "<svg class=ic aria-hidden=true><use href=#i-target></use></svg>", id: "ready-80", t: "Board-ready", d: "Board-ready score of 80%", test: function (x) { return x.ready >= 80; } }
  ];
  function badgeFacts(coreIds, rs) {
    var q = Store.quizzes(), b101 = window.Learn && Learn.nextBoardLesson ? !/^board101/.test((Learn.nextBoardLesson().next || { id: "x" }).id) : false;
    return { seen: rs.seen, total: coreIds.length, ready: rs.ready, streak: Store.streak(), b101: b101,
      boards: q.filter(function (x) { return /^Mock Board/.test(x.deck); }).length, sponsored: q.some(function (x) { return /with sponsor/.test(x.deck); }) };
  }
  function checkBadges(coreIds, rs) {
    var f = badgeFacts(coreIds, rs), fresh = [];
    BADGES.forEach(function (b) { if (b.test(f) && Store.earnBadge(b.id)) fresh.push(b.t); });
    return fresh;
  }
  function badLink(msg) {
    return '<div class="empty-state">' + '<svg class=ic aria-hidden=true><use href=#i-alert></use></svg>' + '<div class="t">This link isn&#39;t complete</div><div class="muted">' + (msg.replace(/^The [^.]*incomplete\. ?/, "") || "Ask for a new link.") + '</div><a class="btn gold lg" href="#/">Open the app</a></div>';
  }
  function screenBadges() {
    setTitle("Badges", true);
    (function () { var ci = STUDY.cards.filter(function (c) { return c.core && rankOk(c); }).map(function (c) { return c.id; }); checkBadges(ci, readyScore(ci)); })();
    var got = Store.badges();
    var coreB = STUDY.cards.filter(function (c) { return c.core && rankOk(c); }).map(function (c) { return c.id; }), fB = badgeFacts(coreB, readyScore(coreB));
    var PROG = { "core-50": [fB.seen, 50], "core-150": [fB.seen, 150], "core-all": [fB.seen, fB.total], "boards-5": [fB.boards, 5], "streak-7": [fB.streak, 7], "ready-50": [fB.ready, 50], "ready-80": [fB.ready, 80] };
    var row = function (b) {
      var on = !!got[b.id], when = on && got[b.id] > 946684800000 ? ' • ' + niceDate(got[b.id]) : '';
      return '<div class="li"' + (on ? '' : ' style="opacity:.6;"') + '><span class="li-ic" aria-hidden="true">' + (b.ic || "<svg class=ic aria-hidden=true><use href=#i-medal></use></svg>") + '</span><span class="grow"><span class="t">' + esc(b.t) + '</span><span class="s">' + esc(!on && PROG[b.id] && PROG[b.id][1] > PROG[b.id][0] ? (PROG[b.id][1] - PROG[b.id][0]) + ' to go' : b.d) + when + '</span></span>' + (!on && PROG[b.id] ? '<span class="pill">' + (/ready/.test(b.id) ? Math.min(PROG[b.id][0], PROG[b.id][1]) + '% of ' + PROG[b.id][1] + '%' : Math.min(PROG[b.id][0], PROG[b.id][1]) + ' / ' + PROG[b.id][1]) + '</span>' : '') + '</div>';
    };
    var earned = BADGES.filter(function (b) { return got[b.id]; }), left = BADGES.filter(function (b) { return !got[b.id]; });
    var medal = function (b) { var when = got[b.id] > 946684800000 ? niceDate(got[b.id]) : ''; return '<div class="medal"><span class="medal-ic">' + (b.ic || '<svg class=ic aria-hidden=true><use href=#i-medal></use></svg>') + '</span><b>' + esc(b.t) + '</b><small>' + when + '</small></div>'; };
    mount.innerHTML = '<div class="muted" style="font-size:.85rem;margin:2px 4px 8px;">Small wins on the way to your board. They stay on this phone.</div>' +
      (earned.length ? '<div class="lg-h">Earned (' + earned.length + ')</div><div class="medal-grid">' + earned.map(medal).join("") + '</div>' : '') +
      (left.length ? group("Still to earn (" + left.length + ")", left.map(row)) : '');
  }

  // last 7 days at a glance
  function weeklyRecap() {
    var log = Store.dayLog(7), total = 0, days = 0, max = 1;
    log.forEach(function (d) { total += d.count; if (d.count) days++; if (d.count > max) max = d.count; });
    if (!total) return "";
    var weekAgo = Date.now() - 7 * 86400000, boards = Store.quizzes().filter(function (q) { return /^Mock Board/.test(q.deck) && q.date > weekAgo; }).length;
    var bars = log.map(function (d) {
      var h = Math.max(3, Math.round(36 * d.count / max)), dn = new Date(d.day + "T12:00:00").toLocaleDateString(undefined, { weekday: "narrow" });
      return '<div style="flex:1;text-align:center;"><div title="' + d.count + ' cards" style="height:' + h + 'px;background:' + (d.count ? 'var(--gold)' : 'var(--line, #3a3f2e)') + ';border-radius:3px;margin:0 2px;"></div><div class="muted" style="font-size:.85rem;margin-top:2px;">' + dn + '</div></div>';
    }).join("");
    var cal = Store.calib(), calLine = '';
    if (cal.sureN >= 10) {
      var sp = Math.round(100 * cal.sureRight / cal.sureN);
      calLine = '<div class="muted" style="font-size:.85rem;margin-top:6px;">When you tapped <b>I know it</b>, you were right <b>' + sp + '%</b> of the time' +
        (sp < 80 ? '. Say the whole answer before you tap it: the board won\u2019t give partial credit for "I knew that."' : '. Your confidence is well calibrated.') +
        (cal.unsureN >= 5 ? ' When unsure: ' + Math.round(100 * cal.unsureRight / cal.unsureN) + '%.' : '') + '</div>';
    }
    return '<div class="card"><div class="flash-tag">Your last 7 days</div><div style="display:flex;align-items:flex-end;height:52px;margin:6px 0;" aria-hidden="true">' + bars + '</div>' +
      '<div class="muted" style="font-size:.85rem;">' + total + ' cards on ' + days + ' day' + (days === 1 ? '' : 's') + ' • ' + boards + ' Mock Board' + (boards === 1 ? '' : 's') + '</div><div class="btn-row" style="margin-top:8px;"><a class="btn ghost sm" href="#/sendprogress">Send to sponsor</a><a class="btn ghost sm" href="#/badges">Badges</a></div>' + calLine + '</div>';
  }
  // ---- progress snapshot: encoded into a link, shown on the sponsor's phone ----
  function b64e(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function b64d(s) { s = String(s).replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return JSON.parse(decodeURIComponent(escape(atob(s)))); }
  function snapshot() {
    var coreIds = STUDY.cards.filter(function (c) { return c.core && rankOk(c); }).map(function (c) { return c.id; });
    var rs = readyScore(coreIds), q = Store.quizzes();
    var weekAgo = Date.now() - 7 * 86400000;
    var weakPubs = []; var lp = {}; STUDY.cards.forEach(function (c) { if (c.core) lp[c.id] = c.pub; });
    coreIds.forEach(function (id) { var r = Store.recOf(id); if (r && r.lapses) lp["_" + lp[id]] = (lp["_" + lp[id]] || 0) + r.lapses; });
    Object.keys(lp).filter(function (k) { return k.charAt(0) === "_"; }).sort(function (a, b) { return lp[b] - lp[a]; }).slice(0, 3).forEach(function (k) { weakPubs.push(k.slice(1)); });
    return { v: 1, id: Store.uid(), n: (Store.settings().displayName || "").slice(0, 30), bd: Store.settings().boardDate || "", bf: Store.settings().boardFor || "",
      r: rs.ready, s: rs.seen, t: coreIds.length, rc: rs.recalled, st: Store.streak(),
      wk: Store.dayLog(7).reduce(function (a, d) { return a + d.count; }, 0),
      m: q.filter(function (x) { return /^Mock Board/.test(x.deck) && x.total; }).slice(0, 3).map(function (x) { return Math.round(100 * x.score / x.total); }),
      mw: q.filter(function (x) { return /^Mock Board/.test(x.deck) && x.date > weekAgo; }).length, w: weakPubs, at: Date.now(),
      mi: coreIds.map(function (id) { return { id: id, r: Store.recOf(id) }; }).filter(function (o) { return o.r && o.r.lapses > 0; })
        .sort(function (x, y) { return ((y.r.cw || 0) - (x.r.cw || 0)) || (y.r.lapses - x.r.lapses) || (y.r.due < x.r.due ? 1 : -1); }).slice(0, 8).map(function (o) { return o.id; }) };
  }
  function shareProgress() {
    if (!Store.settings().displayName) { App.go("#/sendprogress"); App.toast("Add your name first, so your sponsor knows it's you.", 3500); return; }
    var url = APP_URL + "#/progress/" + b64e(snapshot());
    Store.setChainRole("sent-progress", String(Date.now()));
    var text = (Store.settings().displayName) + "'s board prep progress. Open it to see my weak spots and run a board on them: " + url;
    if (navigator.share) navigator.share({ title: "My board prep progress", text: text }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { App.toast("Progress link copied", 3000); }, function () { App.toast(url, 6000); });
    else App.toast(url, 6000);
  }
  function pubName(id) { var p = STUDY.pubsById[id]; return p ? (p.code === p.title || /^[A-Z][a-z]/.test(p.code) ? p.code : p.title) : id; }
  function screenProgress(data) {
    setTitle("Board Prep Progress", true);
    var x; try { x = b64d(data); } catch (e) { x = null; }
    if (!x || x.v !== 1 || typeof x.r !== "number") { mount.innerHTML = badLink('The progress link is incomplete. Ask the Soldier to send it again.'); return; }
    var who = x.n ? esc(x.n) : "This Soldier", days = null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(x.bd || "")) { var p = x.bd.split("-"), t = new Date(); days = Math.round((new Date(+p[0], +p[1] - 1, +p[2]) - new Date(t.getFullYear(), t.getMonth(), t.getDate())) / 86400000); }
    var weakIds = [], byIdP = {};
    STUDY.cards.forEach(function (c) { byIdP[c.id] = c; });
    var twinSeen = {}, rankFit = function (c) { return !c.rank || !x.bf || x.bf === "BOTH" || c.rank === x.bf; };
    // first the cards the Soldier actually missed, then fill from their weakest subjects
    (Array.isArray(x.mi) ? x.mi : []).forEach(function (id) { var c = byIdP[id]; if (!c || c.pub === "personal" || !rankFit(c) || weakIds.indexOf(id) >= 0) return; if (c.twin) { if (twinSeen[c.twin]) return; twinSeen[c.twin] = 1; } weakIds.push(id); });
    (x.w || []).forEach(function (pub) { STUDY.cards.filter(function (c) { if (!c.core || c.pub !== pub || !rankFit(c)) return false; if (c.twin) { if (twinSeen[c.twin]) return false; twinSeen[c.twin] = 1; } return true; }).slice(0, 4).forEach(function (c) { weakIds.push(c.id); }); });
    var sit = STUDY.cards.filter(function (c) { return c.core && c.pub === "sit" && rankFit(c); }).map(function (c) { return c.id; }).sort(function () { return Math.random() - 0.5; }).slice(0, 2);
    var board = weakIds.slice(0, 8).concat(sit.filter(function (id) { return weakIds.indexOf(id) < 0; }));
    mount.innerHTML =
      '<div class="hero"><div class="big">' + x.r + '%</div><div class="sub">' + who + ' • board-ready</div>' +
        '<div class="bar"><span style="width:' + Math.min(100, x.r) + '%"></span></div>' +
        '<div class="sub" style="margin-top:6px;font-size:.85rem;">Sent ' + niceDate(x.at) + (days != null ? ' • ' + (days > 0 ? 'board in ' + days + ' days' : days === 0 ? 'board today' : 'board date passed') : '') + (x.bf ? ' • ' + esc(x.bf) + ' board' : '') + '</div></div>' +
      '<div class="card"><div class="muted">Board Core studied: <b>' + x.s + ' of ' + x.t + '</b> (right last time: ' + x.rc + ')<br>Last 7 days: <b>' + x.wk + ' cards</b>, ' + x.mw + ' Mock Board' + (x.mw === 1 ? '' : 's') + '<br>Streak: <b>' + x.st + ' days</b>' +
        (x.m && x.m.length ? '<br>Recent Mock Boards: <b>' + x.m.join('%, ') + '%</b>' : '<br>No Mock Boards yet') + '</div></div>' +
      ((x.w || []).length ? '<div class="card"><div class="flash-tag">Weakest subjects</div><div style="font-weight:600;">' + esc(x.w.map(pubName).join(", ")) + '</div></div>' : '') +
      (board.length >= 3 ? '<a class="btn gold lg" href="#/sponsor/' + board.join(",") + '"><svg class=ic aria-hidden=true><use href=#i-users></use></svg> Run a sponsor board on ' + ((x.mi || []).length ? 'the questions they missed' : 'these weak spots') + '</a><div class="spacer"></div>' : '') +
      '<div class="muted center" style="font-size:.85rem;margin-top:8px;">Nothing is sent anywhere: this page was built from the link itself.</div>';
  }
  function screenSendProgress() {
    setTitle("Send My Progress", true);
    var name = Store.settings().displayName || "";
    mount.innerHTML = '<div class="card"><div class="muted">Your sponsor gets a link with your score, cards studied, Mock Boards and weakest subjects, and can run a board on your weak spots. Nothing is stored online.</div></div>' +
      '<label class="lbl" for="dName">Your name</label><input class="input" id="dName" maxlength="30" placeholder="e.g. SPC Rivera" value="' + escAttr(name) + '">' +
      '<div class="spacer"></div><button class="btn gold lg" id="shareMine"><svg class=ic aria-hidden=true><use href=#i-send></use></svg> Send my progress</button>';
    var dn = mount.querySelector("#dName");
    dn.addEventListener("change", function () { Store.setSetting("displayName", dn.value.replace(/[<>]/g, "").trim().slice(0, 30)); App.toast("Name saved"); });
    mount.querySelector("#shareMine").addEventListener("click", function () { Store.setSetting("displayName", dn.value.replace(/[<>]/g, "").trim().slice(0, 30)); shareProgress(); });
  }

  // ---- sources & editions: built from the cards' own citations ----
  function screenSources() {
    setTitle("Sources & Editions", true);
    var by = {};
    STUDY.cards.forEach(function (c) {
      var m = String(c.ref || "").match(/^([^;(]+?)\s*\(([^)]*\d{4}[^)]*)\)/); if (!m) return;
      var k = m[1].trim(), e = m[2].trim(); if (!by[k]) by[k] = { n: 0, ed: {} }; by[k].n++; by[k].ed[e] = (by[k].ed[e] || 0) + 1;
    });
    var rows = Object.keys(by).filter(function (k) { return by[k].n >= 2; }).sort(function (x, y) { return x.localeCompare(y, undefined, { numeric: true }); });
    mount.innerHTML = '<div class="card"><div class="muted">Each subject&#39;s edition, and how many cards cite it. Last checked ' + esc(STUDY.meta.updated ? niceDate(new Date(STUDY.meta.updated + "T12:00:00").getTime()) : "") + '.</div></div>' +
      '<div class="lg">' + rows.map(function (k) {
        var eds = Object.keys(by[k].ed).sort(function (x, y) { return by[k].ed[y] - by[k].ed[x]; });
        var pub = STUDY.pubs.filter(function (p) { return p.code === k; })[0];
        var inner = '<span class="grow"><span class="t" style="font-weight:600;">' + esc(k) + '</span><span class="s">' + esc(eds[0]) + ' \u2022 cited by ' + by[k].n + ' card' + (by[k].n === 1 ? '' : 's') + '</span></span>';
        return pub ? '<a class="li" href="#/pub/' + escAttr(pub.id) + '">' + inner + '<span class="chev" aria-hidden="true"><svg class=ic aria-hidden=true><use href=#i-chev></use></svg></span></a>' : '<div class="li static">' + inner.replace('</span></span>', ' \u2022 cited only</span></span>') + '</div>';
      }).join("") + '</div>' +
      '<div class="muted center" style="font-size:.85rem;margin-top:12px;">Spot a problem? Use the flag on any card.</div>';
  }

  function screenChanges() {
    setTitle("What Changed Recently", true);
    var all = allCards();
    var html = '<div class="card"><div class="muted">Boards check that you know the current rule, not the old one. Tap a change to see the cards.</div></div>';
    var first = true;
    CHANGES.forEach(function (sec) {
      var cs = all.filter(sec.test); if (!cs.length) return;
      html += '<details class="set-fold"' + (first ? ' open' : '') + '><summary>' + esc(sec.h) + ' <span class="pill" style="margin-left:6px;">' + cs.length + '</span></summary>';
      first = false;
      cs.forEach(function (c) {
        html += '<div class="chg"><div style="font-weight:600;margin-bottom:4px;">' + esc(c.q) + '</div><div>' + esc(c.a) + '</div>' + (c.ref ? '<div class="flash-ref">' + esc(c.ref) + '</div>' : '') + '</div>';
      });
      html += '</details>';
    });
    mount.innerHTML = html;
  }

  function screenChain() {
    setTitle("Chain of Command", true);
    var chain = Store.chain();
    var filledN = CHAIN_ROLES.filter(function (r) { return chain[r.k]; }).length;
    var html = '<div class="muted" style="font-size:.85rem;margin:2px 4px 8px;">Boards almost always ask these. <b id="chainN">' + filledN + ' of ' + CHAIN_ROLES.length + '</b> filled in. Saved names become flashcards and Mock Board questions.</div>';
    [["Your unit", true], ["Army &amp; national", false]].forEach(function (g) {
      html += '<div class="lg-h">' + g[0] + '</div><div class="lg">';
      CHAIN_ROLES.filter(function (r) { return r.your === g[1]; }).forEach(function (r) {
        html += '<label class="li ch-row" for="ch-' + r.k + '"><span class="ch-l">' + esc(r.label) + '</span><input class="input chainin" id="ch-' + r.k + '" data-k="' + r.k + '" placeholder="' + (EXAMPLE_NAME[r.k] || "RANK Name") + '" value="' + (chain[r.k] ? escAttr(chain[r.k]) : "") + '"></label>';
      });
      html += '</div>';
    });
    html += '<div class="spacer"></div><button class="btn gold lg" id="saveChain">Done</button>';
    if (filledN) html += '<div class="spacer"></div><a class="btn ghost" href="#/flash/chain">Study these ' + filledN + ' as flashcards</a>';
    mount.innerHTML = html;
    mount.querySelectorAll(".chainin").forEach(function (inp) { inp.addEventListener("input", function () { Store.setChainRole(inp.getAttribute("data-k"), inp.value.trim()); flashSaved();
      var cn = mount.querySelector("#chainN"); if (cn) cn.textContent = Array.prototype.filter.call(mount.querySelectorAll(".chainin"), function (x) { return x.value.trim(); }).length + " of " + CHAIN_ROLES.length; }); });
    mount.querySelector("#saveChain").addEventListener("click", function () {
      mount.querySelectorAll(".chainin").forEach(function (inp) { Store.setChainRole(inp.getAttribute("data-k"), inp.value.trim()); });
      App.toast("Roster saved"); screenChain();
    });
  }

  function groupChecks(h) { return h.replace(/((?:<button class="row check[^"]*"[\s\S]*?<\/button>)+)/g, '<div class="lg rows">$1</div>'); }
  function screenUniform() {
    setTitle("Uniform Inspection", true);
    var checks = Store.checks();
    var html = '<div class="card"><div class="muted">Tap each item once you&#39;ve checked it.</div></div>' +
      '<details class="set-fold" style="margin-top:0;"><summary>Picture: where the main items go on the AGSU coat</summary>' + UNIFORM_SVG +
        '<div class="muted" style="font-size:.85rem;margin-top:6px;">Simple sketch, not to scale, shown as you face the Soldier (their right is on your left). From DA PAM 670-1 and AD 2025-18; your board memo and local SOP have the final say.</div><div style="height:8px;"></div></details>';
    UNIFORM_CHECKS.forEach(function (u) {
      var on = !!checks[u.id];
      html += '<button class="row check' + (on ? " checked" : "") + '" data-id="' + u.id + '" role="checkbox" aria-checked="' + (on ? "true" : "false") + '"><div class="checkbox">' + (on ? "&#10003;" : "") + '</div><div class="grow"><div class="ttl">' + checkText(u.t) + '</div></div></button>';
    });
    html += '<div class="spacer"></div><a class="btn ghost" href="#/flash/pam670-1">Study the uniform placement cards (DA PAM 670-1)</a>' +
      '<div class="spacer"></div><button class="btn ghost" id="clear">Clear all checkmarks</button>';
    var doneN = UNIFORM_CHECKS.filter(function (u) { return checks[u.id]; }).length;
    html = '<div class="check-prog"><b>' + doneN + ' of ' + UNIFORM_CHECKS.length + '</b> checked<div class="bar"><span style="width:' + Math.round(100 * doneN / UNIFORM_CHECKS.length) + '%"></span></div></div>' + html;
    mount.innerHTML = groupChecks(html);
    mount.querySelectorAll(".check").forEach(function (b) { b.addEventListener("click", function () { Store.toggleCheck(b.getAttribute("data-id")); screenUniform(); }); });
    mount.querySelector("#clear").addEventListener("click", function () { if (!confirm("Clear all checkmarks?")) return; UNIFORM_CHECKS.forEach(function (u) { if (Store.checks()[u.id]) Store.toggleCheck(u.id); }); screenUniform(); });
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
  // Your actual board memo: the local SOP beats any app, so let the Soldier practice with it
  var MEMO_FIELDS = [
    { k: "report", t: "Exact reporting wording", h: "Copy it word for word from your memo or SOP.", ph: "e.g. Sergeant Major, Specialist Rivera reports to the President of the Board." },
    { k: "uniform", t: "Uniform", h: "What the memo says to wear.", ph: "e.g. AGSU with garrison cap" },
    { k: "when", t: "Date, time, and place", h: "And what time to arrive.", ph: "e.g. 15 Dec, 0900, Bldg 2-1101 conference room; arrive 0830" },
    { k: "president", t: "Board president and members", h: "Names and ranks, if the memo lists them.", ph: "e.g. CSM Harris; 1SG Lee; 1SG Ortiz" },
    { k: "notes", t: "Anything else", h: "Local rules: knocking, where to sit, what to bring.", ph: "e.g. Knock once; bring ID card only" }
  ];
  function screenMemo() {
    setTitle("My Board Memo", true);
    var m = Store.chain();
    var html = '<div class="card"><div class="muted">Type the key parts of your board memo here. When you report in on a Full Mock Board, the app shows your memo\'s exact wording.</div></div>';
    MEMO_FIELDS.forEach(function (f) {
      html += '<label class="lbl" for="memo-' + f.k + '"><b>' + esc(f.t) + '</b>: ' + esc(f.h) + '</label><textarea class="input" id="memo-' + f.k + '" rows="2" placeholder="' + escAttr(f.ph) + '">' + esc(m["memo-" + f.k] || "") + '</textarea>';
    });
    html += '<div class="spacer"></div><button class="btn gold lg" id="memoSave">Done</button>';
    mount.innerHTML = html;
    mount.querySelectorAll("textarea").forEach(function (t) { t.addEventListener("input", function () { var k = t.id.replace(/^memo-/, ""); Store.setChainRole("memo-" + k, t.value.trim().slice(0, 400)); flashSaved(); }); });
    mount.querySelector("#memoSave").addEventListener("click", function () {
      MEMO_FIELDS.forEach(function (f) { Store.setChainRole("memo-" + f.k, mount.querySelector("#memo-" + f.k).value.trim().slice(0, 400)); });
      App.toast("Memo saved");
    });
  }

  // ---- promotion points worksheet: an estimate. Official points come from your records in IPPS-A. ----
  var PTS = [
    { k: "mil", t: "Military training", max: { SGT: 280, SSG: 230 }, h: "Weapons qualification plus your AFT score.", ref: "para 3-15, tables 3-2 to 3-4" },
    { k: "awd", t: "Awards, decorations and achievements", max: { SGT: 145, SSG: 165 }, h: "Awards, badges and other achievements in your records.", ref: "para 3-16, tables 3-5 and 3-6" },
    { k: "med", t: "Military education", max: { SGT: 240, SSG: 245 }, h: "BLC (for SGT) or ALC (for SSG), honors, resident courses and online training.", ref: "para 3-17" },
    { k: "civ", t: "Civilian education", max: { SGT: 135, SSG: 160 }, h: "College credit, credit exams and certifications.", ref: "para 3-18" }
  ];
  // M16/M4/M249 qualification (DA Form 7801/7822): hits 40 down to 23 (tables 3-2 and 3-3)
  var RIFLE = { SGT: [160, 153, 145, 138, 130, 123, 115, 108, 100, 93, 85, 78, 70, 63, 55, 48, 40, 33], SSG: [110, 107, 104, 101, 98, 91, 84, 77, 70, 63, 56, 52, 48, 44, 40, 36, 32, 28] };
  function riflePts(hits, rank) { hits = hits | 0; if (hits > 40) hits = 40; return hits >= 23 ? RIFLE[rank][40 - hits] : 0; }
  // table 3-4: 500 = 120, then 3 points less per 5-point band, 300-304 = 1
  function aftPts(s) { s = s | 0; if (s >= 500) return 120; if (s >= 305) return 117 - 3 * Math.floor((499 - s) / 5); return s >= 300 ? 1 : 0; }
  var AWARDS = [["aam", "Army Achievement Medal", 10], ["gcm", "Good Conduct Medal", 10], ["arcom", "Army Commendation Medal", 20], ["msm", "Meritorious Service Medal", 25], ["bsm", "Bronze Star Medal", 30]];
  function screenPoints() {
    setTitle("Promotion Points Worksheet", true);
    var rank = Store.settings().boardFor === "SSG" ? "SSG" : "SGT", m = Store.chain();
    var school = rank === "SSG" ? "ALC" : "BLC";
    function inp(id, ph, w) { return '<input class="input" id="' + id + '" inputmode="numeric" maxlength="4" placeholder="' + ph + '" value="' + escAttr(m["pts-" + id.slice(2)] || "") + '"' + (w ? ' style="max-width:' + w + ';"' : '') + '>'; }
    var help = {
      mil: '<label class="lbl" for="ptxhits">Rifle qualification hits (M4/M16/M249, out of 40)</label>' + inp("ptxhits", "e.g. 33", "140px") +
        '<label class="lbl" for="ptxaft">AFT total score (last record test)</label>' + inp("ptxaft", "e.g. 420", "140px") + '<div class="muted" id="ptxmilsplit" style="font-size:.85rem;margin-top:6px;"></div>',
      awd: AWARDS.map(function (w) { return '<label class="lbl" for="ptx' + w[0] + '">' + esc(w[1]) + ' (' + w[2] + ' each): how many?</label>' + inp("ptx" + w[0], "0", "100px"); }).join("") +
        '<div class="muted" style="font-size:.85rem;margin-top:4px;">Badges and other awards (tables 3-5 and 3-6): add them in the box above.</div>',
      med: '<label class="switch card" style="margin-top:6px;"><input type="checkbox" id="ptxschool"' + (m["pts-xschool"] ? " checked" : "") + '> <span>I graduated ' + school + ' (+150)</span></label>' +
        '<label class="lbl" for="ptxweeks">Resident military courses in ATRRS: total weeks (4 points a week, up to ' + (rank === "SSG" ? 115 : 110) + ')</label>' + inp("ptxweeks", "e.g. 2", "120px") +
        '<label class="lbl" for="ptxcbt">Online courses (ATRRS self-development, Army e-Learning): total hours (1 point per 5 hours, up to 90)</label>' + inp("ptxcbt", "e.g. 40", "120px") +
        '<div class="chip-row seg3" id="ptxhon">' + [["0", "None"], ["20", "Comdt&#39;s list<small>+20</small>"], ["40", "DHG / DLG<small>+40</small>"]].map(function (h) { return '<button class="chip' + ((m["pts-xhon"] || "0") === h[0] ? " on" : "") + '" data-h="' + h[0] + '">' + esc(h[1]) + '</button>'; }).join("") + '</div>',
      civ: '<label class="lbl" for="ptxhours">College semester hours (2 points each)</label>' + inp("ptxhours", "e.g. 15", "140px")
    };
    var html = '<div class="card"><div class="muted">A quick estimate. Tap <b>Figure it for me</b> to work out a category. Your real points come from your records (AR 600-8-19, para 3-14).</div></div>' +
      '<div class="chip-row" id="ptRank">' + ["SGT", "SSG"].map(function (r) { return '<button class="chip' + (r === rank ? ' on' : '') + '" data-r="' + r + '">For ' + r + '</button>'; }).join("") + '</div>';
    PTS.forEach(function (p) {
      html += '<label class="lbl" for="pt-' + p.k + '"><b>' + esc(p.t) + '</b> (max ' + p.max[rank] + ')</label>' +
        '<input class="input" id="pt-' + p.k + '" inputmode="numeric" maxlength="3" placeholder="0" value="' + escAttr(m["pts-" + p.k] || "") + '">' +
        '<details class="pt-help"' + (m["pts-x" + p.k] ? " open" : "") + '><summary class="muted" style="font-size:.85rem;margin-top:4px;"><svg class=ic aria-hidden=true><use href=#i-calc></use></svg> Figure it for me</summary><div class="muted" style="font-size:.85rem;margin:4px 0;">' + esc(p.h) + ' AR 600-8-19 (Mar 2026), ' + p.ref + '.</div>' + help[p.k] + '</details><div style="height:10px;"></div>';
    });
    html += '<label class="lbl" for="pt-cut">This month\'s cutoff score for your MOS (from your S1 or the HRC cutoff list)</label>' +
      '<input class="input" id="pt-cut" inputmode="numeric" maxlength="3" placeholder="e.g. 450" value="' + escAttr(m["pts-cut"] || "") + '">' +
      '<div class="card" id="ptTotal" style="margin-top:12px;border-color:var(--gold);"></div>';
    mount.innerHTML = html;
    function n(id) { var e = mount.querySelector("#" + id); var v = parseInt(((e && e.value) || "").replace(/\D/g, ""), 10); return isNaN(v) ? null : v; }
    function save(id) { var e = mount.querySelector("#" + id); Store.setChainRole("pts-" + id.replace(/^pt-|^pt/, ""), (e.value || "").replace(/\D/g, "").slice(0, 4)); }
    var hon = m["pts-xhon"] || "0";
    function convert(k) {   // fill a category from the helper inputs
      var v = null;
      if (k === "mil") { var h = n("ptxhits"), s = n("ptxaft"); if (h != null || s != null) { var rp = h != null ? riflePts(h, rank) : 0, ap = s != null ? aftPts(s) : 0; v = rp + ap;
          mount.querySelector("#ptxmilsplit").textContent = "Rifle " + rp + " + AFT " + ap + " = " + v + (h != null && h < 23 ? " (below 23 hits earns no rifle points)" : ""); } }
      if (k === "awd") { var t = 0, any = false; AWARDS.forEach(function (w) { var c = n("ptx" + w[0]); if (c != null) { any = true; t += c * w[2]; } }); if (any) v = t; }
      if (k === "med") { var sc = mount.querySelector("#ptxschool").checked, wk = n("ptxweeks"), cb = n("ptxcbt");
        if (sc || wk != null || cb != null) v = (sc ? 150 + (+hon) : 0) + Math.min((wk || 0) * 4, rank === "SSG" ? 115 : 110) + Math.min(Math.floor((cb || 0) / 5), 90); }
      if (k === "civ") { var hr = n("ptxhours"); if (hr != null) v = hr * 2; }
      if (v != null) { mount.querySelector("#pt-" + k).value = String(v); Store.setChainRole("pts-x" + k, "1"); }
      update();
    }
    function update() {
      var total = 0, over = [];
      PTS.forEach(function (p) {
        var raw = n("pt-" + p.k) || 0, cap = p.max[rank];
        if (raw > cap) over.push(p.t.toLowerCase() + " counts only up to " + cap);
        total += Math.min(raw, cap); save("pt-" + p.k);
      });
      var cut = n("pt-cut"); save("pt-cut");
      var blank = PTS.filter(function (p) { return n("pt-" + p.k) == null; }).length;
      var gap = cut == null ? "" : blank ? '<div class="muted" style="margin-top:6px;">Fill in all four categories (0 is fine) to compare with the cutoff.</div>' : total >= cut ? '<div style="margin-top:6px;" class="badge-good"><b>' + (total - cut) + ' points over the cutoff.</b></div>'
        : '<div style="margin-top:6px;"><b>' + (cut - total) + ' points short of the cutoff.</b> <span class="muted">The categories with the most room left are the fastest gains.</span></div>';
      var room = PTS.map(function (p) { return { t: p.t, left: p.max[rank] - Math.min(n("pt-" + p.k) || 0, p.max[rank]) }; }).sort(function (x, y) { return y.left - x.left; }).slice(0, 2);
      var calm = (rank === "SGT" && !mount.querySelector("#ptxschool").checked) ? '<div class="muted" style="font-size:.85rem;margin-top:6px;">Don\u2019t panic if you\u2019re well short: that\u2019s normal before BLC. You don’t need BLC to pin on SGT (AR 600-8-19, para 1-34a), but graduating adds 150 points, the biggest single jump.</div>' : '';
      var stk = document.getElementById("ptSticky");
      if (!stk && window.IntersectionObserver) { new IntersectionObserver(function (es) { var b = document.getElementById("ptSticky"); if (b) b.classList.toggle("off", es[0].isIntersecting); }).observe(mount.querySelector("#ptTotal")); }
      if (!stk) { mount.addEventListener("focusin", function (e) { if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { var b = document.getElementById("ptSticky"); if (b) b.classList.add("typing"); } });
        mount.addEventListener("focusout", function () { var b = document.getElementById("ptSticky"); if (b) b.classList.remove("typing"); }); }
      if (!stk) { stk = document.createElement("a"); stk.id = "ptSticky"; stk.href = "#"; stk.addEventListener("click", function (e) { e.preventDefault(); var t = mount.querySelector("#ptTotal"); if (t) t.scrollIntoView({ behavior: "smooth", block: "center" }); }); mount.appendChild(stk); }
      stk.innerHTML = '<span>Your estimate</span><b>' + total + ' <small>of 800</small></b>' + (cut != null && !blank ? '<span class="' + (total >= cut ? 'badge-good' : 'badge-bad') + '">' + (total >= cut ? 'at or above' : (cut - total) + ' below') + ' the ' + cut + ' cutoff</span>' : '');
      mount.querySelector("#ptTotal").innerHTML = '<div class="flash-tag">Your estimate for ' + rank + '</div><div style="font-size:1.6rem;font-weight:800;">' + total + ' <span class="muted" style="font-size:1rem;">of 800</span></div>' + gap +
        '<div class="muted" style="font-size:.85rem;margin-top:6px;">Most room left: ' + room.map(function (r) { return esc(r.t.toLowerCase()) + ' (' + r.left + ')'; }).join(", ") + '.</div>' +
        (over.length ? '<div class="muted" style="font-size:.85rem;margin-top:6px;">Note: ' + esc(over.join("; ")) + '.</div>' : '') + calm;
    }
    PTS.forEach(function (p) { mount.querySelector("#pt-" + p.k).addEventListener("input", update); });
    mount.querySelector("#pt-cut").addEventListener("input", update);
    [["ptxhits", "mil"], ["ptxaft", "mil"], ["ptxhours", "civ"], ["ptxweeks", "med"], ["ptxcbt", "med"]].concat(AWARDS.map(function (w) { return ["ptx" + w[0], "awd"]; })).forEach(function (x) {
      mount.querySelector("#" + x[0]).addEventListener("input", function () { save(x[0]); convert(x[1]); });
    });
    mount.querySelector("#ptxschool").addEventListener("change", function (e) { Store.setChainRole("pts-xschool", e.target.checked ? "1" : ""); convert("med"); });
    mount.querySelectorAll("#ptxhon .chip").forEach(function (b) { b.addEventListener("click", function () {
      hon = b.getAttribute("data-h"); Store.setChainRole("pts-xhon", hon === "0" ? "" : hon);
      mount.querySelectorAll("#ptxhon .chip").forEach(function (o) { o.classList.toggle("on", o === b); }); convert("med"); }); });
    mount.querySelectorAll("#ptRank .chip").forEach(function (b) { b.addEventListener("click", function () { Store.setSetting("boardFor", b.getAttribute("data-r")); screenPoints(); }); });
    // reopening (or switching SGT/SSG): recompute any category that was figured from the helper inputs
    PTS.forEach(function (p) { if (m["pts-x" + p.k] || (p.k === "med" && m["pts-xschool"])) convert(p.k); });
    update();
  }

  function screenRecords() {
    setTitle("Records & What to Bring", true);
    var checks = Store.checks();
    var html = '<div class="card"><div class="muted">Do this the week before your board.</div></div>';
    RECORD_CHECKS.forEach(function (u) {
      var on = !!checks[u.id];
      html += '<button class="row check' + (on ? " checked" : "") + '" data-id="' + u.id + '" role="checkbox" aria-checked="' + (on ? "true" : "false") + '"><div class="checkbox">' + (on ? "&#10003;" : "") + '</div><div class="grow"><div class="ttl">' + checkText(u.t) + '</div></div></button>';
    });
    html += '<div class="spacer"></div><a class="btn ghost" href="#/pub/boardskills">Board Know-How cards</a>';
    var doneN = RECORD_CHECKS.filter(function (u) { return checks[u.id]; }).length;
    html = '<div class="check-prog"><b>' + doneN + ' of ' + RECORD_CHECKS.length + '</b> checked<div class="bar"><span style="width:' + Math.round(100 * doneN / RECORD_CHECKS.length) + '%"></span></div></div>' + html;
    mount.innerHTML = groupChecks(html);
    mount.querySelectorAll(".check").forEach(function (b) { b.addEventListener("click", function () { Store.toggleCheck(b.getAttribute("data-id")); screenRecords(); }); });
  }

  // a numbered step: the first clause bold, anything the Soldier says out loud as a callout
  function stepText(s) {
    var h = esc(s).replace(/\s*—\s*e\.g\.\s*"/, ': "');
    var m = h.match(/^([^.:"]{2,78}[^.:\s"]{2}[.:])\s+(.*)$/);
    if (m) h = '<b>' + m[1] + '</b> ' + m[2];
    return h.replace(/"([^"]{6,})"/g, '<span class="say">\u201c$1\u201d</span>').replace(/\u201c([^\u201d]{6,})\u201d(?![^<]*<\/span>)/g, '<span class="say">\u201c$1\u201d</span>');
  }
  function screenReporting() {
    setTitle("Report to the Board", true);
    var html = '<div class="card"><div class="muted">A general sequence — boards differ. Follow your local board SOP and appointment memo exactly.</div></div>';
    html += '<div class="lg">' + REPORTING_STEPS.map(function (s, i) { return '<div class="li steps-li"><span class="numbubble">' + (i + 1) + '</span><span class="grow" style="font-size:.92rem;">' + stepText(s) + '</span></div>'; }).join("") + '</div>';
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
      '<div class="card"><div class="muted">Most boards open with \u201cTell the board about yourself.\u201d Draft your answer here. It saves as you type and stays on this phone.</div></div>' +
      '<label class="lbl" for="stmt">Your opening statement</label>' +
      '<textarea class="input" id="stmt" rows="12" placeholder="Write your statement...">' + (cur ? esc(cur) : "") + '</textarea>' +
      '<div class="btn-row" style="margin-top:10px;"><button class="btn ghost" id="tmpl">Fill-in template</button><button class="btn ghost" id="ex">See an example</button></div>' +
      '<div id="exBox" hidden><div class="card" style="margin-top:10px;"><div class="flash-tag">Example (fictional Soldier: write your own)</div><div style="white-space:pre-wrap;margin-top:6px;">' +
        esc(SAMPLE_STATEMENT) + '</div><div class="muted" style="font-size:.85rem;margin-top:8px;">Keep yours about a minute. Say it, don\'t read it. Be specific: real duties, real accomplishments, real goals.</div></div></div>' +
      '<div class="spacer"></div><button class="btn gold lg" id="save">Done</button>';
    mount.querySelector("#save").addEventListener("click", function () { Store.setStatement(mount.querySelector("#stmt").value); App.toast("Saved"); });
    mount.querySelector("#stmt").addEventListener("input", function () { Store.setStatement(this.value); flashSaved(); });
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
    var html = '<div class="card"><div class="muted">What a board is and how it runs (AR 600-8-19, Mar 2026). Your board memo has your time, place, uniform and reporting wording.</div></div>' +
      '<h2 class="section">Step by step</h2>';
    [ "Before: check your records and points are current, confirm the uniform and time in your board memo, and arrive early.",
      "When called: knock if your SOP says so, enter, halt about two steps in front of the president, salute, and report: \"Sergeant Major, (your rank and last name) reports to the President of the Board.\"",
      "Some boards have you do a few facing movements first. Then sit only when directed, at attention. The president may ask you to tell the board about yourself.",
      "Each board member asks questions in turn: leadership, Army programs, basic Soldiering, world affairs, and required situational questions on things like harassment, assault, abuse, and suicide.",
      "The president asks last and closes the board. When dismissed: stand, salute, hold until returned, face about, and march out.",
      "After: each voting member votes yes or no and the majority decides. The promotion authority makes the final call. If you aren't recommended, your first-line leader counsels you in writing on how to improve (AR 600-8-19, para 1-33)." ]
      .forEach(function (t, i) { html += (i ? '' : '<div class="lg">') + '<div class="li steps-li"><span class="numbubble">' + (i + 1) + '</span><span class="grow" style="font-size:.92rem;">' + stepText(t) + '</span></div>'; });
    html += '</div>';
    ROOM_SECTIONS.forEach(function (sec) {
      html += '<details class="set-fold"><summary>' + esc(sec.h) + '</summary>';
      sec.ids.forEach(function (id) {
        var c = byId[id]; if (!c) return;
        html += '<div class="chg"><div style="font-weight:600;margin-bottom:4px;">' + esc(c.q) + '</div><div>' + esc(c.a) + '</div>' +
          (c.ref ? '<div class="flash-ref">' + esc(c.ref) + '</div>' : '') + '</div>';
      });
      html += '</details>';
    });
    html += '<div class="spacer"></div><a class="btn gold lg" href="#/reporting">How to report to the board</a><div class="spacer"></div>' +
      '<a class="btn ghost lg" href="#/pick/board">Rehearse it: Full board Mock Board</a>';
    mount.innerHTML = html;
  }

  // ---- Know your Army & your job: things boards ask that depend on YOUR unit and the news (not flashcard facts) ----
  var KNOW_PROMPTS = [
    { id: "unit", t: "Your unit", h: "Battalion, brigade, and division: name, motto, what the patch means, mission, and a little history." },
    { id: "job", t: "Your job", h: "Tip: More > My Cards > Start my MOS cards turns this into study cards. Your MOS title and main duties, and a few of the individual tasks you perform. Boards can check your job proficiency: look up your MOS Soldier's Manual (STP) and your individual critical task list on the Central Army Registry or your Digital Job Book, and ask your squad leader which tasks your board likes to ask." },
    { id: "post", t: "Your installation", h: "Installation commander and CSM; where ACS, AER, the SHARP office, and behavioral health are; the SHARP and suicide hotlines." },
    { id: "army", t: "What's changing in the Army", h: "Recent changes you should be able to talk about: the AFT and Combat Field Test, waist-to-height ratio, grooming rules. See What Changed Recently for the details and sources." },
    { id: "news", t: "Current events", h: "A few national and world headlines from this month, from a reliable news source, and how they could affect the Army or your unit." }
  ];
  function screenKnowledge() {
    setTitle("Know Your Army & Your Job", true);
    var notes = Store.chain(), todoChips;
    var chainNow = Store.chain();
    var todo = CHAIN_ROLES.filter(function (r) { return !chainNow[r.k]; }).map(function (r) { return r.label; })
      .concat(KNOW_PROMPTS.filter(function (k) { return !notes["know-" + k.id]; }).map(function (k) { return k.t; }));
    var html = '<div class="muted" style="font-size:.85rem;margin:2px 4px 8px;">Boards ask about your unit, your job, and current events. Your notes stay on this phone.</div>' +
      (todo.length ? '<details class="set-fold"><summary>Still to look up <span class="pill">' + todo.length + '</span></summary>' +
        '<div id="todoChips"></div>' +
        '' + (todoChips = function () {
          var roles = CHAIN_ROLES.filter(function (r) { return !chainNow[r.k]; }), kps = KNOW_PROMPTS.filter(function (k) { return !notes["know-" + k.id]; });
          return (roles.length ? '<div class="lg-h" style="margin-top:4px;">Leaders to name (' + roles.length + ')</div><div class="chip-row">' + roles.map(function (r) { return '<a class="chip" href="#/chain">' + esc(r.label) + '</a>'; }).join("") + '</div>' : '') +
            (kps.length ? '<div class="lg-h">Notes to write (' + kps.length + ')</div><div class="chip-row">' + kps.map(function (k) { return '<button class="chip" data-open="' + k.id + '">' + esc(k.t) + '</button>'; }).join("") + '</div>' : '');
        }, '') +
        '<div class="muted" style="font-size:.85rem;margin:8px 2px 10px;">Names change: check army.mil, your unit\'s page, or your chain of command. Don\'t trust an old smart book.</div></details>'
        : '<div class="card"><div class="badge-good" style="font-weight:700;">&#10003; Everything filled in. Re-check names the week of your board.</div></div>') +
      group("", [li("#/chain", "<svg class=ic aria-hidden=true><use href=#i-sitemap></use></svg>", "Chain of Command roster", "Your leaders, up to the President"), li("#/changes", "<svg class=ic aria-hidden=true><use href=#i-spark></use></svg>", "What's new", "AFT, waist-to-height, grooming")]);
    html += '<div class="lg-h">Your notes</div>';
    KNOW_PROMPTS.forEach(function (k) {
      var done = !!notes["know-" + k.id];
      html += '<details class="set-fold know-fold"' + (done ? '' : '') + '><summary>' + esc(k.t) + '<span class="pill' + (done ? ' pill-done' : '') + '">' + (done ? '&#10003; done' : 'to do') + '</span></summary>' +
        '<div class="muted" style="font-size:.85rem;margin:0 2px 8px;">' + esc(k.h) + '</div>' +
        '<textarea class="input" id="kn-' + k.id + '" rows="4" placeholder="Your notes...">' + esc(notes["know-" + k.id] || "") + '</textarea><div style="height:8px;"></div></details>';
    });
    html += '<div class="spacer"></div><button class="btn gold lg" id="knSave">Done</button>';
    mount.innerHTML = html;
    KNOW_PROMPTS.forEach(function (k) { var t = mount.querySelector("#kn-" + k.id); t.addEventListener("input", function () { Store.setChainRole("know-" + k.id, t.value.trim()); flashSaved(); }); });
    // the chips are built when the fold opens, so the closed page stays light
    var tc = mount.querySelector("#todoChips");
    if (tc) tc.closest("details").addEventListener("toggle", function () { if (this.open && !tc.innerHTML) { tc.innerHTML = todoChips(); wireOpen(); } });
    function wireOpen() { mount.querySelectorAll("[data-open]").forEach(function (b) { b.addEventListener("click", function () {
      var t = mount.querySelector("#kn-" + b.getAttribute("data-open")); if (!t) return; var d = t.closest("details"); if (d) d.open = true; t.scrollIntoView({ block: "center" }); t.focus(); }); }); }
    mount.querySelector("#knSave").addEventListener("click", function () {
      KNOW_PROMPTS.forEach(function (k) { Store.setChainRole("know-" + k.id, mount.querySelector("#kn-" + k.id).value.trim()); });
      App.toast("Notes saved");
    });
  }

  // ---------------- router ----------------
  function route() {
    if (window.App) App.busy = null;
    if (window.MockBoard) MockBoard.stop();
    if (window.Drive) Drive.stop();
    if (window.Speech) Speech.stop();
    var hash = location.hash || "#/";
    var parts = hash.replace(/^#\//, "").split("/");
    var head = parts[0] || "";
    window.scrollTo(0, 0);
    // practice screens get the whole phone (no tab bar; the main button pins to the bottom); sponsor pages get a guest shell
    document.body.classList.toggle("session", /^(flash|type|quiz|drive|board|lesson|sheetin|sponsor)$/.test(head));
    document.body.classList.toggle("guest", /^(sponsor|sheet|sbresult|progress|takecards)$/.test(head));
    setTimeout(sessionBanner, 0);

    if (head === "") return screenHome(), tab("home");
    if (head === "learn") return screenLearn(), tab("learn");
    if (head === "track") return screenTrack(parts[1]), tab("learn");
    if (head === "lesson") return screenLesson(parts.slice(1).join("/")), tab("learn");
    if (head === "browse") return screenBrowse(), tab("browse");
    if (head === "search") return screenSearch(), tab("search");
    if (head === "more") return screenMore(), tab("more");
    if (head === "settings") return screenSettings(parts[1]), tab("more");
    if (head === "backup") return screenBackup(), tab("more");
    if (head === "share") return screenShare(), tab("more");
    if (head === "kit") return screenKit(), tab("more");
    if (head === "mos") return screenMos(), tab("more");
    if (head === "takecards") return screenTakeCards(parts[1] || ""), tab("more");
    if (head === "mycards") {
      if (parts[1] === "new") return screenMyCardForm(null), tab("more");
      if (parts[1] === "edit") return screenMyCardForm(parts.slice(2).join("/")), tab("more");
      return screenMyCards(), tab("more");
    }
    if (head === "boardday") return screenBoardDay(), tab("more");
    if (head === "chain") return screenChain(), tab("more");
    if (head === "uniform") return screenUniform(), tab("more");
    if (head === "reporting") return screenReporting(), tab("more");
    if (head === "statement") return screenStatement(), tab("more");
    if (head === "knowledge") return screenKnowledge(), tab("more");
    if (head === "room") return screenRoom(), tab("more");
    if (head === "records") return screenRecords(), tab("more");
    if (head === "points") return screenPoints(), tab("more");
    if (head === "memo") return screenMemo(), tab("more");
    if (head === "changes") return screenChanges(), tab("more");
    if (head === "sources") return screenSources(), tab("more");
    if (head === "badges") return screenBadges(), tab("more");
    if (head === "sendprogress" || head === "squad") return screenSendProgress(), tab("more");
    if (head === "progress") return screenProgress(parts[1] || ""), tab("home");
    if (head === "sponsor") return screenSponsorBoard(parts[1] || ""), tab("home");
    if (head === "sheet") return screenSheet(parts[1] || ""), tab("home");
    if (head === "sheetin") return screenSheetIn(parts[1] || ""), tab("home");
    if (head === "sbresult") return screenSponsorResult(parts.slice(1)), tab("home");
    if (head === "pub") return screenPub(parts[1]), tab(curTab === "search" ? "search" : "browse");
    if (head === "read") return screenRead(parts[1], parts[2]), tab(curTab === "search" ? "search" : "browse");
    if (head === "pick") return screenPick(parts[1]), modeTab();
    if (head === "flash") return screenFlash(parts[1]), modeTab();
    if (head === "type") return screenType(parts[1]), modeTab();
    if (head === "quiz") return screenQuiz(parts[1]), modeTab();
    if (head === "board") return screenBoard(parts[1]), modeTab();
    if (head === "drive") return screenDrive(parts[1]), modeTab();
    if (head) {
      setTitle("Not found", true);
      mount.innerHTML = '<div class="empty-state"><svg class=ic aria-hidden=true><use href=#i-alert></use></svg><div class="t">Page not found</div><div class="muted">That link doesn&#39;t go anywhere in the app.</div><a class="btn gold lg" href="#/">Go to Home</a></div>';
      return tab("none");
    }
    return screenHome(), tab("home");
  }
  var curTab = (function () { try { return sessionStorage.getItem("ncob-tab") || "home"; } catch (e) { return "home"; } })();
  function modeTab() { tab(curTab); }
  function tab(name) { curTab = name; try { sessionStorage.setItem("ncob-tab", name); } catch (e) {} document.querySelectorAll(".tab").forEach(function (t) { var on = t.getAttribute("data-tab") === name; t.classList.toggle("active", on); if (on) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current"); }); }
  var SHORT = { "What the Board Room Is Like": "Board Room", "Records & What to Bring": "Records", "Promotion Points Worksheet": "Points", "Know Your Army & Your Job": "Know Your Army",
    "What Changed Recently": "What's New", "Board Sheet for Your Sponsor": "Sponsor Sheet", "Sponsor Board Results": "Sponsor Results", "Enter Paper Board Results": "Paper Results",
    "Start My MOS Cards": "My MOS Cards", "Board Prep Progress": "Progress", "Sources & Editions": "Sources", "Promotion Points": "Points", "Add Shared Cards": "Shared Cards", "Send My Progress": "Send Progress" };
  function setTitle(t, showBack) {
    titleEl.textContent = SHORT[t] || t;
    var h = (location.hash || "#/").replace(/^#\//, "").split("/")[0];
    var inApp = false; try { if (!document.body.classList.contains("guest")) sessionStorage.setItem("ncob-inapp", "1"); inApp = !!sessionStorage.getItem("ncob-inapp"); } catch (e) {}
    backBtn.hidden = !showBack || /^(|learn|browse|search|more)$/.test(h) || (document.body.classList.contains("guest") && !inApp);   // tab screens: the tab bar is the way back
  }

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
  // Off-script board questions from the Soldier's own notes (Mock Board's "your unit and your Army" member)
  function localQuestions(n) {
    var ch = Store.chain(), out = [];
    var LOOK = "Not filled in yet. Look it up and add it under Board Day Prep";
    var pick = function (list) { var f = list.filter(function (r) { return ch[r.k]; }); return shuffle(f.length ? f : list)[0]; };
    var mine = pick(CHAIN_ROLES.filter(function (r) { return r.your && ["teamleader", "squadleader"].indexOf(r.k) < 0; }));
    var army = pick(CHAIN_ROLES.filter(function (r) { return !r.your; }));
    var KQ = { unit: "Tell the board about your unit: its mission, its motto, and a little of its history.", post: "Who is your installation commander, and where on post would you send a Soldier who needs help?", news: "What is in the news this month that could affect the Army or your unit?" };
    var kf = ["unit", "post", "news"].filter(function (k) { return ch["know-" + k]; });
    var kid = shuffle(kf.length ? kf : ["unit", "post", "news"])[0];
    var pool = [
      { id: "chain-" + mine.k, pub: "chain", topic: "Chain of Command", q: "Who is your " + mine.label + "?", a: ch[mine.k] || LOOK + " > Chain of Command.", ref: "Your roster (Board Day Prep > Chain of Command)", flashOnly: true, custom: true },
      { id: "chain-" + army.k, pub: "chain", topic: "Chain of Command", q: "Who is the " + army.label + "?", a: ch[army.k] || LOOK + " > Chain of Command (check army.mil).", ref: "Your roster (Board Day Prep > Chain of Command)", flashOnly: true, custom: true },
      { id: "know-" + kid, pub: "chain", topic: "Know your Army", q: KQ[kid], a: ch["know-" + kid] || LOOK + " > Know Your Army & Your Job.", ref: "Your notes (Board Day Prep > Know Your Army & Your Job)", flashOnly: true, custom: true }
    ];
    out = pool.filter(function (c) { return c.a.indexOf(LOOK) !== 0; }).concat(shuffle(pool.filter(function (c) { return c.a.indexOf(LOOK) === 0; }))).slice(0, n || 2);
    out.forEach(function (c) { c.local = true; if (c.a.indexOf(LOOK) === 0) c.unfilled = true; });
    return out;
  }

  var App = {
    localQuestions: localQuestions,
    sessionNextHtml: sessionNextHtml,
    go: function (h) { location.hash = h; },
    appUrl: APP_URL,
    allCards: allCards,
    reportingSteps: REPORTING_STEPS,
    toast: function (msg, ms) {
      document.querySelectorAll(".toast").forEach(function (o) { o.remove(); });   // one at a time
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

  var userFold = 0;
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("summary")) userFold = Date.now(); }, true);
  document.addEventListener("toggle", function (e) {
    var d = e.target; if (!d || d.tagName !== "DETAILS" || !d.open || Date.now() - userFold > 800) return;
    var r = d.getBoundingClientRect(); if (r.bottom > window.innerHeight - 70) d.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, true);
  function askLeave(go) {
    if (document.querySelector(".leave-sheet")) return;
    var o = document.createElement("div"); o.className = "leave-sheet"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true");
    o.innerHTML = '<div class="leave-box"><div class="t">Leave this session?</div><div class="muted">You&#39;ll lose your place. Cards you already graded stay graded.</div>' +
      '<button class="btn gold lg" id="lvStay">Keep going</button><div class="spacer"></div><button class="btn ghost lg" id="lvGo">Leave</button></div>';
    document.body.appendChild(o);
    o.querySelector("#lvStay").addEventListener("click", function () { o.remove(); });
    o.querySelector("#lvGo").addEventListener("click", function () { o.remove(); App.busy = null; go(); });
    o.addEventListener("click", function (e) { if (e.target === o) o.remove(); });
    o.querySelector("#lvStay").focus();
  }
  backBtn.addEventListener("click", function (e) {
    if (window.App && App.busy && App.busy()) { e.stopImmediatePropagation(); return askLeave(function () { if (history.length > 1) history.back(); else App.go("#/"); }); }
  }, true);
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
  // the phone's own Back (or swipe) during a running board or quiz: put the session back and ask
  var lastHash = location.hash, leavingOK = false;
  window.addEventListener("hashchange", function () {
    if (!leavingOK && window.App && App.busy && App.busy()) {
      var want = location.hash;
      history.pushState(null, "", lastHash || "#/");
      askLeave(function () { leavingOK = true; location.hash = want; });
      return;
    }
    leavingOK = false; lastHash = location.hash; route();
  });
  route();
  hideSplash(900);   // long enough to read the version, short enough not to annoy
})();
