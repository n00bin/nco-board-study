/* ===========================================================
   Audio — read-aloud using the browser's built-in speech.
   No library, no network. Degrades silently if unsupported.
   The onEnd callback fires exactly once per speak(): on end, on
   error, or from a fallback timer (so callers never hang). If the
   speech is cancelled by stop() or a newer speak(), it does NOT fire.
   =========================================================== */
(function () {
  "use strict";

  var synth = window.speechSynthesis || null;
  var current = null; // { dead: fn } for the utterance now speaking

  function killCurrent() {
    if (current) { var c = current; current = null; c.dead(); }
  }

  var Speech = {
    supported: function () { return !!synth; },
    speak: function (text, opts) {
      opts = opts || {};
      killCurrent(); // silently retire the previous utterance (no stale callback)

      var fired = false, timer = null, token = {};
      function done() {
        if (fired) return;
        fired = true;
        if (timer) { clearTimeout(timer); timer = null; }
        if (current === token) current = null;
        if (opts.onEnd) { try { opts.onEnd(); } catch (e) {} }
      }
      token.dead = function () { fired = true; if (timer) { clearTimeout(timer); timer = null; } };

      if (!synth || !text) { current = token; timer = setTimeout(done, 400); return; }

      try {
        current = token;
        try { synth.cancel(); } catch (e0) {} // stop anything in progress
        var s = String(text);
        var u = new SpeechSynthesisUtterance(s);
        u.rate = opts.rate || 0.98;
        u.pitch = opts.pitch || 1;
        u.lang = "en-US";
        u.onend = done;
        u.onerror = done;
        // Safety net: some Android builds never fire onend/onerror.
        timer = setTimeout(done, Math.max(4000, s.length * 90 + 3000));
        synth.speak(u);
      } catch (e) {
        current = token;
        if (timer) { clearTimeout(timer); timer = null; }
        timer = setTimeout(done, 400);
      }
    },
    stop: function () {
      killCurrent();
      if (synth) { try { synth.cancel(); } catch (e) {} }
    }
  };

  window.Speech = Speech;
})();
