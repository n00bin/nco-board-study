/* ===========================================================
   Mock Board — simulates the oral board as a sequence of steps:
   (full board) report in → "tell the board about yourself" →
   mixed questions (with surprise follow-ups asked only AFTER you
   grade the main answer) → report out. Per-step timer, answer
   aloud, self-grade. Ends with a score and your weakest subjects.
   =========================================================== */
(function () {
  "use strict";

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // Spread a board across subjects and topics: no two cards on the same idea (three "Restricted Report" cards
  // in one board felt broken), and at most ~1 in 5 questions from one publication. Leftovers fill in only if needed.
  var STOP = { the: 1, and: 1, for: 1, army: 1, program: 1, definitions: 1, definition: 1, sexual: 1, assault: 1, with: 1, from: 1 };
  function topicKeys(c) {
    return String(c.topic || "").toLowerCase().replace(/\([^)]*\)/g, " ").split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 4 && !STOP[w]; })
      .map(function (w) { return w.replace(/(ing|ed|s)$/, ""); });
  }
  function spread(list, want) {
    var cap = Math.max(2, Math.ceil(want / 5)), perPub = {}, seenKey = {}, out = [], left = [];
    list.forEach(function (c) {
      var keys = topicKeys(c), clash = keys.some(function (k) { return seenKey[c.pub + ":" + k]; });
      if (clash || (perPub[c.pub] || 0) >= cap) { left.push(c); return; }
      perPub[c.pub] = (perPub[c.pub] || 0) + 1; keys.forEach(function (k) { seenKey[c.pub + ":" + k] = 1; }); out.push(c);
    });
    return out.concat(left);
  }
  // Themes that cross subjects: a SHARP scenario and a Restricted Report fact card shouldn't share a board.
  var THEMES = [/\brestricted\b|unrestricted|\bSARC\b/i, /suicid|\bACE\b/i, /hazing|bullying/i, /article 15|nonjudicial/i, /article 31/i, /tattoo/i,
    /beard|facial hair|shav|sideburn/i, /waist-to-height|WHtR|body (fat|composition)/i, /\bAFT\b|fitness test|combat field test/i, /\bDUI\b|alcohol|drunk/i,
    /drug|urinalysis|kratom/i, /inspector general|\bIG\b/i, /open[- ]door/i, /equal opportunity|\bEO\b|discriminat/i, /fraterniz/i, /extremis|gang/i,
    /counsel/i, /9-line|medevac/i, /tourniquet|bleeding/i, /\bNCOER\b/i, /retaliat/i, /family advocacy|spouse|child abuse/i];
  function themesOf(c) { var t = (c.topic || "") + " " + (c.oral || c.q || ""); var out = []; THEMES.forEach(function (re, k) { if (re.test(t)) out.push(k); }); return out; }
  function pickBoard(sitList, restList, nSit, length) {
    var used = {}, picked = [], spare = [];
    function take(list, n) {
      var got = 0;
      list.forEach(function (c) {
        if (got >= n) return;
        var th = themesOf(c);
        if (th.some(function (k) { return used[k]; })) { spare.push(c); return; }
        th.forEach(function (k) { used[k] = 1; }); picked.push(c); got++;
      });
      return got;
    }
    take(sitList, nSit);
    var nRest = length - picked.length;
    take(restList, nRest);
    // not enough without repeats (small decks): fill from the spares
    for (var i = 0; picked.length < length && i < spare.length; i++) if (picked.indexOf(spare[i]) < 0) picked.push(spare[i]);
    return picked;
  }
  // spoken-style wording when the card has one ("Which set lists..." reads like a quiz, not a board)
  var LOWER = /^(What|Who|How|When|Where|Why|Which|Name|List|Define|Explain|Describe|Is|Are|Can|Do|Does|Should|May|In|On|At|Your|You|A|An|The|If|After|Before|During|Under|Recite|Give|Tell|Walk)\b/;
  function qt(c) {
    var q = c.oral || c.q;
    if (c.pub === "sit" || c.pub === "personal" || /^(Sergeant|Specialist|Staff Sergeant),/.test(q)) return q;
    var h = 0; for (var i = 0; i < c.id.length; i++) h = (h * 31 + c.id.charCodeAt(i)) >>> 0;
    var who = window.Store && Store.settings().boardFor === "SSG" ? "Sergeant" : "Specialist";
    var pre = ["", who + ", ", "", "Tell the board, "][h % 4];
    if (!pre) return q;
    return pre + (LOWER.test(q) ? q.charAt(0).toLowerCase() + q.slice(1) : q);
  }
  // short subject names for "Board member 2 will ask about ..."
  function subjectName(c) {
    if (c.pub === "sit") return "a situation";
    if (c.pub === "personal") return "you personally";
    var p = STUDY.pubsById[c.pub]; if (!p) return c.pub;
    var t = p.title.replace(/^.*?:\s*/, "").replace(/\s*\(.*\)\s*$/, "");
    return /^[A-Z]{2,}/.test(p.code) && p.code.length <= 12 && t.length > 40 ? p.code : t.replace(/^The /, "the ");
  }
  function listJoin(a) { return a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }

  // Voice check: optional speech-to-text that pre-ticks the key points you actually said (Chrome on Android/desktop).
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var STOPW = { that: 1, this: 1, with: 1, from: 1, they: 1, them: 1, their: 1, have: 1, will: 1, your: 1, into: 1, also: 1, only: 1, when: 1, what: 1, which: 1, than: 1, then: 1, each: 1, more: 1, must: 1, does: 1, about: 1, there: 1, were: 1, been: 1, being: 1, should: 1, could: 1, would: 1 };
  function words(s) { return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(function (w) { return w.length >= 4 && !STOPW[w]; }).map(function (w) { return w.slice(0, 5); }); }
  function hitRate(point, said) {
    var pw = words(point); if (!pw.length) return 0;
    var set = {}; words(said).forEach(function (w) { set[w] = 1; });
    return pw.filter(function (w) { return set[w]; }).length / pw.length;
  }

  // Choose a board: about 20% scenarios (at least 2), spread across subjects and themes. Going to a SGT board?
  // "Advanced" cards (more likely at an SSG board) go to the back of the line.
  function drawDeck(pool, length) {
    var sgt = window.Store && Store.settings().boardFor !== "SSG";
    var basicsFirst = function (list) { return sgt ? list.filter(function (c) { return !c.adv; }).concat(list.filter(function (c) { return c.adv; })) : list; };
    var sit = shuffle(pool.filter(function (c) { return c.pub === "sit"; }));
    var rest = spread(basicsFirst(shuffle(pool.filter(function (c) { return c.pub !== "sit"; }))), length);
    if (sit.length && rest.length) {
      var nSit = Math.min(sit.length, Math.max(2, Math.round(length * 0.2)));
      return shuffle(pickBoard(spread(sit, nSit), rest, nSit, length));
    }
    return shuffle(pickBoard([], spread(basicsFirst(shuffle(pool)), length), 0, length));
  }

  var timer = null, releaseMic = null;
  function clearTimer() { if (timer) { clearInterval(timer); timer = null; } }

  var MockBoard = {
    stop: function () { clearTimer(); if (window.Speech) Speech.stop(); if (releaseMic) releaseMic(); },

    // opts.full: rehearse the whole board (report in, opening statement, report out)
    // the ids a board would ask (used to send the same board to a sponsor's phone)
    drawIds: function (cards, length) { return drawDeck(cards.filter(function (c) { return c.q && c.a; }), length).map(function (c) { return c.id; }); },

    render: function (container, cards, length, opts) {
      opts = opts || {};
      var pool = cards.filter(function (c) { return c.q && c.a; });
      if (pool.length < 3) { container.innerHTML = '<div class="empty">Need a few more cards to run a board.</div>'; return; }
      length = Math.min(length || 15, pool.length);
      var deck = opts.fixed ? pool.slice(0, length) : drawDeck(pool, length);

      // The board as a queue of steps. Follow-ups are inserted right after their question once it's graded.
      var steps = [];
      if (opts.full) {
        // Real boards split subjects among members. Group questions by subject, then hand each member a share,
        // with the Board President asking last (scenarios stay mixed in with each member's questions).
        var bySub = {}, subOrder = [];
        deck.forEach(function (c) { var k = c.pub === "sit" ? "~sit" : c.pub; if (!bySub[k]) { bySub[k] = []; subOrder.push(k); } bySub[k].push(c); });
        var sits = bySub["~sit"] || []; delete bySub["~sit"]; subOrder = subOrder.filter(function (k) { return k !== "~sit"; });
        var ordered = []; subOrder.forEach(function (k) { ordered = ordered.concat(bySub[k]); });
        var M = deck.length >= 8 ? 4 : 3, per = Math.ceil(ordered.length / M), chunks = [];
        for (var m = 0; m < M; m++) chunks.push(ordered.slice(m * per, (m + 1) * per));
        sits.forEach(function (c, k) { chunks[k % M].push(c); });
        steps.push({ kind: "reportIn" }, { kind: "drill" }, { kind: "intro" });
        chunks.forEach(function (ch, m) {
          if (!ch.length) return;
          var last = m === chunks.length - 1;
          var subs = []; ch.forEach(function (c) { var nm = subjectName(c); if (subs.indexOf(nm) < 0) subs.push(nm); });
          // "a situation" reads best last
          subs.sort(function (a, b) { return (a === "a situation") - (b === "a situation"); });
          steps.push({ kind: "member", label: last ? "The Board President" : "Board member " + (m + 1), subs: subs });
          ch.forEach(function (c) { steps.push({ kind: "q", c: c }); });
        });
        steps.push({ kind: "reportOut" });
        deck = [].concat.apply([], chunks);
      } else deck.forEach(function (c) { steps.push({ kind: "q", c: c }); });

      var sponsor = !!opts.sponsor;   // the sponsor holds the phone: answer shown with the question, sponsor grades

      // ---- record-and-replay: hear your own delivery (audio stays on this phone, gone when the board ends) ----
      var rec = { stream: null, mr: null, chunks: [], url: null };
      var canRec = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
      function getStream() { return rec.stream ? Promise.resolve(rec.stream) : navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) { rec.stream = st; return st; }); }
      function startRec(btn) {
        getStream().then(function (st) {
          rec.chunks = []; rec.mr = new MediaRecorder(st);
          rec.mr.ondataavailable = function (e) { if (e.data && e.data.size) rec.chunks.push(e.data); };
          rec.mr.start(); btn.textContent = "⏺ Recording… (stops when you reveal)"; btn.classList.add("on"); btn.disabled = true;
        }).catch(function () { App.toast("Can't use the microphone. Allow mic access for this app to record.", 4500); });
      }
      function stopRec(cb) {
        if (!rec.mr || rec.mr.state === "inactive") return cb(null);
        rec.mr.onstop = function () {
          var b = new Blob(rec.chunks, { type: rec.mr.mimeType || "audio/webm" });
          if (rec.url) URL.revokeObjectURL(rec.url);
          rec.url = URL.createObjectURL(b); rec.mr = null; cb(rec.url);
        };
        rec.mr.stop();
      }
      releaseMic = function () {
        stopVoice();
        try { if (rec.mr && rec.mr.state !== "inactive") rec.mr.stop(); } catch (e) {}
        if (rec.stream) rec.stream.getTracks().forEach(function (t) { t.stop(); });
        if (rec.url) URL.revokeObjectURL(rec.url);
        rec = { stream: null, mr: null, chunks: [], url: null };
      };
      function recButton() { return canRec && !sponsor ? '<button class="btn ghost" id="recBtn">&#127897; Record my answer</button><div class="spacer"></div>' : ""; }
      function wireRec() { var b = container.querySelector("#recBtn"); if (b) b.addEventListener("click", function () { startRec(b); }); }
      // call right after a reveal screen is drawn: fills #playback once the recording is ready
      function playback() {
        stopRec(function (url) {
          var box = container.querySelector("#playback");
          if (url && box) box.innerHTML = '<div class="card"><div class="flash-tag">Your answer</div><audio controls src="' + url + '" style="width:100%;margin-top:6px;"></audio>' +
            '<div class="muted" style="font-size:.85rem;margin-top:6px;">Listen for filler words ("um," "like"), pace, and whether you answered the question asked.</div></div>';
        });
      }
      function whyHtml(c) { return c.why ? '<div class="flash-ref" style="color:var(--text);margin-top:10px;"><b>Why it matters:</b> ' + esc(c.why) + '</div>' : ""; }
      function sponsorBox(a, ref, why) {
        return '<div class="card" style="border-color:var(--gold);"><div class="flash-tag">Sponsor: the answer (don\'t show the Soldier)</div>' +
          '<div class="flash-a" style="margin-top:6px;">' + esc(a).replace(/\n/g, "<br>") + '</div>' + (ref ? '<div class="flash-ref">Reference: ' + esc(ref) + '</div>' : "") + (why || "") + '</div>';
      }

      var s = 0, got = 0, asked = 0, missed = [], qNum = 0, missedIds = [];
      var bearing = [];          // {label, ok} for the reporting/intro steps
      var perPub = {};           // pub -> {n, miss, code}
      var secs = (Store.settings().timer | 0);
      var autoRead = Store.settings().autoRead;

      function pubCode(c) { var p = STUDY.pubsById[c.pub]; return p ? p.code : c.pub; }
      function pubLabel(c) { var p = STUDY.pubsById[c.pub]; return p ? p.code + (p.title ? " — " + p.title : "") : c.pub; }
      // Recite-length answers (creeds, Code of Conduct) get no timer; long answers and scenarios get double time.
      function timeFor(c) {
        if (!secs) return 0;
        var L = String(c.a || "").length;
        if (L > 600) return 0;
        return (L > 200 || c.follow) ? secs * 2 : secs;
      }
      function header(label) {
        var totalQ = deck.length;
        return '<div class="q-count">' + (label ? label : qNum ? "Question " + qNum + " of " + totalQ : "") + (asked >= 3 ? (qNum ? "  •  " : "") + "Score so far " + Math.round(100 * got / asked) + "%" : "") + '</div>';
      }
      function timerHtml(t, why) {
        // say why the clock isn't the Settings value (long answers and scenarios get double time; the intro gets 90 s)
        var note = why ? why : (t > secs && secs ? "Double time: long answer" : "");
        return t > 0 ? '<div class="bar timer-bar"><span id="tBar" style="width:100%"></span></div><div class="center muted" id="tNum"></div>' + (note ? '<div class="center muted" style="font-size:.75rem;">' + note + '</div>' : '')
          : (secs ? '<div class="center muted" style="font-size:.85rem;">No timer on this one: take it at your own pace.</div>' : '');
      }
      function runTimer(t, onEnd) {
        if (!(t > 0)) return;
        var left = t, bar = container.querySelector("#tBar"), num = container.querySelector("#tNum");
        num.textContent = left + "s";
        timer = setInterval(function () {
          left--;
          if (!container.querySelector("#tBar")) { clearTimer(); return; } // navigated away
          bar.style.width = Math.max(0, (left / t) * 100) + "%";
          num.textContent = Math.max(0, left) + "s";
          if (left <= 0) { clearTimer(); onEnd(); }
        }, 1000);
      }
      function gradeButtons(missLabel, gotLabel) {
        return '<div class="grade-row"><button class="btn grade-again" id="miss">' + (missLabel || "Missed it") + '</button>' +
          '<button class="btn grade-good" id="got">' + (gotLabel || "Got it") + '</button></div>';
      }
      function onGrade(fn) {
        container.querySelector("#got").addEventListener("click", function () { fn(true); });
        container.querySelector("#miss").addEventListener("click", function () { fn(false); });
      }
      function next() { s++; if (s >= steps.length) return results(); show(); }

      // Key-point rubric (scenario cards with `points`): tick what the answer actually covered; partial credit.
      function rubricHtml(c, who) {
        return '<div class="card" style="border-color:var(--gold);"><div class="flash-tag">' + (who || "Did you cover these?") + '</div>' +
          c.points.map(function (pt, k) {
            return '<label class="switch" style="margin-top:10px;"><input type="checkbox" class="kp" data-k="' + k + '"> <span>' + (c.kp1 && k === 0 ? '<b>' + esc(pt) + '</b> <span class="muted" style="font-size:.8rem;">(the key fact)</span>' : esc(pt)) + '</span></label>';
          }).join("") + '</div><button class="btn gold lg" id="rubricDone">Score this answer</button>';
      }
      function onRubric(fn, c) {
        container.querySelector("#rubricDone").addEventListener("click", function () {
          var boxes = container.querySelectorAll(".kp"), n = 0;
          boxes.forEach(function (b) { if (b.checked) n++; });
          if (c && c.kp1 && boxes.length > 1) {
            var rest = 0; boxes.forEach(function (b, k) { if (k > 0 && b.checked) rest++; });
            return fn((boxes[0].checked ? 0.75 : 0) + 0.25 * rest / (boxes.length - 1));
          }
          fn(boxes.length ? n / boxes.length : 0);
        });
      }
      function fmt(x) { return (Math.round(x * 10) / 10).toString(); }

      function show() {
        clearTimer();
        var st = steps[s];
        if (st.kind === "q") return question(st.c);
        if (st.kind === "follow") return followUp(st);
        if (st.kind === "comeback") return comeback(st.c);
        if (st.kind === "reportIn") return reportIn();
        if (st.kind === "intro") return intro();
        if (st.kind === "reportOut") return reportOut();
        if (st.kind === "member") return member(st);
        if (st.kind === "drill") return drill();
      }

      // one hint per command actually given (TC 3-21.5)
      function drillHints(cmds) {
        var H = { "Left, FACE.": "Left face: pivot 90 degrees on the left heel, then bring the right foot beside the left. ", "Right, FACE.": "Right face: pivot 90 degrees on the right heel, then bring the left foot beside the right. ",
          "About, FACE.": "About face: place the right toe behind the left heel, pivot 180 degrees to the right, then bring the heels together. ",
          "Parade, REST.": "Parade rest: left foot about 10 inches left, hands at the small of the back. ", "Half left, FACE.": "Half left: a 45-degree turn to the left. " };
        return cmds.map(function (c) { return H[c] || ""; }).join("");
      }
      // Some boards test drill before you sit: the president gives a few facing movements.
      function drill() {
        var cmds = shuffle(["Left, FACE.", "Right, FACE.", "About, FACE.", "Parade, REST.", "Half left, FACE."]).slice(0, 3);
        container.innerHTML = header() +
          '<div class="card"><div class="flash-tag">The board president</div>' +
            '<div class="q-text" style="margin-top:8px;">"Before you sit, let\'s see some drill."</div>' +
            '<div class="muted">' + (sponsor ? 'Call each command out loud. Watch for a sharp movement on the command of execution, and a return to attention after each one.' : 'Stand up and do each command, sharply, from the position of attention. After each one, come back to attention.') + '</div></div>' +
          '<div class="card">' + cmds.map(function (t, k) { return '<div class="row" style="margin-bottom:6px;"><div class="numbubble">' + (k + 1) + '</div><div class="grow"><div class="ttl" style="font-size:1.15rem;font-weight:700;">' + esc(t) + '</div></div></div>'; }).join("") +
            '<div class="muted" style="font-size:.85rem;margin-top:6px;">' + drillHints(cmds) + 'Then ' + (sponsor ? 'tell the Soldier to take their seat.' : 'wait for the president to tell you to take your seat.') + '</div></div>' +
          (sponsor ? '' : '<button class="btn ghost" id="sayIt">&#128266; Call the commands for me</button><div class="spacer"></div>') +
          '<p class="center muted">Honest check: crisp, on the command of execution, back to attention each time?</p>' +
          '<a class="btn ghost" href="#/flash/tc3-21-5" style="margin-bottom:10px;">Study drill cards (TC 3-21.5)</a>' +
          gradeButtons("Needs work", "Drill was sharp");
        var say = container.querySelector("#sayIt");
        if (say) say.addEventListener("click", function () {
          var k = 0;
          (function nextCmd() { if (k >= cmds.length || !container.querySelector("#sayIt")) return; Speech.speak(cmds[k++]); setTimeout(nextCmd, 4000); })();
        });
        onGrade(function (ok) { Speech.stop(); bearing.push({ label: "Facing movements", ok: ok }); next(); });
      }

      // ---- full-board rehearsal steps ----
      function stepsList(list) {
        return '<div class="card" style="margin-top:10px;">' + list.map(function (t, k) {
          return '<div class="row" style="margin-bottom:6px;"><div class="numbubble">' + (k + 1) + '</div><div class="grow"><div class="ttl">' + esc(t) + '</div></div></div>';
        }).join("") + '</div>';
      }
      function reportIn() {
        var all = (window.App && App.reportingSteps) || [];
        container.innerHTML = header() +
          '<div class="card"><div class="flash-tag">Report to the board</div>' +
            (sponsor ? '<div class="q-text" style="margin-top:8px;">Call the Soldier in. Have them knock (if your SOP does), enter, and report to you out loud.</div>' +
              '<div class="muted">Listen for: "Sergeant Major, (rank) (last name) reports to the President of the Board," a sharp salute held until you return it, and their correct rank.</div></div>'
            : '<div class="q-text" style="margin-top:8px;">You are called in. Stand up, walk in, and report — out loud, for real.</div>' +
              '<div class="muted">"Sergeant Major, (your rank) (your last name) reports to the President of the Board." Use your own rank and your board memo\'s exact wording.</div></div>') +
          '<button class="btn ghost" id="showSteps">Show the reporting steps</button><div id="stepsBox" hidden>' + stepsList(all.slice(1, 5)) + '</div>' +
          '<p class="center muted">' + (sponsor ? 'Did they halt about two steps in front of you, salute and hold it, say their correct rank, and sit only when told?' : 'Honest check: halted two steps in front of the president, saluted and held it until returned, said your correct rank, sat only when told?') + '</p>' +
          gradeButtons("Needs work", "Reported in clean");
        container.querySelector("#showSteps").addEventListener("click", function () { var b = container.querySelector("#stepsBox"); b.hidden = !b.hidden; });
        onGrade(function (ok) { bearing.push({ label: "Reporting in", ok: ok }); next(); });
      }
      function intro() {
        var t = secs ? 90 : 0, stmt = Store.statement();
        container.innerHTML = header() + timerHtml(t, "90 seconds for your introduction") +
          '<div class="card"><div class="flash-tag">The board president</div>' +
            '<div class="q-text" style="margin-top:8px;">"Tell the board a little about yourself."</div></div>' +
          '<div class="card"><div class="muted" style="font-size:.9rem;">' + (sponsor ? 'Ask the Soldier to tell you about themselves. Listen for about a minute: who they are, job and unit, time in service, a real accomplishment or two, and their goals as an NCO. Are they saying it, not reciting it?' :
            'Answer out loud in about a minute, eyes on the president: who you are, your job and unit, time in service, a real accomplishment or two, and your goals as an NCO. Say it, don\'t read it.' +
            (stmt ? '' : ' <a href="#/statement">Draft your opening statement first</a> (there\'s an example), then come back.')) + '</div></div>' +
          recButton() + '<button class="btn gold lg" id="reveal">I\'m done</button>';
        if (autoRead) Speech.speak("Tell the board a little about yourself.");
        var done = function () {
          clearTimer();
          container.innerHTML = header() +
            (stmt ? '<div class="card"><div class="flash-tag">Your opening statement</div><div class="flash-a" style="white-space:pre-wrap;">' + esc(stmt) + '</div></div>' +
                    '<div id="playback"></div>' +
                    '<p class="center muted">Did you deliver it smoothly, without reading it, in about a minute?</p>' + gradeButtons("Needs work", "Delivered it well")
                  // no draft yet: score what you said against the parts of a good answer instead
                  : '<div class="card" style="border-color:var(--gold);"><div class="flash-tag">Did you cover these?</div>' +
                      ["Your rank, name, job, and unit", "Your time in service", "One or two real accomplishments", "Your goals as an NCO"].map(function (t) {
                        return '<label class="switch" style="margin-top:10px;"><input type="checkbox" class="ip"> <span>' + esc(t) + '</span></label>'; }).join("") +
                      '<div class="muted" style="font-size:.85rem;margin-top:10px;">Tip: draft it under Board Day Prep → Opening Statement (there\'s an example).</div></div>' +
                    '<div id="playback"></div><button class="btn gold lg" id="introDone">Score it</button>');
          playback();
          if (stmt) onGrade(function (ok) { bearing.push({ label: "Tell us about yourself", ok: ok }); next(); });
          else container.querySelector("#introDone").addEventListener("click", function () {
            var n = 0; container.querySelectorAll(".ip").forEach(function (b) { if (b.checked) n++; });
            bearing.push({ label: "Tell us about yourself", ok: n >= 3 }); next();
          });
        };
        container.querySelector("#reveal").addEventListener("click", done);
        wireRec();
        runTimer(t, done);
      }
      function reportOut() {
        var all = (window.App && App.reportingSteps) || [];
        container.innerHTML = header() +
          '<div class="card"><div class="flash-tag">The board president</div>' +
            '<div class="q-text" style="margin-top:8px;">"That concludes the board. You are dismissed."</div></div>' +
          '<p class="center muted">' + (sponsor ? 'Watch them stand at attention, salute and hold until you return it, face about, and march out.' : 'Do it now: stand at attention, salute and hold until it\'s returned, face about, and march out.') + '</p>' +
          (all.length ? stepsList([all[all.length - 1]]) : '') + gradeButtons("Needs work", "Reported out clean");
        onGrade(function (ok) { bearing.push({ label: "Reporting out", ok: ok }); next(); });
      }

      function member(st) {
        container.innerHTML = header() +
          '<div class="card" style="border-color:var(--gold);"><div class="flash-tag">' + esc(st.label) + '</div>' +
            '<div class="q-text" style="margin-top:8px;">' + esc(st.label) + ' will ask about ' + esc(listJoin(st.subs)) + '.</div>' +
            '<div class="muted">' + (sponsor ? 'Speak as this board member. The Soldier should turn to face you, keep their bearing, and answer to you.' : 'Turn to face this member, keep your bearing, and answer to them.') + '</div></div>' +
          '<button class="btn gold lg" id="ready">Ready</button>';
        container.querySelector("#ready").addEventListener("click", next);
      }

      // ---- questions ----
      function question(c) {
        qNum++;
        var cs = timeFor(c);
        container.innerHTML = header() + timerHtml(cs) +
          // Only the publication is shown on the question side: topic labels can give the answer away.
          '<div class="card"><div class="flash-toprow"><span class="flash-tag">' + esc(pubCode(c)) + (c.adv ? ' \u2022 Advanced' : '') + '</span>' +
            '<span><button class="mini" id="mSpeak" aria-label="Read aloud">&#128266;</button>' +
            '<button class="mini" id="mReport" aria-label="Report card">&#9873;</button></span></div>' +
            '<div class="q-text" style="margin-top:8px;">' + esc(qt(c)) + '</div></div>' +
          (sponsor ? sponsorBox(c.a, c.ref, whyHtml(c)) + '<p class="center muted">Read the question aloud, listen, then grade.</p>' + (c.points ? rubricHtml(c, "Sponsor: tick what the Soldier covered") : gradeButtons())
                   : '<p class="center muted">Answer out loud, then reveal.</p>' + voiceButton() + recButton() + '<button class="btn gold lg" id="reveal">Reveal answer</button>');
        container.querySelector("#mSpeak").addEventListener("click", function () { Speech.speak(qt(c)); });
        container.querySelector("#mReport").addEventListener("click", function () { App.reportCard(c); });
        if (autoRead) Speech.speak(qt(c));
        if (sponsor) {
          if (c.points) onRubric(function (fr) { clearTimer(); markQ(c, fr); }, c); else onGrade(function (ok) { clearTimer(); markQ(c, ok ? 1 : 0); });
          runTimer(cs, function () { var n = container.querySelector("#tNum"); if (n) n.textContent = "Time!"; }); return;
        }
        var rev = function () { stopVoice(); reveal(c); };
        container.querySelector("#reveal").addEventListener("click", rev);
        wireRec(); wireVoice();
        runTimer(cs, rev);
      }

      // ---- voice check: hear what you said, pre-tick the key points it heard (you can still change any box) ----
      var voice = { rec: null, text: "" };
      function voiceButton() { return SR ? '<button class="btn ghost" id="voiceBtn">&#128483;&#65039; Voice check: the app listens and ticks what you covered</button><div class="spacer"></div>' : ""; }
      function wireVoice() {
        voice.text = "";
        var b = container.querySelector("#voiceBtn"); if (!b) return;
        var start = function () {
          Store.setSetting("voiceAuto", true);
          try {
            var r = new SR(); r.lang = "en-US"; r.continuous = true; r.interimResults = false;
            r.onresult = function (e) { for (var k = e.resultIndex; k < e.results.length; k++) if (e.results[k].isFinal) voice.text += " " + e.results[k][0].transcript; };
            r.onerror = function () { App.toast("Voice check isn't available right now (it may need a connection). Grade yourself as usual.", 4000); };
            r.start(); voice.rec = r;
            b.textContent = "⏺ Listening… (stops when you reveal)"; b.classList.add("on"); b.disabled = true;
            var rb = container.querySelector("#recBtn"); if (rb) rb.disabled = true;   // one microphone user at a time
          } catch (err) { App.toast("Voice check isn't supported in this browser.", 3500); }
        };
        b.addEventListener("click", start);
        if (Store.settings().voiceAuto) start();
      }
      function stopVoice() { if (voice.rec) { try { voice.rec.stop(); } catch (e) {} voice.rec = null; } }
      // after reveal: show what it heard and pre-tick matching points (results can arrive a moment after stop)
      function applyVoice(c) {
        if (!voice.text && !container.querySelector("#heard")) return;
        var box = container.querySelector("#heard"); if (!box) return;
        var said = voice.text.trim();
        if (!said) { box.innerHTML = '<div class="muted" style="font-size:.85rem;">Voice check didn\'t catch anything. Grade yourself below.</div>'; return; }
        var html = '<div class="card"><div class="flash-tag">Voice check heard</div><div class="muted" style="font-size:.9rem;">"' + esc(said) + '"</div>';
        if (c.points) {
          var n = 0;
          container.querySelectorAll(".kp").forEach(function (cb, k) { if (hitRate(c.points[k], said) >= 0.5) { cb.checked = true; n++; } });
          html += '<div class="muted" style="font-size:.85rem;margin-top:6px;">Pre-ticked ' + n + ' of ' + c.points.length + ' key points it heard. Check the boxes yourself: you are the final judge.</div>';
        } else {
          var hr = Math.round(100 * hitRate(c.a, said));
          html += '<div class="muted" style="font-size:.85rem;margin-top:6px;">You used about ' + hr + '% of the answer\'s key words.' + (hr >= 60 ? ' Looks like you had it.' : ' Compare carefully.') + '</div>';
        }
        box.innerHTML = html + '</div>';
      }

      function reveal(c) {
        clearTimer();
        if (autoRead) Speech.speak(c.a);
        var listened = SR && container.querySelector("#voiceBtn") && container.querySelector("#voiceBtn").disabled;
        container.innerHTML = header() +
          '<div class="card"><div class="flash-tag">' + esc(pubCode(c)) + (c.topic ? " • " + esc(c.topic) : "") + '</div>' +
            '<div class="q-text" style="margin:6px 0 12px;">' + esc(qt(c)) + '</div>' +
            '<div class="flash-tag">Answer</div><div class="flash-a">' + esc(c.a).replace(/\n/g, "<br>") + '</div>' +
            (c.ref ? '<div class="flash-ref">Reference: ' + esc(c.ref) + '</div>' : '') + whyHtml(c) +
            (c.sample ? '<div class="flash-ref" style="color:var(--text);margin-top:10px;"><b>Example answer (fictional Soldier):</b> ' + esc(c.sample) + '</div>' : '') + '</div>' +
          (listened ? '<div id="heard"><div class="muted center" style="font-size:.85rem;">Checking what you said…</div></div>' : '') +
          '<div id="playback"></div>' +
          (c.points ? rubricHtml(c) : '<p class="center muted">How did you do?</p>' + gradeButtons());
        playback();
        if (listened) setTimeout(function () { applyVoice(c); }, 900);
        if (c.points) onRubric(function (fr) { markQ(c, fr); }, c); else onGrade(function (ok) { markQ(c, ok ? 1 : 0); });
      }

      function markQ(c, score) {          // score: 1 = got it, 0 = missed, fractions from the key-point rubric
        var ok = score >= 0.75;
        Store.grade(c.id, ok ? "good" : "again");
        var pp = perPub[c.pub] || (perPub[c.pub] = { n: 0, miss: 0, code: pubLabel(c) });
        pp.n++; asked++; got += score;
        if (!ok) { missedIds.push(c.id); pp.miss++; missed.push({ q: qt(c), a: c.a, code: pubCode(c) + (score > 0 && score < 1 ? " \u2022 " + Math.round(score * 100) + "% of key points" : "") }); }
        // Like a real board: a good answer earns a harder follow-up; a miss means the board comes back to it
        // later in that member's turn (or at the end), so you get a second chance to get it right.
        if (score >= 0.5 && c.follow && c.follow.length) {
          var fu = c.follow.map(function (f) { return { kind: "follow", f: f, parent: c }; });
          Array.prototype.splice.apply(steps, [s + 1, 0].concat(fu));
        } else if (score < 0.5) {
          var at = s + 1;
          while (at < steps.length && steps[at].kind !== "member" && steps[at].kind !== "reportOut") at++;
          steps.splice(at, 0, { kind: "comeback", c: c });
        }
        next();
      }

      // second chance on a missed question: the board comes back to it
      function comeback(c) {
        var t = secs;
        container.innerHTML = header("Second try") + timerHtml(t) +
          '<div class="card" style="border-color:var(--gold);"><div class="flash-tag">The board comes back to it</div>' +
            '<div class="muted" style="font-size:.85rem;margin-top:6px;">"Let\'s go back to an earlier question."</div>' +
            '<div class="q-text" style="margin-top:8px;">' + esc(qt(c)) + '</div></div>' +
          (sponsor ? sponsorBox(c.a, c.ref, "") + '<p class="center muted">Ask it again, listen, then grade.</p>' + gradeButtons()
                   : '<p class="center muted">You saw the answer a few minutes ago. Say it out loud now, in your own words, then reveal.</p><button class="btn gold lg" id="reveal">Reveal answer</button>');
        if (autoRead) Speech.speak(qt(c));
        var gradeIt = function (ok) {
          var pp = perPub[c.pub] || (perPub[c.pub] = { n: 0, miss: 0, code: pubLabel(c) });
          pp.n++; asked++; if (ok) got++; else pp.miss++;
          next();
        };
        if (sponsor) { onGrade(function (ok) { clearTimer(); gradeIt(ok); }); runTimer(t, function () { var n = container.querySelector("#tNum"); if (n) n.textContent = "Time!"; }); return; }
        var rev = function () {
          clearTimer();
          container.innerHTML = header() +
            '<div class="card"><div class="flash-tag">Second try</div><div class="q-text" style="margin:6px 0 12px;">' + esc(qt(c)) + '</div>' +
            '<div class="flash-tag">Answer</div><div class="flash-a">' + esc(c.a).replace(/\n/g, "<br>") + '</div></div>' +
            '<p class="center muted">Did you get it this time?</p>' + gradeButtons();
          onGrade(gradeIt);
        };
        container.querySelector("#reveal").addEventListener("click", rev);
        runTimer(t, rev);
      }

      function followUp(st) {
        var f = st.f, c = st.parent, t = secs;
        container.innerHTML = header() + timerHtml(t) +
          '<div class="card" style="border-color:var(--gold);"><div class="flash-tag">The board follows up</div>' +
            '<div class="muted" style="font-size:.85rem;margin-top:6px;">About: ' + esc(String(qt(c)).length > 110 ? String(qt(c)).slice(0, 107) + "\u2026" : qt(c)) + '</div>' +
            '<div class="q-text" style="margin-top:8px;">' + esc(f.q) + '</div></div>' +
          (sponsor ? sponsorBox(f.a, f.ref, "") + '<p class="center muted">Ask the follow-up, listen, then grade.</p>' + gradeButtons()
                   : '<p class="center muted">Answer out loud, then reveal.</p>' + recButton() + '<button class="btn gold lg" id="reveal">Reveal answer</button>');
        if (autoRead) Speech.speak(f.q);
        var gradeFollow = function (ok) {
          var pp = perPub[c.pub] || (perPub[c.pub] = { n: 0, miss: 0, code: pubLabel(c) });
          pp.n++; asked++;
          if (ok) got++; else { pp.miss++; missed.push({ q: f.q, a: f.a, code: "Follow-up" }); }
          next();
        };
        if (sponsor) { onGrade(function (ok) { clearTimer(); gradeFollow(ok); }); runTimer(t, function () { var n = container.querySelector("#tNum"); if (n) n.textContent = "Time!"; }); return; }
        var rev = function () {
          clearTimer();
          if (autoRead) Speech.speak(f.a);
          container.innerHTML = header() +
            '<div class="card" style="border-color:var(--gold);"><div class="flash-tag">Follow-up</div>' +
              '<div class="q-text" style="margin:6px 0 12px;">' + esc(f.q) + '</div>' +
              '<div class="flash-tag">Answer</div><div class="flash-a">' + esc(f.a) + '</div>' +
              (f.ref ? '<div class="flash-ref">Reference: ' + esc(f.ref) + '</div>' : '') + '</div>' +
            '<div id="playback"></div>' +
            '<p class="center muted">How did you do?</p>' + gradeButtons();
          playback();
          onGrade(gradeFollow);
        };
        container.querySelector("#reveal").addEventListener("click", rev);
        wireRec();
        runTimer(t, rev);
      }

      function results() {
        clearTimer(); Speech.stop(); releaseMic();
        Store.recordQuiz("Mock Board" + (opts.full ? " (full)" : "") + (sponsor ? " with sponsor" : ""), got, asked);
        var pct = asked ? Math.round((got / asked) * 100) : 0;
        var weak = Object.keys(perPub).map(function (k) { return perPub[k]; })
          .filter(function (p) { return p.miss > 0; })
          .sort(function (a, b) { return b.miss - a.miss; }).slice(0, 5);
        var msg = pct >= 90 ? "Board-ready." : pct >= 75 ? "Strong — tighten the misses." : pct >= 60 ? "Passing. Keep drilling." : "Needs work — run it again.";
        // A real board weighs bearing and the required situational questions, not just the percentage.
        var bearingMiss = bearing.filter(function (b) { return !b.ok; }).map(function (b) { return b.label.toLowerCase(); });
        var sitMiss = missedIds.filter(function (id) { return /^sit-/.test(id); }).length;
        var notReady = pct >= 75 && (bearingMiss.length || sitMiss);
        if (notReady) msg = "Not board-ready yet." + (bearingMiss.length ? " Work on: " + listJoin(bearingMiss) + "." : "") +
          (sitMiss ? " You missed " + sitMiss + " required situational question" + (sitMiss > 1 ? "s" : "") + "." : "") + " A board weighs bearing and those questions as much as the facts.";
        var nQ = deck.length, nF = Math.max(0, asked - nQ);
        var countLine = nQ + " question" + (nQ === 1 ? "" : "s") + (nF ? " + " + nF + " follow-up" + (nF === 1 ? "" : "s") + " and second tries" : "") + " (partial credit counted)";
        var html = notReady
          ? '<div class="card" style="border-color:var(--bad);text-align:center;"><div style="font-size:1.4rem;font-weight:800;">Not board-ready yet</div><div class="muted" style="margin-top:6px;">' + esc(msg.replace(/^Not board-ready yet\.\s*/, "")) + '</div>' +
              '<div class="muted" style="font-size:.85rem;margin-top:8px;">Answers: ' + pct + '% \u2022 ' + countLine + '</div></div>'
          : '<div class="ring-wrap"><div class="ring">' + pct + '%<small>' + countLine + '</small></div></div>' + '<p class="center muted">' + msg + '</p>';
        if (bearing.length) {
          html += '<h2 class="section">Bearing &amp; delivery</h2>';
          bearing.forEach(function (b) {
            html += '<div class="row"><div class="grow"><div class="ttl">' + esc(b.label) + '</div></div><div class="' + (b.ok ? "badge-good" : "badge-bad") + '" style="font-weight:700;">' + (b.ok ? "✓ clean" : "✗ needs work") + '</div></div>';
          });
        }
        if (weak.length) {
          html += '<h2 class="section">Weakest subjects</h2>';
          weak.forEach(function (p) { html += '<div class="row"><div class="grow"><div class="code">' + esc(p.code) + '</div></div><div class="badge-bad" style="font-weight:700;">missed ' + p.miss + '/' + p.n + '</div></div>'; });
        }
        if (missed.length) {
          html += '<h2 class="section">Review your misses</h2>';
          missed.forEach(function (m) {
            html += '<div class="card"><div class="flash-tag">' + esc(m.code) + '</div><div style="font-weight:600;margin-bottom:6px;">' + esc(m.q) + '</div><div class="muted">' + esc(m.a) + '</div></div>';
          });
        }
        if (sponsor) html += '<h2 class="section">Your notes for the Soldier (optional)</h2><textarea class="input" id="sbNote" rows="3" maxlength="300" placeholder="e.g. Good bearing. Rambled on the intro; slow down on SHARP answers."></textarea>' +
          '<div class="spacer"></div><button class="btn green lg" id="sendBack">&#128228; Send these results to the Soldier</button>' +
          '<div class="muted center" style="font-size:.8rem;margin-top:6px;">They open the link on their phone: the score goes into their history and the questions they missed come back sooner.</div>';
        html += '<div class="spacer"></div><button class="btn gold lg" id="again">New board</button><div class="spacer"></div><button class="btn ghost" id="home">Home</button>';
        container.innerHTML = html;
        container.querySelector("#again").addEventListener("click", function () { MockBoard.render(container, cards, length, opts); });
        container.querySelector("#home").addEventListener("click", function () { App.go("#/"); });
        var sb = container.querySelector("#sendBack");
        if (sb) sb.addEventListener("click", function () {
          var ids = missedIds.filter(function (id, k) { return missedIds.indexOf(id) === k; }).slice(0, 40);
          var note = (container.querySelector("#sbNote").value || "").trim().slice(0, 300);
          var CODE = { "Reporting in": "R", "Facing movements": "D", "Tell us about yourself": "I", "Reporting out": "O" };
          var bcode = "b-" + bearing.map(function (b) { return (CODE[b.label] || "X") + (b.ok ? 1 : 0); }).join("");
          var url = App.appUrl + "#/sbresult/" + (Math.round(got * 10) / 10) + "/" + asked + "/" + Date.now().toString(36) + "/" + ids.join(",") + "/" + bcode + (note ? "/" + encodeURIComponent(note) : "");
          var text = "Your practice board: " + pct + "%. Open this to save it in your app: " + url;
          if (navigator.share) navigator.share({ title: "Practice board results", text: text }).catch(function () {});
          else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { App.toast("Link copied: text it to the Soldier", 3500); });
          else App.toast(url, 6000);
        });
      }

      show();
    }
  };

  window.MockBoard = MockBoard;
})();
