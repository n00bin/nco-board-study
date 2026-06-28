/* ===========================================================
   Learn Mode — for someone starting from zero.
   A guided path of bite-sized lessons: each one TEACHES a small
   group of facts (read them, with context), then PRACTICES them.
   Starts with fundamentals, then walks through each publication.
   =========================================================== */
(function () {
  "use strict";

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  // Plain-English "what is this and why does the board care" intro per publication.
  var OVERVIEWS = {
    "adp6-22": "ADP 6-22 is the Army's book on leadership and the profession. It defines what leadership is, the attributes and competencies every leader needs, and the Army Values. Boards lean on this heavily.",
    "atp6-22-1": "ATP 6-22.1 is how leaders develop Soldiers — counseling, coaching, and mentoring. Know the three types of developmental counseling and the form used (DA Form 4856).",
    "adp3-0": "ADP 3-0 is the Army's capstone doctrine for operations — how the Army fights and wins on land. Focus on decisive action and the warfighting functions.",
    "adp5-0": "ADP 5-0 is how leaders plan, prepare, execute, and assess operations. Know the operations process, the MDMP, and Troop Leading Procedures (TLP).",
    "adp7-0": "ADP 7-0 is how the Army trains. Know the principles of training, 'train as you fight,' crawl-walk-run, and METL.",
    "ar600-20": "AR 600-20 is the Army Command Policy — the rules of command, discipline, and conduct. Chain of command, the NCO support channel, Equal Opportunity, and the ban on hazing and bullying. One of the most-tested regs.",
    "ar27-10": "AR 27-10 governs military justice — how the UCMJ is applied. Know nonjudicial punishment (Article 15) and the three types of courts-martial.",
    "ar350-1": "AR 350-1 is the rulebook for Army training and leader development. Know the three training domains.",
    "ar670-1": "AR 670-1 sets the standards for wear and appearance of the uniform — grooming, insignia placement, and what's authorized (with DA PAM 670-1). The board inspects you against it.",
    "ar600-52": "AR 600-52 is the SHARP program — Sexual Harassment/Assault Response and Prevention. Know the two report types, the SARC and Victim Advocate, and DD Form 2910.",
    "ar600-85": "AR 600-85 is the Army Substance Abuse Program (ASAP). Know its purpose, the Limited Use Policy, and the types of referral.",
    "ar608-1": "AR 608-1 is Army Community Service — the support programs for Soldiers and Families. Know what ACS offers and its symbol (a heart in a hand).",
    "ar930-4": "AR 930-4 is Army Emergency Relief — emergency financial help for Soldiers and Families. Know its motto, that it's a private nonprofit, and how it assists.",
    "stp21-1": "STP 21-1 is the Soldier's Manual of Common Tasks, Warrior Skills Level 1 — the hands-on tasks every Soldier must perform: shoot, move, communicate, survive, and first aid.",
    "stp21-24": "STP 21-24 is the common tasks for NCOs — Warrior Leader Skills, Levels 2-4. The leader tasks expected as you take charge.",
    "fm7-22": "FM 7-22 is Holistic Health and Fitness (H2F). Know the five readiness domains and the Army's fitness test.",
    "tc7-21-13": "TC 7-21.13, the Soldier's Guide, is the all-around handbook — Army history, customs and courtesies, creeds, ranks, and professionalism. A great place to start.",
    "atp3-50-20": "ATP 3-50.20 covers SERE — Survival, Evasion, Resistance, and Escape — and the Code of Conduct's six articles."
  };

  var FUND_OVERVIEW = "New to all of this? Start here. These lessons cover the bedrock every board expects you to know cold — the Army Values, the ranks and chain of command, the creeds, the general orders, and the Code of Conduct. Learn these first, then work through each publication.";

  var FUNDAMENTALS = [
    { title: "Leadership & the Army Values", ids: ["adp6-22-01", "adp6-22-02", "adp6-22-07", "adp6-22-08", "adp6-22-03", "adp6-22-04", "adp6-22-05", "adp6-22-12", "adp6-22-11"] },
    { title: "The Warrior Ethos & the Creeds", ids: ["adp6-22-09", "tc72113-02", "tc72113-03"] },
    { title: "The Three General Orders", ids: ["tc72113-04", "tc72113-05", "tc72113-06"] },
    { title: "Ranks & the Chain of Command", ids: ["tc72113-09", "tc72113-10", "tc72113-11", "ar60020-01", "ar60020-03", "ar60020-04", "ar60020-05", "ar60020-09"] },
    { title: "Army History & Customs", ids: ["tc72113-07", "tc72113-08", "tc72113-12", "tc72113-01"] },
    { title: "The Code of Conduct", ids: ["sere-01", "sere-03", "sere-04", "sere-05", "sere-06", "sere-07", "sere-08", "sere-09"] }
  ];

  function dominantTopic(cards) {
    var count = {}, best = "", bestN = 0;
    cards.forEach(function (c) { var t = c.topic || ""; if (!t) return; count[t] = (count[t] || 0) + 1; if (count[t] > bestN) { bestN = count[t]; best = t; } });
    return best;
  }

  function chunkLessons(cards, trackId) {
    var groups = [], chunk = [];
    cards.forEach(function (c) { chunk.push(c); if (chunk.length >= 8) { groups.push(chunk); chunk = []; } });
    if (chunk.length) { if (chunk.length < 4 && groups.length) groups[groups.length - 1] = groups[groups.length - 1].concat(chunk); else groups.push(chunk); }
    return groups.map(function (cs, n) {
      var topic = dominantTopic(cs);
      return { id: trackId + "-L" + (n + 1), title: "Lesson " + (n + 1) + (topic ? ": " + topic : ""), cards: cs };
    });
  }

  function buildTracks() {
    var all = App.allCards(), byId = {};
    all.forEach(function (c) { byId[c.id] = c; });
    var tracks = [];
    var fLessons = FUNDAMENTALS.map(function (f, n) {
      return { id: "fundamentals-L" + (n + 1), title: f.title, cards: f.ids.map(function (id) { return byId[id]; }).filter(Boolean) };
    }).filter(function (l) { return l.cards.length; });
    tracks.push({ id: "fundamentals", title: "Fundamentals — Start Here", overview: FUND_OVERVIEW, lessons: fLessons });
    STUDY.pubs.forEach(function (p) {
      if (p.id === "mine" || p.id === "chain") return;
      var cards = all.filter(function (c) { return c.pub === p.id; });
      if (!cards.length) return;
      tracks.push({ id: p.id, title: p.code + " — " + p.title, overview: OVERVIEWS[p.id] || "", lessons: chunkLessons(cards, p.id) });
    });
    return tracks;
  }

  function flatLessons(tracks) { var out = []; tracks.forEach(function (t) { t.lessons.forEach(function (l) { out.push(l); }); }); return out; }
  function findLesson(tracks, id) { var f = flatLessons(tracks).filter(function (l) { return l.id === id; }); return f[0] || null; }

  var Learn = {
    // ---- the path / hub ----
    hub: function (container) {
      var tracks = buildTracks();
      var flat = flatLessons(tracks);
      var doneN = Store.lessonsDoneCount(flat.map(function (l) { return l.id; }));
      var pct = flat.length ? Math.round((doneN / flat.length) * 100) : 0;
      var next = flat.filter(function (l) { return !Store.lessonDone(l.id); })[0];

      var html =
        '<div class="hero"><div class="big">' + pct + '%</div><div class="sub">of the learning path complete • ' + doneN + ' / ' + flat.length + ' lessons</div>' +
          '<div class="bar"><span style="width:' + pct + '%"></span></div></div>' +
        '<div class="card"><div class="muted">Learn Mode teaches you the material first, then practices it — a few facts at a time. Work top to bottom.</div></div>';
      if (next) html += '<a class="btn gold lg" href="#/lesson/' + next.id + '">' + (doneN ? "&#9654; Continue learning" : "&#9654; Start learning") + '</a><div class="spacer"></div>';

      tracks.forEach(function (t) {
        var td = Store.lessonsDoneCount(t.lessons.map(function (l) { return l.id; }));
        var tp = t.lessons.length ? Math.round((td / t.lessons.length) * 100) : 0;
        html += '<a class="row" href="#/track/' + t.id + '"><div class="grow"><div class="code">' + esc(t.title) + '</div>' +
          '<div class="meta">' + td + ' / ' + t.lessons.length + ' lessons</div>' +
          '<div class="bar"><span style="width:' + tp + '%"></span></div></div><div class="chev">&#8250;</div></a>';
      });
      container.innerHTML = html;
    },

    // ---- one track's lessons ----
    track: function (container, trackId) {
      var tracks = buildTracks();
      var t = tracks.filter(function (x) { return x.id === trackId; })[0];
      if (!t) return Learn.hub(container);
      var html = '<div class="card"><div class="muted">' + esc(t.overview || "") + '</div></div>';
      t.lessons.forEach(function (l) {
        var done = Store.lessonDone(l.id);
        html += '<a class="row" href="#/lesson/' + l.id + '"><div class="checkbox' + (done ? " checked" : "") + '" style="' + (done ? "border-color:var(--good);" : "") + '">' + (done ? "&#10003;" : "") + '</div>' +
          '<div class="grow"><div class="ttl">' + esc(l.title) + '</div><div class="meta">' + l.cards.length + ' facts</div></div><div class="chev">&#8250;</div></a>';
      });
      container.innerHTML = html;
      return t.title;
    },

    // ---- a lesson: teach, then practice ----
    lesson: function (container, lessonId) {
      var tracks = buildTracks();
      var lesson = findLesson(tracks, lessonId);
      if (!lesson) return Learn.hub(container);
      var flat = flatLessons(tracks);
      var idx = flat.map(function (l) { return l.id; }).indexOf(lessonId);
      var nextLesson = flat[idx + 1] || null;
      var autoRead = Store.settings().autoRead;
      var i = 0;

      function teach() {
        var c = lesson.cards[i], p = STUDY.pubsById[c.pub];
        container.innerHTML =
          '<div class="flash-progress">Learn • ' + esc(lesson.title) + ' • ' + (i + 1) + ' / ' + lesson.cards.length + '</div>' +
          '<div class="card learn-card"><div class="flash-toprow"><span class="flash-tag">' + esc(p ? p.code : "") + (c.topic ? " • " + esc(c.topic) : "") + '</span>' +
            '<button class="mini" id="lSpeak" aria-label="Read aloud">&#128266;</button></div>' +
            '<div class="learn-q">' + esc(c.q) + '</div>' +
            '<div class="learn-a">' + esc(c.a).replace(/\n/g, "<br>") + '</div>' +
            (c.ref ? '<div class="flash-ref">' + esc(c.ref) + '</div>' : '') + '</div>' +
          '<div class="btn-row">' +
            (i > 0 ? '<button class="btn ghost" id="lPrev">&#8592; Back</button>' : '') +
            '<button class="btn gold" id="lNext">' + (i + 1 >= lesson.cards.length ? "Practice these &#8594;" : "Next &#8594;") + '</button></div>';
        container.querySelector("#lSpeak").addEventListener("click", function () { Speech.speak(c.q + ". " + c.a); });
        if (container.querySelector("#lPrev")) container.querySelector("#lPrev").addEventListener("click", function () { i--; teach(); });
        container.querySelector("#lNext").addEventListener("click", function () { if (i + 1 >= lesson.cards.length) practice(); else { i++; teach(); } });
        if (autoRead) Speech.speak(c.q + ". " + c.a);
      }

      function practice() {
        Speech.stop();
        var quizzable = lesson.cards.filter(function (c) { return !c.flashOnly && ((c.choices && c.choices.length >= 2 && typeof c.answer === "number") || (c.a && String(c.a).length <= 90)); });
        container.innerHTML = '<div class="card center"><div class="code">Practice: ' + esc(lesson.title) + '</div><div class="muted">Now recall what you just learned.</div></div>';
        var go = document.createElement("button"); go.className = "btn gold lg"; go.textContent = "Start practice";
        container.appendChild(go);
        go.addEventListener("click", function () {
          if (quizzable.length >= 4) Quiz.render(container, lesson.cards, lesson.title, quizzable.length, { onDone: complete });
          else Flashcards.render(container, lesson.cards, lesson.title, { onDone: function () { complete(null, null); } });
        });
      }

      function complete(score, total) {
        Store.markLessonDone(lessonId, score == null ? null : Math.round((score / total) * 100));
        var line = (score == null) ? "Lesson complete." : "You scored " + score + " / " + total + ".";
        container.innerHTML =
          '<div class="ring-wrap"><div class="ring">&#10003;<small>Lesson complete</small></div></div>' +
          '<p class="center muted">' + line + '</p><div class="spacer"></div>' +
          (nextLesson ? '<button class="btn gold lg" id="next">Next lesson &#8594;</button><div class="spacer"></div>' : '') +
          '<button class="btn ghost" id="path">Back to the path</button>';
        if (nextLesson) container.querySelector("#next").addEventListener("click", function () { App.go("#/lesson/" + nextLesson.id); });
        container.querySelector("#path").addEventListener("click", function () { App.go("#/learn"); });
      }

      teach();
    }
  };

  window.Learn = Learn;
})();
