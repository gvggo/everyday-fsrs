/** FSRS-4.5 core (browser). Based on open-spaced-repetition formulas. */
(function (global) {
  // FSRS-4.5 default parameters
  const w = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
  const DECAY = -0.5;
  const FACTOR = 19 / 81;
  const REQUEST_RETENTION = 0.9;
  const MAX_INTERVAL = 36500;

  function clampD(d) { return Math.min(10, Math.max(1, d)); }
  function retrievability(elapsedDays, stability) {
    return Math.pow(1 + FACTOR * elapsedDays / stability, DECAY);
  }
  function nextInterval(stability, r) {
    r = r == null ? REQUEST_RETENTION : r;
    const interval = stability / FACTOR * (Math.pow(r, 1 / DECAY) - 1);
    return Math.min(MAX_INTERVAL, Math.max(1, Math.round(interval)));
  }
  function initDifficulty(grade) {
    // FSRS-4.5 / v5 style init from grade
    return clampD(w[4] - Math.exp(w[5] * (grade - 1)) + 1);
  }
  function initStability(grade) {
    return Math.max(0.1, w[grade - 1]);
  }
  function nextDifficulty(d, grade) {
    const delta = -w[6] * (grade - 3);
    let next = d + delta * (10 - d) / 9;
    // mean reversion toward D0(4) in FSRS-5; FSRS-4.5 uses D0(3)=w4 mean reversion in v4 docs;
    // using FSRS-4.5 wiki: same as v4 mean reversion to D0(3)
    const d0 = w[4];
    next = w[7] * d0 + (1 - w[7]) * next;
    return clampD(next);
  }
  function nextStabilitySuccess(d, s, r, grade) {
    let hardPen = grade === 2 ? w[15] : 1;
    let easyBon = grade === 4 ? w[16] : 1;
    // FSRS-4.5 wiki lists 17 params — hard/easy multipliers exist in v4 as w15/w16; if missing use 1
    if (w[15] == null) hardPen = 1;
    if (w[16] == null) easyBon = 1;
    const sInc = Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp(w[10] * (1 - r)) - 1) * hardPen * easyBon;
    return s * (sInc + 1);
  }
  function nextStabilityFail(d, s, r) {
    return w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp(w[14] * (1 - r));
  }

  function schedule(card, grade, now) {
    now = now || new Date();
    const last = card.last_review ? new Date(card.last_review) : now;
    const elapsed = Math.max(0, (now - last) / 86400000);
    let { stability: s, difficulty: d, reps, lapses, state } = card;
    reps = reps || 0; lapses = lapses || 0; state = state || "new";

    if (state === "new" || s == null) {
      s = initStability(grade);
      d = initDifficulty(grade);
      if (grade === 1) { lapses += 1; }
      reps += 1;
      const interval = grade === 1 ? 1 : nextInterval(s);
      const due = new Date(now.getTime() + interval * 86400000);
      return { ...card, stability: s, difficulty: d, reps, lapses, state: grade === 1 ? "learning" : "review", last_review: now.toISOString(), due: due.toISOString(), scheduled_days: interval };
    }

    const R = retrievability(elapsed, s);
    if (grade === 1) {
      lapses += 1;
      s = nextStabilityFail(d, s, R);
      d = nextDifficulty(d, grade);
      const interval = 1;
      const due = new Date(now.getTime() + interval * 86400000);
      return { ...card, stability: s, difficulty: d, reps: reps + 1, lapses, state: "relearning", last_review: now.toISOString(), due: due.toISOString(), scheduled_days: interval, retrievability: R };
    }
    s = nextStabilitySuccess(d, s, R, grade);
    d = nextDifficulty(d, grade);
    let interval = nextInterval(s);
    if (grade === 2) interval = Math.max(1, Math.round(interval * 1.2 / 1.2)); // hard slightly shorter already via w15 when present
    if (grade === 4) interval = Math.min(MAX_INTERVAL, Math.round(interval * 1.3));
    const due = new Date(now.getTime() + interval * 86400000);
    return { ...card, stability: s, difficulty: d, reps: reps + 1, lapses, state: "review", last_review: now.toISOString(), due: due.toISOString(), scheduled_days: interval, retrievability: R };
  }

  function createCard(front, back) {
    return {
      id: "c_" + Math.random().toString(36).slice(2, 10),
      front, back,
      state: "new",
      stability: null,
      difficulty: null,
      reps: 0,
      lapses: 0,
      due: new Date().toISOString(),
      last_review: null,
      created: new Date().toISOString()
    };
  }

  global.FSRS = { w, retrievability, nextInterval, initStability, initDifficulty, nextDifficulty, nextStabilitySuccess, nextStabilityFail, schedule, createCard, REQUEST_RETENTION, DECAY, FACTOR };
})(typeof window !== "undefined" ? window : global);
