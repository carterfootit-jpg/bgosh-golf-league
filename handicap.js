/* B'gosh Golf League — Prototype 4 HANDICAP ENGINE (spec §7, finalized text)
   The nine pipeline stages, each a separate function so the Handicap tab can
   display every intermediate value and the checks can test each stage alone:

   1 eligibleRoundFilter      — eligibility progression (0-2 → none; 3/4→1;
                                5/6→2; 7/8→3; 9/10→4; >10 → last-10 window, 4)
   2 adjustedGrossScore       — Par+5 cap pre-establishment; Net Double Bogey
                                after (cap strokes from FULL Course Handicap,
                                never the reduced Playing Handicap)
   3 scoreDifferential        — (113/Slope)×(AGS − Course Rating); PCC = 0
   4 selectDifferentials      — B'gosh selection (stage 1 window, lowest-first)
   5 handicapIndex            — arithmetic mean of selected, nearest tenth
   6 courseHandicap           — (HI/2 rounded to tenth)×(Slope/113)+(CR−Par),
                                result kept to the nearest tenth (§7 rounding)
   7   Handicap Allowance     — season configuration (DB.season.allowance)
   8 playingHandicap          — CH × allowance %, rounded .5 upward to whole
   9 matchNetting/strokesOn   — all four PHs compared; lowest plays from 0;
                                others receive the difference (works for plus
                                PHs); strokes allocated by hole rank 1-9,
                                cycling above 9 and 18.

   NOT implemented (B'gosh has not adopted it): USGA best-8-of-20, WHS caps,
   exceptional-score adjustments, and a PCC engine — PCC is fixed 0 by rule.

   Internal representation — unambiguous golf semantics, never raw UI signs:
     handicaps/PHs are "receive" numbers: 6 = receives 6 strokes,
     −3 = a plus golfer who GIVES 3 strokes. Display "+" is produced only by
     fmtHdcpLabel. (The league sheet's inverted minus-for-plus convention is
     normalized ONCE at import, in data.js normalizeSheetHandicap.)
   An established-less state is represented as null — NEVER as 0.0. */

/* ---------- stage 1: eligible round history ---------- */
// eligibleCount: number of eligible rounds recorded for a golfer (>=0).
// Returns { windowLen, selectCount, label } for the eligible-round
// progression in spec §7. windowLen 0/1 → no selection at all (null HI).
function selectionPlan(n) {
  if (n <= 0) return { windowLen: 0, selectCount: 0, label: 'no eligible rounds yet' };
  if (n <= 2) return { windowLen: 0, selectCount: 0, label: '1\u20132 rounds \u2014 not eligible for a Handicap Index yet' };
  if (n <= 4) return { windowLen: n, selectCount: 1, label: '3\u20134 rounds \u2014 lowest 1 differential' };
  if (n <= 6) return { windowLen: n, selectCount: 2, label: '5\u20136 rounds \u2014 lowest 2' };
  if (n <= 8) return { windowLen: n, selectCount: 3, label: '7\u20138 rounds \u2014 lowest 3' };
  if (n <= 10) return { windowLen: n, selectCount: 4, label: '9\u201310 rounds \u2014 lowest 4' };
  return { windowLen: 10, selectCount: 4, label: '>10 rounds \u2014 rolling most-recent-10 window, lowest 4 (oldest drops out each new round)' };
}

/* ---------- stage 2: Adjusted Gross Score ---------- */
// gross = 9 actual gross hole scores (array), hole = DB.course row
// ({h, par, rank}), chFull = the golfer's FULL Course Handicap in receive
// strokes (null pre-establishment; number after), course = DB.course.
// Returns { ags, holes: [{h, par, rank, gross, cap, adj, capped}] }.
//   pre-establishment: cap = par + 5 (spec §7; PCC not involved).
//   post-establishment: cap = Net Double Bogey = par + 2 + strokes received
//   on that hole from the FULL Course Handicap applied by hole rank
//   (strokesOn from logic.js — NOT the Playing Handicap).
// The golfers actual gross scores are never modified — only ADJ per hole.
function adjustedGrossScore(gross, established, chFull) {
  const holes = CH().map((hole, i) => {
    const g = gross[i];
    let cap, adj, capped = false;
    if (g == null) { cap = null; adj = null; }
    else if (!established) {
      cap = hole.par + 5;
      adj = Math.min(g, cap); capped = adj < g;
    } else {
      const st = strokesOn(hole.rank, chFull || 0);
      cap = hole.par + 2 + st;
      adj = Math.min(g, cap); capped = adj < g;
    }
    return { h: hole.h, par: hole.par, rank: hole.rank, gross: g, cap, adj, capped };
  });
  const ags = holes.reduce((s, x) => s + (x.adj == null ? 0 : x.adj), 0);
  return { ags, holes };
}

/* ---------- stage 3: Score Differential (PCC fixed 0, spec §7) ---------- */
// (113 / Slope) × (AGS − Course Rating), rounded to the nearest tenth.
// No PCC engine — PCC is 0 by league rule, not an omitted feature.
function scoreDifferential(ags, season) {
  return roundTenth((113 / season.slope) * (ags - season.cr));
}

/* ---------- stages 4–5: differential selection + Handicap Index ---------- */
// rounds = array of AGS numbers (eligible, in chronological order). Returns
// { established, hi, plan, window: [ {idx, sd, selected} ], selected: [] }.
// fewer than 3 eligible rounds → established:false with NO numeric HI and NO
// fake 0.0 — the caller renders "Not established".
function selectDifferentials(rounds) {
  const n = rounds.length;
  const plan = selectionPlan(n);
  if (n < 3) {
    return { established: false, hi: null, plan, window: [], selected: [] };
  }
  // Rolling window: the most recent `plan.windowLen` eligible rounds.
  const start = Math.max(0, n - plan.windowLen);
  const window = [];
  for (let i = start; i < n; i++) {
    window.push({ idx: i, sd: scoreDifferential(rounds[i], DB.season), selected: false });
  }
  // Lowest-first until selectCount filled. Stability: equal differentials
  // keep chronological order (no invented tie-break behavior is needed —
  // the average is identical whichever equal values are picked).
  const bySd = window.slice().sort((a, b) => a.sd - b.sd || a.idx - b.idx);
  for (let k = 0; k < plan.selectCount && k < bySd.length; k++) bySd[k].selected = true;
  const selected = window.filter(w => w.selected).map(w => w.sd).sort((a, b) => a - b);
  const avg = selected.reduce((s, v) => s + v, 0) / selected.length;
  return { established: true, hi: roundTenth(avg), plan, window, selected };
}

/* ---------- stage 6: Course Handicap (9-hole, spec §7) ---------- */
// Course Handicap = (HI / 2, rounded to nearest tenth) × (Slope/113)
//                   + (Course Rating − Par); the result is rounded to the
// nearest tenth (§7 Rounding). Precision is preserved through the
// calculation; only these adopted rounding points are applied.
// Returns null inputs as null (unestablished golfers have no CH at all).
function courseHandicapFrom(hi, season) {
  if (hi == null) return null;
  const half = roundTenth(hi / 2);                    // §7: HI/2 to nearest tenth first
  const raw = half * (season.slope / 113) + (season.cr - season.par);
  return roundTenth(raw);
}

/* ---------- stages 7–8: Handicap Allowance → Playing Handicap ---------- */
// Playing Handicap = CH × allowance% , whole strokes, .5 rounded upward
// (upward on the number line for both signs: 10.4→10, 10.5→11, −2.5→−2).
// Returns { exact, ph } or null pre-establishment.
function playingHandicapFrom(ch, allowancePct) {
  if (ch == null) return null;
  const exact = ch * (allowancePct / 100);
  return { exact: exact, ph: Math.floor(exact + 0.5) };
}

/* ---------- stage 9: match-relative netting (spec §7) ---------- */
// all four Playing Handicaps compared (receive-space); the lowest plays from
// 0; every other golfer receives (their PH − lowest). Plus (negative) PHs
// work naturally: e.g. PHs [−1, 0, 5, 29] → strokes [0, 1, 6, 30].
// A golfer WITHOUT an established PH (null) is the B'gosh pre-establishment
// case: they receive ZERO strokes — and the other golfers still net among
// themselves relative to the lowest ESTABLISHED PH (the unestablished
// golfer's zero is not treated as the match baseline and no fictitious PH is
// manufactured for them).
function matchNetting(golfers) {
  const established = golfers.filter(g => g.ph != null);
  const base = established.length
    ? Math.min.apply(null, established.map(g => g.ph))
    : 0;
  return golfers.map(g => ({
    provisional: g.ph == null,
    strokes: g.ph == null ? 0 : g.ph - base
  }));
}

/* ---------- helper: strokes received on ONE hole (spec §7) ---------- */
// n total strokes over 9 holes: floor(n/9) on every hole plus one extra on
// the n%9 best (lowest-numbered) stroke ranks. Ranks cycle above 9 and 18
// automatically (e.g. 21 = 2 everywhere + a 3rd on ranks 1–3).
function strokesOn(rank, n) {
  n = n || 0;
  if (n <= 0) return 0;
  return Math.floor(n / 9) + ((rank <= (n % 9)) ? 1 : 0);
}

/* ---------- shared math helpers (spec §7 Rounding) ---------- */
/* Round to the nearest tenth following the USGA rule convention: exact
   half-cent values round to the nearest EVEN tenth (9.05 → 9.0, 9.15 → 9.2;
   9.14 → 9.1) — the same half-to-even behavior of ES2016 toFixed that the
   spec's rounding examples point to. */
function roundTenth(x) {
  const s = +(x).toFixed(10);            // kill float representation noise
  const scaled = s * 10;
  const floor = Math.floor(scaled);
  const rem = scaled - floor;            // 0 ≤ rem < 1
  if (rem > 0.5 + 1e-9 || (rem >= 0.5 - 1e-9 && floor % 2 === 1)) {
    return +((floor + 1) / 10).toFixed(1);
  }
  return +(floor / 10).toFixed(1);
}

/* ============================================================
   Sandbox round pipeline — demo golfer end-to-end
   ============================================================
   computeHandicapSandbox(rounds) turns raw demo gross rounds into the full
   auditable record the Handicap tab renders: eligible rounds, actual gross
   totals, AGS (with per-hole caps), Score Differentials, which are selected,
   HI, CH, allowance, PH — plus establishment stage and provisional flags. */

// One demo "match" result for the walkthrough: the demo golfer's side vs a
// fixed demo-opponent side, scored with the REAL match engine (logic.js).
function demoMatchFor(roundGross, golferPhOrNull, opponents) {
  const golfers = [
    { name: DB.hcpDemo.golferName, team: 'A', ph: golferPhOrNull },
    { name: opponents[0].name, team: 'B', ph: opponents[0].ph },
    { name: opponents[1].name, team: 'B', ph: opponents[1].ph },
    { name: opponents[2].name, team: 'B', ph: opponents[2].ph }
  ];
  // demo canned rounds + opponents are per-GOLFER 9-hole arrays; the match
  // engine is hole-major (9 rows x 4 golfers) — transpose:
  const perGolfer = [roundGross, opponents[0].scores, opponents[1].scores, opponents[2].scores];
  const scores = [];
  for (let holeIdx = 0; holeIdx < 9; holeIdx++) {
    scores.push([perGolfer[0][holeIdx], perGolfer[1][holeIdx], perGolfer[2][holeIdx], perGolfer[3][holeIdx]]);
  }
  const mm = { golfers, scores };
  return { m: mm, c: matchCalc(mm) };
}

/* Establishment walkthrough (spec §7 "Initial establishment and retroactive
   recalculation"): for rounds before the third eligible round completes, the
   match is provisional (zero strokes for the demo golfer, gross recorded);
   completing round 3 establishes the initial HI (lowest 1 of the first
   three differentials) and RETROACTIVELY recalculates the earlier
   provisional matches with the newly established PH — the one defined
   exception to the historical-snapshot principle (§18). Rounds after
   establishment ride the normal pipeline (new HI applies to the NEXT round).
   Returns { rounds, before, after, audit, hi, ph }. */
function establishmentWalkthrough(rounds) {
  const opp = DB.hcpDemo.opponents;
  const before = [];
  const after = [];
  const audit = [];
  const n = rounds.length;
  const estIdx = n >= 3 ? 2 : -1;   // round 3 completion establishes

  // AGS per round under the pre-establishment cap (Par+5) — the values that
  // feed the first SDs. Actual gross is kept for match scoring (below).
  const agsList = rounds.map(r => adjustedGrossScore(r, false, null).ags);

  let curPH = null;
  for (let i = 0; i < n; i++) {
    if (estIdx === -1 || i < estIdx) {
      const dm = demoMatchFor(rounds[i], null, opp);
      before.push({ round: i + 1, m: dm.m, c: dm.c, provisional: true });
    } else if (i === estIdx) {
      const selNow = selectDifferentials(agsList.slice(0, i + 1));
      const ph = playingHandicapFrom(courseHandicapFrom(selNow.hi, DB.season), DB.season.allowance).ph;
      for (let j = 0; j < i; j++) {
        const dm = demoMatchFor(rounds[j], ph, opp);
        after.push({ round: j + 1, m: dm.m, c: dm.c, provisional: false, recalculated: true });
      }
      const dm = demoMatchFor(rounds[i], ph, opp);
      after.push({ round: i + 1, m: dm.m, c: dm.c, provisional: false, recalculated: false });
      curPH = ph;
    } else {
      const detail = computeHandicapSandbox(rounds.slice(0, i + 1));
      const ph = detail.ph != null ? detail.ph : curPH;
      const dm = demoMatchFor(rounds[i], ph, opp);
      after.push({ round: i + 1, m: dm.m, c: dm.c, provisional: false, recalculated: false });
      curPH = ph;
    }
  }
  if (before.length && after.length) {
    audit.push({
      when: 'at round ' + n + ' completion (round ' + (estIdx + 1) + ' established the initial Handicap Index)',
      text: 'Initial Handicap Index established from the lowest Score Differential of the first ' + (estIdx + 1) + ' eligible rounds (HI ' + (function () { const s = selectDifferentials(agsList.slice(0, estIdx + 1)); return s.hi != null ? s.hi.toFixed(1) : '?'; })() + '). The earlier provisional matches were recalculated with the newly established Playing Handicap (spec \u00a77 retroactive recalculation \u2014 the defined exception to the historical-snapshot rule, \u00a718); they can now become official (\u00a713).'
    });
  }
  return { rounds: rounds, agsList: agsList, before: before, after: after, audit: audit, hi: curPH != null ? selectDifferentials(agsList.slice(0, Math.max(estIdx + 1, 3))).hi : null, ph: curPH };
}

/* Full audit record for Handicap Detail (spec §15 transparency): */
function computeHandicapSandbox(rounds) {
  const season = DB.season;
  const detail = { stageLabel: '', rounds: [], established: false, hi: null, ch: null, ph: null };

  detail.count = rounds.length;
  detail.plan = selectionPlan(rounds.length);

  // stage 1–3 per round: gross total, AGS (Par+5 pre / NDB post), SD.
  // Per-round establishment flag: a golfer has no established HI until 3
  // eligible rounds have COMPLETED — so rounds 1–3 are scored
  // pre-establishment (Par+5 caps); from round 4 on, NDB applies using the
  // full CH built from the HI established by the PREVIOUS rounds (spec §7:
  // "the new handicap is used for the following round").
  const agsList = [];
  rounds.forEach((g, i) => {
    const establishedForThisRound = i >= 3;
    let chFull = null;
    if (establishedForThisRound) {
      const selPrev = selectDifferentials(rounds.slice(0, i));
      chFull = courseHandicapFrom(selPrev.established ? selPrev.hi : null, season);
    }
    const a = adjustedGrossScore(g, establishedForThisRound, chFull);
    agsList.push(a.ags);
    detail.rounds.push({
      n: i + 1,
      gross: g.slice(),
      grossTotal: g.reduce((s, v) => s + v, 0),
      caps: a.holes.filter(x => x.capped).map(x => 'H' + x.h + ' gross ' + x.gross + ' \u2192 ' + x.adj + ' (cap ' + x.cap + ')'),
      ags: a.ags,
      sd: scoreDifferential(a.ags, season),
      capped: a.holes.some(x => x.capped)
    });
  });

  // stage 4–5: selection + HI (null pre-establishment — never 0.0).
  const sel = selectDifferentials(agsList);
  detail.sel = sel;
  detail.established = sel.established;
  detail.hi = sel.hi;
  detail.stageLabel = sel.established ? 'Established Handicap Index' : 'Not established (\u00a77: rounds 1\u20132 \u2014 zero strokes, provisional)';
  if (!sel.established) return detail;

  // stage 6: Course Handicap (full CH — also what NDB caps use above).
  detail.ch = courseHandicapFrom(sel.hi, season);
  detail.chCalc = { halfIdx: roundTenth(sel.hi / 2), slope: season.slope, cr: season.cr, par: season.par };

  // stages 7–8: allowance → Playing Handicap.
  const phr = playingHandicapFrom(detail.ch, season.allowance);
  detail.ph = phr ? phr.ph : null;
  detail.phExact = phr ? phr.exact : null;
  detail.allowance = season.allowance;
  return detail;
}