/* ===========================================================
   Storage — all progress lives in the browser (localStorage).
   Nothing leaves the phone. Includes spaced-repetition (SRS)
   scheduling, daily goal/streak, custom cards, export/import.
   =========================================================== */
(function () {
  "use strict";

  var KEY = "ncoboard.v1";
  var DAY = 86400000;
  var MC_CAP = 3;   // days: the longest interval a multiple-choice win alone can earn

  var DEFAULT = {
    v: 2,
    cards: {},      // id -> { reps, lapses, ease, interval, due, status, seen, correct, wrong }
    quizzes: [],    // { deck, total, score, date }
    userCards: [],  // user-authored cards
    lessons: {},    // Learn-mode progress: lessonId -> { done, score, date }
    chain: {},      // chain-of-command roster: roleKey -> "RANK Name"
    checks: {},     // board-day checklist: itemId -> bool
    statement: "",  // opening-statement draft
    daily: { date: "", count: 0 },
    goal: 20,
    streak: 0,
    lastStudyDate: "",
    settings: { autoRead: false, timer: 30, driveGap: 5, boardDate: "", fullBoard: true, boardFor: "" }   // boardDate: "YYYY-MM-DD" or ""; boardFor: "SGT", "SSG" or ""
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ---- type-safe cleanup: used on every load AND every backup import, so a
  // damaged or hand-edited file can never leave the app in a state that crashes. ----
  function isObj(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
  function num(v, dflt) { return (typeof v === "number" && isFinite(v)) ? v : dflt; }
  function str(v, dflt) { return typeof v === "string" ? v : dflt; }
  var SAFE_ID = /^[\w-]{1,80}$/;
  function okKey(k) { return k !== "__proto__" && k !== "constructor" && k !== "prototype"; }
  var STATUSES = { "new": 1, review: 1, known: 1 };

  function cleanRec(r) {
    return {
      reps: num(r.reps, 0), lapses: num(r.lapses, 0), ease: num(r.ease, 2.3), interval: num(r.interval, 0),
      due: num(r.due, 0), status: Object.prototype.hasOwnProperty.call(STATUSES, r.status) ? r.status : "new",
      seen: num(r.seen, 0), correct: num(r.correct, 0), wrong: num(r.wrong, 0)
    };
  }
  function cleanUserCard(c, i) {
    if (!isObj(c) || typeof c.q !== "string" || typeof c.a !== "string") return null;
    var out = { id: (SAFE_ID.test(c.id) && okKey(c.id)) ? c.id : "u-" + Date.now() + "-" + i, q: c.q, a: c.a, custom: true };
    if (typeof c.pub === "string") out.pub = c.pub;
    if (typeof c.topic === "string") out.topic = c.topic;
    if (typeof c.ref === "string") out.ref = c.ref;
    if (c.flashOnly) out.flashOnly = true;
    if (Array.isArray(c.choices) && c.choices.every(function (x) { return typeof x === "string"; }) &&
        typeof c.answer === "number" && c.answer >= 0 && c.answer < c.choices.length) {
      out.choices = c.choices.slice(); out.answer = c.answer;
    }
    return out;
  }
  function sanitize(d) {
    var s = clone(DEFAULT), k;
    if (isObj(d.cards)) for (k in d.cards) if (okKey(k) && SAFE_ID.test(k) && isObj(d.cards[k])) s.cards[k] = cleanRec(d.cards[k]);
    if (Array.isArray(d.quizzes)) s.quizzes = d.quizzes.filter(isObj).slice(0, 50).map(function (q) {
      return { deck: str(q.deck, ""), score: num(q.score, 0), total: num(q.total, 0), date: num(q.date, 0) };
    });
    if (Array.isArray(d.userCards)) s.userCards = d.userCards.map(cleanUserCard).filter(Boolean);
    if (isObj(d.lessons)) for (k in d.lessons) if (okKey(k) && isObj(d.lessons[k]))
      s.lessons[k] = { done: !!d.lessons[k].done, score: num(d.lessons[k].score, null), date: num(d.lessons[k].date, 0) };
    if (isObj(d.chain)) for (k in d.chain) if (okKey(k) && typeof d.chain[k] === "string") s.chain[k] = d.chain[k];
    if (isObj(d.checks)) for (k in d.checks) if (okKey(k)) s.checks[k] = !!d.checks[k];
    s.statement = str(d.statement, "");
    if (isObj(d.daily)) s.daily = { date: str(d.daily.date, ""), count: num(d.daily.count, 0) };
    s.goal = Math.max(5, num(d.goal, DEFAULT.goal) | 0);
    s.streak = num(d.streak, 0);
    s.lastStudyDate = str(d.lastStudyDate, "");
    if (isObj(d.settings)) {
      s.settings.autoRead = !!d.settings.autoRead;
      s.settings.timer = num(d.settings.timer, DEFAULT.settings.timer);
      s.settings.driveGap = num(d.settings.driveGap, DEFAULT.settings.driveGap);
      s.settings.boardDate = /^\d{4}-\d{2}-\d{2}$/.test(d.settings.boardDate) ? d.settings.boardDate : "";
      s.settings.fullBoard = d.settings.fullBoard !== false;
      s.settings.boardFor = (d.settings.boardFor === "SGT" || d.settings.boardFor === "SSG" || d.settings.boardFor === "BOTH") ? d.settings.boardFor : "";
      s.settings.voiceAuto = !!d.settings.voiceAuto;
      s.settings.remindersAdded = !!d.settings.remindersAdded;
      s.settings.boardResult = /^\d{4}-\d{2}-\d{2}\|(Recommended|Not recommended|Board postponed)$/.test(d.settings.boardResult || "") ? d.settings.boardResult : "";
    }
    return s;
  }

  function load() {
    var raw = null;
    try {
      raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULT);
      var d = JSON.parse(raw);
      if (!isObj(d)) throw new Error("bad save");
      return sanitize(d);
    } catch (e) {
      // Keep the damaged copy instead of silently overwriting it on the next save.
      try { if (raw) localStorage.setItem(KEY + ".corrupt", raw); } catch (x) {}
      return clone(DEFAULT);
    }
  }

  var state = load();
  var lastFailWarn = 0;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) {
      // Tell the app (at most every 30 s) so it can warn that progress isn't being saved.
      var now = Date.now();
      if (now - lastFailWarn >= 30000) {
        lastFailWarn = now;
        try { window.dispatchEvent(new CustomEvent("ncoboard:savefailed")); } catch (x) {}
      }
      return false;
    }
  }

  // Local calendar date of the day before `ts` (calendar math, safe across DST changes).
  function localYesterday(ts) {
    var d = new Date(ts);
    return localDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1).getTime());
  }

  function localDay(ts) {
    var d = new Date(ts);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function rec(id) {
    if (!state.cards[id])
      state.cards[id] = { reps: 0, lapses: 0, ease: 2.3, interval: 0, due: 0, status: "new", seen: 0, correct: 0, wrong: 0 };
    return state.cards[id];
  }

  // ---- daily goal + streak bookkeeping (called whenever a card is studied) ----
  function touchDay(now) {
    var today = localDay(now);
    if (state.lastStudyDate !== today) {
      var yest = localYesterday(now);
      state.streak = (state.lastStudyDate === yest) ? (state.streak + 1) : 1;
      state.lastStudyDate = today;
    }
    if (state.daily.date !== today) state.daily = { date: today, count: 0 };
    state.daily.count++;
  }

  // the board date (local midnight, ms) or 0 if none is set
  function boardDayMs() {
    var b = state.settings && state.settings.boardDate;
    if (!b || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return 0;
    var p = b.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
  }

  // ---- spaced repetition (SM-2-lite). grade: "again" | "good" | "easy" ----
  function applyGrade(id, grade, now) {
    now = now || Date.now();
    var r = rec(id);
    r.seen++;
    if (grade === "again") {
      r.lapses++; r.reps = 0; r.interval = 0;
      r.ease = Math.max(1.3, r.ease - 0.2);
      r.due = now + 60000;            // ~1 min: comes back this session
      r.status = "review";
    } else {
      if (grade === "easy") r.ease = Math.min(2.8, r.ease + 0.15);
      if (r.reps === 0) r.interval = (grade === "easy") ? 3 : 1;
      else if (r.reps === 1) r.interval = (grade === "easy") ? 6 : 3;
      else r.interval = Math.round(r.interval * r.ease * (grade === "easy" ? 1.3 : 1));
      r.interval = Math.max(1, r.interval);
      r.reps++;
      r.due = now + r.interval * DAY;
      r.status = (r.interval >= 7) ? "known" : "review";
      // Board-date-aware spacing: if the next review would land after the board, pull it in so every studied card
      // gets one last review in the final days before the board (about 3 days out, never sooner than tomorrow).
      var bd = boardDayMs();
      if (bd && now < bd) {
        var latest = bd - 3 * DAY;
        if (r.due > bd - DAY) r.due = Math.max(now + DAY, latest);
      }
    }
    touchDay(now);
    save();
    return r;
  }

  var Store = {
    // ---- flashcards / SRS ----
    grade: function (id, g) { return applyGrade(id, g); },
    markKnown: function (id) { applyGrade(id, "good"); },   // back-compat
    markReview: function (id) { applyGrade(id, "again"); }, // back-compat
    statusOf: function (id) { return state.cards[id] ? state.cards[id].status : "new"; },
    recOf: function (id) { return state.cards[id] || null; },

    // A card is "due" once it has been studied at least once and its review time has
    // arrived. Uses `seen`, not `reps`: a missed ("Again") card resets reps to 0 but
    // must still come back as due — those are the cards you most need.
    isDue: function (id, now) {
      var r = state.cards[id];
      return !!(r && r.seen > 0 && r.due <= (now || Date.now()));
    },
    dueCount: function (cardIds) {
      var now = Date.now(), n = 0;
      for (var i = 0; i < cardIds.length; i++) if (Store.isDue(cardIds[i], now)) n++;
      return n;
    },
    // build a study session: due reviews (oldest first) + up to newLimit fresh cards
    buildQueue: function (cards, newLimit) {
      var now = Date.now();
      var due = [], fresh = [], rest = [];
      cards.forEach(function (c) {
        var r = state.cards[c.id];
        if (!r || !(r.seen > 0)) fresh.push(c);
        else if (r.due <= now) due.push(c);
        else rest.push(c);
      });
      due.sort(function (a, b) { return state.cards[a.id].due - state.cards[b.id].due; });
      // Interleave new cards across subjects (round-robin by publication) instead of one subject at a time:
      // mixing related topics makes you work out which idea applies, which sticks better than blocked practice.
      var byPub = {}, order = [];
      fresh.forEach(function (c) { if (!byPub[c.pub]) { byPub[c.pub] = []; order.push(c.pub); } byPub[c.pub].push(c); });
      if (order.length > 1) {
        var mixed = [], left = fresh.length, k = 0;
        while (left > 0) { var q = byPub[order[k % order.length]]; if (q.length) { mixed.push(q.shift()); left--; } k++; }
        fresh = mixed;
      }
      if (typeof newLimit === "number") fresh = fresh.slice(0, newLimit);
      return due.concat(fresh);
    },

    // ---- quiz ----
    // Quiz (multiple-choice) answers. Recognizing an answer isn't recalling it, so a quiz win schedules a short
    // review (at most MC_CAP days) and can never make a card "known" by itself; that takes flashcard recall.
    // A card already mastered on flashcards is left alone. A miss counts like "Again".
    recordAnswer: function (id, correct) {
      var r = rec(id), now = Date.now();
      if (!correct) { r.wrong++; applyGrade(id, "again", now); return; }
      r.correct++;
      if (r.status === "known") { r.seen++; touchDay(now); save(); return; }
      applyGrade(id, "good", now);
      if (r.interval > MC_CAP) { r.interval = MC_CAP; r.due = now + MC_CAP * DAY; }
      r.status = "review";
      save();
    },
    recordQuiz: function (deck, score, total) {
      state.quizzes.unshift({ deck: deck, score: score, total: total, date: Date.now() });
      state.quizzes = state.quizzes.slice(0, 50);
      save();
    },
    quizzes: function () { return state.quizzes.slice(); },

    // ---- aggregate ----
    mastery: function (ids) {
      if (!ids.length) return 0;
      var k = 0;
      for (var i = 0; i < ids.length; i++) if (this.statusOf(ids[i]) === "known") k++;
      return k / ids.length;
    },
    counts: function (ids) {
      var c = { known: 0, review: 0, new: 0 };
      for (var i = 0; i < ids.length; i++) c[this.statusOf(ids[i])]++;
      return c;
    },

    // ---- daily goal + streak ----
    daily: function () { var t = localDay(Date.now()); return { count: state.daily.date === t ? state.daily.count : 0, goal: state.goal }; },
    streak: function () {
      // streak is 0 if the last study day was before yesterday
      if (!state.lastStudyDate) return 0;
      var t = localDay(Date.now()), y = localYesterday(Date.now());
      if (state.lastStudyDate === t || state.lastStudyDate === y) return state.streak;
      return 0;
    },
    setGoal: function (n) { state.goal = Math.max(5, n | 0); save(); },

    // ---- settings ----
    settings: function () { return state.settings; },
    setSetting: function (k, v) { state.settings[k] = v; save(); },

    // ---- custom cards ----
    userCards: function () { return state.userCards.slice(); },
    addUserCard: function (card) {
      card.id = "u-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
      card.custom = true;
      state.userCards.push(card);
      save();
      return card;
    },
    updateUserCard: function (id, patch) {
      var c = state.userCards.filter(function (x) { return x.id === id; })[0];
      if (c) {
        for (var k in patch) c[k] = patch[k];
        if (!patch || !patch.choices) { delete c.choices; delete c.answer; } // don't keep stale quiz options
        save();
      }
      return c;
    },
    deleteUserCard: function (id) {
      state.userCards = state.userCards.filter(function (x) { return x.id !== id; });
      save();
    },

    // ---- Learn mode lesson progress ----
    markLessonDone: function (id, score) { state.lessons[id] = { done: true, score: score == null ? null : score, date: Date.now() }; save(); },
    lessonDone: function (id) { return !!(state.lessons[id] && state.lessons[id].done); },
    lessonsDoneCount: function (ids) { var n = 0; for (var i = 0; i < ids.length; i++) if (this.lessonDone(ids[i])) n++; return n; },

    // ---- leeches (cards you keep missing) ----
    leeches: function (ids) {
      var out = [];
      for (var i = 0; i < ids.length; i++) { var r = state.cards[ids[i]]; if (r && r.lapses >= 3) out.push(ids[i]); }
      return out;
    },

    // ---- board day: chain of command, checklist, opening statement ----
    chain: function () { return state.chain; },
    setChainRole: function (role, val) { if (val) state.chain[role] = val; else delete state.chain[role]; save(); },
    checks: function () { return state.checks; },
    toggleCheck: function (id) { state.checks[id] = !state.checks[id]; save(); return state.checks[id]; },
    statement: function () { return state.statement || ""; },
    setStatement: function (t) { state.statement = String(t || ""); save(); },

    // ---- backup ----
    exportData: function () { return JSON.stringify(state); },
    importData: function (json) {
      var d = JSON.parse(json);            // throws on bad JSON -> caller catches
      if (!isObj(d) || !isObj(d.cards)) throw new Error("Not a valid backup file.");
      state = sanitize(d); save();
    },

    resetAll: function () { state = clone(DEFAULT); save(); },
    resetCards: function () { state.cards = {}; save(); }
  };

  window.Store = Store;
})();
