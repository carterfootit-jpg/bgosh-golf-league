/* B'gosh Golf League — Prototype 4 UI (part 1).
   Standings/rosters/names are the REAL 2026 league snapshot; tonight's demo
   scores are Prototype Demo Data. Carter (Team B3) is the logged-in example.
   Carter handicap-detail view + score entry + review + scores list + match
   detail. Plain JS, no packages. Uses the mini-API from app.js. */

function viewHome() {
  const m = curMatch();
  const c = matchCalc(m);
  let h = "";

  h += dBar("League Night &middot; Prototype demo night (real 2026 standings snapshot)");

  /* ----- Tee Order: prominently placed at the top of Tonight/Home (spec §11). */
  h += '<section class="card"><h2 class="sec-t">Tee Order &middot; Tonight</h2>';
  h += '<div class="proto-note">Set by the administrator for each league night &mdash; view-only for players (spec &sect;11). Pairings/tee times are Prototype Demo Data (no 2026 schedule was provided).</div>';
  h += teeOrderListHTML();
  h += "</section>";

  h += '<section class="card"><h2 class="sec-t">Tonight&rsquo;s Events</h2>';
  h += '<div class="proto-note">Administrator-entered hole events (demo).</div>';
  if (!DB.events.length) h += '<div class="mut">No events posted tonight.</div>';
  DB.events.forEach(ev => {
    h += '<div class="eventline"><b>Hole ' + ev.hole + "</b><span>" + esc(ev.label) + "</span></div>";
  });
  h += "</section>";

  h += '<section class="card"><h2 class="sec-t">Your Handicap</h2>';
  h += '<div class="handicapline"><span class="big-num">+3</span>';
  h += '<span class="mut small">imported 2026 snapshot &middot; sheet &minus;3 &rarr; <b>+</b>3 (plus golfer &mdash; the lowest Playing Handicap in tonight&rsquo;s match: 0 strokes)</span></div>';
  h += '<div class="proto-note">Tonight&rsquo;s strokes: netted against the lowest Playing Handicap in your match (spec &sect;7) &mdash; lowest here is yours (see Handicap tab for the full detail).</div>';
  h += "</section>";

  h += '<section class="card matchcard"><h2 class="sec-t">Tonight&rsquo;s Matchup</h2>';
  h += '<div class="teamsline"><div><span class="tname">' + esc(teamName(m.a)) + '</span> <span class="mut">Team ' + m.a + "</span></div>";
  h += '<span class="vsmark">vs</span>';
  h += '<div><span class="tname">' + esc(teamName(m.b)) + '</span> <span class="mut">Team ' + m.b + "</span></div></div>";
  h += '<div class="golfersline">';
  m.golfers.forEach(g => {
    const prov = provisionalGolfer(m, m.golfers.indexOf(g));
    h += '<div class="gchip' + (g.team === MY_TEAM ? " mine" : "") + '"><b>' + esc(g.name) + "</b> " + fmtHdcp(g.ph) + (prov ? provisionalTag() : "") + (g.name === MY_NAME ? ' <span class="youmark">you</span>' : "") + "</div>";
  });
  h += "</div>";
  h += '<div class="live-line">' + curStatusChip(m) + (c.provisional ? provisionalTag() : "") + '<span class="pts">' + fmtHalf(c.pts[0]) + " &ndash; " + fmtHalf(c.pts[1]) + "</span></div>";
  h += '<button class="cta" id="enterbtn">' + iconS("pencil") + " Enter Scores</button>";
  h += '<div class="row2"><button class="b2" id="tonightbtn">' + iconS("eye") + ' Tonight&rsquo;s Scores</button>';
  h += '<button class="b2" id="standbtn">' + iconS("chart") + " Standings</button></div>";
  h += '<div class="proto-note">Tee time ' + esc(m.tee) + " &middot; 20 points available in the &sect;6 match.</div>";
  h += "</section>";

  h += '<section class="card"><h2 class="sec-t">League Tonight</h2>';
  let started = 0, finals = 0;
  DB.matches.forEach(mm => {
    if (mm.status === "not_started") return;
    started++;
    if (mm.status === "final") finals++;
    const c2 = matchCalc(mm);
    const mine = mm.a === MY_TEAM || mm.b === MY_TEAM;
    h += '<div class="scoreline" data-mid="' + mm.id + '"><div>';
    h += '<div class="mut small">Div ' + esc(DB.divisions[mm.a]) + " &middot; tee " + esc(mm.tee) + (mine ? " &middot; YOUR MATCH" : "") + "</div>";
    h += '<span class="tn2">' + esc(teamName(mm.a)) + "</span> <b>" + fmtHalf(c2.pts[0]) + "</b> &ndash; <b>" + fmtHalf(c2.pts[1]) + '</b> <span class="tn2">' + esc(teamName(mm.b)) + "</span></div>";
    h += curStatusChip(mm) + (c2.provisional ? provisionalTag() : "");
    h += "</div>";
  });
  h += '<div class="proto-note">' + started + " of 8 demo matches started &middot; " + finals + " final. In-progress results are UNOFFICIAL; Provisional matches recalculate on establishment (&sect;7).</div>";
  h += "</section>";
  setMain(h);

  qs$("#enterbtn").on("click", () => { preloadEntry(m.id); sel.hole = 0; go("scoreentry"); });
  qs$("#tonightbtn").on("click", () => go("scorelist"));
  qs$("#standbtn").on("click", () => go("standings"));
  qsa$(".scoreline").forEach(el => el.on("click", () => go("match", el.dataset.mid)));
}

/* Tee-order list for Tonight/Home (read-only for normal players, spec §11).
   Slots come from DB.teeOrder; the demo tee times ride in TEE_SLOTS. */
function teeOrderListHTML() {
  let rows = "";
  const order = currentTeeOrder();
  order.forEach((mid, idx) => {
    const mm = findMatch(mid);
    if (!mm) return;
    const c2 = matchCalc(mm);
    const mine = mm.a === MY_TEAM || mm.b === MY_TEAM;
    rows += '<div class="teerow' + (mine ? " teerow-mine" : "") + '">';
    rows += '<span class="teenum">' + (idx + 1) + "</span>";
    rows += '<div class="teemain"><span class="tee-teams">' + esc(teamName(mm.a)) + ' <span class="mut">vs</span> ' + esc(teamName(mm.b)) + "</span>";
    rows += '<span class="mut small">Provisional matches recalc on establishment &middot; demo tee ' + esc(TEE_SLOTS[idx]) + " &middot; " + fmtHalf(c2.pts[0]) + "&ndash;" + fmtHalf(c2.pts[1]) + "</span></div>";
    rows += '<span class="tee-div">Div ' + esc(DB.divisions[mm.a]) + "</span>";
    rows += "</div>";
  });
  return rows;
}
function currentTeeOrder() {
  return loadTee() || DB.teeOrder;
}

/* ================= SCORE ENTRY ================= */
function viewScoreEntry() {
  const m = curMatch();
  const allowed = canEditMatch(m);
  const calc = matchCalc(m);
  const i = sel.hole;
  const hole = CH()[i];
  const myGolfers = m.golfers.filter(g => g.team === MY_TEAM);
  const strokes = nettingFor(m);
  let h = "";

  h += '<div class="datebar"><button class="p" id="phl">&lsaquo;</button>';
  h += '<span class="datebar-t">Hole ' + hole.h + " of 9 &middot; Par " + hole.par + " &middot; Stroke rank " + hole.rank + "</span>";
  h += '<button class="p" id="nhl">&rsaquo;</button></div>';

  h += '<div class="stepper">';
  for (let hh = 1; hh <= 9; hh++) {
    const entered = m.scores[hh - 1].every(v => v !== null);
    h += '<button class="ppill' + (hh - 1 === i ? " on" : "") + (entered && hh - 1 !== i ? " done" : "") + '" data-h="' + (hh - 1) + '" ' + (allowed ? "" : "disabled") + ">" + hh + "</button>";
  }
  h += "</div>";

  const provList = matchNetting(m.golfers);
  const provisionalGolferNames = m.golfers.filter((g, gi) => provList[gi].provisional).map(g => g.name);
  if (calc.provisional) {
    h += '<div class="banner-warn">PROVISIONAL MATCH &mdash; ' + esc(provisionalGolferNames.join(", ")) + " plays without an established Handicap Index: the four entered gross scores all count, that golfer gets zero handicap strokes, and the match recalculates (and can become official) once the round that establishes their handicap is completed (spec &sect;7).</div>";
  }
  if (!allowed) {
    h += '<div class="banner-warn">Read-only &mdash; scores are editable only by Team ' + MY_TEAM_LABEL + " players (spec &sect;14).</div>";
  }

  h += '<div class="gcards">';
  m.golfers.forEach((g, gi) => {
    const st = strokesOn(hole.rank, strokes[gi]);
    h += '<div class="gcard' + (g.team === MY_TEAM ? " gcard-me" : "") + '">';
    h += '<div class="ghd"><span class="gname"><b>' + esc(g.name) + "</b>" + (g.team === MY_TEAM ? ' <span class="youmark">you</span>' : "") + '</span><span class="ghcp">' + fmtHdcp(g.ph) + ' Playing Hdcp' + (provList[gi].provisional ? provisionalTag() : "") + "</span></div>";
    h += '<div class="grossbox"><div class="grosslbl">Gross &mdash; actual</div><button class="pm" data-g="' + gi + '" data-d="-1" ' + (allowed ? "" : "disabled") + ">&minus;</button>";
    h += '<input class="grossin" data-g="' + gi + '" inputmode="numeric" value="' + esc(sel.entry[i][gi]) + '" placeholder="&ndash;" ' + (allowed ? "" : "disabled") + ">";
    h += '<button class="pm" data-g="' + gi + '" data-d="1" ' + (allowed ? "" : "disabled") + ">+</button></div>";
    h += '<div class="gnet">Net so far: <b>' + calc.netT[gi] + "</b></div>";
    if (st > 0) h += '<div class="strokes">' + (st === 1 ? "1 stroke" : st + " strokes") + " on this hole</div>";
    h += "</div>";
    if (gi === 1) h += '<div class="teamsplit">&mdash; vs &mdash;</div>';
  });
  h += "</div>";

  h += '<p class="note">Enter actual gross scores only &mdash; no upper limit (the old prototype cap of 12 was never a league rule, spec &sect;12); a score below 1 is blocked. Net, points and the running match score calculate automatically (spec &sect;5&ndash;&sect;8, &sect;12). Blank + starts at par; the draft stays editable until explicit submission (spec &sect;13).</p>';
  h += '<div class="scoreactions"><button class="cta" id="reviewbtn">' + iconS("check") + " Review &amp; Submit</button>";
  h += '<button class="b2" id="backhome">' + iconS("home") + " Home</button></div>";
  h += '<div class="running" id="runningbar">Running: <b>' + fmtHalf(calc.pts[0]) + "</b> &ndash; <b>" + fmtHalf(calc.pts[1]) + "</b> " + curStatusChip(m) + (calc.provisional ? provisionalTag() : "") + "</div>";
  setMain(h);

  qs$("#phl").on("click", () => { commit(); if (sel.hole > 0) { sel.hole--; go("scoreentry"); } });
  qs$("#nhl").on("click", () => {
    commit();
    if (sel.hole < 8) { sel.hole++; go("scoreentry"); } else { go("review"); }
  });
  qs$("#reviewbtn").on("click", () => { commit(); go("review"); });
  qs$("#backhome").on("click", () => go("home"));
  qsa$(".ppill").forEach(b => b.on("click", () => { commit(); sel.hole = +b.dataset.h; go("scoreentry"); }));
  if (allowed) {
    // ± taps keep the input in place: update only the affected cell, the
    // "Net so far" value and the running bar — no re-render, no scroll jump
    // (spec §12; proto-2 lesson: never re-render the whole view on tap).
    qsa$(".pm").forEach(b => b.on("click", () => { adjust(+b.dataset.g, +b.dataset.d); }));
    qsa$(".grossin").forEach(inp => inp.on("input", () => {
      draftSet(i, +inp.dataset.g, inp.value.replace(/[^0-9]/g, ""));
      updateRunningBar(m);
    }));
    qsa$(".grossin").forEach(inp => inp.on("change", () => rerenderSame()));
  }
}

function adjust(gi, d) {
  // Blank cell: the FIRST + tap initializes to the hole's par (spec §12); the
  // first − tap also starts from par (least surprising non-destructive
  // default). After that the buttons adjust normally.
  const cur0 = sel.entry[sel.hole][gi];
  let v = cur0 === "" ? CH()[sel.hole].par : +cur0 + d;
  if (v < 1) v = 1; // sensible lower bound only — NO arbitrary maximum (spec §12): 13, 14, … are real scores
  draftSet(sel.hole, gi, String(v));
  const m = curMatch();
  m.scores[sel.hole][gi] = v;
  saveDB();
  // In-place refresh: this cell, that golfer's Net-so-far and the running bar.
  const inp = $('.grossin[data-g="' + gi + '"]');
  if (inp) inp.value = String(v);
  updateRunningBar(m);
  const calc = matchCalc(m);
  const gEl = document.querySelectorAll(".gcard")[gi];
  if (gEl) {
    const nb = gEl.querySelector(".gnet b");
    if (nb) nb.textContent = String(calc.netT[gi]);
  }
  markStepDone(sel.hole);
}

/* ================= REVIEW / SUBMIT ================= */
function viewReview() {
  const m = curMatch();
  const c = matchCalc(m);
  const complete = c.complete;
  const totalPts = c.pts[0] + c.pts[1];
  const ok20 = complete && totalPts === 20;
  let h = "";
  h += '<div class="datebar"><span class="datebar-t">Review &amp; Submit</span></div>';
  h += '<div class="banner-unoff">' + iconS("info") + " NOT OFFICIAL &mdash; standings stay unchanged until you submit (prototype: submission is simulated locally).</div>";
  if (c.provisional) {
    h += '<div class="banner-warn">PROVISIONAL &mdash; this match involves a golfer without an established handicap (spec &sect;7). It stays UNOFFICIAL and keeps recalculating on establishment even after submission, until the establishment recalculation is complete.</div>';
  }

  /* Primary result: the two team totals, prominent and nothing else
     (spec §13: no hole-points-vs-overall breakdown in the main display). */
  h += '<section class="card"><div class="resultbig">';
  h += '<div><div class="rb-team">' + esc(teamName(m.a)) + (m.a === MY_TEAM ? ' <span class="youmark">you</span>' : "") + '</div><div class="rb-pts">' + fmtHalf(c.pts[0]) + "</div></div>";
  h += '<div class="rb-vs">vs</div>';
  h += '<div><div class="rb-team">' + esc(teamName(m.b)) + (m.b === MY_TEAM ? ' <span class="youmark">you</span>' : "") + '</div><div class="rb-pts">' + fmtHalf(c.pts[1]) + "</div></div>";
  h += "</div>";

  h += '<div class="validline ' + (ok20 ? " ok" : " bad") + '">' + iconS(ok20 ? "check" : "warn") + " Match points total: <b>" + (complete ? fmtHalf(totalPts) : "&ndash;") + " / 20</b>";
  h += ok20 ? " &mdash; OK to submit." : " &mdash; every hole needs all 4 gross scores before the total can reach 20 (spec &sect;6/&sect;13).</div>";

  h += '<h2 class="sec-t">Scorecard</h2><div class="scrollx"><table class="gridtbl">';
  h += "<tr><th>Hole</th>";
  m.golfers.forEach(g => { h += "<th>" + esc(g.name.split(" ")[0]) + "</th>"; });
  h += "</tr>";
  for (let hi = 0; hi < 9; hi++) {
    h += '<tr><td><b>H' + (hi + 1) + '</b> <span class="mut">' + CH()[hi].par + "&middot;" + CH()[hi].rank + "</span></td>";
    for (let g = 0; g < 4; g++) {
      const raw = m.scores[hi][g];
      if (raw === null) { h += '<td class="mut">&ndash;</td>'; continue; }
      const st = strokesOn(CH()[hi].rank, c.strokes[g]);
      h += "<td" + (st > 0 ? ' class="stcell"' : "") + ">" + strokeCell(raw, st) + "</td>";
    }
    h += "</tr>";
  }
  h += "</table></div>";
  h += '<p class="note">Cell = gross, or gross/net when a stroke(s) was received (two strokes: 5&sol;3). Strokes netted against the lowest Playing Handicap (spec &sect;7); ties split the point.</p>';
  h += '<div class="scoreactions"><button class="cta cta-plain" id="editscores">' + iconS("pencil") + " Edit Scores</button>";
  h += '<button class="cta cta-green" id="submitbtn" ' + (ok20 ? "" : "disabled") + ">" + iconS("check") + " Submit Match</button></div>";
  h += '<div class="proto-note">Edit access is team-scoped: this screen edits only Team B3&rsquo;s match (spec &sect;14).</div>';
  h += "</section>";
  setMain(h);
  qs$("#editscores").on("click", () => go("scoreentry"));
  if (ok20) qs$("#submitbtn").on("click", () => submitMatch());
}

function submitMatch() {
  const m = curMatch();
  m.status = "final";
  const c = matchCalc(m);
  saveDB();
  toast("Match submitted &mdash; simulated locally; standings reflect it." + (c.provisional ? " It remains PROVISIONAL/UNOFFICIAL until establishment recalculation completes (spec &sect;7/&sect;13)." : ""));
  go("match", m.id);
}

/* ================= TONIGHT'S SCORES + MATCH DETAIL ================= */
// After an in-place score update, mark the hole pill as filled (class only —
// no re-render) so the stepper reflects progress without a scroll jump.
function markStepDone(i) {
  const el = document.querySelectorAll(".ppill")[i];
  if (el) el.classList.add("done");
}
function viewScoreList() {
  let h = "";
  h += dBar("Tonight&rsquo;s League Scores &middot; Prototype demo night");
  h += '<section class="card"><h2 class="sec-t">All 8 Matches &middot; demo scores (real 2026 teams)</h2>';
  currentTeeOrder().forEach((mid, idx) => {
    const mm = findMatch(mid);
    if (!mm) return;
    const c2 = matchCalc(mm);
    const mine = mm.a === MY_TEAM || mm.b === MY_TEAM;
    h += '<div class="scoreline' + (mine ? " mine" : "") + '" data-mid="' + mm.id + '">';
    h += '<div class="sl-teams"><b>' + esc(teamName(mm.a)) + '</b> <span class="mut">T' + mm.a + "</span> vs <b>" + esc(teamName(mm.b)) + '</b> <span class="mut">T' + mm.b + "</span>" + (mine ? ' <span class="youmark">yours</span>' : "") + "</div>";
    h += '<div class="sl-pts"><b>' + fmtHalf(c2.pts[0]) + "</b>&ndash;<b>" + fmtHalf(c2.pts[1]) + "</b> " + curStatusChip(mm) + (c2.provisional ? provisionalTag() : "") + "</div>";
    h += "</div>";
  });
  h += '<div class="proto-note">In-progress results are UNOFFICIAL (spec &sect;13); provisional matches recalculate on establishment (spec &sect;7). Scores on this screen are Prototype Demo Data &mdash; not real 2026 match history. Tap any match to inspect it.</div>';
  h += "</section>";
  setMain(h);
  qsa$(".scoreline").forEach(el => el.on("click", () => go("match", el.dataset.mid)));
}

function viewMatch() {
  const m = curMatch();
  const c = matchCalc(m);
  let h = '<div class="datebar"><button class="p" id="backlists">&larr;</button><span class="datebar-t">' + esc(teamName(m.a)) + " vs " + esc(teamName(m.b)) + "</span></div>";
  h += '<div class="banner-unoff2">' + iconS("info") + " " +
    (m.status === "final" ? "FINAL &mdash; official (submitted)." :
     (m.status === "not_started" ? "NOT STARTED." :
      "IN PROGRESS &mdash; UNOFFICIAL. No standings effect until submitted.")) + "</div>";
  if (c.provisional) {
    h += '<div class="banner-warn">PROVISIONAL &mdash; ' + esc(m.golfers.filter(g => g.ph == null).map(g => g.name).join(", ")) + " plays without an established handicap (zero strokes, spec &sect;7). This result recalculates (and only then can become official) when their round 3 establishes the initial Handicap Index.</div>";
  }
  if (DB.corrected[m.id]) {
    // Show the audit entry for THIS match (most recent correction mentioning
    // its team labels), not the seed example (spec §16).
    const entry = DB.audit.slice().reverse().find(a =>
      a.text.indexOf("Corrected a submitted match") !== -1 &&
      a.text.indexOf(teamName(m.a)) !== -1 &&
      a.text.indexOf(teamName(m.b)) !== -1);
    if (entry) h += '<div class="banner-warn">Admin-corrected &mdash; preserved audit trail: ' + esc(entry.text) + "</div>";
  }

  /* Primary result: team totals only (spec §13). */
  h += '<section class="card"><div class="resultbig">';
  h += '<div><div class="rb-team">' + esc(teamName(m.a)) + (m.a === MY_TEAM ? ' <span class="youmark">yours</span>' : "") + '</div><div class="rb-pts">' + fmtHalf(c.pts[0]) + "</div></div>";
  h += '<div class="rb-vs">vs</div>';
  h += '<div><div class="rb-team">' + esc(teamName(m.b)) + (m.b === MY_TEAM ? ' <span class="youmark">yours</span>' : "") + '</div><div class="rb-pts">' + fmtHalf(c.pts[1]) + "</div></div>";
  h += "</div>";

  h += '<table class="gridtbl"><tr><th>Golfer</th><th>Playing Hdcp</th><th>Gross</th><th>Net</th></tr>';
  m.golfers.forEach((g, gi) => {
    h += "<tr><td><b>" + esc(g.name) + "</b>" + (g.team === MY_TEAM ? ' <span class="youmark">you</span>' : "") + "</td><td>" + fmtHdcp(g.ph) + (provisionalGolfer(m, gi) ? provisionalTag() : "") + "</td><td>" + c.gross[gi] + "</td><td>" + c.netT[gi] + "</td></tr>";
  });
  h += "</table>";
  h += '<h2 class="sec-t">Scorecard</h2>' + scorecardTable(m, c);
  h += '<div class="validline ' + (c.complete ? " ok" : " bad") + '">' + iconS("check") + " Match points: " + fmtHalf(c.pts[0]) + " &ndash; " + fmtHalf(c.pts[1]) + (c.complete ? " (sums to 20)" : " (incomplete/running)") + "</div>";

  // Handicap-engine inspection for C's side of M3 (spec: actual gross vs
  // adjusted must stay inspectable somewhere without cluttering entry).
  const mine = m.golfers.map((g, gi) => ({ g, gi })).filter(x => x.g.team === MY_TEAM);
  const canInspect = mine.length > 0 && m.scores.every(r => r.every(v => v != null));
  if (canInspect) {
    h += '<details class="agd"><summary>Handicap engine (computed, example) &mdash; actual gross vs Adjusted Gross Score</summary>';
    mine.forEach(x => {
      const round = m.scores.map(r => r[x.gi]);
      const prov = provisionalGolfer(m, x.gi);
      const est = !provisionalGolfer(m, x.gi);
      const chFull = est ? phToCh(x.g.ph) : null;
      const a = adjustedGrossScore(round, est, chFull);
      const capped = a.holes.filter(x2 => x2.capped);
      h += '<div class="agrow"><b>' + esc(x.g.name) + "</b> &mdash; actual gross total <b>" + a.holes.reduce((s, hh) => s + hh.gross, 0) + "</b>, Adjusted Gross Score <b>" + a.ags + "</b>";
      if (!capped.length) h += ' <span class="mut">(no hole exceeded its cap)</span>';
      else capped.forEach(c2 => {
        h += '<div class="mut small">Hole ' + c2.h + " (par " + c2.par + ", rank " + c2.rank + "): actual " + c2.gross + " \u2192 handicap " + c2.adj + " (cap " + c2.cap + (est ? ", Net Double Bogey from full Course Handicap " + fmtHdcp(chFull) : " = Par+5, handicap not yet established") + ")</div>";
      });
      h += (prov ? '<div class="mut small">Not Established &mdash; this demo-night match is the golfer\u2019s 2nd recorded round; pre-establishment AGS caps are Par+5 (full walkthrough on the Handicap tab).</div></div>' : '<div class="mut small">AGS caps are Net Double Bogey from the full Course Handicap (established golfer &mdash; walkthrough on the Handicap tab).</div></div>');
    });
    h += '</details>';
  }

  if (!canEditMatch(m)) h += '<div class="proto-note">View-only: you can browse other teams&rsquo; match results, but editing is team-scoped (spec &sect;14).</div>';
  if (canEditMatch(m)) h += '<button class="cta" id="editmine">' + iconS("pencil") + " Enter / Edit Scores</button>";
  h += "</section>";
  setMain(h);
  qs$("#backlists").on("click", () => go("scorelist"));
  if (qs$("#editmine")) qs$("#editmine").on("click", () => { preloadEntry(m.id); sel.hole = 0; go("scoreentry"); });
}

/* Debug helper: derive a full Course Handicap estimate from a Playing Handicap
   by inverting the configured allowance (PH = CH � allowance). Used only for
   the local, inspectable AGS example on Carter's side of M3; the real §7
   pipeline direction HI→CH→PH is in handicap.js. */
function phToCh(ph) {
  const a = DB.season.allowance / 100;
  if (!a) return null;
  return ph / a;
}