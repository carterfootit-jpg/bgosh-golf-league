/* B'gosh Golf League — Prototype 4 UI (part 4): Handicap tab.
   - REAL 2026 snapshot handicaps (imports, distinct from calculated values).
   - §7 engine sandbox: auditable end-to-end demo golfer (Prototype Demo Data).
   - Establishment walkthrough + retroactive recalculation audit (§7/§18).
   Plain JS, no packages. */

function viewHandicap() {
  const which = sel.hcpDetail || "real";
  let h = "";

  h += '<div class="proto-note" style="margin-bottom:6px">Two clearly separated things live here: <b>(1)</b> the REAL 2026 snapshot handicaps used by tonight&rsquo;s matches, and <b>(2)</b> a live run of the finalized &sect;7 handicap engine on Prototype Demo Data.</div>';
  h += '<div class="tabbar"><button class="pill' + (which === "real" ? " on" : "") + '" id="tabReal">Real 2026 snapshot</button>';
  h += '<button class="pill' + (which === "sandbox" ? " on" : "") + '" id="tabSandbox">&sect;7 engine sandbox (demo)</button></div>';
  h += '<div class="mut small">Imported values and calculated values never mix: the snapshot came from the league sheet; the sandbox is a demo golfer with no real history.</div>';
  h += "</div>"; // close .datebar

  if (which === "real") h += realHandicapSection();
  else h += sandboxHandicapSection();

  h += seasonSettingsSection();

  setMain(h);
  qs$("#tabReal").on("click", () => { sel.hcpDetail = "real"; rerenderSame(); });
  qs$("#tabSandbox").on("click", () => { sel.hcpDetail = "sandbox"; rerenderSame(); });
  wireSandboxControls();
}

// Deep-persist: localStorage copy of DB so nested objects (hcpDemo sandbox,
// season settings, teams) survive reloads — saveDB() above stores shallow.
function persistDeep() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch (e) {}
}

function wireSandboxControls() {
  const lr = qs$("#loadRound");
  if (lr) lr.on("click", () => {
    const demo = DB.hcpDemo;
    if (demo.cannedNext < demo.canned.length) {
      demo.rounds.push(demo.canned[demo.cannedNext]);
      demo.cannedNext++;
      persistDeep();
      rerenderSame();
    }
  });
  const rb = qs$("#resetSandbox");
  if (rb) rb.on("click", () => {
    const demo = DB.hcpDemo;
    demo.rounds = [];
    demo.cannedNext = 0;
    demo.audit = [];
    persistDeep();
    rerenderSame();
  });
}

/* ============ (1) REAL 2026 SNAPSHOT ============ */
function realHandicapSection() {
  let h = '<section class="card"><h2 class="sec-t">League Handicaps &middot; real 2026 snapshot</h2>';
  h += '<div class="proto-note">Imported from the league standings sheet and normalized to conventional golf notation: sheet &ldquo;&minus;3&rdquo; means a <b>plus golfer</b> (gives strokes), sheet &ldquo;6&rdquo; means the golfer <b>receives 6</b>. These are the final handicaps actually in use for match strokes at snapshot time (spec &sect;7 context) &mdash; <b>not</b> recalculated here: the historical rounds/data that would derive them were not provided and none are invented.</div>';
  ["A", "B", "C", "D"].forEach(d => {
    h += '<h3 class="div-t">Division ' + d + "</h3><table class=\"gridtbl\"><tr><th>Team</th><th>Golfer</th><th>Handicap</th></tr>";
    DB.teams.filter(t => t.div === d).forEach(t => {
      t.golfers.forEach((g, gi) => {
        const isMe = g.name === MY_NAME;
        h += "<tr" + (isMe ? ' class="tr-mine"' : "") + "><td>" + esc(t.code) + "</td><td><b>" + esc(g.name) + "</b>" + (isMe ? ' <span class="youmark">you</span>' : "") + "</td><td><b>" + fmtHdcp(g.hdcp.receive) + "</b>" +
          (g.sheet < 0 ? ' <span class="mut small">(sheet &minus;' + (-g.sheet) + ")</span>" : (g.sheet > 0 ? ' <span class="mut small">(sheet +' + g.sheet + ")</span>" : ' <span class="mut small">(scratch)</span>')) + "</td></tr>";
      });
    });
    h += "</table>";
  });
  h += '<div class="proto-note"><b>No Handicap Index history is shown for any real golfer</b> &mdash; the league&rsquo;s historical Score Differential records were not provided, and inventing them is not allowed. A walkthrough of the full calculation (demo data) is on the second sub-tab.</div>';
  h += "</section>";
  return h;
}

/* ============ (2) §7 ENGINE SANDBOX (demo golfer) ============ */
function sandboxHandicapSection() {
  const demo = DB.hcpDemo;
  const rounds = demo.rounds;
  let h = '<section class="card"><h2 class="sec-t">&sect;7 engine sandbox &middot; demo golfer &ldquo;' + esc(demo.golferName) + '&rdquo;</h2>';
  h += '<div class="banner-warn">PROTOTYPE DEMO DATA &mdash; this golfer, the fixed demo opponents, and every score here are demo; no real 2026 league history is used or implied.</div>';
  h += '<div class="proto-note">Canned demo rounds load one at a time; the pipeline stages below recompute on every load, so every stage of the spec progression can be inspected (0-2 rounds &rarr; rounds 3-4 &rarr; &hellip; &rarr; the rolling last-10 window).</div>';

  h += '<div class="row2"><button class="b2" id="loadRound">' + iconS("check") + " Load next demo round (" + (rounds.length + 1) + ")</button>";
  h += '<button class="b2" id="resetSandbox">Reset sandbox</button></div>';
  if (demo.cannedNext >= demo.canned.length) h += '<div class="mut small">All ' + demo.canned.length + " canned demo rounds loaded.</div>";

  if (!rounds.length) {
    h += '<div class="mut">No demo rounds loaded yet &mdash; press <b>Load next demo round</b> to begin.</div></section>';
    return h;
  }

  const d = computeHandicapSandbox(rounds);

  /* Establishment stage banner (spec §7: never display 0.0) */
  if (!d.established) {
    h += '<div class="banner-warn"><b>Handicap: Not Established</b> &mdash; ' + esc(d.plan.label) + ". Matches are PROVISIONAL; zero handicap strokes (no 0.0 Handicap Index is ever implied).</div>";
  } else {
    h += '<div class="banner-unoff2"><b>Established &middot; Handicap Index ' + d.hi.toFixed(1) + "</b> &mdash; " + esc(d.plan.label) + "</div>";
  }

  /* Stage 1–2: eligible rounds, AGS, SD table */
  h += '<h3 class="div-t">Eligible rounds &mdash; actual gross, Adjusted Gross Score, Score Differential</h3>';
  h += '<div class="scrollx"><table class="gridtbl"><tr><th>Rd</th><th>Gross total (actual)</th><th>Adjusted</th><th>Cap rule</th><th>Diff (PCC 0)</th></tr>';
  d.rounds.forEach(r => {
    h += '<tr><td><b>' + r.n + "</b></td><td>" + r.grossTotal + "</td><td>" + r.ags + "</td><td>";
    if (r.caps.length) h += r.caps.map(c2 => esc(c2)).join("<br>");
    else h += '<span class="mut">no hole capped</span>';
    h += "</td><td><b>" + r.sd.toFixed(1) + "</b></td></tr>";
  });
  h += "</table></div>";
  h += '<div class="proto-note">Adjusted Gross Score: before establishment the cap is <b>Par + 5</b>; after establishment <b>Net Double Bogey</b> (par + 2 + strokes from the FULL Course Handicap by hole rank &mdash; never the reduced Playing Handicap). Actual gross scores stay intact (spec &sect;7) &mdash; the Gross column is never rewritten; the demo match still scores on gross-minus-strokes.</div>';

  if (!d.established) {
    h += "</section>";
    return h;
  }

  /* Stage 4: which differentials are selected */
  h += '<h3 class="div-t">B&rsquo;gosh differential selection (' + esc(d.plan.label) + ")</h3>";
  h += '<div class="scrollx"><table class="gridtbl"><tr><th>Rd</th><th>Differential</th><th>Selected?</th></tr>';
  d.sel.window.forEach(w => {
    h += '<tr><td>' + (w.idx + 1) + "</td><td>" + w.sd.toFixed(1) + '</td><td>' + (w.selected ? '<span class="chip chip-final">YES</span>' : '<span class="chip chip-ns">no</span>') + "</td></tr>";
  });
  h += "</table></div>";

  /* Stage 5: Handicap Index */
  h += '<h3 class="div-t">Handicap Index</h3>';
  h += '<div class="hcpstep">Arithmetic mean of the ' + d.sel.selected.length + " selected differential(s) = <b>" + d.hi.toFixed(1) + "</b> (nearest tenth)</div>";

  /* Stage 6: Course Handicap */
  h += '<h3 class="div-t">Course Handicap (nine-hole formula)</h3>';
  h += '<div class="hcpstep">(' + d.hi.toFixed(1) + " &divide; 2, to nearest tenth = " + d.chCalc.halfIdx.toFixed(1) + ") &times; (" + d.chCalc.slope + " &sol; 113) + (" + d.chCalc.cr + " &minus; " + d.chCalc.par + ") = <b>" + d.ch.toFixed(1) + "</b></div>";

  /* Stages 7–8: allowance → Playing Handicap */
  h += '<h3 class="div-t">Playing Handicap (allowance ' + d.allowance + "%)</h3>";
  h += '<div class="hcpstep">' + d.ch.toFixed(1) + " &times; " + d.allowance + "% = " + d.phExact.toFixed(2) + " \u2192 rounded (.5 upward) = <b><span class=\u0022big-num\u0022>" + fmtHdcp(d.ph) + "</span></b>" + (d.ph < 0 ? " <b>(plus &mdash; gives strokes)</b>" : "") + "</div>";

  /* Stage 9: match netting (worked example vs the demo foursome) */
  const mInfo = establishmentMatches(rounds).pop(); // most recent demo match
  h += '<h3 class="div-t">Match netting (stage 9) &mdash; demo foursome of the latest round</h3>';
  h += '<div class="scrollx"><table class="gridtbl"><tr><th>Golfer</th><th>Playing Hdcp</th><th>Match strokes (netted to lowest)</th></tr>';
  const netting = matchNetting(mInfo.m.golfers);
  mInfo.m.golfers.forEach((g, gi) => {
    const isProv = netting[gi].provisional;
    h += "<tr><td>" + esc(g.name) + (gi === 0 ? ' <span class="youmark">demo golfer</span>' : "") + "</td><td>" + (isProv ? "Not Established" + ' PROVISIONAL' : fmtHdcp(g.ph)) + "</td><td><b>" + netting[gi].strokes + "</b></td></tr>";
  });
  h += "</table></div>";
  h += '<div class="proto-note">All four Playing Handicaps are compared; the lowest plays from 0 and everyone else receives the difference (spec &sect;7 &mdash; plus PHs handled). The demo golfer&rsquo;s rounds 1&ndash;2 were provisional: zero strokes, no manufactured handicap (below).</div>';

  /* Establishment walkthrough + retroactive recalculation (§7) */
  const walk = establishmentWalkthrough(rounds);
  walk.ph = d.ph;   // current PH after the latest round (per §7: applies to the NEXT round)
  h += establishmentSection(walk);

  h += "</section>";
  return h;
}

/* --- the establishment/retroactive-recalculation walkthrough table (§7/§18) */
function establishmentSection(walk) {
  let h = '<h3 class="div-t">Provisional rounds &amp; third-round establishment (&sect;7)</h3>';
  if (!walk.before.length && !walk.after.length) {
    h += '<div class="mut">Load at least 3 demo rounds to see the establishment walkthrough.</div>';
    return h;
  }
  h += '<h4 class="subt">Before establishment (rounds 1&ndash;' + walk.before.length + ') &mdash; provisional/unofficial</h4>';
  h += '<div class="scrollx"><table class="gridtbl"><tr><th>Rd</th><th>Demo golfer strokes</th><th>Result (demo match)</th><th>Status</th></tr>';
  walk.before.forEach(b => {
    h += "<tr><td>R" + b.round + '</td><td>0</td><td>' + fmtHalf(b.c.pts[0]) + " &ndash; " + fmtHalf(b.c.pts[1]) + '</td><td><span class="tag provisional">PROVISIONAL</span></td></tr>';
  });
  h += "</table></div>";
  h += '<h4 class="subt">Round ' + (walk.before.length + 1) + " establishes the initial Handicap Index (lowest differential of rounds 1&ndash;3)</h4>";
  h += '<div class="hcpstep">Initial HI = lowest Score Differential of the first three eligible rounds; the Course/Playing Handicap and relative strokes derive from it (stages 5&ndash;9).</div>';
  if (walk.after.length) {
    h += '<h4 class="subt">After retroactive recalculation (matches can become official &mdash; &sect;7/&sect;13)</h4>';
    h += '<div class="scrollx"><table class="gridtbl"><tr><th>Rd</th><th>Demo golfer Playing Hdcp</th><th>Strokes</th><th>Recalculated result</th><th>Change vs provisional</th></tr>';
    walk.after.forEach(a2 => {
      const st = matchNetting(a2.m.golfers)[0].strokes;
      const changed = a2.recalculated;
      h += "<tr><td>R" + a2.round + "</td><td>" + fmtHdcp(walk.ph) + "</td><td>" + st + "</td><td>" + fmtHalf(a2.c.pts[0]) + " &ndash; " + fmtHalf(a2.c.pts[1]) + "</td><td>" + (changed ? "<b>recalculated</b> &mdash; changed because the initial handicap became established (&sect;7)" : '<span class="mut">first official-capable round (PH established at this round)</span>') + "</td></tr>";
    });
    h += "</table></div>";
  }
  h += '<div class="banner-warn"><b>Audit (&sect;7/&sect;18)</b> &mdash; ' + esc(walk.audit[0] ? walk.audit[0].text : "") + '</div>';
  h += '<div class="proto-note">The demo match keeps actual gross scores throughout; only the handicap-derived strokes, nets and points changed. This exception to the historical-snapshot principle is limited to initial establishment (spec &sect;18).</div>';
  return h;
}

/* ============ season settings summary (spec §7/§10 context) ============ */
function seasonSettingsSection() {
  const s = DB.season;
  return '<section class="card"><h2 class="sec-t">Season settings used above (Admin &rarr; Season Course Configuration)</h2>' +
    '<div class="row2"><div class="seedband s14" style="flex:1"><div class="seedband-t">9-hole course</div>' +
    'Slope <b>' + s.slope + "</b> &middot; Course Rating <b>" + s.cr + "</b> &middot; Par <b>" + s.par + "</b></div>" +
    '<div class="seedband s14" style="flex:1"><div class="seedband-t">Handicap Allowance</div><b>' + s.allowance + "%</b> &middot; Playing Hdcp = Course Hdcp &times; allowance</div></div>" +
    '<div class="proto-note">PCC is fixed at 0 by league rule (spec &sect;7) &mdash; no PCC engine is implemented. USGA best-8-of-20, WHS caps and exceptional-score adjustments are NOT part of the B&rsquo;gosh system and are not implemented.</div></section>';
}

/* ---------- shared helper used by the establishment walkthrough ---------- */
function establishmentMatches(rounds) {
  // Demo matches for each loaded round (same construction as walkthrough);
  // used to render the latest foursome netting example.
  const opp = DB.hcpDemo.opponents;
  const n = rounds.length;
  const last = Math.max(0, n - 1);
  const d = computeHandicapSandbox(rounds.slice(0, last + 1));
  const phObj = d.established && d.ph != null ? d.ph : null;
  return [{ m: { golfers: [
    { name: DB.hcpDemo.golferName, team: 'A', ph: phObj },
    { name: opp[0].name, team: 'B', ph: opp[0].ph },
    { name: opp[1].name, team: 'B', ph: opp[1].ph },
    { name: opp[2].name, team: 'B', ph: opp[2].ph }
  ], scores: [
    rounds[last],
    opp[0].scores, opp[1].scores, opp[2].scores
  ] } }];
}