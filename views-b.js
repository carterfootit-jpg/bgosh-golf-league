/* B'gosh Golf League — Prototype 4 UI (part 2).
   Standings/roster data is the REAL 2026 league snapshot (imported into
   data.js — totals, Last Week, Points Behind, Playoff Ranking all come
   straight from the league's sheet; nothing recalculated where the snapshot
   is authoritative). My Team = real team B3 with the §3 custom-name demo.
   Plain JS, no packages. */

/* ============ STANDINGS (real 2026 snapshot) ============ */
// Groups the REAL standings snapshot by division, ordered by total points
// with the sheet's own Points Behind values (ties in points keep the
// snapshot order — no invented tie-break is applied, §19 TBD).
function standingsRows() {
  const out = {};
  ["A", "B", "C", "D"].forEach(d => { out[d] = []; });
  DB.teams.forEach(t => {
    out[t.div].push({
      team: t.id, name: teamName(t.id), pts: t.pts,
      lastWeek: t.lastWeek, behind: t.behind, rank: t.rank
    });
  });
  ["A", "B", "C", "D"].forEach(d => {
    out[d].sort((x, y) => {
      // Primary sort: total points DESC (spec §2). Ties: keep the snapshot
      // sheet order — tie-breaking is TBD (§19), not simulated here.
      if (y.pts !== x.pts) return y.pts - x.pts;
      return 0;
    });
  });
  return [{ div: "A", teams: out.A }, { div: "B", teams: out.B }, { div: "C", teams: out.C }, { div: "D", teams: out.D }];
}

function fmtHalf(v) {
  const r = Math.round(v * 2) / 2;
  return r % 1 === 0 ? String(r) : r.toFixed(1);
}

function standingsTableHTML(div) {
  let h = '<table class="gridtbl standtbl"><tr><th>#</th><th>Team</th><th>Total Pts</th><th>Last Week</th><th>Behind</th></tr>';
  div.teams.forEach((t, idx) => {
    const mine = t.team === MY_TEAM;
    h += '<tr' + (mine ? ' class="tr-mine"' : "") + '>';
    h += "<td>" + (idx + 1) + "</td>";
    h += "<td><b>" + esc(teamName(t.team)) + "</b></td>";
    h += "<td>" + fmtHalf(t.pts) + "</td>";
    h += "<td>" + fmtHalf(t.lastWeek) + "</td>";
    h += "<td>" + (t.behind === 0 ? "&mdash;" : fmtHalf(t.behind)) + "</td>";
    h += "</tr>";
  });
  h += "</table>";
  return h;
}

function viewStandings() {
  let h = dBar("Standings &middot; 2026 season (real league snapshot)", "ordered by total points (§2)");
  h += '<div class="banner-unoff2">' + iconS("info") + " Standings below are the REAL 2026 league table imported from the standings sheet — total points, Last Week, Points Behind and Playoff Ranking are as recorded; they update when demo-night matches are submitted.</div>";

  const divs = standingsRows();
  h += '<section class="card"><h2 class="sec-t">Division Standings</h2>';
  divs.forEach(d => {
    h += '<div class="standdiv"><h3 class="div-t">Division ' + d.div + "</h3>";
    h += standingsTableHTML(d);
    h += "</div>";
  });
  h += '<div class="proto-note">Division standings are ranked by total points (spec &sect;2); Points Behind is the league sheet&rsquo;s own value. Equal-points tie-breaking is not yet defined and stays TBD (spec &sect;19) &mdash; the snapshot order is shown.</div>';
  h += "</section>";

  /* Playoff Picture (spec §2) — the real snapshot's own Playoff Ranking
     values are authoritative wherever equal points make the seed
     unknowable from rules alone (TBD §19). */
  h += '<section class="card"><h2 class="sec-t">Playoff Picture &middot; 2026 (16-team / 4-division format)</h2>';
  h += '<div class="proto-note">Seed numbers are the league standings sheet&rsquo;s real 2026 Playoff Ranking (not recomputed): division winners take seeds 1&ndash;4 by total points; seeds 5&ndash;12 advance to play-in night; seeds 13&ndash;16 miss the main playoffs (spec &sect;2). Play-in pairings / winner-to-bye assignment are TBD (&sect;19), not simulated.</div>';
  const all = [];
  divs.forEach(d => d.teams.forEach(t => all.push(t)));
  all.sort((a, b) => a.rank - b.rank);
  const band = (lo, hi, title, cls) => {
    let b = '<div class="seedband ' + cls + '"><div class="seedband-t">' + title + "</div>";
    all.filter(t => t.rank >= lo && t.rank <= hi).forEach(t => {
      const mine = t.team === MY_TEAM;
      b += '<div class="seedrow' + (mine ? " seedrow-mine" : "") + '"><span class="seednum">#' + t.rank + "</span><span>" + esc(teamName(t.team)) + ' <span class="mut">(Div ' + DB.divisions[t.team] + (mine ? " &middot; <b>your team</b>" : "") + ")</span></span><span class=\"seedpts\">" + fmtHalf(t.pts) + " pts</span></div>";
    });
    b += "</div>";
    return b;
  };
  h += band(1, 4, "Seeds 1&ndash;4 &middot; Division winners &middot; play-in BYE", "s14");
  h += band(5, 12, "Seeds 5&ndash;12 &middot; playoffs / play-in night", "s512");
  h += band(13, 16, "Seeds 13&ndash;16 &middot; miss the main playoffs", "s1316");
  h += '<div class="proto-note">Playoff ranking shown from the 2026 snapshot; demo-night submissions can change points, and the picture re-derives only what the defined rules determine (division winners &rarr; seeds 1&ndash;4 by points; everyone else ranked by points). Snapshot Playoff Ranking remains the tie display until a real tie-break rule is adopted (spec &sect;19).</div>';
  h += "</section>";

  setMain(h);
}

/* ============ MY TEAM (real team B3 + §3 naming demo) ============ */
function teamNamingState(t) {
  return DB.freeNameUsed[t] ? "needs-approval" : "free";
}

function viewTeam() {
  const t = MY_TEAM;
  const mode = teamNamingState(t);
  const pending = DB.nameRequests.filter(r => r.team === t)[0];
  const currentName = teamName(t);
  const teammates = DB.members.filter(x => x.team === t);
  const hdcpOf = n => hdcpLabelFor(n.name, t);
  let h = "";

  h += dBar("My Team &middot; real 2026 roster");
  h += '<section class="card"><h2 class="sec-t">Team B3 &mdash; Carter + Kristen</h2>';
  h += '<div class="namerow"><div>';
  h += '<div class="proto-note">Internal team number: <b>7</b> (stable reference, spec &sect;3) &mdash; sheet code <b>B3</b>.</div>';
  h += '<div class="proto-note">Display name shown league-wide: <b>B3</b> (the league sheet uses code labels; the optional custom-name flow below is the spec &sect;3 demo).</div>';
  h += '<div class="proto-note">Whether a team&rsquo;s identity carries across seasons is TBD (spec &sect;3/&sect;19) &mdash; not simulated.</div>';
  h += "</div></div>";

  h += '<h3 class="div-t">Roster</h3>';
  h += '<table class="gridtbl"><tr><th>Member</th><th>Handicap (2026 sheet, normalized)</th><th>Role</th></tr>';
  teammates.forEach(me => {
    const isMe = me.name === MY_NAME;
    h += "<tr><td><b>" + esc(me.name) + "</b>" + (isMe ? ' <span class="youmark">you</span>' : "") + "</td><td>" + hdcpOf(me) + "</td><td>" + me.role + "</td></tr>";
  });
  h += "</table>";
  h += '<div class="proto-note">Sheet &minus;3 (Carter) is a PLUS handicap &mdash; conventional notation +3. Sheet +6 (Kristen) means Kristen receives 6 strokes. Roster is the real 2026 snapshot; account rules in spec &sect;14.</div>';

  h += '<h3 class="div-t">Custom Team Name</h3>';
  h += '<div class="banner-unoff2">The naming privilege belongs to the <b>team</b> as a whole, not separately to each teammate (spec &sect;3). Either B3 member may act for the team here.</div>';
  if (pending) {
    h += '<div class="banner-warn">Pending administrator approval: &ldquo;' + esc(pending.requested) + '&rdquo; &mdash; the current name stays active until then (spec &sect;3).</div>';
  }
  if (mode === "free") {
    h += '<p class="note">Team B3 has not chosen a custom name yet &mdash; the <b>first</b> naming needs no administrator approval (spec &sect;3).</p>';
    h += '<div class="nameform"><input id="freenm" maxlength="30" placeholder="Choose team name&hellip;">';
    h += '<button class="cta" id="freebtn">Set Name (free)</button></div>';
  } else {
    h += '<p class="note">The free naming has been used. Further changes are <b>pending requests</b> requiring administrator approval; the current name remains displayed meanwhile.</p>';
    h += '<div class="nameform"><input id="reqnm" maxlength="30" placeholder="Request new team name&hellip;">';
    h += '<button class="cta" id="reqbtn">Request Change</button></div>';
  }

  h += '<h3 class="div-t">Name History</h3>';
  h += '<table class="gridtbl"><tr><th>When</th><th>Event</th></tr>';
  const hist = DB.nameHistory[t].slice().reverse();
  if (!hist.length) h += '<tr><td colspan="2" class="mut">No custom-name history yet (code "B3" used so far).</td></tr>';
  hist.forEach(x => {
    h += '<tr><td>W' + x.week + "</td><td>" + esc(x.text) + "</td></tr>";
  });
  h += "</table></section>";

  setMain(h);
  const fb = qs$("#freebtn");
  if (fb) fb.on("click", () => {
    const v = qs$("#freenm").el.value.trim();
    if (!v) { toast("Enter a custom name first."); return; }
    DB.teamNames[MY_TEAM] = v;
    DB.freeNameUsed[MY_TEAM] = true;
    DB.nameHistory[MY_TEAM].push({ week: 7, text: 'Initial custom name set (free, team-level): "' + v + '"' });
    saveDB();
    toast("Team name set &mdash; no admin approval needed (first naming).");
    rerenderSame();
  });
  const rb = qs$("#reqbtn");
  if (rb) rb.on("click", () => {
    const v = qs$("#reqnm").el.value.trim();
    if (!v) { toast("Enter the requested name first."); return; }
    DB.nameRequests.push({ id: "r2", team: MY_TEAM, requested: v, week: 7 });
    DB.nameHistory[MY_TEAM].push({ week: 7, text: 'Change to "' + v + '" requested (pending admin approval)' });
    saveDB();
    toast("Request sent to administrator (prototype: local, sample approval flow).");
    rerenderSame();
  });
}