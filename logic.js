/* B'gosh Golf League — Prototype 4 (scoring/match logic only)
   Implements the confirmed scoring rules from docs/LEAGUE_SPEC.md:
   - §5 Hole scoring: 2 pts/hole = 1 lowest individual net + 1 lowest team net
     sum; ties split 0.5.
   - §6 Overall: 2 more pts (lowest individual 9-hole net, lowest combined team
     net); ties split. Completed match totals sum to 20 (§13 validation).
   - §8 Team net on a hole = SUM of the partners' net scores (not a shamble).
   - §10 Course: the season course configuration in DB.course is the single
     source for pars/ranks used here.
   Handicap stages live in handicap.js (the §7 engine). Match scoring reads:
   - golfer match strokes = matchNetting(golfers) (stage 9; Playing Handicaps
     netted against the lowest, plus PHs supported, provisional golfers get 0);
   - strokesOn(rank, n) for hole-level stroke allocation.
   Marked-TBD rules are NOT simulated. */

// Total par of the configured 9-hole course (spec §10).
function coursePar() {
  return CH().reduce((s, h) => s + h.par, 0);
}

// Match-relative strokes for the four golfers (stage 9 of the §7 pipeline,
// in handicap.js): lowest Playing Handicap plays from 0; provisional
// (unestablished) golfers get 0 per the B'gosh pre-establishment rule.
function nettingFor(m) {
  return matchNetting(m.golfers).map(x => x.strokes);
}

function provisionalGolfer(m, gi) {
  return matchNetting(m.golfers)[gi].provisional;
}

function matchCalc(m) {
  const strokes = nettingFor(m);
  const ind = [0, 0];      // hole points won per side
  const team = [0, 0];
  const indTot = [0, 0];   // 9-hole net totals per side
  const teamTot = [0, 0];
  const complete = m.scores.every(r => r.every(s => s !== null && s !== undefined && s !== ''));
  for (let i = 0; i < 9; i++) {
    const hole = CH()[i];
    const nets = [null, null, null, null];
    let have = true;
    for (let g = 0; g < 4; g++) {
      const raw = m.scores[i][g];
      if (raw == null) { have = false; continue; }
      nets[g] = raw - strokesOn(hole.rank, strokes[g]);
    }
    if (!have) continue;
    // Individual hole point: lowest net of the four golfers (1 pt), ties 0.5/0.5 (§5).
    const best = Math.min.apply(null, nets);
    const winners = [0, 1, 2, 3].filter(g => nets[g] === best);
    if (winners.length === 1) ind[winners[0] < 2 ? 0 : 1]++;
    else { ind[0] += 0.5; ind[1] += 0.5; }
    // Team net: SUM of partners' net scores (§8, explicitly not a shamble).
    const tn = [nets[0] + nets[1], nets[2] + nets[3]];
    if (tn[0] < tn[1]) team[0]++;
    else if (tn[1] < tn[0]) team[1]++;
    else { team[0] += 0.5; team[1] += 0.5; }
    for (let s = 0; s < 2; s++) {
      indTot[s] += nets[s] + nets[s + 2];
      teamTot[s] += tn[s];
    }
  }
  // Overall points (§6): +1 lowest individual 9-hole net total, +1 lowest team net total.
  const overall = [0, 0];
  if (complete) {
    if (indTot[0] < indTot[1]) overall[0]++;
    else if (indTot[1] < indTot[0]) overall[1]++;
    else { overall[0] += 0.5; overall[1] += 0.5; }
    if (teamTot[0] < teamTot[1]) overall[0]++;
    else if (teamTot[1] < teamTot[0]) overall[1]++;
    else { overall[0] += 0.5; overall[1] += 0.5; }
  }
  const pts = [ind[0] + team[0] + overall[0], ind[1] + team[1] + overall[1]];
  const gross = [0, 0, 0, 0];
  const netT = [0, 0, 0, 0];
  m.scores.forEach((r, i) => r.forEach((s, g) => {
    if (s != null) { gross[g] += s; netT[g] += (s - strokesOn(CH()[i].rank, strokes[g])); }
  }));
  return { strokes, pts, ind, team, overall, indTot, teamTot, gross, netT, complete, provisional: m.provisional || false };
}

/* Scorecard cell notation (spec §13 "Completed-scorecard/results display"):
   no strokes -> gross only ("5"); strokes applied -> compact "gross/net"
   ("5/4"; two strokes: 5 -> net 3 displays "5/3"). No letters, no
   calculation details — that is the whole notation. */
function strokeCell(raw, st) {
  return st > 0 ? raw + "/" + (raw - st) : String(raw);
}

// Team label: custom display name if set (spec §3), otherwise the REAL 2026
// sheet code (B3, A4, …) — ids derive from the code, so never synthesize one.
function teamName(n) {
  if (DB.teamNames[n]) return DB.teamNames[n];
  const t = DB.teams.find(x => x.id === n);
  return t ? t.code : ('Team ' + n);
}
function findMatch(id) { return DB.matches.find(m => m.id === id); }
// (canEditMatch lives in app.js — edit access is team-scoped per spec §14.)