/* ===========================================================
   Storage — all progress lives in the browser (localStorage).
   Nothing leaves the phone. Survives app restarts & offline.
   =========================================================== */
(function () {
  "use strict";

  var KEY = "ncoboard.v1";

  var DEFAULT = {
    cards: {},      // cardId -> { status: "known"|"review", seen: n, correct: n, wrong: n }
    quizzes: [],    // { deck, total, score, date }
    streakDate: null,
    streak: 0
  };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT));
      var data = JSON.parse(raw);
      // fill any missing top-level keys (forward compatibility)
      for (var k in DEFAULT) if (!(k in data)) data[k] = JSON.parse(JSON.stringify(DEFAULT[k]));
      return data;
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT));
    }
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  var state = load();

  function cardRec(id) {
    if (!state.cards[id]) state.cards[id] = { status: "new", seen: 0, correct: 0, wrong: 0 };
    return state.cards[id];
  }

  var Store = {
    // ---- flashcards ----
    markKnown: function (id) {
      var r = cardRec(id); r.status = "known"; r.seen++; save(state);
    },
    markReview: function (id) {
      var r = cardRec(id); r.status = "review"; r.seen++; save(state);
    },
    statusOf: function (id) { return state.cards[id] ? state.cards[id].status : "new"; },

    // ---- quiz ----
    recordAnswer: function (id, correct) {
      var r = cardRec(id);
      if (correct) r.correct++; else r.wrong++;
      r.seen++;
      save(state);
    },
    recordQuiz: function (deck, score, total) {
      state.quizzes.unshift({ deck: deck, score: score, total: total, date: Date.now() });
      state.quizzes = state.quizzes.slice(0, 50);
      save(state);
    },
    quizzes: function () { return state.quizzes.slice(); },

    // ---- aggregate progress ----
    // "mastery" = fraction of cards in the set marked known
    mastery: function (cardIds) {
      if (!cardIds.length) return 0;
      var known = 0;
      for (var i = 0; i < cardIds.length; i++)
        if (this.statusOf(cardIds[i]) === "known") known++;
      return known / cardIds.length;
    },
    counts: function (cardIds) {
      var c = { known: 0, review: 0, new: 0 };
      for (var i = 0; i < cardIds.length; i++) c[this.statusOf(cardIds[i])]++;
      return c;
    },

    resetAll: function () {
      state = JSON.parse(JSON.stringify(DEFAULT));
      save(state);
    },
    resetCards: function () {
      state.cards = {};
      save(state);
    }
  };

  window.Store = Store;
})();
