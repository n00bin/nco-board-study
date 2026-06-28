/* ===========================================================
   Flashcards — flip cards, mark Known / Need review.
   Prioritises cards you don't know yet, then shuffles.
   =========================================================== */
(function () {
  "use strict";

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Order: cards needing review first, then new, then known.
  function orderCards(cards) {
    var review = [], fresh = [], known = [];
    cards.forEach(function (c) {
      var s = Store.statusOf(c.id);
      if (s === "review") review.push(c);
      else if (s === "known") known.push(c);
      else fresh.push(c);
    });
    return shuffle(review).concat(shuffle(fresh)).concat(shuffle(known));
  }

  var Flashcards = {
    render: function (container, cards, title) {
      if (!cards.length) {
        container.innerHTML = '<div class="empty">No cards in this deck yet.</div>';
        return;
      }

      var deck = orderCards(cards);
      var i = 0;

      container.innerHTML =
        '<div class="flash-wrap">' +
          '<div class="flash-progress" id="fProg"></div>' +
          '<div class="flashcard" id="fCard">' +
            '<div class="flash-inner">' +
              '<div class="flash-face flash-front">' +
                '<div class="flash-tag" id="fTagF"></div>' +
                '<div class="flash-q" id="fQ"></div>' +
              '</div>' +
              '<div class="flash-face flash-back">' +
                '<div class="flash-tag" id="fTagB">Answer</div>' +
                '<div class="flash-a" id="fA"></div>' +
                '<div class="flash-ref" id="fRef"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="flash-hint">Tap card to flip</div>' +
          '<div class="btn-row">' +
            '<button class="btn ghost" id="fReview">&#8635; Need review</button>' +
            '<button class="btn gold" id="fKnown">&#10003; I knew it</button>' +
          '</div>' +
        '</div>';

      var cardEl = container.querySelector("#fCard");
      var inner = container.querySelector(".flash-inner");

      function pub(c) {
        var p = STUDY.pubsById[c.pub];
        return p ? p.code : "";
      }

      function paint() {
        var c = deck[i];
        cardEl.classList.remove("flipped");
        container.querySelector("#fProg").textContent =
          "Card " + (i + 1) + " of " + deck.length + " • " + title;
        container.querySelector("#fTagF").textContent = pub(c) + (c.topic ? " • " + c.topic : "");
        container.querySelector("#fQ").textContent = c.q;
        container.querySelector("#fA").innerHTML = String(c.a).replace(/\n/g, "<br>");
        container.querySelector("#fRef").textContent = c.ref ? "Reference: " + c.ref : "";
      }

      function next(markFn) {
        markFn(deck[i].id);
        if (i + 1 >= deck.length) {
          App.toast("Deck complete — great work!");
          App.go("#/"); // back home
          return;
        }
        i++;
        paint();
      }

      cardEl.addEventListener("click", function () { cardEl.classList.toggle("flipped"); });
      container.querySelector("#fKnown").addEventListener("click", function (e) {
        e.stopPropagation(); next(Store.markKnown.bind(Store));
      });
      container.querySelector("#fReview").addEventListener("click", function (e) {
        e.stopPropagation(); next(Store.markReview.bind(Store));
      });

      paint();
    }
  };

  window.Flashcards = Flashcards;
})();
