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

NOTES
  - Progress is saved in the browser you use. The local copy and the online
    version keep separate progress, and so do different browsers or devices.
  - Every word has a built-in mnemonic (tap "Mnemonic" after flipping a card).
    They are inside index.html, so they work offline with no Claude needed.
    The CSV files also include them in a "mnemonic" column.
  - Example sentences live in examples.js, one line per word, keyed by the same id
    as the mnemonics ("1-0" = lesson 1, word 0). Furigana is written as 漢字[かんじ].
    To fix a sentence, search for it in examples.js and edit it.
  - "Ask Claude for another" only appears in the online version on Claude.
  - The N4 list was typed from your scanned PDF (people and place names left out).
    To fix a word, edit it in index.html (search for the word) and save.
