(function () {
  const KEY = "everyday-fsrs-v1";
  let cards = [];
  let current = null;
  let revealed = false;

  const review = document.getElementById("review");
  const grades = document.getElementById("grades");
  const deckEl = document.getElementById("deck");
  const countEl = document.getElementById("count");

  function save() { localStorage.setItem(KEY, JSON.stringify(cards)); }
  function dueCards() {
    const now = Date.now();
    return cards.filter((c) => new Date(c.due).getTime() <= now);
  }
  function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}

  function renderDeck() {
    countEl.textContent = String(cards.length);
    deckEl.innerHTML = cards.slice().reverse().map((c) =>
      `<li><strong>${esc(c.front)}</strong><br/><small>due ${new Date(c.due).toLocaleString()} · S=${c.stability!=null?c.stability.toFixed(2):"—"} · D=${c.difficulty!=null?c.difficulty.toFixed(2):"—"}</small></li>`
    ).join("") || "<li>Empty deck</li>";
  }

  function pick() {
    const due = dueCards();
    current = due[0] || null;
    revealed = false;
    if (!current) {
      review.innerHTML = `<p class="empty">Nothing due. ${cards.length ? "Next: " + new Date(cards.map(c=>c.due).sort()[0]).toLocaleString() : "Add a card or load the demo deck."}</p>`;
      grades.hidden = true;
      return;
    }
    review.innerHTML = `<div class="front">${esc(current.front)}</div>
      <button type="button" class="btn ghost show-btn" id="show">Show answer</button>`;
    grades.hidden = true;
    document.getElementById("show").onclick = () => {
      revealed = true;
      review.innerHTML = `<div class="front">${esc(current.front)}</div><div class="back">${esc(current.back)}</div>`;
      grades.hidden = false;
    };
  }

  grades.querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      if (!current || !revealed) return;
      const g = Number(b.dataset.g);
      const updated = FSRS.schedule(current, g);
      const idx = cards.findIndex((c) => c.id === current.id);
      cards[idx] = updated;
      save(); renderDeck(); pick();
    };
  });

  document.getElementById("form").onsubmit = (e) => {
    e.preventDefault();
    cards.push(FSRS.createCard(
      document.getElementById("front").value.trim(),
      document.getElementById("back").value.trim()
    ));
    e.target.reset(); save(); renderDeck(); pick();
  };
  document.getElementById("clear").onclick = () => { cards=[]; save(); renderDeck(); pick(); };
  document.getElementById("demo").onclick = () => {
    cards = [
      FSRS.createCard("Name of the barista who always remembers your order?", "Maya"),
      FSRS.createCard("Wi-Fi guest password at coworking space", "Orbit-7-Lemon"),
      FSRS.createCard("Kid-safe dose reminder: children's acetaminophen rule of thumb?", "Follow weight on the box — never guess"),
      FSRS.createCard("Spanish: 'I forgot' ", "Se me olvidó"),
      FSRS.createCard("Neighbor's dog name (apt 4B)", "Pickles")
    ];
    save(); renderDeck(); pick();
  };

  try { cards = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch(_) { cards = []; }
  renderDeck(); pick();
})();
