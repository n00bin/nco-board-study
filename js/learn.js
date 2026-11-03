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
    "adp3-0": "ADP 3-0 (March 2025) is the Army's capstone doctrine for operations — multidomain operations, the six warfighting functions and combat power, the four tenets, and the Army's four strategic roles.",
    "adp5-0": "ADP 5-0 is how leaders plan, prepare, execute, and assess operations. Know the operations process, the MDMP, and Troop Leading Procedures (TLP).",
    "adp7-0": "ADP 7-0 is how the Army trains. Know the principles of training, 'train as you fight,' crawl-walk-run, and METL.",
    "ar600-20": "AR 600-20 is the Army Command Policy — the rules of command, discipline, and conduct. Chain of command, the NCO support channel, Equal Opportunity, and the ban on hazing and bullying. One of the most-tested regs.",
    "ar27-10": "AR 27-10 governs military justice — how the UCMJ is applied. Know nonjudicial punishment (Article 15) and the three types of courts-martial.",
    "ar350-1": "AR 350-1 is the rulebook for Army training and leader development. Know the three training domains.",
    "ar670-1": "AR 670-1 sets the standards for wear and appearance of the uniform — grooming, insignia placement, and what's authorized (with DA PAM 670-1). The board inspects you against it.",
    "ar600-52": "AR 600-52 is the SHARP program — Sexual Harassment/Assault Response and Prevention. Know the two report types, the SARC and Victim Advocate, and DD Form 2910.",
    "ar600-85": "AR 600-85 is the Army Substance Abuse Program (ASAP). Know its purpose, the Limited Use Policy, and the types of referral.",
    "ar608-1": "AR 608-1 (May 2026) is Soldier and Family Readiness (SFR): the Army's support services for Soldiers and Families, such as financial readiness, EFMP, Family Advocacy, relocation, and employment help. Your installation's ACS center is one place to get them.",
    "ar930-4": "AR 930-4 is Army Emergency Relief — emergency financial help for Soldiers and Families. Know its motto, that it's a private nonprofit, and how it assists.",
    "stp21-1": "STP 21-1 is the Soldier's Manual of Common Tasks, Warrior Skills Level 1 — the hands-on tasks every Soldier must perform: shoot, move, communicate, survive, and first aid.",
    "stp21-24": "STP 21-24 is the common tasks for NCOs — Warrior Leader Skills, Levels 2-4. The leader tasks expected as you take charge.",
    "fm7-22": "FM 7-22 is Holistic Health and Fitness (H2F). Know the five readiness domains and the Army's fitness test.",
    "tc7-21-13": "TC 7-21.13, the Soldier's Guide, is the all-around handbook — Army history, customs and courtesies, creeds, ranks, and professionalism. A great place to start.",
    "atp3-50-20": "ATP 3-50.20 covers SERE — Survival, Evasion, Resistance, and Escape — and the Code of Conduct's six articles."
  };

  var FUND_OVERVIEW = "New to all of this? Start here. These lessons cover the bedrock every board expects you to know cold — the Army Values, the ranks and chain of command, the creeds, the general orders, and the Code of Conduct. Learn these first, then work through each publication.";

  var CORE_OVERVIEW = "The questions boards ask most, most-asked first. Finish this track and you've covered the core of the board.";
  var CORE_ORDER = ["tc7-21-13", "ar600-8-19", "boardskills", "sit", "personal", "adp6-22", "ar600-20", "atp6-22-1", "ar600-52", "ar27-10", "ar670-1", "pam670-1", "ar600-25", "tc3-21-5", "tc7-22-7", "ar623-3", "ar600-8-22", "ar840-10", "fm7-22",
    "ar350-1", "stp21-1", "weapons", "ar735-5", "adp7-0", "fm7-0", "adp5-0", "atp5-19", "ar530-1", "ar600-85", "atp3-50-20", "ar608-1", "ar930-4", "ar385-10", "ad2019-33", "brs", "stp21-24", "adp3-0"];

  // Board 101: what a promotion board is and how it works, from AR 600-8-19 (6 Mar 2026). First track in Learn.
  var B101_OVERVIEW = "Never been to a board? Start here. See what happens in the room and how to answer, then how you get eligible, who sits on the board, how they vote, and how points turn a \"yes\" into stripes.";
  var BOARD101 = [
    { id: "board101-room", title: "What happens in the board room", ids: ["ar600-8-19-24", "ar600-8-19-26", "bk-06", "bk-02", "bk-01", "personal-11"] },
    { title: "Getting to the board", ids: ["ar600-8-19-05", "ar600-8-19-06", "ar600-8-19-15", "ar600-8-19-16", "ar600-8-19-08"] },
    { title: "Board day, points, and promotion", ids: ["ar600-8-19-25", "ar600-8-19-28", "ar600-8-19-30", "ar600-8-19-32", "ar600-8-19-37", "ar600-8-19-40", "ar600-8-19-27"] }
  ];

  var FUNDAMENTALS = [
    { title: "Leadership & the Army Values", ids: ["adp6-22-01", "adp6-22-02", "adp6-22-07", "adp6-22-08", "adp6-22-03", "adp6-22-04", "adp6-22-05", "adp6-22-12", "adp6-22-11"] },
    { title: "The Warrior Ethos & the Creeds", ids: ["adp6-22-09", "tc72113-02", "tc72113-03", "tc72113-13", "tc72113-14"] },
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
    // Title a lesson by what's in it ("Restricted reports, Unrestricted reports & DD Form 2910"), not "Lesson 1: Reference".
    return groups.map(function (cs, n) {
      var topics = [];
      cs.forEach(function (c) { var t = (c.topic || "").replace(/\s*\((?:AD|AR|TC) [^)]*\)\s*$/, ""); if (t && topics.indexOf(t) < 0) topics.push(t); });
      var title = topics.length ? (topics.length <= 3 ? topics.slice(0, -1).join(", ") + (topics.length > 1 ? " & " : "") + topics[topics.length - 1]
        : topics.slice(0, 3).join(", ") + " & more") : "Lesson " + (n + 1);
      return { id: trackId + "-" + cs[0].id, alt: trackId + "-L" + (n + 1), title: title, topics: topics, cards: cs };
    });
  }

  function buildTracks() {
    var all = App.allCards(), byId = {};
    all.forEach(function (c) { byId[c.id] = c; });
    var tracks = [];
    var fLessons = FUNDAMENTALS.map(function (f, n) {
      return { id: "fundamentals-L" + (n + 1), title: f.title, cards: f.ids.map(function (id) { return byId[id]; }).filter(Boolean) };
    }).filter(function (l) { return l.cards.length; });
    // the room-first lesson has its own id; the others keep "board101-L1/L2" so saved progress still counts
    var bLessons = BOARD101.map(function (f, n) {
      return { id: f.id || "board101-L" + (BOARD101[0].id ? n : n + 1), title: f.title, cards: f.ids.map(function (id) { return byId[id]; }).filter(Boolean) };
    }).filter(function (l) { return l.cards.length; });
    if (bLessons.length) tracks.push({ id: "board101", title: "Board 101: what to expect", overview: B101_OVERVIEW, lessons: bLessons });
    tracks.push({ id: "fundamentals", title: "Fundamentals: the bedrock", overview: FUND_OVERVIEW, lessons: fLessons });

    // Board Core track: the tagged must-know cards (minus what Fundamentals already teaches),
    // ordered high-yield first. Lesson ids are "core-<pub>-L<n>", so older saved progress is untouched.
    var inFund = {};
    FUNDAMENTALS.concat(BOARD101).forEach(function (f) { f.ids.forEach(function (id) { inFund[id] = 1; }); });
    var coreLessons = [];
    CORE_ORDER.forEach(function (pubId) {
      var p = STUDY.pubsById[pubId];
      var cs = all.filter(function (c) { return c.core && c.pub === pubId && !inFund[c.id]; });
      if (!p || !cs.length) return;
      var nm = (p.code === p.title || /^[A-Z][a-z]/.test(p.code) ? p.code : p.title).replace(/\s*\([^)]*\)\s*$/, "");
      chunkLessons(cs, "core-" + pubId).forEach(function (l) { l.title = nm + (/[?!]$/.test(nm) ? " " : ": ") + l.title; l.pubName = nm; coreLessons.push(l); });
    });
    if (coreLessons.length)
      tracks.push({ id: "core", title: "Board Core: the must-know questions", overview: CORE_OVERVIEW, lessons: coreLessons });
    STUDY.pubs.forEach(function (p) {
      if (p.id === "mine" || p.id === "chain") return;
      var cards = all.filter(function (c) { return c.pub === p.id; });
      if (!cards.length) return;
      tracks.push({ id: p.id, title: (/^[A-Z]{2,}/.test(p.code) ? p.code + ": " : "") + p.title, overview: OVERVIEWS[p.id] || "", lessons: chunkLessons(cards, p.id) });
    });
    return tracks;
  }

  // done under its stable id, or under the old positional id (progress saved before 2026-10-31)
  function isDone(l) { return Store.lessonDone(l.id) || (!!l.alt && Store.lessonDone(l.alt)); }
  function doneCount(ls) { return ls.filter(isDone).length; }
  function flatLessons(tracks) { var out = []; tracks.forEach(function (t) { t.lessons.forEach(function (l) { out.push(l); }); }); return out; }
  function findLesson(tracks, id) { var f = flatLessons(tracks).filter(function (l) { return l.id === id || l.alt === id; }); return f[0] || null; }

  var Learn = {
    // ---- the path / hub ----
    hub: function (container) {
      var tracks = buildTracks();
      var flat = flatLessons(tracks);
      // Progress is measured against YOUR board path (Board 101, Fundamentals, Board Core), not every lesson in the app.
      var pathFlat = flatLessons(tracks.filter(function (t) { return t.id === "board101" || t.id === "fundamentals" || t.id === "core"; }));
      var doneN = doneCount(pathFlat);
      var pct = pathFlat.length ? Math.round((doneN / pathFlat.length) * 100) : 0;
      var next = pathFlat.filter(function (l) { return !isDone(l); })[0] || flat.filter(function (l) { return !isDone(l); })[0];
      var extraDone = doneCount(flat) - doneN;

      var html =
        '<div class="hero"><div class="big" style="font-size:1.6rem;">' + doneN + ' of ' + pathFlat.length + ' lessons</div><div class="sub">on your board path' + (extraDone > 0 ? ' (+' + extraDone + ' extra)' : '') + '</div>' +
          (function () { var seen = STUDY.cards.filter(function (c) { if (!c.core) return false; var r = Store.recOf(c.id); return r && r.seen > 0; }).length;
            return seen && !doneN ? '<div class="sub" style="margin-top:4px;">You&#39;ve already studied ' + seen + ' Board Core cards in Flashcards. Lessons teach them step by step.</div>' : ''; })() +
          '<div class="bar"><span style="width:' + pct + '%"></span></div></div>' +
        '<div class="card"><div class="muted">Learn it, then practice it. <b>For your board: finish Board 101, Fundamentals and Board Core.</b></div></div>';
      if (next) html += '<a class="btn gold lg" href="#/lesson/' + next.id + '">' + (doneN ? "<svg class=ic aria-hidden=true><use href=#i-play></use></svg> Continue learning" : "<svg class=ic aria-hidden=true><use href=#i-play></use></svg> Start learning") + '</a><div class="spacer"></div>';

      var BOARD_PATH = { board101: 1, fundamentals: 1, core: 1, sit: 1, personal: 1 }, shownExtra = false;
      html += '<h2 class="section">Your board path</h2>';
      // keep the board path together at the top: the required scenario and personal tracks right after Board Core
      tracks = tracks.filter(function (t) { return BOARD_PATH[t.id]; }).concat(tracks.filter(function (t) { return !BOARD_PATH[t.id]; }));
      tracks.forEach(function (t) {
        if (!BOARD_PATH[t.id] && !shownExtra) { shownExtra = true; html += '<details class="set-fold"><summary>Extra depth: every publication (optional)</summary>'; }
        var td = doneCount(t.lessons);
        var tp = t.lessons.length ? Math.round((td / t.lessons.length) * 100) : 0;
        html += '<a class="row" href="#/track/' + t.id + '"><div class="grow"><div class="ttl" style="font-weight:700;">' + esc(t.title) + '</div>' +
          '<div class="meta">' + td + ' / ' + t.lessons.length + (t.lessons.length === 1 ? ' lesson' : ' lessons') + (t.id === "sit" || t.id === "personal" ? ' \u2022 asked at every board' : '') + '</div>' +
          '<div class="bar"><span style="width:' + tp + '%"></span></div></div><div class="chev" aria-hidden="true"><svg class=ic aria-hidden=true><use href=#i-chev></use></svg></div></a>';
      });
      if (shownExtra) html += '</details>';
      html = html.replace(/((?:<a class="row" href="#\/track\/[^"]*">[\s\S]*?<\/a>)+)/g, '<div class="lg rows">$1</div>');
      container.innerHTML = html;
    },

    // next unfinished lesson on the board path (Board 101 -> Fundamentals -> Board Core), for Home's daily plan
    trackDone: function (id) { var t = buildTracks().filter(function (x) { return x.id === id; })[0]; return t ? [t.lessons.filter(isDone).length, t.lessons.length] : null; },
    nextBoardLesson: function () {
      var tracks = buildTracks().filter(function (t) { return t.id === "board101" || t.id === "fundamentals" || t.id === "core"; });
      var total = 0, done = 0, next = null;
      tracks.forEach(function (t) { t.lessons.forEach(function (l) { total++; if (isDone(l)) done++; else if (!next) next = { id: l.id, title: t.title.replace(/^\W+\s*/, "") + ": " + l.title }; }); });
      return { next: next, done: done, total: total };
    },

    // ---- one track's lessons ----
    track: function (container, trackId) {
      var tracks = buildTracks();
      var t = tracks.filter(function (x) { return x.id === trackId; })[0];
      if (!t) return Learn.hub(container);
      var tdn = doneCount(t.lessons);
      var html = '<div class="track-prog"><span>' + tdn + ' of ' + t.lessons.length + (t.lessons.length === 1 ? ' lesson' : ' lessons') + ' done</span><div class="bar"><span style="width:' + Math.round(100 * tdn / Math.max(1, t.lessons.length)) + '%"></span></div></div>' +
        (t.overview ? '<div class="muted" style="margin:2px 4px 10px;">' + esc(t.overview) + '</div>' : '');
      var nx = t.lessons.filter(function (l) { return !isDone(l); })[0];
      if (nx) html += '<a class="btn gold lg" href="#/lesson/' + nx.id + '" style="margin-bottom:12px;"><svg class=ic aria-hidden=true><use href=#i-play></use></svg> ' + (t.lessons.indexOf(nx) ? 'Continue: lesson ' + (t.lessons.indexOf(nx) + 1) : 'Start lesson 1') + '</a>';
      var seenLead = {};
      t.lessons.forEach(function (l, k) {
        var done = isDone(l);
        // lead with one topic; the publication and the other topics go in the small line
        var tp = l.topics && l.topics.length ? l.topics.slice() : null, lead = tp ? tp.shift() : String(l.title);
        if (tp && seenLead[lead] && tp.length) lead = tp.shift();
        else if (seenLead[lead]) lead += " (part " + (seenLead[lead] + 1) + ")";
        seenLead[lead] = (seenLead[lead] || 0) + 1;
        var short = lead, parts = [lead].concat(tp && tp.length && !l.pubName ? ["also " + tp[0] + (tp.length > 1 ? " and more" : "")] : []);
        if (l.pubName) parts.splice(1, 0, l.pubName);
        html += (k ? '' : '<div class="lg">') + '<a class="li" href="#/lesson/' + l.id + '"><span class="numbubble' + (done ? ' done' : '') + '">' + (done ? "&#10003;" : (k + 1)) + '</span>' +
          '<span class="grow"><span class="t" style="font-weight:600;">' + esc(short) + '</span><span class="s">' + l.cards.length + (l.cards[0] && l.cards[0].pub === "sit" ? " scenarios" : " facts") + (parts.length > 1 ? ' \u2022 ' + esc(parts.slice(1).join(" \u2022 ")) : '') + '</span></span><span class="chev" aria-hidden="true"><svg class=ic aria-hidden=true><use href=#i-chev></use></svg></span></a>';
      });
      if (t.lessons.length) html += '</div>';
      if (t.lessons.length > 15) {   // long track: the next few up front, the whole list in a fold
        var MK = '<a class="li" href="#/lesson/', bits = html.split(MK), head = bits.shift().replace(/<div class="lg">$/, ''), rows = bits.map(function (b) { return MK + b.replace(/<\/div>$/, ''); });
        var at = Math.max(0, nx ? t.lessons.indexOf(nx) : 0);
        html = head + '<div class="lg-h">Up next</div><div class="lg">' + rows.slice(at, at + 5).join("") + '</div>' +
          '<details class="set-fold"><summary><span class="grow">All ' + rows.length + ' lessons</span></summary><div class="lg">' + rows.join("") + '</div></details>';
      }
      container.innerHTML = html;
      return t.title;
    },

    // ---- a lesson: teach, then practice ----
    lesson: function (container, lessonId) {
      var tracks = buildTracks();
      var lesson = findLesson(tracks, lessonId);
      if (!lesson) return Learn.hub(container);
      var flat = flatLessons(tracks);
      var idx = flat.indexOf(lesson);
      var nextLesson = flat[idx + 1] || null;
      var autoRead = Store.settings().autoRead;
      var i = 0;

      function teach() {
        var c = lesson.cards[i], p = STUDY.pubsById[c.pub];
        container.innerHTML =
          '<div class="q-count mb-head"><span>' + esc(lesson.title) + '</span><span class="pill">' + (i + 1) + ' / ' + lesson.cards.length + '</span></div><div class="progress-bar"><span style="width:' + Math.round(100 * (i + 1) / lesson.cards.length) + '%"></span></div>' +
          '<div class="card learn-card"><div class="flash-toprow"><span class="flash-tag">' + esc(p ? p.code : "") + (c.topic ? " • " + esc(c.topic) : "") + '</span>' +
            '<button class="mini" id="lSpeak" aria-label="Read aloud"><svg class=ic aria-hidden=true><use href=#i-speaker></use></svg></button></div>' +
            '<div class="learn-q">' + esc(c.q) + '</div>' +
            '<div class="learn-a">' + esc(c.a).replace(/\n/g, "<br>") + '</div>' +
            (c.why ? '<div class="flash-ref" style="color:var(--text);margin-top:12px;"><b>Why it matters:</b> ' + esc(c.why) + '</div>' : '') +
            (c.sample ? '<div class="flash-ref" style="color:var(--text);margin-top:12px;"><b>Example answer (fictional Soldier, make it yours):</b> ' + esc(c.sample) + '</div>' : '') +
            (c.ref ? '<div class="flash-ref">' + esc(c.ref) + '</div>' : '') + '</div>' +
          '<div class="btn-row lesson-nav">' +
            '<button class="btn ghost" id="lPrev"' + (i > 0 ? '' : ' disabled') + '><svg class=ic aria-hidden=true><use href=#i-back></use></svg> Previous</button>' +
            '<button class="btn gold" id="lNext">' + (i + 1 >= lesson.cards.length ? "Practice <svg class=ic aria-hidden=true><use href=#i-chev></use></svg>" : "Next <svg class=ic aria-hidden=true><use href=#i-chev></use></svg>") + '</button></div>';
        container.querySelector("#lSpeak").addEventListener("click", function () { Speech.speak(c.q + ". " + c.a); });
        if (container.querySelector("#lPrev")) container.querySelector("#lPrev").addEventListener("click", function () { i--; teach(); });
        container.querySelector("#lNext").addEventListener("click", function () { if (i + 1 >= lesson.cards.length) practice(); else { i++; teach(); } });
        if (autoRead) Speech.speak(c.q + ". " + c.a);
      }

      function practice() {
        Speech.stop();
        var quizzable = lesson.cards.filter(function (c) { return !c.flashOnly && ((c.choices && c.choices.length >= 2 && typeof c.answer === "number") || (c.a && String(c.a).length <= 90)); });
        window.scrollTo(0, 0);

        if (quizzable.length >= 4) Quiz.render(container, lesson.cards, lesson.title, quizzable.length, { onDone: complete });
        else Flashcards.render(container, lesson.cards, lesson.title, { all: true, onDone: function (n, first) { var k = Object.keys(first || {}); if (!k.length) return complete(null, null); complete(k.filter(function (id) { return first[id] !== "again"; }).length, k.length, true); } });
      }

      function complete(score, total, selfGraded) {
        var sessN = '';
        Store.markLessonDone(lesson.id, score == null ? null : Math.round((score / total) * 100));
        var p = score == null ? 100 : Math.round(100 * score / Math.max(1, total));
        
        var line = (score == null) ? "Practice done. Nice work." : (score === total ? "Every card. Nice work." : "The ones you missed come back sooner in your reviews.");
        container.innerHTML =
          '<div class="ring-wrap"><div class="ring ' + (p >= 75 ? 'good' : p >= 50 ? 'mid' : 'bad') + '" style="--p:' + p + ';"><div class="ring-in">' + (score == null ? '&#10003;' : p + '%') + '</div></div>' + (score == null ? '' : '<small>' + score + ' of ' + total + (selfGraded ? ' on the first try' : ' right in practice') + '</small>') + '</div>' +
          '<div class="done-h">Lesson complete</div><p class="center muted" style="margin:0 0 6px;">' + esc(lesson.title) + '</p>' +
          (function () { var tr = tracks.filter(function (t) { return t.lessons.indexOf(lesson) >= 0; })[0]; if (!tr) return ''; var d = doneCount(tr.lessons);
            return '<div class="track-prog"><span>' + esc(tr.title.replace(/:.*$/, "")) + ': ' + d + ' of ' + tr.lessons.length + (tr.lessons.length === 1 ? ' lesson' : ' lessons') + '</span><div class="bar"><span style="width:' + Math.round(100 * d / tr.lessons.length) + '%"></span></div></div>'; })() +
          '<p class="center muted">' + line + '</p><div class="spacer"></div>' + (sessN = (window.App && App.sessionNextHtml ? App.sessionNextHtml() : '')) +
          (nextLesson && sessN ? '<button class="home-link" id="next" style="display:block;margin:0 auto 10px;">Or start the next lesson</button>' : '') +
          (nextLesson && !sessN ? '<button class="btn gold lg" id="next">Next lesson <svg class=ic aria-hidden=true><use href=#i-chev></use></svg></button><div class="muted center" style="font-size:.85rem;margin:6px 0 4px;">Up next: ' + esc(String(nextLesson.title).replace(/^.*?:\s*/, "")) + '</div><div class="spacer"></div>' : '') +
          '<button class="home-link" id="path">' + (sessN ? 'Back to Home' : 'Back to Learn') + '</button>';
        if (nextLesson) container.querySelector("#next").addEventListener("click", function () { App.go("#/lesson/" + nextLesson.id); });
        container.querySelector("#path").addEventListener("click", function () { App.go(sessN ? "#/" : "#/learn"); });
      }

      teach();
    }
  };

  window.Learn = Learn;
})();
