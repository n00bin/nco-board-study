/* ===========================================================
   Storage — all progress lives in the browser (localStorage).
   Nothing leaves the phone. Includes spaced-repetition (SRS)
   scheduling, daily goal/streak, custom cards, export/import.
   =========================================================== */
(function () {
  "use strict";

  var KEY = "ncoboard.v1";
  var DAY = 86400000;

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
    settings: { autoRead: false, timer: 30, driveGap: 6 }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULT);
      var d = JSON.parse(raw);
      for (var k in DEFAULT) if (!(k in d)) d[k] = clone(DEFAULT[k]);
      if (!d.settings) d.settings = clone(DEFAULT.settings);
      for (var sk in DEFAULT.settings) if (d.settings[sk] == null) d.settings[sk] = DEFAULT.settings[sk];
      return d;
    } catch (e) { return clone(DEFAULT); }
  }

  var state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

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
      var yest = localDay(now - DAY);
      state.streak = (state.lastStudyDate === yest) ? (state.streak + 1) : 1;
      state.lastStudyDate = today;
    }
    if (state.daily.date !== today) state.daily = { date: today, count: 0 };
    state.daily.count++;
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

    // cards due for review right now (have been studied and are scheduled)
    dueCount: function (cardIds) {
      var now = Date.now(), n = 0;
      for (var i = 0; i < cardIds.length; i++) {
        var r = state.cards[cardIds[i]];
        if (r && r.reps > 0 && r.due <= now) n++;
      }
      return n;
    },
    // build a study session: due reviews (oldest first) + up to newLimit fresh cards
    buildQueue: function (cards, newLimit) {
      var now = Date.now();
      var due = [], fresh = [], rest = [];
      cards.forEach(function (c) {
        var r = state.cards[c.id];
        if (!r || r.reps === 0) fresh.push(c);
        else if (r.due <= now) due.push(c);
        else rest.push(c);
      });
      due.sort(function (a, b) { return state.cards[a.id].due - state.cards[b.id].due; });
      if (typeof newLimit === "number") fresh = fresh.slice(0, newLimit);
      return due.concat(fresh);
    },

    // ---- quiz ----
    recordAnswer: function (id, correct) {
      var r = rec(id);
      if (correct) r.correct++; else r.wrong++;
      applyGrade(id, correct ? "good" : "again");
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
      var t = localDay(Date.now()), y = localDay(Date.now() - DAY);
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
      if (c) { for (var k in patch) c[k] = patch[k]; save(); }
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
      if (!d || typeof d !== "object" || !("cards" in d)) throw new Error("Not a valid backup file.");
      for (var k in DEFAULT) if (!(k in d)) d[k] = clone(DEFAULT[k]);
      state = d; save();
    },

    resetAll: function () { state = clone(DEFAULT); save(); },
    resetCards: function () { state.cards = {}; save(); }
  };

  window.Store = Store;
})();
