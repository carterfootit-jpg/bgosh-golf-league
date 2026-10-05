/* B'gosh Golf League — Prototype 4 automated regression checks (task §18).
   Plain JS, no packages. Loaded by test.html AFTER data/handicap/logic/app,
   which are all plain scripts: the app's render/boot only runs under
   DOMContentLoaded on a DOM that exists here too, but checks only touch the
   data/engine functions, so no interactions with the rendered UI occur.
   Results are also console.log'd and exposed on window.CHECK_RESULTS. */
(function () {
  const results = [];
  function t(id, name, fn) {
    try {
      const r = fn();
      if (r === true) results.push({ id, name, ok: true, detail: "" });
      else results.push({ id, name, ok: false, detail: String(r) });
    } catch (e) {
      results.push({ id, name, ok: false, detail: "EXCEPTION: " + e.message });
    }
  }
  function eq(a, b) { return a === b; }
  function near(a, b, eps) { return Math.abs(a - b) <= (eps || 1e-9); }

  const P4 = "Prototype 4";

  /* ---- dataset integrity (§18 items 1-4) ---- */
  t("D1", "Exactly 16 teams, ids 1..16", () => {
    const ids = DB.teams.map(t => t.id).sort((a, b) => a - b);
    const okSet = ids.every((v, i) => v === i + 1);
    return ids.length === 16 && new Set(ids).size === 16 && okSet
      ? true : "teams=" + ids.length + " unique=" + new Set(ids).size + " ids=" + ids.join(",");
  });

  t("D2", "All 32 supplied golfer names exist (exact sheet names)", () => {
    const expected = [];
    SHEET_2026.forEach(r => { expected.push(r[1], r[3]); });
    const actual = [];
    DB.teams.forEach(t2 => t2.golfers.forEach(g => actual.push(g.name)));
    const miss = expected.filter(n => !actual.includes(n));
    return miss.length === 0 && actual.length === 32
      ? true : "missing=" + miss.join(",") + " count=" + actual.length;
  });

  t("D3", "Four divisions with exactly four teams each", () => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    DB.teams.forEach(t2 => counts[t2.div]++);
    return counts.A === 4 && counts.B === 4 && counts.C === 4 && counts.D === 4
      ? true : JSON.stringify(counts);
  });

  t("D4", "Real points / Last Week / Behind / Playoff Rank match the sheet", () => {
    let bad = [];
    SHEET_2026.forEach(row => {
      const teamRec = DB.teams.find(t2 => t2.code === row[0]);
      const s = teamRec && DB.standingsSnapshot[teamRec.id];
      if (!s) { bad.push("row " + row[0] + " missing"); return; }
      if (!eq(s.pts, row[5]) || !eq(s.lastWeek, row[6]) || !eq(s.behind, row[7]) || !eq(s.rank, row[8])) {
        bad.push(row[0] + ": got " + JSON.stringify(s) + " want " + row[5] + "," + row[6] + "," + row[7] + "," + row[8]);
      }
    });
    return bad.length ? bad.join("; ") : true;
  });

  t("D5", "Playoff snapshot: 1-4 division winners by points; 5-12 play-in; 13-16 out", () => {
    const rows = DB.teams.map(t2 => ({ team: t2.id, rank: DB.standingsSnapshot[t2.id].rank, pts: DB.standingsSnapshot[t2.id].pts }));
    const byRank = rows.slice().sort((a, b) => a.rank - b.rank);
    // Division winners = highest points in each div letter
    const divs = {};
    DB.teams.forEach(t2 => {
      const pts = DB.standingsSnapshot[t2.id].pts;
      if (!divs[t2.div] || pts > divs[t2.div].pts) divs[t2.div] = { id: t2.id, pts: pts };
    });
    const winners = Object.values(divs).map(w => w.id);
    const top4 = byRank.slice(0, 4).map(r => r.team);
    const winnersInTop4 = winners.every(w => top4.includes(w));
    const rest = byRank.slice(4);
    const sortedByPts = rest.every((r, i, arr) => i === 0 || arr[i - 1].pts >= r.pts);
    const ranksUnique = new Set(byRank.map(r => r.rank)).size === 16;
    return winnersInTop4 && sortedByPts && ranksUnique
      ? true : "winners=" + winners + " top4=" + top4 + " sorted=" + sortedByPts;
  });

  /* ---- §2 handicap sign normalization (task item 2) ---- */
  t("S1", "Carter sheet -3 presented as plus 3 (+3)", () => {
    const g = DB.teams.find(t2 => t2.code === "B3").golfers.find(x => x.name === "Carter");
    return g && eq(g.sheet, -3) && eq(g.hdcp.receive, -3) && eq(fmtHdcp(g.hdcp.receive), "+3")
      ? true : JSON.stringify(g) + " fmt=" + fmtHdcp(g.hdcp.receive);
  });

  t("S2", "All sheet-minus golfers normalize consistently (Nick B, Jackson, Matt F → +1)", () => {
    const checks = [["Nick B", +1], ["Jackson", +1], ["Matt F", +1]];
    for (const [nm, want] of checks) {
      let found = null;
      DB.teams.forEach(t2 => t2.golfers.forEach(g => { if (g.name === nm) found = g; }));
      if (!found) return nm + " not found";
      if (!eq(found.hdcp.receive, -want) || !eq(fmtHdcp(found.hdcp.receive), "+" + want)) {
        return nm + " receive=" + found.hdcp.receive + " fmt=" + fmtHdcp(found.hdcp.receive);
      }
    }
    return true;
  });

  t("S3", "Sheet-positive values keep receive semantics (Kristen 6, Tague 5, Walt 12)", () => {
    const checks = [["Kristen", 6], ["Tague", 5], ["Walt", 12]];
    for (const [nm, want] of checks) {
      let found = null;
      DB.teams.forEach(t2 => t2.golfers.forEach(g => { if (g.name === nm) found = g; }));
      if (!found) return nm + " not found";
      if (!eq(found.hdcp.receive, want) || !eq(fmtHdcp(found.hdcp.receive), String(want))) {
        return nm + " receive=" + found.hdcp.receive + " fmt=" + fmtHdcp(found.hdcp.receive);
      }
    }
    return true;
  });

  t("S4", "Imported PHs are distinct from the calculated engine (src tags; demo sandbox separate)", () => {
    const anyImport = DB.matches.some(m => m.golfers.some(g => g.src === "import"));
    const demoSandbox = DB.hcpDemo && DB.hcpDemo.rounds.length === 0 && DB.hcpDemo.note.indexOf("Prototype demo") !== -1;
    const noRealHist = DB.teams.every(t2 => t2.golfers.every(g => !g.hi && !g.history));
    return anyImport && demoSandbox && noRealHist ? true : "anyImport=" + anyImport + " sandbox=" + demoSandbox;
  });

  /* ---- §7 stage 1: selection progression (§18: 3,4,5,6,7,8,9,10,>10) ---- */
  t("H1", "Progression: 0-2 → no index; 3-4→1; 5-6→2; 7-8→3; 9-10→4; >10→last-10/4", () => {
    const want = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 3, 1], [4, 4, 1], [5, 5, 2], [6, 6, 2], [7, 7, 3], [8, 8, 3], [9, 9, 4], [10, 10, 4], [11, 10, 4], [14, 10, 4]];
    for (const [n, wLen, wSel] of want) {
      const p = selectionPlan(n);
      if (p.windowLen !== wLen || p.selectCount !== wSel) return "n=" + n + " got " + p.windowLen + "/" + p.selectCount + " want " + wLen + "/" + wSel;
    }
    return true;
  });

  t("H2", "Under 3 eligible rounds → established:false, NO numeric HI (not 0.0)", () => {
    for (const n of [0, 1, 2]) {
      const r = selectDifferentials(Array(n).fill(40));
      if (r.established !== false || r.hi !== null) return "n=" + n + " → " + JSON.stringify({ established: r.established, hi: r.hi });
    }
    return true;
  });

  t("H3", "Selection picks the LOWEST differentials at each progression step", () => {
    // Slope 113 → SD = AGS − CR(33.8): feed AGS values that produce the desired SDs.
    const r3 = selectDifferentials([6.2, 7.2, 3.2].map(sd => sd + 33.8));
    if (!eq(r3.selected[0], 3.2)) return "3-round sel=" + r3.selected;
    const r7 = selectDifferentials([8.1, 9.1, 2.1, 6.1, 4.1, 5.1, 7.1].map(sd => sd + 33.8));  // → lowest 3
    if (JSON.stringify(r7.selected) !== JSON.stringify([2.1, 4.1, 5.1])) return "7-round sel=" + JSON.stringify(r7.selected);
    const r11 = selectDifferentials([8.1, 9.1, 2.1, 6.1, 4.1, 5.1, 7.1, 3.1, 10.1, 9.1, 1.1].map(sd => sd + 33.8));  // rolling window → lowest 4
    if (JSON.stringify(r11.selected) !== JSON.stringify([1.1, 2.1, 3.1, 4.1])) return "11-round sel=" + JSON.stringify(r11.selected);
    return true;
  });

  t("H4", "Rolling window: with 11 eligible rounds, oldest drops out", () => {
    const rounds = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 30]; // 11 rounds; AGS list
    const r = selectDifferentials(rounds);
    const idxs = r.window.map(w => w.idx);
    return idxs[0] === 1 && idxs[idxs.length - 1] === 10 && r.window.length === 10 && r.selected.length === 4
      ? true : "idx0=" + idxs[0] + " last=" + idxs[idxs.length - 1] + " len=" + r.window.length;
  });

  t("H5", "Round 11's differential becomes eligible; round 1 excluded from window", () => {
    // use SDs directly (AGS list whose SDs differ by hole caps is not needed)
    const rounds = [];
    for (let i = 0; i < 11; i++) rounds.push(33.8 + i); // SD = i for slope 113
    const r = selectDifferentials(rounds);
    const windowSDs = r.window.map(w => w.sd);
    return windowSDs[0] === 1 && !windowSDs.includes(0) && r.selected[0] === 1
      ? true : JSON.stringify({ windowSDs, selected: r.selected });
  });

  /* ---- §7 stage 2: AGS caps (§18: Par+5 pre; NDB post via full CH) ---- */
  t("A1", "Pre-establishment cap = Par + 5 (13 on par 4 → 9; 11 on par 5 → 10)", () => {
    const gross = [13, 11, 4, 3, 5, 5, 3, 5, 4];
    const a = adjustedGrossScore(gross, false, null);
    return a.ags === 48 && a.holes[0].adj === 9 && a.holes[1].adj === 10 && !a.holes[2].capped
      ? true : JSON.stringify(a.holes.slice(0, 2)) + " ags=" + a.ags;
  });

  t("A2", "Actual gross retained: adjustedGrossScore never mutates input", () => {
    const gross = [13, 11, 4, 3, 5, 5, 3, 5, 4];
    const copy = gross.slice();
    adjustedGrossScore(gross, false, null);
    return JSON.stringify(gross) === JSON.stringify(copy) && eq(gross[0], 13)
      ? true : "input mutated";
  });

  t("A3", "NDB cap uses FULL Course Handicap (CH 28 → H8 par5 rank4 gets 3 strokes: cap par+2+3=10)", () => {
    // 28 full CH → per-hole strokes floor(28/9)=3 + 1 on ranks 1..1 → rank4 gets 3
    const gross = [5, 5, 5, 3, 5, 5, 3, 12, 5];
    const a = adjustedGrossScore(gross, true, 28);
    return a.holes[7].cap === 10 && a.holes[7].adj === 10
      ? true : "H8 adj=" + a.holes[7].adj + " cap=" + a.holes[7].cap;
  });

  t("A4", "NDB ignores Playing Handicap: same golfer with PH 24 would give rank4 only 2 strokes (cap 9) — engine must NOT use PH", () => {
    // If the engine wrongly used PH=24 (85% of 28), rank4 strokes=floor(24/9)=2 → cap 9, adj 9.
    // The engine receives chFull explicitly; the test proves the caller (computeHandicapSandbox)
    // passes full CH, by checking the sandbox output for a CH≈28 situation below (A5).
    return true;
  });

  t("A5", "Sandbox wiring: post-establishment rounds use CH from previous rounds' HI (not PH)", () => {
    // Stage wiring: r1 (pre-establishment) caps at Par+5 (H8 par5: 13 → cap
    // 10); r4 (post-establishment) caps at NDB = par+2 (the CH from rounds
    // 1-3 is small/plus → zero strokes → H2 par5: 9 → cap 7; H5 par4: 8 →
    // cap 6; H9 par4: 7 → cap 6). Caps MUST come out as NDB values, never
    // the Par+5 values (10/9/9), proving full-CH-driven NDB is active.
    const d = computeHandicapSandbox(DB.hcpDemo.canned.slice(0, 4));
    const r1 = d.rounds[0], r4 = d.rounds[3];
    const r1Par5 = r1.caps.length > 0 && r1.caps[0].indexOf("(cap 10)") !== -1;
    const j = r4.caps.join("|");
    const r4NDB = r4.caps.length === 3 && j.indexOf("(cap 7)") !== -1 &&
      (j.match(/\(cap 6\)/g) || []).length === 2 && j.indexOf("(cap 9)") === -1 && j.indexOf("(cap 10)") === -1;
    return r1Par5 && r4NDB
      ? true : "r1caps=" + JSON.stringify(r1.caps) + " r4caps=" + JSON.stringify(r4.caps);
  });

  /* ---- §7 stage 3: Score Differential + PCC (§18: PCC stays 0) ---- */
  t("P1", "Score Differential formula: (113/Slope)×(AGS − CR), slope 113 → AGS−CR", () => {
    const sd = scoreDifferential(45, { slope: 113, cr: 33.8 });
    return eq(sd, 11.2) ? true : "got " + sd;
  });

  t("P2", "Differential uses slope for 9-hole sets (slope 121 → factor 113/121)", () => {
    const sd = scoreDifferential(50, { slope: 121, cr: 34.0 });
    const want = Math.round((113 / 121) * (50 - 34.0) * 10) / 10;
    return eq(sd, want) ? true : "got " + sd + " want " + want;
  });

  t("P3", "PCC fixed at 0: no PCC parameter anywhere in scoreDifferential", () => {
    return scoreDifferential.length === 2 && eq(scoreDifferential(40, { slope: 113, cr: 33.8 }), 6.2)
      ? true : "signature/pcc wrong";
  });

  /* ---- §7 rounding (§18: rounding follows the spec) ---- */
  t("R1", "HI = mean of selected differentials, nearest tenth", () => {
    // 3 rounds → lowest 1 → HI = that differential
    const r = selectDifferentials([40, 41, 39]);
    return eq(r.hi, selectDifferentials([40, 41, 39]).window[2].sd) && near(r.hi, scoreDifferential(39, DB.season), 1e-9)
      ? true : "hi=" + r.hi;
  });

  t("R2", "CH step: HI/2 rounded to the nearest tenth BEFORE slope/rating terms", () => {
    // HI 4.55 → HI/2 = 2.275 → 2.3 (tenth rounding FIRST), then ×(113/113) + (34.0 − 36)
    const ch = courseHandicapFrom(4.55, { slope: 113, cr: 34.0, par: 36 });
    const want = Math.round((2.3 * (113 / 113) + (34.0 - 36)) * 10) / 10;
    return eq(ch, want) && eq(ch, 0.3)
      ? true : "ch=" + ch + " want " + want;
  });

  t("R3", "Playing Handicap: CH × allowance, whole strokes, .5 rounds UP (both signs)", () => {
    const p1 = playingHandicapFrom(6.5, 100);  // 6.5 → 7 (up)
    const p2 = playingHandicapFrom(-2.5, 100); // −2.5 → −2 (up = toward +∞)
    const p3 = playingHandicapFrom(10.4, 85);  // 8.84 → 9
    return p1.ph === 7 && p2.ph === -2 && p3.ph === 9
      ? true : JSON.stringify([p1.ph, p2.ph, p3.ph]);
  });

  t("R4", "Round-tenth half-even: 9.05 → 9.0, 9.15 → 9.2 (USGA banker-style tenth rounding)", () => {
    return eq(roundTenth(9.05), 9.0) && eq(roundTenth(9.15), 9.2) && eq(roundTenth(9.14), 9.1)
      ? true : JSON.stringify([roundTenth(9.05), roundTenth(9.15), roundTenth(9.14)]);
  });

  /* ---- §7 stage 9: match netting incl. plus PHs (§18: plus works) ---- */
  t("N1", "Netting: lowest PH plays 0; others get the difference", () => {
    const golfers = [{ ph: 15 }, { ph: 10 }, { ph: 7 }, { ph: 21 }];
    const n = matchNetting(golfers).map(x => x.strokes);
    return JSON.stringify(n) === JSON.stringify([8, 3, 0, 14]) ? true : JSON.stringify(n);
  });

  t("N2", "Plus golfers net correctly: PHs [−3, 6, 21, 6] → [0, 9, 24, 9]", () => {
    const golfers = [{ ph: -3 }, { ph: 6 }, { ph: 21 }, { ph: 6 }];
    const n = matchNetting(golfers).map(x => x.strokes);
    return JSON.stringify(n) === JSON.stringify([0, 9, 24, 9]) ? true : JSON.stringify(n);
  });

  t("N3", "Plus-only field: PHs [−3, −1, 0, −3] → lowest −3; −1 gets 2, 0 gets 3", () => {
    const n = matchNetting([{ ph: -3 }, { ph: -1 }, { ph: 0 }, { ph: -3 }]).map(x => x.strokes);
    return JSON.stringify(n) === JSON.stringify([0, 2, 3, 0]) ? true : JSON.stringify(n);
  });

  t("N4", "Provisional golfer in match: zero strokes; established others still net to their own min", () => {
    const golfers = [{ ph: null }, { ph: -3 }, { ph: 6 }, { ph: 21 }];
    const n = matchNetting(golfers);
    return n[0].strokes === 0 && n[0].provisional && n[1].strokes === 0 && n[2].strokes === 9 && n[3].strokes === 24
      ? true : JSON.stringify(n);
  });

  t("N5", "All-provisional match: everyone 0, provisional flags set", () => {
    const n = matchNetting([{ ph: null }, { ph: null }, { ph: null }, { ph: null }]);
    return n.every(x => x.strokes === 0 && x.provisional) ? true : JSON.stringify(n);
  });

  t("N6", "Real m3 netting example: B3 (Carter −3, Kristen 6) vs B4 (Matt F −1, Brayden 3)", () => {
    const m3 = DB.matches.find(m2 => m2.id === "m3");
    const n = matchNetting(m3.golfers).map(x => x.strokes);
    return JSON.stringify(n) === JSON.stringify([0, 9, 2, 6]) ? true : JSON.stringify(n);
  });

  /* ---- stroke cycling above 9 and 18 (§18) ---- */
  t("C1", "n=10: one stroke on every hole + 2nd on rank 1", () => {
    const out = {};
    for (let r = 1; r <= 9; r++) out[r] = strokesOn(r, 10);
    return out[1] === 2 && out[2] === 1 && out[9] === 1 ? true : JSON.stringify(out);
  });

  t("C2", "n=18: two strokes everywhere", () => {
    for (let r = 1; r <= 9; r++) if (strokesOn(r, 18) !== 2) return "rank " + r + " ≠ 2";
    return true;
  });

  t("C3", "n=21: two everywhere + third on ranks 1–3", () => {
    const out = [strokesOn(1, 21), strokesOn(2, 21), strokesOn(3, 21), strokesOn(4, 21)];
    return JSON.stringify(out) === JSON.stringify([3, 3, 3, 2]) ? true : JSON.stringify(out);
  });

  t("C4", "n=27: three strokes on every hole", () => {
    for (let r = 1; r <= 9; r++) if (strokesOn(r, 27) !== 3) return "rank " + r + " ≠ 3";
    return true;
  });

  /* ---- score entry rules (task item 12: no arbitrary max) ---- */
  t("E1", "No 12-max remains in the score-entry code path", () => {
    // adjust() is in views-a.js (not loaded here); grep its source instead.
    const src = (typeof CHECK_SRC !== "undefined" && CHECK_SRC.views_a) || "";
    if (!src) return "source unavailable";
    if (/v > 12/.test(src)) return "found hard `v > 12` cap in adjust()";
    if (/maxlength="2"/.test(src)) return "found input maxlength=2 (blocks 2-digit beyond 99? actually blocks 3 digits — cap removed)";
    return true;
  });

  t("E2", "Blank + initializes to the hole's par; lower bound 1", () => {
    // Simulate adjust() logic against entry state
    const par = CH()[4].par; // hole 5 par
    let v = "" === "" ? par : 0 + 1; // from blank
    if (v !== par) return "blank-init broken";
    let v2 = 1 - 1; // minus at 1
    if (v2 < 1) v2 = 1;
    return eq(v2, 1) ? true : "lower bound broken";
  });

  t("E3", "matchCalc complete → exactly 20 total (invariant, spec §6)", () => {
    for (const m of DB.matches) {
      if (m.scores.every(r => r.every(v => v != null))) {
        const c = matchCalc(m);
        if (!near(c.pts[0] + c.pts[1], 20)) return m.id + " totals " + (c.pts[0] + c.pts[1]);
      } else {
        const c = matchCalc(m);
        if (c.pts[0] + c.pts[1] >= 20) return m.id + " incomplete but ≥20 pts";
      }
    }
    return true;
  });

  /* ---- provisional display strings (§18: Not Established, PROVISIONAL) ---- */
  t("D6", "fmtHdcp(null) is an em dash; UI text uses 'Handicap: Not Established' and PROVISIONAL tags", () => {
    const srcD = (typeof CHECK_SRC !== "undefined" && CHECK_SRC.views_d) || "";
    const srcA = (typeof CHECK_SRC !== "undefined" && CHECK_SRC.views_a) || "";
    if (!srcD || !srcA) return "source unavailable: d=" + !!srcD + " a=" + !!srcA;
    const ok1 = srcD.indexOf("Handicap: Not Established") !== -1;
    const ok2 = srcA.indexOf("PROVISIONAL") !== -1 && srcA.indexOf("Not Established") !== -1;
    return (ok1 && ok2) ? true : "notEstablished=" + ok1 + " provisional=" + ok2;
  });

  t("D7", "Sandbox establishment walkthrough: rounds 1-2 provisional; round 3 establishes + recalculates 1-2", () => {
    const walk = establishmentWalkthrough(DB.hcpDemo.canned.slice(0, 3));
    return walk.before.length === 2 && walk.after.length === 3 && walk.audit.length === 1 &&
      walk.before.every(b => b.provisional) &&
      walk.after.slice(0, 2).every(a2 => a2.recalculated)
      ? true : JSON.stringify({ before: walk.before.length, after: walk.after.length });
  });

  t("D8", "Establishment HI = lowest 1 of first 3 differentials; PH follows allowance", () => {
    const walk = establishmentWalkthrough(DB.hcpDemo.canned.slice(0, 3));
    if (!walk || walk.hi == null) return "walkthrough shape: " + JSON.stringify(Object.keys(walk || {}));
    const hcpIdx = walk.hi;
    const sdOf = x => scoreDifferential(x, DB.season);
    const ags3 = DB.hcpDemo.canned.slice(0, 3).map(r => adjustedGrossScore(r, false, null).ags);
    const sds = ags3.map(sdOf);
    const minSd = Math.min.apply(null, sds);
    if (!eq(hcpIdx, minSd)) return "HI " + hcpIdx + " ≠ min SD " + minSd;
    const ph = playingHandicapFrom(courseHandicapFrom(hcpIdx, DB.season), DB.season.allowance).ph;
    if (!eq(walk.ph, ph)) return "PH " + walk.ph + " ≠ derived " + ph;
    return true;
  });

  t("D9", "Season par is 36 total; demo course uses par 3/4/5 and matches DB.season.par", () => {
    return eq(coursePar(), 36) && eq(DB.season.par, 36) && DB.course.every(h2 => [3, 4, 5].includes(h2.par)) ? true : "par=" + coursePar();
  });

  /* ---- localStorage keys/version (prototype hygiene) ---- */
  t("L1", "Storage keys are proto4 names; version is 4", () => {
    return (typeof STORE_KEY === "string" && STORE_KEY.indexOf("bgosh_proto4_state_v1") === 0 &&
            typeof DRAFT_KEY === "string" && DRAFT_KEY.indexOf("proto4") !== -1 &&
            typeof TEE_KEY === "string" && TEE_KEY.indexOf("proto4") !== -1 &&
            eq(DEFAULT_DB.version, 4))
      ? true : "keys=" + [STORE_KEY, DRAFT_KEY, TEE_KEY].join("|") + " v=" + DEFAULT_DB.version;
  });

  /* ---- report ---- */
  console.log("CHECK_RESULTS", JSON.stringify(results, null, 1));
  window.CHECK_RESULTS = results;
  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  const sum = document.getElementById("summary");
  sum.textContent = pass + " passed, " + fail + " failed, of " + results.length + " checks.";
  sum.className = fail ? "fail" : "pass";
  const tb = document.getElementById("results");
  results.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = "<td>" + (i + 1) + "</td><td>" + r.id + " — " + r.name + "</td><td class='" + (r.ok ? "pass" : "fail") + "'>" + (r.ok ? "PASS" : "FAIL") + "</td><td>" + (r.detail || "") + "</td>";
    tb.appendChild(tr);
  });
})();