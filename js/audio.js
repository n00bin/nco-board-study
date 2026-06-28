/* ===========================================================
   Audio — read-aloud using the browser's built-in speech.
   No library, no network. Degrades silently if unsupported.
   =========================================================== */
(function () {
  "use strict";

  var synth = window.speechSynthesis || null;

  var Speech = {
    supported: function () { return !!synth; },
    speak: function (text, opts) {
      if (!synth || !text) return;
      opts = opts || {};
      try {
        synth.cancel(); // stop anything in progress
        var u = new SpeechSynthesisUtterance(String(text));
        u.rate = opts.rate || 0.98;
        u.pitch = opts.pitch || 1;
        u.lang = "en-US";
        synth.speak(u);
      } catch (e) {}
    },
    stop: function () { if (synth) { try { synth.cancel(); } catch (e) {} } }
  };

  window.Speech = Speech;
})();
