import React, { useEffect, useMemo, useState } from "react";

// Idioms Flashcards — Single-file React component
// - Uses Tailwind classes for styling (no external CSS needed)
// - Default export a React component so the canvas can preview it
// - Features:
//   * Import CSV or paste TSV / CSV text
//   * Load built-in sample (50 idioms)
//   * Flip card to view front/back
//   * Mark ✅ correct or ❌ incorrect
//   * In-session short requeue for incorrect cards ("after a few cards")
//   * SM-2-like scheduling saved to localStorage
//   * Points tracker & stats
//   * Settings: session requeue distance (cards), speed (minutes vs days for next due)

// ---------- Utilities ----------
const STORAGE_KEY = "idioms_flashcards_v1";

function nowTs() {
  return Date.now();
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// Simple CSV/TSV parser: tries to detect tabs or commas, supports quoted fields (basic)
function parseBulkText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Detect separator: tab preferred if present
  const sep = lines.some((l) => l.includes("\t")) ? "\t" : ",";

  const rows = lines.map((line) => {
    // Basic split — handle quoted cells
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (!inQuotes && line.substr(i, sep.length) === sep) {
        result.push(cur.trim());
        cur = "";
        i += sep.length - 1;
        continue;
      }
      cur += ch;
    }
    result.push(cur.trim());
    return result;
  });
  return rows
    .filter((r) => r.length >= 2)
    .map((r) => ({ front: r[0], back: r.slice(1).join(" ") }));
}

// Default sample (your 50 idioms) — small subset shown here for brevity; the code includes full 50.
const SAMPLE = [
  [
    "Under the weather",
    "Feeling ill / getting a cold. Example: My mom was feeling a bit under the weather.",
  ],
  ["Cold feet", "Becoming nervous. Example: It was her chance to speak and she was getting cold feet."],
  ["Apple of my eye", "Someone you are very fond of or like. Example: My younger brother is the apple of my eye."],
  ["Set the record straight", "Reveal the truth / clarify. Example: In order to set the record straight, the umpires checked the camera to review the previous shot."],
  ["Kill two birds with one stone", "Achieve two results by doing one thing. Example: None of us understood that he was trying to kill two birds with a stone when he joined the military forces."],
  ["Snowed under", "To be busy. Example: My father seems to have been snowed under for the last few weeks."],
  ["To break someone’s bubble", "To prove someone else’s beliefs are not true. Example: Glint just broke my bubble when he said that he was a part of it."],
  ["Walk on eggshells", "To be very careful with your actions and words. Example: Talking to my mom about my grades made me feel like I was walking on eggshells."],
  ["Bite the bullet", "Finish something unpleasant / get something over with. Example: Danny decided to bite the bullet and talk to Sid today."],
  ["Make two ends meet", "To have just enough money for your needs. Example: Harry and Hani are finding it difficult to make two ends meet."],
  ["To be at loggerheads", "To quarrel or disagree. Example: Jithin’s parents seem to be at loggerheads all the time."],
  ["Pretty penny", "Expensive. Example: The dress she wants for her birthday will cost a pretty penny."],
  ["Break a leg", "Used instead of good luck. Example: The teacher asked us to break a leg at the annual day dance."],
  ["Through thick and thin", "At all times – both good and bad. Example: My friends are always there for me – through thick and thin."],
  ["Beat around the bush", "Not saying directly. Example: Jason’s neighbour kept beating around the bush and did not give a direct answer."],
  ["Hang in there", "Stay strong in a difficult situation. Example: Hang in there! Everything will be okay before you know it."],
  ["Cut corners", "Do something cheaply / reduce expenses. Example: I often cut corners in order to buy something for my brother."],
  ["Steal someone’s thunder", "Take praise meant for someone else. Example: Monica claimed Rachel tried to steal her thunder."],
  ["Call it a day", "To stop doing something. Example: We decided to call it a day as everyone was tired."],
  ["Better late than never", "To do something rather than not doing. Example: We thought it was better late than never, but where are the others?"],
  ["Stick to your guns", "Stay firm in decisions. Example: The lawyer asked Rakesh to stick to his guns if he wants to win the case."],
  ["Leave no stone unturned", "Take every effort possible. Example: The police were determined not to leave any stone unturned."],
  ["Clouds on the horizon", "Problems/trouble. Example: Vishnu sensed there were multiple clouds on the horizon."],
  ["A blessing in disguise", "Something bad that turns out good. Example: Me catching a cold was a blessing in disguise."],
  ["Blue in the face", "Exhausted due to strain or anger. Example: Usha looked blue in the face after the marathon."],
  ["Make a long story short", "To be brief. Example: We decided to cut the long story short and tell them what happened at the mall."],
  ["Cup of tea", "Not something one would do. Example: Cooking has never been Rachel’s cup of tea."],
  ["Beating a dead horse", "Pointless action. Example: She was just beating a dead horse thinking she could change his mind."],
  ["Speak of the devil", "When someone appears while being mentioned. Example: Speak of the devil! Here he comes."],
  ["Let sleeping dogs lie", "Stop discussing something resolved. Example: The police warned us to let sleeping dogs lie."],
  ["Let the cat out of the bag", "Reveal a secret. Example: Adharsh let the cat out of the bag by revealing the baby's gender."],
  ["Elephant in the room", "A major controversial issue. Example: We had to identify the elephant in the room before making a decision."],
  ["In a nutshell", "To sum up briefly. Example: The teacher asked us to quote the findings in a nutshell."],
  ["Worth its weight in gold", "Highly valuable. Example: Every word you say is worth its weight in gold."],
  ["To weather the storm", "To go through something difficult. Example: My mom taught me how to weather the storm."],
  ["A piece of cake", "An easy task. Example: Solving the Wordle everyday was just a piece of cake."],
  ["Get your act together", "Stop fooling around, act properly. Example: It is time you get your act together and do something useful."],
  ["Cost an arm and a leg", "Extremely expensive. Example: It will cost an arm and a leg to get the car my brother wants."],
  ["On top of the world", "Extremely happy. Example: Niya seemed on top of the world since she heard the news."],
  ["Time is money", "Time is valuable. Example: The manager reminded them that time is money."],
  ["Get out of hand", "Not in one’s control anymore. Example: The situation has gotten out of hand."],
  ["Like two peas in a pod", "Always together. Example: My cousin and I are always like two peas in a pod."],
  ["Know which way the wind blows", "To understand what is happening. Example: Detectives must know which way the wind blows."],
  ["Hit the nail on the head", "Do something exactly right. Example: Harish hit the nail on the head with his decision."],
  ["Catch more flies with honey", "Get more by being nice. Example: You may catch more flies with honey than with vinegar."],
  ["Let someone off the hook", "Let someone go free. Example: The court decided to let the guy off the hook."],
  ["Like riding a bicycle", "A skill never forgotten. Example: Learning a language is like riding a bicycle."],
  ["Blame one’s tools", "Blaming something else. Example: He blamed his tools when he had no way out."],
  ["It’s not rocket science", "Not difficult to understand. Example: Cooking sambar is not rocket science."],
  ["Spill the beans", "Reveal a secret. Example: Remya spilled the beans about her sister."]
];

function defaultDeckFromSample() {
  return SAMPLE.map((pair) => ({
    id: uid(),
    front: pair[0],
    back: pair[1],
    // SM-2 fields
    repetitions: 0,
    interval: 0, // in days (can be fractional)
    easiness: 2.5,
    due: nowTs(),
    score: 0,
  }));
}

// SM-2-ish update using binary correct/incorrect
function sm2Update(card, correct, now = nowTs(), speedMultiplier = 1) {
  // Map correct -> quality
  const quality = correct ? 5 : 2;
  let { easiness, repetitions, interval } = card;

  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easiness);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 0;
  }

  // update easiness
  easiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easiness < 1.3) easiness = 1.3;

  // schedule next due: convert interval (days) into ms
  const nextDue = now + Math.round(interval * 24 * 60 * 60 * 1000 / speedMultiplier);

  return {
    ...card,
    easiness,
    repetitions,
    interval,
    due: nextDue,
    lastReviewed: now,
  };
}

// ---------- Main Component ----------
export default function FlashcardApp() {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [score, setScore] = useState(0);
  const [sessionCorrectCount, setSessionCorrectCount] = useState(0);
  const [sessionWrongCount, setSessionWrongCount] = useState(0);
  const [requeueDistance, setRequeueDistance] = useState(3); // "after few cards"
  const [speedMultiplier, setSpeedMultiplier] = useState(1440); // 1440 => minutes->days scaling for quicker testing; default means 1440 to convert days to minutes
  const [filter, setFilter] = useState("due"); // due | all

  // Load from storage on mount
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setCards(parsed.cards || []);
        setScore(parsed.score || 0);
      } catch (e) {
        console.warn("Failed to parse storage", e);
      }
    } else {
      // load default sample
      const deck = defaultDeckFromSample();
      setCards(deck);
      saveToStorage(deck, 0);
    }
  }, []);

  useEffect(() => {
    // keep currentIndex valid
    if (cards.length === 0) setCurrentIndex(0);
    else if (currentIndex >= cards.length) setCurrentIndex(0);
  }, [cards, currentIndex]);

  function saveToStorage(cardsToSave, scoreToSave) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cards: cardsToSave, score: scoreToSave }));
  }

  function handleImportText(text) {
    const parsed = parseBulkText(text);
    if (!parsed.length) return;
    const newCards = parsed.map((p) => ({
      id: uid(),
      front: p.front,
      back: p.back,
      repetitions: 0,
      interval: 0,
      easiness: 2.5,
      due: nowTs(),
      score: 0,
    }));
    setCards(newCards);
    setScore(0);
    saveToStorage(newCards, 0);
  }

  function handleFileUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      handleImportText(e.target.result);
    };
    reader.readAsText(file, "utf-8");
  }

  function markCard(correct) {
    if (!cards.length) return;
    const now = nowTs();
    const idx = currentIndex;
    const card = cards[idx];

    const updatedCard = sm2Update(card, correct, now, speedMultiplier);
    // adjust score
    if (correct) {
      setScore((s) => {
        const ns = s + 1;
        saveToStorage(
          cards.map((c, i) => (i === idx ? updatedCard : c)),
          ns
        );
        return ns;
      });
      setSessionCorrectCount((c) => c + 1);
    } else {
      setSessionWrongCount((c) => c + 1);
      // in-session requeue: put it a few positions later
      const insertAt = Math.min(cards.length, idx + requeueDistance);
      const newList = cards.slice();
      newList.splice(idx, 1); // remove
      newList.splice(insertAt, 0, updatedCard); // insert later
      setCards(newList);
      saveToStorage(newList, score);
      setShowBack(false);
      // do not advance currentIndex because we've removed current; the next card at same index is new
      return;
    }

    // For correct: update array and advance to next due card
    const newCards = cards.map((c, i) => (i === idx ? updatedCard : c));
    setCards(newCards);
    saveToStorage(newCards, score + (correct ? 1 : 0));
    setShowBack(false);

    // pick next due card index
    const nextIndex = pickNextDueIndex(newCards, idx);
    setCurrentIndex(nextIndex);
  }

  function pickNextDueIndex(list, fromIndex = 0) {
    const now = nowTs();
    // find next card whose due <= now
    let next = list.findIndex((c, i) => c.due <= now && i !== fromIndex);
    if (next !== -1) return next;
    // otherwise pick next card in circular order
    return (fromIndex + 1) % Math.max(1, list.length);
  }

  const dueCount = useMemo(() => cards.filter((c) => c.due <= nowTs()).length, [cards]);

  function resetProgress() {
    if (!confirm("Reset all progress and scheduling? This will keep the cards but clear review history.")) return;
    const reset = cards.map((c) => ({ ...c, repetitions: 0, interval: 0, easiness: 2.5, due: nowTs(), lastReviewed: null }));
    setCards(reset);
    setScore(0);
    setSessionCorrectCount(0);
    setSessionWrongCount(0);
    saveToStorage(reset, 0);
  }

  function loadSample() {
    if (!confirm("Load sample deck (will replace current deck)?")) return;
    const deck = defaultDeckFromSample();
    setCards(deck);
    setScore(0);
    saveToStorage(deck, 0);
  }

  // Build list to show (filter)
  const visibleList = useMemo(() => {
    if (filter === "all") return cards;
    // due
    const now = nowTs();
    return cards.filter((c) => c.due <= now);
  }, [cards, filter]);

  const currentCard = visibleList.length ? visibleList[currentIndex % visibleList.length] : null;

  // If currentCard is null, show a friendly message
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Idioms Flashcards — Study App</h1>
          <div className="text-sm text-gray-300">Due now: <strong className="text-white">{dueCount}</strong></div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <section className="md:col-span-2">
            <div className="bg-gray-800 rounded-2xl p-6 shadow-lg">
              {currentCard ? (
                <>
                  <div className="mb-4 text-sm text-gray-400">Card {cards.indexOf(currentCard) + 1} of {cards.length}</div>
                  <div className="p-6 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 cursor-pointer" onClick={() => setShowBack((s) => !s)}>
                    <div className="text-xl md:text-2xl font-medium text-center">
                      {showBack ? currentCard.back : currentCard.front}
                    </div>
                    <div className="mt-4 text-xs text-gray-400 text-center">Click card to flip</div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button className="flex-1 py-3 rounded-lg bg-green-600 hover:bg-green-500" onClick={() => markCard(true)}>✅ I knew it</button>
                    <button className="flex-1 py-3 rounded-lg bg-red-600 hover:bg-red-500" onClick={() => markCard(false)}>❌ I was wrong</button>
                  </div>

                </>
              ) : (
                <div className="text-center py-12 text-gray-300">
                  No cards due right now. You can change filter to "All" or load the deck.
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <label className="flex-1 bg-gray-800 p-4 rounded-xl">
                <div className="text-sm text-gray-400">Import CSV / TSV (paste) — each line: front,back</div>
                <textarea placeholder={`Under the weather,Feeling ill...`} rows={3} className="w-full bg-transparent mt-2 text-sm outline-none" onBlur={(e) => { if (e.target.value.trim()) handleImportText(e.target.value); }} />
              </label>

              <div className="w-48 bg-gray-800 p-4 rounded-xl flex flex-col gap-2">
                <div className="text-sm text-gray-400">Or upload file</div>
                <input type="file" accept=".csv,.txt" onChange={(e) => { if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0]); }} />
                <button className="mt-2 py-2 rounded bg-indigo-600" onClick={loadSample}>Load sample deck</button>
                <button className="mt-2 py-2 rounded bg-yellow-600" onClick={resetProgress}>Reset progress</button>
              </div>
            </div>

          </section>

          <aside className="bg-gray-800 p-4 rounded-2xl">
            <div className="mb-4">
              <div className="text-sm text-gray-400">Score</div>
              <div className="text-2xl font-semibold">{score}</div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-400">Session</div>
              <div className="text-sm">✅ {sessionCorrectCount}  ❌ {sessionWrongCount}</div>
            </div>

            <div className="mb-4">
              <label className="text-sm text-gray-400">Requeue distance (cards)</label>
              <input type="range" min={1} max={10} value={requeueDistance} onChange={(e) => setRequeueDistance(Number(e.target.value))} />
              <div className="text-xs">Show wrong card again after <strong>{requeueDistance}</strong> cards</div>
            </div>

            <div className="mb-4">
              <label className="text-sm text-gray-400">Speed (higher = schedule faster for testing)</label>
              <select value={speedMultiplier} onChange={(e) => setSpeedMultiplier(Number(e.target.value))} className="w-full mt-2">
                <option value={1}>Real days (1)</option>
                <option value={24}>Minutes scale (24)</option>
                <option value={1440}>Fast test (1440) — days become minutes</option>
              </select>
            </div>

            <div className="mb-2">
              <label className="text-sm text-gray-400">Filter</label>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full mt-2">
                <option value="due">Due now</option>
                <option value="all">All</option>
              </select>
            </div>

            <div className="mt-3 text-sm text-gray-400">
              Cards: {cards.length}
              <br />Due now: {dueCount}
            </div>

            <div className="mt-4">
              <button className="w-full py-2 rounded bg-gray-700" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(cards)); alert('Saved cards copied to clipboard (JSON)'); }}>Export JSON</button>
            </div>

          </aside>
        </div>

        <footer className="mt-6 text-sm text-gray-500">Tip: click the card to flip. Use ✅ if you guessed correctly or ❌ if you didn't. Wrong cards will reappear after a few cards. Progress is saved locally.</footer>
      </div>
    </div>
  );
}
