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
  // a board asks the same thing different ways: one wording per card per board (kept for the reveal and the misses list)
  var askPick = {};
  function qt(c) {
    if (!Object.prototype.hasOwnProperty.call(askPick, c.id)) { var ws = [c.oral || c.q].concat(Array.isArray(c.asks) ? c.asks : []); askPick[c.id] = ws[Math.floor(Math.random() * ws.length)]; }
    var q = askPick[c.id];
    if (c.pub === "sit" || c.pub === "personal" || /^(Sergeant|Specialist|Staff Sergeant),/.test(q)) return q;
    var h = 0; for (var i = 0; i < c.id.length; i++) h = (h * 31 + c.id.charCodeAt(i)) >>> 0;
    var who = window.Store && Store.settings().boardFor === "SSG" ? "Sergeant" : "Specialist";
    var pre = ["", who + ", ", "", "Tell the board, "][h % 4];
    if (!pre || !/^(What|Who|Whom|Whose|How|When|Which|Why|Where|Is|Are|Does|Do|Can|May|Should|Must|Under|Per|In|On|At|As|If)\b/.test(q)) return q;
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
  var NUMW = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", fifteen: "15", twenty: "20", thirty: "30", sixty: "60", ninety: "90", hundred: "100", first: "1", second: "2", third: "3" };
  function words(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).map(function (w) { return NUMW[w] || w; })
      .filter(function (w) { return /^\d+$/.test(w) || (w.length >= 4 && !STOPW[w]); }).map(function (w) { return /^\d+$/.test(w) ? w : w.slice(0, 5); });
  }
  function hitRate(point, said) {
    var pw = words(point); if (!pw.length) return 0;
    var set = {}; words(said).forEach(function (w) { set[w] = 1; });
    return pw.filter(function (w) { return set[w]; }).length / pw.length;
  }

  // Choose a board: about 20% scenarios (at least 2), spread across subjects and themes. Going to a SGT board?
  // "Advanced" cards (more likely at an SSG board) go to the back of the line.
  var REGNAME = /\b(which|what)\b[^?]{0,30}\b(regulation|AR|publication|manual)\b[^?]{0,50}\b(covers?|governs?|prescribes?|outlines?)\b/i;
  function dedupeTwins(list) {
    var seen = {};
    return list.filter(function (c) {
      var key = c.twin || (REGNAME.test(c.oral || c.q || "") ? "_regname" : "");
      if (!key) return true; if (seen[key]) return false; seen[key] = 1; return true;
    });
  }
  function drawDeck(pool, length) {
    pool = dedupeTwins(shuffle(pool.slice()));
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

  var timer = null, releaseMic = null, voiceFail = false;
  function clearTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function listJoin2(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
  // One verdict everywhere. bearingMiss: labels that need work; sitMiss: required situational questions missed.
  function verdict(pct, bearingMiss, sitMiss) {
    bearingMiss = bearingMiss || []; sitMiss = sitMiss || 0;
    var fix = [bearingMiss.length ? listJoin2(bearingMiss.map(function (b) { return /^tell us/i.test(b) ? "\u201cTell us about yourself\u201d" : b; })) : "", sitMiss ? sitMiss + " situational question" + (sitMiss > 1 ? "s" : "") : ""].filter(Boolean);
    if (pct >= 75 && fix.length) return { level: "almost", title: "Almost board-ready", msg: "Your answers scored " + pct + "%. A real board also grades bearing and the situational questions, so tighten up " + listJoin2(fix) + " and run it again." };
    if (pct >= 90) return { level: "ready", title: "Board-ready", msg: "Board-ready. Keep it sharp with a board every few days." };
    if (pct >= 75) return { level: "ready", title: "Strong", msg: "Strong. Tighten the misses." };
    if (pct >= 60) return { level: "work", title: "Getting there", msg: "A board doesn't pass you on a percentage: it wants confident, complete answers. Drill the misses" + (fix.length ? ", work on " + listJoin2(fix) : "") + ", and run it again." };
    return { level: "work", title: "Needs work", msg: "Needs work. Study the misses, then run it again" + (fix.length ? ", and practice " + listJoin2(fix) : "") + "." };
  }

  var MockBoard = {
    verdict: verdict,
    stop: function () { clearTimer(); if (window.Speech) Speech.stop(); if (releaseMic) releaseMic(); },

    // opts.full: rehearse the whole board (report in, opening statement, report out)
    // the ids a board would ask (used to send the same board to a sponsor's phone)
    drawIds: function (cards, length) { return drawDeck(cards.filter(function (c) { return c.q && c.a; }), length).map(function (c) { return c.id; }); },

    render: function (container, cards, length, opts) {
      opts = opts || {};
      askPick = {};
      var pool = cards.filter(function (c) { return c.q && c.a && !(opts.full && c.id === "personal-11"); });
      if (pool.length < 3) { container.innerHTML = '<div class="empty">A Mock Board needs at least 3 cards. Pick a bigger subject, or Board Core.</div>'; return; }
      length = Math.min(length || 15, pool.length);
      var deck = opts.fixed ? pool.slice(0, length) : drawDeck(pool, length);

      // The board as a queue of steps. Follow-ups are inserted right after their question once it's graded.
      var steps = [], sponsorMode = !!opts.sponsor;
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
          var style = last ? "standard" : ["standard", "rapid", "why"][m % 3];
          steps.push({ kind: "member", label: last ? "The Board President" : "Board member " + (m + 1), subs: subs, style: style });
          ch.forEach(function (c) { steps.push({ kind: "q", c: c, style: style, mi: last ? 3 : m % 3 }); });
        });
        var inDeck = {}; deck.forEach(function (c) { inDeck[c.id] = 1; });
        var local = (!sponsorMode && !opts.fixed && window.App && App.localQuestions) ? App.localQuestions(3).filter(function (c) { return !inDeck[c.id]; }).slice(0, 2) : [];
        if (local.length) {   // goes in just before the Board President
          var pi = steps.map(function (x) { return x.kind; }).lastIndexOf("member");
          var ins = [{ kind: "member", label: "Board member " + M, subs: ["your unit and your Army"], style: "standard" }].concat(local.map(function (c) { return { kind: "q", c: c, style: "standard", mi: 2 }; }));
          Array.prototype.splice.apply(steps, [pi, 0].concat(ins));
          chunks.splice(chunks.length - 1, 0, local);
        }
        steps.push({ kind: "reportOut" });
        deck = [].concat.apply([], chunks);
      } else deck.forEach(function (c) { steps.push({ kind: "q", c: c }); });

      var sponsor = !!opts.sponsor;
      // listen-only: like a real board, you hear the question; the words show only when you reveal
      var listen = !sponsor && !!opts.listen && !!(window.Speech && Speech.supported());
      function qShow(text) {
        return listen ? '<div class="q-text" style="margin-top:8px;"><svg class=ic aria-hidden=true><use href=#i-headphones></use></svg> Listen&hellip;</div><div class="muted" style="font-size:.85rem;">Tap <svg class=ic aria-hidden=true><use href=#i-speaker></use></svg> to hear it again. The words show when you reveal.</div>'
                      : '<div class="q-text" style="margin-top:8px;">' + esc(text) + '</div>';
      }
      function sayQ(text) { if (autoRead || listen) Speech.speak(text, curVoice); }   // the sponsor holds the phone: answer shown with the question, sponsor grades

      // ---- record-and-replay: hear your own delivery (audio stays on this phone, gone when the board ends) ----
      var rec = { stream: null, mr: null, chunks: [], url: null };
      var canRec = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
      function getStream() { return rec.stream ? Promise.resolve(rec.stream) : navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) { rec.stream = st; return st; }); }
      function startRec(btn) {
        getStream().then(function (st) {
          rec.chunks = []; rec.mr = new MediaRecorder(st);
          rec.mr.ondataavailable = function (e) { if (e.data && e.data.size) rec.chunks.push(e.data); };
          rec.mr.start(); rec.t0 = Date.now(); btn.textContent = "⏺ Recording… (stops when you reveal)"; btn.classList.add("on"); btn.disabled = true;
        }).catch(function () { App.toast("Can't use the microphone. Allow mic access for this app to record.", 4500); });
      }
      function stopRec(cb) {
        if (!rec.mr || rec.mr.state === "inactive") return cb(null);
        rec.mr.onstop = function () {
          var b = new Blob(rec.chunks, { type: rec.mr.mimeType || "audio/webm" });
          if (rec.url) URL.revokeObjectURL(rec.url);
          rec.url = URL.createObjectURL(b); rec.mr = null; rec.secs = rec.t0 ? Math.round((Date.now() - rec.t0) / 1000) : 0; rec.t0 = 0; cb(rec.url);
        };
        rec.mr.stop();
      }
      releaseMic = function () {
        stopVoice();
        try { if (rec.mr && rec.mr.state !== "inactive") rec.mr.stop(); } catch (e) {}
        if (rec.stream) rec.stream.getTracks().forEach(function (t) { t.stop(); });
        if (rec.url) URL.revokeObjectURL(rec.url);
        rec = { stream: null, mr: null, chunks: [], url: null };
        stopMirror();
      };
      var mirror = { stream: null };
      function mirrorButton() { return (!sponsor && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ? '<button class="btn ghost" id="mirrorBtn"><svg class=ic aria-hidden=true><use href=#i-mirror></use></svg> Mirror (front camera)</button><div id="mirrorBox"></div><div class="spacer"></div>' : ''; }
      function stopMirror() { if (mirror.stream) { mirror.stream.getTracks().forEach(function (t) { t.stop(); }); mirror.stream = null; } }
      function wireMirror() {
        var b = container.querySelector("#mirrorBtn"); if (!b) return;
        b.addEventListener("click", function () {
          if (mirror.stream) { stopMirror(); container.querySelector("#mirrorBox").innerHTML = ""; b.textContent = "Mirror (front camera)"; return; }
          navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false }).then(function (st) {
            mirror.stream = st;
            var box = container.querySelector("#mirrorBox"); if (!box) { stopMirror(); return; }
            box.innerHTML = '<video autoplay playsinline muted style="width:100%;border-radius:10px;transform:scaleX(-1);margin-top:6px;"></video><div class="muted" style="font-size:.85rem;">Head and eyes front, hands still at your sides, no swaying. Nothing is recorded or saved.</div>';
            box.querySelector("video").srcObject = st; b.textContent = "Turn the mirror off";
          }).catch(function () { App.toast("Can't use the camera. Allow camera access to use the mirror.", 4000); });
        });
      }
      function recButton() { return canRec && !sponsor ? '<button class="btn ghost" id="recBtn"><span class="ic"><svg class=ic aria-hidden=true><use href=#i-mic></use></svg></span> Record</button><div class="spacer"></div>' : ""; }
      // Record takes the microphone from the voice check (one microphone user at a time)
      function wireRec() { var b = container.querySelector("#recBtn"); if (b) b.addEventListener("click", function () {
        if (voice.rec) { stopVoice(); voice.paused = true; var vb = container.querySelector("#voiceBtn"); if (vb) { vb.textContent = "Voice check paused while you record"; vb.disabled = true; } }
        startRec(b); }); }
      // call right after a reveal screen is drawn: fills #playback once the recording is ready
      function playback() {
        stopRec(function (url) {
          var box = container.querySelector("#playback");
          if (url && box) box.innerHTML = '<div class="card"><div class="flash-tag">Your answer</div><audio controls src="' + url + '" style="width:100%;margin-top:6px;"></audio>' +
            lengthCue(rec.secs) +
            '<div class="muted" style="font-size:.85rem;margin-top:6px;">Play it back before you tick the boxes: grade what you actually said. Listen for filler words ("um," "like"), pace, and whether you answered the question asked.</div></div>';
        });
      }
      var curLimit = 0;   // seconds allowed for the question on screen
      function lengthCue(secs) {
        if (!secs) return "";
        var cue = secs < 8 ? "Too short: give the answer in a full sentence, then say why it matters." :
          (curLimit && secs > curLimit) ? "Too long: lead with the answer, give the reason, then stop." : "Good length.";
        return '<div style="font-size:.92rem;margin-top:6px;"><b>You talked for ' + secs + ' seconds.</b> ' + cue + '</div>';
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

      function pubCode(c) { if (c.label) return c.label; var p = STUDY.pubsById[c.pub]; return p ? p.code : c.pub; }
      function pubLabel(c) { var p = STUDY.pubsById[c.pub]; return p ? p.code + (p.title ? " — " + p.title : "") : c.pub; }
      // Recite-length answers (creeds, Code of Conduct) get no timer; long answers and scenarios get double time.
      function timeFor(c) {
        if (!secs) return 0;
        var L = String(c.a || "").length;
        if (L > 600) return 0;
        return (L > 200 || (c.points && c.points.length > 1)) ? secs * 2 : secs;
      }
      function header(label) {
        var localN = deck.filter(function (c) { return c.local; }).length, totalQ = deck.length - localN;
        var kind = steps[s] && steps[s].kind, KL = { reportIn: "Reporting in", drill: "Facing movements", intro: "Tell us about yourself", member: "Next board member", reportOut: "Reporting out", follow: "Follow-up to question " + qNum };
        var txt = label ? label : (kind && kind !== "q" && KL[kind]) ? KL[kind] : curLocal ? "About your unit" : qNum ? "Question " + qNum + " of " + totalQ : "";
        return '<div class="q-count mb-head"><span>' + txt + '</span>' + (asked >= 3 ? '<span class="pill score-pill">Score ' + Math.round(100 * got / asked) + '%</span>' : '') + '</div>' +
          '<div class="progress-bar"><span style="width:' + Math.round(100 * Math.min(1, qNum / Math.max(1, totalQ))) + '%"></span></div>';
      }
      function timerHtml(t, why) {
        // say why the clock isn't the Settings value (long answers and scenarios get double time; the intro gets 90 s)
        var note = why ? why : (t > secs && secs ? "Double time: long answer or scenario" : "");
        return t > 0 ? '<div class="timer-big"><span id="tNum"></span>' + (note ? '<small>' + note + '</small>' : '') + '</div><div class="bar timer-bar"><span id="tBar" style="width:100%"></span></div>'
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
        return '<div class="grade-row"><button class="btn grade-again" id="miss">' + (missLabel || "Missed") + '</button>' +
          '<button class="btn grade-good" id="got">' + (gotLabel || "Got it") + '</button></div>';
      }
      function onGrade(fn) {
        container.querySelector("#got").addEventListener("click", function () { fn(true); });
        container.querySelector("#miss").addEventListener("click", function () { fn(false); });
      }
      function next() { stopMirror(); s++; if (s >= steps.length) return results(); show(); }

      // Key-point rubric (scenario cards with `points`): tick what the answer actually covered; partial credit.
      function rubricHtml(c, who) {
        var rule = c.kp1 && c.points.length > 1 ? 'The key fact alone is a pass (75%). Each other box adds a little more.' : 'Tick only what was actually said out loud.';
        return '<div class="card" style="border-color:var(--gold);"><div class="flash-tag">' + (who || "Did you cover these?") + '</div>' +
          '<div class="muted" style="font-size:.85rem;margin-top:4px;">' + rule + '</div>' +
          c.points.map(function (pt, k) {
            var bonus = /^Said why it matters/i.test(pt);
            return '<label class="switch" style="margin-top:10px;"><input type="checkbox" class="kp" data-k="' + k + '"> <span>' + (c.kp1 && k === 0 ? (pt.length > 60 ? '<b>Said the key fact</b> <span class="muted" style="font-size:.85rem;">(' + esc(pt.slice(0, 48).replace(/\s+\S*$/, "")) + '\u2026)</span>' : '<b>' + esc(pt) + '</b> <span class="muted" style="font-size:.85rem;">(the key fact)</span>') : esc(pt) + (bonus ? ' <span class="muted" style="font-size:.85rem;">(bonus)</span>' : '')) + '</span></label>';
          }).join("") + '</div><button class="btn gold lg" id="rubricDone">Score this answer</button>';
      }
      function onRubric(fn, c) {
        // if the checklist is still below the fold, the first tap takes you to it instead of scoring an unticked answer
        var btn = container.querySelector("#rubricDone"), rc = btn.previousElementSibling, gate = false;
        if (window.IntersectionObserver && rc && rc.getBoundingClientRect().top > window.innerHeight - 140) {
          gate = true; btn.textContent = sponsor ? "Tick what they said \u2193" : "Tick what you said \u2193";
          var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { gate = false; btn.textContent = "Score this answer"; io.disconnect(); } }, { rootMargin: "0px 0px -100px 0px" });
          io.observe(rc);
        }
        btn.addEventListener("click", function () {
          if (gate) { gate = false; btn.textContent = "Score this answer"; rc.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
          var boxes = container.querySelectorAll(".kp"), n = 0, left = [];
          boxes.forEach(function (b, k) { if (b.checked) n++; else left.push(k); });
          if (c && c.kp1 && boxes.length > 1) {
            var rest = 0; boxes.forEach(function (b, k) { if (k > 0 && b.checked) rest++; });
            return fn((boxes[0].checked ? 0.75 : 0) + 0.25 * rest / (boxes.length - 1), left);
          }
          fn(boxes.length ? n / boxes.length : 0, left);
        });
      }
      function fmt(x) { return (Math.round(x * 10) / 10).toString(); }

      function show() {
        clearTimer(); document.querySelectorAll(".toast").forEach(function (t) { t.remove(); });
        if (window.App) App.busy = function () { return container.isConnected; };
        var st = steps[s];
        if (st.kind === "q") { curLocal = !!st.c.local; curStyle = st.style || "standard"; curVoice = VOICES[st.mi || 0] || VOICES[0]; return question(st.c); }
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
            '<div class="muted">' + (sponsor ? 'Call each command out loud. Watch for a sharp movement on the command of execution, then they hold the position until your next command.' : 'Stand up and do each command, sharply, on the command of execution. Hold each position until the next command.') + '</div></div>' +
          '<div class="card">' + cmds.map(function (t, k) { return '<div class="row" style="margin-bottom:6px;"><div class="numbubble">' + (k + 1) + '</div><div class="grow"><div class="ttl" style="font-size:1.15rem;font-weight:700;">' + esc(t) + '</div></div></div>'; }).join("") +
            (sponsor ? '' : '<button class="btn ghost" id="sayIt" style="margin-top:6px;"><svg class=ic aria-hidden=true><use href=#i-speaker></use></svg> Call the commands for me</button>') +
            '<details class="fb-fold"><summary>How to do these</summary><div class="muted" style="font-size:.92rem;">' + drillHints(cmds) + 'Then ' + (sponsor ? 'tell the Soldier to take their seat.' : 'wait for the president to tell you to take your seat.') + '</div></details></div>' +
          '<p class="center muted">' + (sponsor ? 'Were the movements crisp, on the command of execution, back to attention each time?' : 'Honest check: crisp, on the command of execution, back to attention each time?') + '</p>' +
          mirrorButton() +
          gradeButtons("Needs work", "Clean");
        setTimeout(wireMirror, 0);
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
              (Store.chain()["memo-report"] ? '<div class="muted">Your memo\'s wording: <b>"' + esc(Store.chain()["memo-report"]) + '"</b></div></div>'
                : '<div class="muted">"Sergeant Major, ' + esc(Store.settings().displayName || "(your rank) (your last name)") + ' reports to the President of the Board." Use your board memo\'s exact wording. <a href="#/memo">Add your memo\'s wording</a>.</div></div>')) +
          '<button class="btn ghost" id="showSteps">Show the reporting steps</button><div id="stepsBox" hidden>' + stepsList(all.slice(1, 5)) + '</div><div class="spacer"></div>' +
          mirrorButton() + '<p class="center muted">' + (sponsor ? 'Did they halt about two steps in front of you, salute and hold it, say their correct rank, and sit only when told?' : 'Honest check: halted two steps in front of the president, saluted and held it until returned, said your correct rank, sat only when told?') + '</p>' +
          gradeButtons("Needs work", "Clean");
        container.querySelector("#showSteps").addEventListener("click", function () { var b = container.querySelector("#stepsBox"); b.hidden = !b.hidden; this.textContent = b.hidden ? "Show the reporting steps" : "Hide the reporting steps"; });
        wireMirror();
        onGrade(function (ok) { bearing.push({ label: "Reporting in", ok: ok }); next(); });
      }
      function intro() {
        var t = secs ? 90 : 0, stmt = Store.statement();
        container.innerHTML = header() + timerHtml(t, "Aim for about a minute (90 seconds max)") +
          '<div class="card"><div class="flash-tag">The board president</div>' +
            '<div class="q-text" style="margin-top:8px;">"Tell the board a little about yourself."</div></div>' +
          '<div class="card"><div class="muted" style="font-size:.92rem;">' + (sponsor ? 'Ask the Soldier to tell you about themselves. Listen for about a minute: who they are, job and unit, time in service, a real accomplishment or two, and their goals as an NCO. Are they saying it, not reciting it?' :
            'Answer out loud in about a minute, eyes on the president: who you are, your job and unit, time in service, a real accomplishment or two, and your goals as an NCO. Say it, don\'t read it.' +
            (stmt ? '' : ' <a href="#/statement">Draft your opening statement first</a> (there\'s an example), then come back.')) + '</div></div>' +
          recButton() + '<button class="btn gold lg" id="reveal">I\'m done</button>';
        if (autoRead) Speech.speak("Tell the board a little about yourself.");
        var done = function () {
          clearTimer();
          container.innerHTML = header() +
            (stmt ? '<div class="card"><div class="flash-tag">Your opening statement</div><div class="flash-a" style="white-space:pre-wrap;">' + esc(stmt) + '</div></div>' +
                    '<div id="playback"></div>' +
                    '<p class="center muted">Did you deliver it smoothly, without reading it, in about a minute?</p>' + gradeButtons("Needs work", "Clean")
                  // no draft yet: score what you said against the parts of a good answer instead
                  : '<div class="card" style="border-color:var(--gold);"><div class="flash-tag">Did you cover these?</div>' +
                      ["Your rank, name, job, and unit", "Your time in service", "One or two real accomplishments", "Your goals as an NCO"].map(function (t) {
                        return '<label class="switch" style="margin-top:10px;"><input type="checkbox" class="ip"> <span>' + esc(t) + '</span></label>'; }).join("") +
                      (sponsor ? '</div>' : '<div class="muted" style="font-size:.85rem;margin-top:10px;">Tip: draft it under Board Day Prep → Opening Statement (there\'s an example).</div></div>') +
                    '<div id="playback"></div><button class="btn gold lg" id="introDone">Score this answer</button>');
          playback();
          if (stmt) onGrade(function (ok) { bearing.push({ label: "Tell us about yourself", ok: ok }); next(); });
          else container.querySelector("#introDone").addEventListener("click", function () {
            var n = 0; container.querySelectorAll(".ip").forEach(function (b) { if (b.checked) n++; });
            bearing.push({ label: "Tell us about yourself", ok: n >= 3 });
            var bt = container.querySelector("#introDone"); bt.disabled = true; bt.classList.add("result-flash");
            bt.textContent = n >= 3 ? "\u2713 Good intro: " + n + " of 4 covered" : n + " of 4 covered. Add the rest next time";
            setTimeout(next, 1300);
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
          gradeButtons("Needs work", "Clean");
        onGrade(function (ok) { bearing.push({ label: "Reporting out", ok: ok }); next(); });
      }

      var STYLE_NOTE = { rapid: "Rapid-fire: short, quick questions. 20 seconds each, no follow-ups. Answer crisply and stop.",
        why: "Asks \"why?\": after a good answer, expect \"Why does that matter?\" Be ready to explain, not just recite.", standard: "" };
      function member(st) {
        container.innerHTML = header() +
          '<div class="card" style="border-color:var(--gold);"><div class="flash-tag">' + esc(st.label) + '</div>' +
            '<div class="q-text" style="margin-top:8px;">' + esc(st.label) + ' will ask about ' + esc(listJoin(st.subs)) + '.</div>' +
            (STYLE_NOTE[st.style] ? '<div style="margin:6px 0;font-weight:600;color:var(--gold);">' + esc(STYLE_NOTE[st.style]) + '</div>' : '') +
            '<div class="muted">' + (sponsor ? 'Speak as this board member. The Soldier should turn to face you, keep their bearing, and answer to you.' : 'Turn to face this member, keep your bearing, and answer to them.') + '</div></div>' +
          '<button class="btn gold lg" id="ready">Ready</button>';
        container.querySelector("#ready").addEventListener("click", next);
      }

      // ---- questions ----
      var curStyle = "standard", curLocal = false;
      var VOICES = [{ pitch: 1, rate: 0.98 }, { pitch: 0.8, rate: 0.92 }, { pitch: 1.2, rate: 1.05 }, { pitch: 0.9, rate: 0.9 }], curVoice = VOICES[0];
      function question(c) {
        if (!c.local) qNum++;
        var cs = timeFor(c); curLimit = cs || 0;
        if (curStyle === "rapid" && secs && c.pub !== "sit" && c.pub !== "personal") cs = Math.min(cs || 20, 20);
        container.innerHTML = header() + timerHtml(cs) +
          // Only the publication is shown on the question side: topic labels can give the answer away.
          '<div class="card"><div class="flash-toprow"><span class="flash-tag">' + esc(pubCode(c)) + (c.adv ? ' \u2022 Advanced' : '') + '</span>' +
            '<span><button class="mini" id="mSpeak" aria-label="Read aloud"><svg class=ic aria-hidden=true><use href=#i-speaker></use></svg></button>' +
            '<button class="mini" id="mReport" aria-label="Report card"><svg class=ic aria-hidden=true><use href=#i-flag></use></svg></button></span></div>' +
            qShow(qt(c)) + '</div>' +
          (sponsor ? sponsorBox(c.a, c.ref, whyHtml(c)) + '<p class="center muted">Read the question aloud, listen, then grade.</p>' + (c.points ? rubricHtml(c, "Sponsor: tick what the Soldier covered") : gradeButtons())
                   : '<p class="center muted">' + (c.why && c.pub !== "sit" && c.pub !== "personal" && curStyle !== "rapid" ? 'Answer out loud, then say why it matters. Then reveal.' : 'Answer out loud, then reveal.') + '</p>' + '<div class="rv-row">' + recButton() + voiceButton() + '</div>' + '<button class="btn gold lg" id="reveal">Reveal answer</button>');
        container.querySelector("#mSpeak").addEventListener("click", function () { Speech.speak(qt(c), curVoice); });
        container.querySelector("#mReport").addEventListener("click", function () { App.reportCard(c); });
        sayQ(qt(c));
        if (sponsor) {
          if (c.points) onRubric(function (fr, left) { clearTimer(); markQ(c, fr, left); }, c); else onGrade(function (ok) { clearTimer(); markQ(c, ok ? 1 : 0); });
          runTimer(cs, function () { var n = container.querySelector("#tNum"); if (n) n.textContent = "Time!"; }); return;
        }
        var rev = function () { stopVoice(); reveal(c); };
        container.querySelector("#reveal").addEventListener("click", rev);
        wireRec(); wireVoice(c);
        runTimer(cs, rev);
      }

      // ---- voice check: hear what you said, pre-tick the key points it heard (you can still change any box) ----
      var voice = { rec: null, text: "" };
      function voiceButton() { return SR ? '<button class="btn ghost" id="voiceBtn" title="Uses your phone\u2019s speech service (Google or Apple); needs a connection"><span class="ic"><svg class=ic aria-hidden=true><use href=#i-voice></use></svg></span> Voice check</button><div class="spacer"></div>' : ""; }
      function wireVoice(c) {
        voice.text = ""; voice.paused = false; voice.started = false;
        var b = container.querySelector("#voiceBtn"); if (!b) return;
        if (c && (c.local || c.pub === "personal")) {   // your unit, your leaders, your life: keep it off the speech service
          b.textContent = "No voice check here"; b.disabled = true; b.title = "Off for personal and your-unit questions"; return;
        }
        var start = function () {
          Store.setSetting("voiceAuto", true); voice.started = true;
          try {
            var r = new SR(); r.lang = "en-US"; r.continuous = true; r.interimResults = false;
            r.onresult = function (e) { for (var k = e.resultIndex; k < e.results.length; k++) if (e.results[k].isFinal) voice.text += " " + e.results[k][0].transcript; };
            r.onerror = function () { if (voiceFail) return; voiceFail = true; App.toast("Voice check isn't available right now (it may need a connection). Grade yourself as usual.", 4000); };
            r.start(); voice.rec = r; voice.t0 = Date.now();
            b.textContent = "⏺ Listening… (stops when you reveal)"; b.classList.add("on"); b.disabled = true;
            // (tapping Record pauses the voice check; see wireRec)
          } catch (err) { App.toast("Voice check isn't supported in this browser.", 3500); }
        };
        if (navigator.onLine === false) {   // speech recognition uses the phone's online service: say so up front instead of failing
          b.textContent = "Voice check needs a connection. Use Record to hear yourself instead."; b.disabled = true; return;
        }
        b.addEventListener("click", start);
        if (Store.settings().voiceAuto && !Store.settings().voiceOff && !voiceFail) start();   // only after you've turned it on once
      }
      function stopVoice() { if (voice.rec) { try { voice.rec.stop(); } catch (e) {} voice.rec = null; } }
      // after reveal: show what it heard and pre-tick matching points (results can arrive a moment after stop)
      function applyVoice(c) {
        if (!voice.text && !container.querySelector("#heard")) return;
        var box = container.querySelector("#heard"); if (!box) return;
        var said = voice.text.trim();
        if (!said) { box.innerHTML = '<div class="muted" style="font-size:.85rem;">Voice check didn\'t catch anything. Grade yourself below.</div>'; return; }
        var html = '<div class="card"><div class="flash-tag">Voice check heard</div><div class="muted" style="font-size:.92rem;">"' + esc(said) + '"</div>';
        var words = said.split(/\s+/).filter(Boolean).length, secsV = voice.t0 ? Math.max(1, Math.round((Date.now() - voice.t0) / 1000) - 1) : 0;
        var fill = (said.toLowerCase().match(/\b(um+|uh+|er+|like|you know|basically|kind of|sort of)\b/g) || []).length;
        if (secsV >= 5) { var wpm = Math.round(words * 60 / secsV);
          html += '<div style="font-size:.92rem;margin-top:6px;"><b>Delivery:</b> about ' + words + ' words in ' + secsV + ' seconds (' + wpm + ' a minute)' +
            (wpm > 190 ? ', a little fast: slow down and breathe' : wpm < 90 ? ', a little slow or halting: lead with the answer' : ', a good pace') +
            (fill ? '; ' + fill + ' filler word' + (fill > 1 ? 's' : '') + ' ("um", "like")' : '; no filler words heard') + '.</div>'; }
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

      function subjHtml(s) { var x = String(s).split(" \u2014 "); return '<span class="t" style="font-weight:700;">' + esc(x[0]) + '</span>' + (x.length > 1 ? '<span class="s">' + esc(x.slice(1).join(" \u2014 ")) + '</span>' : ''); }
      function moreHtml(c) {
        return (curStyle === "why" && c.pub !== "sit" && c.pub !== "personal" ? '' : whyHtml(c)) +
          (c.ref ? '<div class="flash-ref">Reference: ' + esc(c.ref) + '</div>' : '') +
          (c.sample && c.pub === "personal" ? '<div class="flash-ref" style="color:var(--text);margin-top:10px;"><b>Example answer (fictional Soldier):</b> ' + esc(c.sample) + '</div>' : '');
      }
      function reveal(c) {
        clearTimer();
        if (autoRead) Speech.speak(c.a);
        var listened = SR && voice.started && !voice.paused && !c.unfilled;
        container.innerHTML = header() +
          '<div class="card"><div class="flash-tag">' + esc(pubCode(c)) + (c.topic && String(c.topic).toLowerCase() !== String(pubCode(c)).toLowerCase() ? " • " + esc(c.topic) : "") + '</div>' +
            '<div class="q-text" style="margin:6px 0 12px;">' + esc(qt(c)) + '</div>' +
            (c.unfilled ? '' : '<div class="flash-tag">Answer</div><div class="flash-a">' + esc(c.a).replace(/\n/g, "<br>") + '</div>') +
            (c.changed ? '<div class="flash-ref" style="color:var(--gold);margin-top:8px;"><svg class=ic aria-hidden=true><use href=#i-alert></use></svg> ' + esc(c.changed) + '</div>' : '') +
            (c.points && !c.unfilled ? '' : moreHtml(c)) + '</div>' +
          (c.points && !c.unfilled ? (listened ? '<div id="heard"><div class="muted center" style="font-size:.85rem;">Checking what you said…</div></div>' : '') + rubricHtml(c) +
            (moreHtml(c) ? '<div class="card">' + moreHtml(c) + '</div>' : '') : '') +
          (window.Speech && Speech.supported() && !c.unfilled ? '<button class="btn ghost" id="hearA" style="margin-bottom:8px;"><svg class=ic aria-hidden=true><use href=#i-speaker></use></svg> Hear a model answer</button>' : '') +
          (listened && !c.points ? '<div id="heard"><div class="muted center" style="font-size:.85rem;">Checking what you said…</div></div>' : '') +
          '<div id="playback"></div>' +
          (c.unfilled ? '<div class="card"><div class="muted">You haven\'t filled this in yet, so it isn\'t scored. Boards do ask it: look it up and add it under Board Day Prep, then it counts.</div></div><button class="btn gold lg" id="skipLocal">Next question</button>'
            : c.points ? '' : '<p class="center muted">How did you do?</p>' + gradeButtons());
        playback();
        var ha = container.querySelector("#hearA"); if (ha) ha.addEventListener("click", function () { Speech.speak(c.sample || c.a, { rate: 0.95 }); });
        if (listened) setTimeout(function () { applyVoice(c); }, 900);
        if (c.unfilled) { container.querySelector("#skipLocal").addEventListener("click", function () { next(); }); return; }
        if (c.points) onRubric(function (fr, left) { markQ(c, fr, left); }, c); else onGrade(function (ok) { markQ(c, ok ? 1 : 0); });
      }

      var qScores = [], extras = [];   // extras: second tries and follow-ups, {k: 'cb'|'fu', ok}
      function markQ(c, score, left) {
        if (!c.local) qScores.push(score);          // score: 1 = got it, 0 = missed, fractions from the key-point rubric
        var ok = score >= 0.66;   // two of three key points is a pass; the key fact alone (kp1) is 0.75
        Store.grade(c.id, ok ? "good" : "again");
        var pp = perPub[c.pub] || (perPub[c.pub] = { n: 0, miss: 0, code: pubLabel(c), id: c.pub });
        pp.n++; asked++; got += score;
        if (!ok) { missedIds.push(c.id); pp.miss++; missed.push({ q: qt(c), a: c.a, code: pubCode(c) + (score > 0 && score < 1 ? " \u2022 " + Math.round(score * 100) + "% of key points" : "") }); }
        // Like a real board: a good answer earns a harder follow-up; a miss means the board comes back to it
        // later in that member's turn (or at the end), so you get a second chance to get it right.
        var fups = (c.follow || []).slice();
        if (curStyle === "why" && c.why && c.pub !== "sit" && c.pub !== "personal") fups = [{ q: "Why does that matter?", a: c.why, ref: c.ref }];
        if (curStyle === "rapid" || opts.quick) fups = [];
        // A real board member presses on what you left out: ask about the first missed key point (bonus "why" boxes skipped)
        var gap = (left || []).map(function (k) { return c.points && c.points[k]; }).filter(function (p) { return p && !/^Said why it matters/i.test(p); })[0];
        if (score >= 0.66 && score < 1 && gap && curStyle !== "rapid" && !opts.quick && !c.local && c.pub !== "personal") {
          var shortList = c.points.every(function (p) { return p.length <= 22 || /^Said why/i.test(p); });
          var nLeft = (left || []).filter(function (k) { return c.points[k] && !/^Said why/i.test(c.points[k]); }).length;
          var tp = c.topic ? String(c.topic).replace(/\s*\(.*\)\s*$/, "") : "";
          if (tp && !/^[A-Z0-9]{2,}/.test(tp) && !/\s[A-Z]/.test(tp)) tp = tp.charAt(0).toLowerCase() + tp.slice(1);   // keep acronyms like AFTB, SHARP
          var cue = c.pub === "sit" ? "What else would you do, Sergeant?" : shortList ? (nLeft > 1 ? "You left some out. What's the rest of it?" : "You left one out. What's the rest of it?") : "There's more to it. What else should the board hear" + (tp ? " about " + tp : "") + "?";
          fups = [{ q: cue, a: "The part left out: " + gap.replace(/\.$/, "") + "." + (c.why ? " " + c.why : ""), ref: c.ref, adaptive: true }];
        }
        if (score >= 0.5 && fups.length) {
          var fu = fups.map(function (f) { return { kind: "follow", f: f, parent: c }; });
          Array.prototype.splice.apply(steps, [s + 1, 0].concat(fu));
        } else if (score < 0.5 && !opts.quick) {
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
            qShow(qt(c)) + (listen ? '<button class="mini" id="cbSpeak" aria-label="Hear it again" style="margin-top:6px;"><svg class=ic aria-hidden=true><use href=#i-speaker></use></svg></button>' : '') + '</div>' +
          (sponsor ? sponsorBox(c.a, c.ref, "") + '<p class="center muted">Ask it again, listen, then grade.</p>' + gradeButtons()
                   : '<p class="center muted">You saw the answer a few minutes ago. Say it out loud now, in your own words, then reveal.</p>' + recButton() + '<button class="btn gold lg" id="reveal">Reveal answer</button>');
        sayQ(qt(c));
        var cbs = container.querySelector("#cbSpeak"); if (cbs) cbs.addEventListener("click", function () { Speech.speak(qt(c), curVoice); });
        var gradeIt = function (ok) {
          var pp = perPub[c.pub] || (perPub[c.pub] = { n: 0, miss: 0, code: pubLabel(c), id: c.pub });
          pp.n++; asked++; if (ok) got++; else pp.miss++;
          extras.push({ k: "cb", ok: ok });
          next();
        };
        if (sponsor) { onGrade(function (ok) { clearTimer(); gradeIt(ok); }); runTimer(t, function () { var n = container.querySelector("#tNum"); if (n) n.textContent = "Time!"; }); return; }
        var rev = function () {
          clearTimer();
          container.innerHTML = header("Second try") +
            '<div class="card"><div class="flash-tag">' + esc(pubCode(c)) + '</div><div class="q-text" style="margin:6px 0 12px;">' + esc(qt(c)) + '</div>' +
            '<div class="flash-tag">Answer</div><div class="flash-a">' + esc(c.a).replace(/\n/g, "<br>") + '</div></div>' +
            '<div id="playback"></div><p class="center muted">Did you get it this time?</p>' + gradeButtons();
          playback();
          onGrade(gradeIt);
        };
        container.querySelector("#reveal").addEventListener("click", rev);
        wireRec();
        runTimer(t, rev);
      }

      function followUp(st) {
        var f = st.f, c = st.parent, t = secs;
        container.innerHTML = header() + timerHtml(t) +
          '<div class="card" style="border-color:var(--gold);"><div class="flash-tag">The board follows up</div>' +
            '<div class="muted" style="font-size:.85rem;margin-top:6px;">About: ' + esc(String(qt(c)).length > 110 ? String(qt(c)).slice(0, 107).replace(/\s+\S*$/, "") + "\u2026" : qt(c)) + '</div>' +
            qShow(f.q) + (listen ? '<button class="mini" id="fuSpeak" aria-label="Hear it again" style="margin-top:6px;"><svg class=ic aria-hidden=true><use href=#i-speaker></use></svg></button>' : '') + '</div>' +
          (sponsor ? sponsorBox(f.a, f.ref, "") + '<p class="center muted">Ask the follow-up, listen, then grade.</p>' + gradeButtons()
                   : '<p class="center muted">Answer out loud, then reveal.</p>' + recButton() + '<button class="btn gold lg" id="reveal">Reveal answer</button>');
        sayQ(f.q);
        var fus = container.querySelector("#fuSpeak"); if (fus) fus.addEventListener("click", function () { Speech.speak(f.q, curVoice); });
        var gradeFollow = function (ok) {
          var pp = perPub[c.pub] || (perPub[c.pub] = { n: 0, miss: 0, code: pubLabel(c), id: c.pub });
          pp.n++; asked++; extras.push({ k: "fu", ok: ok });
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
        clearTimer(); Speech.stop(); releaseMic(); window.scrollTo(0, 0); if (window.App) App.busy = null;
        Store.recordQuiz("Mock Board" + (opts.full ? " (full)" : "") + (sponsor ? " with sponsor" : ""), got, asked);
        var pct = asked ? Math.round((got / asked) * 100) : 0;
        var weak = Object.keys(perPub).map(function (k) { return perPub[k]; })
          .filter(function (p) { return p.miss > 0; })
          .sort(function (a, b) { return b.miss - a.miss; }).slice(0, 5);

        // A real board weighs bearing and the required situational questions, not just the percentage.
        var bearingMiss = bearing.filter(function (b) { return !b.ok; }).map(function (b) { return b.label.toLowerCase(); });
        var pubOf = {}; cards.forEach(function (c) { pubOf[c.id] = c.pub; });
        var sitMiss = missedIds.filter(function (id, k) { return pubOf[id] === "sit" && missedIds.indexOf(id) === k; }).length;
        var V = verdict(pct, bearingMiss, sitMiss), notReady = V.level === "almost", msg = V.msg;
        if (sponsor) msg = msg.replace(/^Your answers/, "Their answers").replace(/so tighten up/, "so have them tighten up");
        if (deck.length < 8 && V.level !== "work") { V = { level: "work", title: "Good practice", msg: pct + "% on a short board. Board-ready takes a full board of 10 or more questions." }; msg = V.msg; }
        var nQ = deck.filter(function (c) { return !c.local; }).length, nF = Math.max(0, asked - nQ);
        var countLine = nQ + " question" + (nQ === 1 ? "" : "s") + (nF ? ", " + nF + " follow-up" + (nF === 1 ? "" : "s") + " or second tries" : "");
        var strongB = pct >= 75 && !notReady && V.level !== "work" && deck.length >= 8;
        var vTitle = strongB ? "Strong board" : V.title, vLine = strongB ? (missed.length ? "Tighten the " + missed.length + " miss" + (missed.length === 1 ? "" : "es") + ", then run another." : "Keep it sharp with a board every few days.")
          : (msg.indexOf(V.title + ".") === 0 ? msg.slice(V.title.length + 1).trim() : msg);
        var html = '<div class="ring-wrap"><div class="ring ' + (pct >= 75 ? 'good' : pct >= 50 ? 'mid' : 'bad') + '" style="--p:' + pct + ';"><div class="ring-in">' + pct + '%</div></div><small>score</small></div>' +
          '<div class="done-h">' + (strongB ? '<svg class=ic aria-hidden=true><use href=#i-trophy></use></svg> ' : '') + esc(vTitle) + '</div><p class="center muted" style="margin-top:0;">' + esc(vLine) + '</p>' +
          (function () {
            var full = qScores.filter(function (x) { return x >= 0.99; }).length, part = qScores.filter(function (x) { return x >= 0.66 && x < 0.99; }).length, miss = qScores.length - full - part;
            var cb = extras.filter(function (x) { return x.k === "cb"; }), fu = extras.filter(function (x) { return x.k === "fu"; });
            var cbOk = cb.filter(function (x) { return x.ok; }).length, fuOk = fu.filter(function (x) { return x.ok; }).length;
            var legend = '<div class="dot-legend">' + (full ? '<span><span class="dot g"></span>full</span>' : '') + (part ? '<span><span class="dot a"></span>with gaps</span>' : '') + (miss ? '<span><span class="dot r"></span>missed</span>' : '') + (extras.length ? '<span><span class="dot sq"></span>second try / follow-up</span>' : '') + '</div>';
            return '<div class="dots" aria-hidden="true">' + qScores.map(function (x) { return '<span class="dot ' + (x >= 0.99 ? 'g' : x >= 0.66 ? 'a' : 'r') + '"></span>'; }).join("") +
                (extras.length ? '<span class="dot-gap"></span>' + extras.map(function (x) { return '<span class="dot sq ' + (x.ok ? 'g' : 'r') + '"></span>'; }).join("") : '') + '</div>' + legend +
              '<p class="center muted" style="font-size:.92rem;margin:4px 0 0;">' + countLine + '</p><details class="set-fold score-how"><summary>How this was scored</summary><p class="muted" style="font-size:.92rem;margin:0 0 8px;">First answers: ' + full + ' full \u2022 ' + part + ' with gaps \u2022 ' + miss + ' missed' +
                (cb.length ? '<br>Second tries: ' + cbOk + ' of ' + cb.length + ' recovered' : '') + (fu.length ? '<br>Follow-ups: ' + fuOk + ' of ' + fu.length + ' right' : '') +
                '<br>The score counts every answer, with part credit for answers with gaps.</p></details>' +
              '';
          })() +
          // the next step first: drill the misses (or run another), then the details
          (missed.length && !sponsor ? '<button class="btn gold lg" id="drillMiss"><svg class=ic aria-hidden=true><use href=#i-refresh></use></svg> Drill your ' + missed.length + ' miss' + (missed.length === 1 ? '' : 'es') + ' now</button><div class="spacer"></div>' : '');
        if (bearing.length) {
          var BHREF = { "Reporting in": "#/reporting", "Reporting out": "#/reporting", "Facing movements": "#/flash/tc3-21-5", "Tell us about yourself": "#/statement" };
          html += '<h2 class="section">Bearing &amp; delivery</h2><div class="lg">';
          bearing.forEach(function (b) {
            var inner = '<span class="grow"><span class="t" style="font-weight:600;">' + esc(b.label) + '</span>' + (!b.ok && !sponsor && BHREF[b.label] ? '<span class="s">Tap to practice</span>' : '') + '</span><b class="' + (b.ok ? "badge-good" : "badge-bad") + '">' + (b.ok ? "✓ clean" : "✗ needs work") + '</b>';
            html += !b.ok && !sponsor && BHREF[b.label] ? '<a class="li" href="' + BHREF[b.label] + '">' + inner + '<span class="chev" aria-hidden="true"><svg class=ic aria-hidden=true><use href=#i-chev></use></svg></span></a>' : '<div class="li">' + inner + '</div>';
          });
          html += '</div>';
        }
        if (weak.length) {
          html += '<h2 class="section">Weakest subjects</h2><div class="lg">';
          weak.forEach(function (p) { html += '<a class="li" href="#/flash/' + encodeURIComponent(p.id || "") + '"><span class="grow">' + subjHtml(p.code) + '</span><b class="badge-bad" style="white-space:nowrap;">missed ' + p.miss + ' of ' + p.n + '</b><span class="chev" aria-hidden="true"><svg class=ic aria-hidden=true><use href=#i-chev></use></svg></span></a>'; });
          html += '</div>';
        }
        if (sponsor) html += '<h2 class="section">Your notes for the Soldier (optional)</h2><textarea class="input" id="sbNote" rows="3" maxlength="300" placeholder="e.g. Good bearing. Rambled on the intro; slow down on SHARP answers."></textarea>' +
          '<div class="spacer"></div><button class="btn gold lg" id="sendBack"><svg class=ic aria-hidden=true><use href=#i-send></use></svg> Send results to the Soldier</button>' +
          '<div class="muted center" style="font-size:.85rem;margin-top:6px;">They open the link on their phone: the score goes into their history and the questions they missed come back sooner.</div>';
        if (missed.length) {
          html += '<details class="set-fold"><summary>Review ' + (sponsor ? 'their' : 'your') + ' ' + missed.length + ' miss' + (missed.length === 1 ? '' : 'es') + '</summary>';
          missed.forEach(function (m) {
            html += '<div class="card"><div class="flash-tag">' + esc(m.code) + '</div><div style="font-weight:600;margin-bottom:6px;">' + esc(m.q) + '</div><div class="muted">' + esc(m.a) + '</div></div>';
          });
          html += '</details>';
        }
        html += (window.App && App.sessionNextHtml ? App.sessionNextHtml() : '') + '<div class="spacer"></div><button class="btn ' + (missed.length || sponsor ? 'ghost' : 'gold') + ' lg" id="again">Run another board</button><div class="spacer"></div><button class="btn ghost lg" id="home">Back to Home</button>';
        container.innerHTML = html;
        container.querySelector("#again").addEventListener("click", function () { MockBoard.render(container, cards, length, opts); });
        container.querySelector("#home").addEventListener("click", function () { App.go("#/"); });
        var dm = container.querySelector("#drillMiss");
        if (dm) dm.addEventListener("click", function () {
          Store.setChainRole("last-misses", missedIds.filter(function (id, k) { return missedIds.indexOf(id) === k; }).slice(0, 40).join(","));
          App.go("#/flash/misses");
        });
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
