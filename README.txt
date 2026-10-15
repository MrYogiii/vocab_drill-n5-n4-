Nihongo Vocab Drill (N5 + N4)
=============================

Flashcards for Minna no Nihongo vocabulary:
  N5 = Lessons 1-25 (745 words)
  N4 = Lessons 26-50 (991 words)

FILES
  index.html                 The app. Double-click to open it in a browser.
  examples.js                2 example sentences for every word (keep it next to index.html).
  data/n5-vocabulary.csv     N5 word list + mnemonics (opens in Excel / Google Sheets)
  data/n4-vocabulary.csv     N4 word list + mnemonics

HOW TO USE
  1. Open index.html and pick N5 or N4.
  2. Read the English word, say the Japanese in your head, tap "Show answer".
  3. Tap the green "Got it" or the red "Wrong". Wrong cards come back 3 cards later,
     then once more about 8 cards later.
  4. "Start-of-day recall" tests the words from your last study day.
     "End-of-day review" tests the words you studied today.
  5. "Lessons & mode" lets you pick lessons, switch to Kanji -> Reading,
     or skip katakana words.
  6. After flipping a card, tap "Examples" to see 2 short sentences that use the word,
     with furigana over every kanji and an English translation.
  Keyboard: Enter/Space = flip, right arrow = got it, left arrow = wrong,
            M = mnemonic, E = examples.

ONLINE (website + backend + database, all free)
  Website:  https://nihongo-vocab-drill.nihongo-vocab-drill.workers.dev
  Backup:   https://mryogiii.github.io/vocab_drill-n5-n4-/  (same app, same sync)
  - Hosted on Cloudflare Workers (free plan). The database is Cloudflare D1.
  - "Online sync" on the home screen saves your progress to the database.
    Tap "Turn on sync" on one device, then on your other devices tap
    "I have a sync key" and type the key. No email or password.
  - Keep your sync key private: anyone with it can see and change your progress.

  Files for the backend:
    sync.js            Runs in the browser; uploads/downloads progress.
    worker/index.js    The server (Cloudflare Worker): sync API + serves the app.
    schema.sql         Database tables.
    wrangler.jsonc     Cloudflare settings (database id, etc.).
    .assetsignore      Files the server must NOT publish.

  To publish changes to the Cloudflare site, run this in this folder:
    npx wrangler@4 deploy
  (git push updates the GitHub Pages copy only.)

NOTES
  - Without sync, progress is saved only in the browser you use, so different
    browsers or devices keep separate progress.
  - Every word has a built-in mnemonic (tap "Mnemonic" after flipping a card).
    They are inside index.html, so they work offline with no Claude needed.
    The CSV files also include them in a "mnemonic" column.
  - Example sentences live in examples.js, one line per word, keyed by the same id
    as the mnemonics ("1-0" = lesson 1, word 0). Furigana is written as 漢字[かんじ].
    To fix a sentence, search for it in examples.js and edit it.
  - "Ask Claude for another" only appears in the online version on Claude.
  - The N4 list was typed from your scanned PDF (people and place names left out).
    To fix a word, edit it in index.html (search for the word) and save.
