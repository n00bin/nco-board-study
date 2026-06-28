# NCO Board Study Guide

A phone study app (flashcards + quizzes) for the **E-5 / E-6 Army promotion board**, built from the
publications in this folder. It installs to your Android home screen, runs **fully offline**, and keeps
your progress on your phone — no account, no app store, nothing to sign up for.

---

## What's inside

- **Flashcards** — flip a card to see the answer, then tap **"I knew it"** or **"Need review."** The app
  shows cards you don't know yet first.
- **Quiz** — multiple-choice, scored, with instant right/wrong feedback. Pick 10, 20, or all questions.
- **Browse** — every publication, broken out by subject, with its own progress bar.
- **Search** — type any word to find a card.
- **Stats** — overall mastery, known/review counts, and your recent quiz scores.

Content currently covers **all 18 publications** with **124 high-yield cards** (the kind of facts a board
asks: the Army Values, the Code of Conduct, MDMP/TLP steps, which AR covers what, SHARP reporting, the
General Orders, the Soldier's & NCO Creeds, and more).

---

## Get it on your Android phone (easiest way — about 3 minutes)

Phones can only "install" a web app when it's served over a secure (`https`) web address, so we put the
`app` folder online for free first. The simplest option needs **no account**:

### Option A — Netlify Drop (no account, instant)
1. On your computer, open **https://app.netlify.com/drop** in a browser.
2. Drag the **`app`** folder (this folder) onto the page.
3. It uploads and gives you a link like `https://random-name.netlify.app`.
4. On your **phone**, open that link in **Chrome**.
5. Tap Chrome's **⋮ menu → "Add to Home screen"** (or "Install app"). Confirm.
6. Open it from your home screen like any app. It now works **offline**.

> The free Netlify link can expire after about an hour unless you make a free account. If you want a
> permanent link, make the free account when it prompts you, or use Option B.

### Option B — GitHub Pages (permanent, free, needs a free GitHub account)
1. Create a repository and upload the contents of the `app` folder to it.
2. In the repo: **Settings → Pages → Build from branch → `main` / root → Save**.
3. After a minute you get a permanent link like `https://yourname.github.io/your-repo/`.
4. Open it on your phone in Chrome and **Add to Home screen** (same as above).

### Preview on your computer first (optional)
From inside the `app` folder, run one of these, then open the printed address:
```
python -m http.server 8000
```
Go to `http://localhost:8000`. (Service-worker offline mode only activates over `https` or `localhost`,
so test offline behavior on the phone after installing.)

---

## How to study

- Tap **Flashcards** → pick **All Publications** or one subject → tap a card to flip → mark it.
- Tap **Quiz** → pick a subject → choose how many questions → answer.
- The home screen and each subject show a **mastery bar** that fills as you mark cards "known."
- **Stats → Reset** lets you wipe progress and start fresh.

---

## Adding or changing study content

All questions live in one plain-text file: **`data/content.js`**. You don't need to touch any other file.
Each card looks like this:

```js
{ id:"ar600-20-01", pub:"ar600-20", topic:"Chain of Command",
  q:"What Army Regulation covers the Army Command Policy?",
  a:"AR 600-20",
  ref:"AR 600-20",
  choices:["AR 600-20","AR 670-1","AR 350-1","AR 27-10"], answer:0 },
```

- `pub` must match one of the publication `id`s listed at the top of the file.
- `choices` + `answer` are **optional** — include them to write a custom multiple-choice question
  (`answer` is the position of the correct choice, starting at 0). Leave them out and the quiz builds
  choices automatically.
- Add `flashOnly:true` to long passages (creeds, etc.) so they only appear as flashcards, not quizzes.

After editing, bump the cache name in **`sw.js`** (change `ncoboard-v1` to `ncoboard-v2`) so your phone
picks up the new content next time it's online, then re-upload the folder.

---

## A note on accuracy

These cards were written from established, board-standard Army knowledge. A few details (for example exact
fitness-test events, specific measurements, or time limits) change between editions — those are flagged in
the cards and should be **double-checked against the actual PDFs** in the parent folder before your board.
A deeper, page-by-page extraction of every publication can be added later to expand each subject from a
handful of cards to comprehensive coverage.
