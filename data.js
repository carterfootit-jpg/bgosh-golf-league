/* B'gosh Golf League — Prototype 4 DATA
   Real 2026 dataset: 16 teams, 32 golfers, 4 divisions, taken from the
   league's official standings sheet ("These values came from the league's
   real standings sheet"). Everything invented for the demo (tonight's demo
   scores, demo squads, demo accounts) is explicitly labeled Prototype Demo
   Data below and in the UI.
   Rules follow docs/LEAGUE_SPEC.md; TBD rules are NOT simulated. */

// (Identity consts MY_NAME/MY_TEAM/MY_MATCH_ID/WEEK and STORE_KEY are owned by app.js.)

// Course accessor: the SINGLE source of course data for scoring and every UI.
// Administrators configure it in the Admin demo (Season Course Configuration,
// spec §10); score entry, stroke allocation and scorecards all read DB.course.
function CH() { return DB.course; }

/* ============================================================
   1. REAL 2026 STANDINGS SHEET (authoritative import)
   ============================================================
   The sheet writes handicaps in an INVERTED sign convention:
     sheet "-3" = a PLUS golfer (conventional +3, gives strokes)
     sheet "-1" = plus golfer (gives 1 stroke)
     sheet  "0" = scratch
     sheet  "3" = receives 3 strokes, sheet "6" = receives 6
   Rows below keep the sheet values VERBATIM in `sheet`. The numeric
   normalization to the canonical internal representation happens ONCE,
   in normalizeSheetHandicap(), right below — UI code never re-negates. */
const SHEET_2026 = [
  // code, golfer1, sheetHdcp, golfer2, sheetHdcp, pts, lastWeek, behind, playoffRank
  ['A4', 'Scott',     0, 'Joe Abitz',  0, 156,   11,   0,  3],
  ['A2', 'Bryce',     0, 'Dylan',      0, 140,    7,  16,  6],
  ['A1', 'Kyle',      0, 'Andrew',     0, 140,    9,  16,  8],
  ['A3', 'Nick B',   -1, 'Marc M',     1, 124.5, 13, 31.5, 14],

  ['B3', 'Carter',   -3, 'Kristen',    6, 171.5, 11,   0,  1],
  ['B1', 'Megan',     0, 'Jackson',   -1, 148,   12, 23.5,  5],
  ['B2', 'John',      0, 'Tague',      5, 135.5,  9,  36, 10],
  ['B4', 'Matt F',   -1, 'Brayden',    3, 130,    8, 41.5, 11],

  ['C3', 'Zack',      1, 'Ben Jir',    3, 144.5, 11.5, 0,  4],
  ['C2', 'Drew',      1, 'Joe Ashley', 5, 140,   8.5, 4.5,  7],
  ['C4', 'Michael',   6, 'Parker',     2, 122.5, 12.5, 22, 15],
  ['C1', 'Paul',      2, 'Jerry',      4, 122,   7.5, 22.5, 16],

  ['D3', 'Jordan',    7, 'Walt',      12, 162,   17.5, 0,  2],
  ['D4', 'Nick J',    6, 'Shea',      10, 137.5, 14.5, 24.5, 9],
  ['D2', 'Marc J',    7, 'Kylee',      8, 129.5, 2.5, 32.5, 12],
  ['D1', 'Matt C',    4, 'Ken',        8, 125,   5.5,  37, 13]
];

/* Canonical internal representation (UNAMBIGUOUS, spec §7 semantics):
   `{ receive: N }` — N > 0: golfer RECEIVES N strokes (sheet "6" → +6).
                      N < 0: golfer is a PLUS golfer who GIVES |N| strokes
                             (sheet "-3" → receive -3, displayed "+3").
                      N = 0: scratch.
   The sheet's numeric value maps to receive-space with the same magnitude —
   the sheet's minus sign IS the give-direction; only the DISPLAY convention
   differs (sheet prints minus, golf prints plus, see fmtHdcp). */
function normalizeSheetHandicap(sheetVal) {
  if (typeof sheetVal !== 'number' || isNaN(sheetVal)) {
    throw new Error('Invalid sheet handicap: ' + sheetVal);
  }
  return { receive: sheetVal };
}

// Team identities: internal id (stable reference, spec §3) derived EXPLICITLY
// from the sheet code — Div letter × sheet number (A1=1…A4=4, B1=5…B3=7,
// C3=11, D2=14, …) so internal ids carry the real league meaning, not the
// sheet's row order. `golfers` = the real roster with normalized handicaps.
const TEAMS_2026 = SHEET_2026.map(row => {
  const code = row[0];
  const id = (code.charCodeAt(0) - 65) * 4 + Number(code.charAt(1));
  return {
    id: id,
    code: code,
    div: code.charAt(0),
    golfers: [
      { name: row[1], sheet: row[2], hdcp: normalizeSheetHandicap(row[2]) },
      { name: row[3], sheet: row[4], hdcp: normalizeSheetHandicap(row[4]) }
    ],
    pts: row[5], lastWeek: row[6], behind: row[7], rank: row[8]
  };
});

function realGolfer(id, slot) {
  const t = TEAMS_2026.find(x => x.id === id);
  return t.golfers[slot];
}
function realPh(id, slot) { return realGolfer(id, slot).hdcp.receive; }

/* ============================================================
   2. Season course configuration (sample values — Prototype Demo Data)
   ============================================================
   The 9-hole side the league plays. Hole numbers/pars/stroke ranks mirror
   the sample scorecard; Slope/Course Rating/Allowance are sample season
   settings for the §7 pipeline (the league's real ones were not provided). */
const SEASON_COURSE_SAMPLE = {
  holes: [
    { h: 1, par: 4, rank: 5 },
    { h: 2, par: 5, rank: 1 },
    { h: 3, par: 4, rank: 7 },
    { h: 4, par: 3, rank: 8 },
    { h: 5, par: 4, rank: 3 },
    { h: 6, par: 4, rank: 2 },
    { h: 7, par: 3, rank: 9 },
    { h: 8, par: 5, rank: 4 },
    { h: 9, par: 4, rank: 6 }
  ],
  slope: 113,        // 9-hole Slope Rating (sample)
  cr: 33.8,          // 9-hole Course Rating (sample)
  par: 36,           // total 9-hole par (derived from the hole list below; verified in checks)
  allowance: 85      // Handicap Allowance % (sample; league's real setting not provided)
};

/* ============================================================
   3. Tonight's demo matches (Prototype Demo Data)
   ============================================================
   8 demo matches pair teams within their real divisions (1v4 / 2v3 per
   division), but NO 2026 schedule was provided — the pairings, tee slots
   and all scores below are prototype demo data, never real history.
   Golfer order per match: [teamA g1, teamA g2, teamB g1, teamB g2].
   `ph` = the golfer's imported 2026 Playing Handicap in receive-space
   (the value in actual use for match strokes at snapshot time, §7). */
const TONIGHT_PAIRINGS = [
  { id: 'm1', a: 4, b: 3,  status: 'final', tee: '5:00 PM' },        // A4 vs A3
  { id: 'm2', a: 2, b: 1,  status: 'not_started', tee: '5:00 PM' },  // A2 vs A1
  { id: 'm3', a: 7, b: 8,  status: 'in_progress', tee: '5:00 PM' },  // B3 vs B4 (Carter's)
  { id: 'm4', a: 5, b: 6,  status: 'not_started', tee: '5:00 PM' },  // B1 vs B2
  { id: 'm5', a: 11, b: 9, status: 'final', tee: '5:00 PM' },        // C3 vs C1
  { id: 'm6', a: 10, b: 12, status: 'in_progress', tee: '5:45 PM' }, // C2 vs C4
  { id: 'm7', a: 15, b: 13, status: 'not_started', tee: '6:00 PM' }, // D3 vs D1
  { id: 'm8', a: 16, b: 14, status: 'not_started', tee: '6:15 PM' }  // D4 vs D2
];

// Demo gross scores (hole 1..9; null = not entered yet). All demo data.
const demoRows = rows => {
  // rows = per-golfer 9-hole gross arrays [g1, g2, g3, g4]; invert to the
  // hole-major 9x4 DB format (one row per hole, 4 golfer values per hole).
  const holes = [];
  for (let h = 0; h < 9; h++) holes.push([rows[0][h], rows[1][h], rows[2][h], rows[3][h]]);
  return holes;
};
const TONIGHT_SCORES = {
  m1: demoRows([
    [4,5,4,3,4,4,3,5,5],
    [5,5,4,3,5,4,3,5,4],
    [4,5,4,3,4,4,3,6,4],
    [4,6,5,3,5,5,3,6,5]
  ]),
  m3: demoRows([   // partially entered (holes 1-5)
    [4,5,4,3,5,null,null,null,null],
    [6,6,5,3,6,null,null,null,null],
    [5,5,4,3,4,null,null,null,null],
    [7,6,5,3,5,null,null,null,null]
  ]),
  m5: demoRows([
    [5,6,4,3,4,5,3,5,5],
    [4,5,5,3,5,4,4,6,6],
    [5,6,4,4,5,5,3,6,6],
    [4,5,4,3,5,4,3,5,5]
  ]),
  m6: demoRows([   // partially entered (holes 1-4)
    [5,5,4,3,null,null,null,null,null],
    [5,6,4,4,null,null,null,null,null],
    [5,6,5,3,null,null,null,null,null],
    [4,5,4,3,null,null,null,null,null]
  ])
};

/* ============================================================
   4. Handicap-engine demo fixtures (Prototype Demo Data — NOT the
      real league; used only in the Handicap tab's sandbox so the §7
      engine can be tested/inspected without touching real golfers).
   ============================================================
   Demo Opponent Squad: fixed PHs (receive-space: "+2" plus golfer = -2)
   and fixed demo scores — the squad is constant across rounds, so every
   change the engine makes is attributable to the demo golfer alone. */
const HCP_DEMO_OPPONENTS = [
  { name: 'Demo Opponent 1', ph: -2, scores: [4,5,4,3,4,4,3,5,4] }, // plus golfer (gives 2)
  { name: 'Demo Opponent 2', ph: 4,  scores: [5,6,5,3,5,5,4,6,5] }, // receives 4
  { name: 'Demo Opponent 3', ph: 9,  scores: [6,7,5,4,5,5,4,7,6] }  // receives 9
];

/* Canned demo rounds — ONE GOLFER'S gross score per round (per hole, in
   hole order 1..9). Round 1-2: the pre-establishment provisional arc;
   round 3: establishment (lowest 1 of 3); round 4: the Net-Double-Bogey
   post-establishment AGS example; rounds 5+ ride the selection
   progression (1/2/3/4 lowest diffs, rolling last-10 window). */
const HCP_DEMO_CANNED_ROUNDS = [
  [5,7,5,4,6,6,5,13,7],  // r1: blow-up hole 8 (par 5, gross 13) — Par+5 cap
  [5,6,5,4,6,5,4,6,11],  // r2: hole 9 (par 4, gross 11) — Par+5 cap
  [5,6,5,4,5,5,4,6,6],   // r3: completes establishment (lowest 1 of 3)
  [4,9,4,4,8,4,4,5,7],   // r4: Net Double Bogey cap demo (holes 2 & 5)
  [5,6,5,3,5,5,3,6,7],   // r5
  [5,6,4,4,5,5,3,6,6],   // r6
  [5,5,4,3,5,5,3,6,6],   // r7
  [5,6,5,3,4,5,3,6,6],   // r8
  [4,6,4,3,5,4,3,6,4],   // r9
  [4,5,4,3,4,4,3,6,4],   // r10
  [4,6,4,3,5,4,3,6,5],   // r11: rolls round 1 out of the last-10 window
  [5,6,4,4,5,5,3,6,5]    // r12
];

/* ============================================================
   5. Assembled default DB (version 4)
   ============================================================ */
const TEE_SLOTS = ['5:00 PM', '5:00 PM', '5:00 PM', '5:00 PM', '5:00 PM', '5:45 PM', '6:00 PM', '6:15 PM'];

const DEFAULT_DB = {
  version: 4,

  // Season course configuration (spec §10): holes + slope/rating/allowance.
  course: SEASON_COURSE_SAMPLE.holes.map(x => ({ h: x.h, par: x.par, rank: x.rank })),
  season: { slope: SEASON_COURSE_SAMPLE.slope, cr: SEASON_COURSE_SAMPLE.cr, par: SEASON_COURSE_SAMPLE.par, allowance: SEASON_COURSE_SAMPLE.allowance },

  // Real 2026 team table + rosters (single source of truth for names/hdcp).
  teams: TEAMS_2026.map(t => ({
    id: t.id, code: t.code, div: t.div,
    golfers: t.golfers.map(g => ({ name: g.name, sheet: g.sheet, hdcp: { receive: g.hdcp.receive } })),
    pts: t.pts, lastWeek: t.lastWeek, behind: t.behind, rank: t.rank
  })),
  // divisions by team id (kept for lookups); standings group by div letter.
  divisions: (() => { const d = {}; TEAMS_2026.forEach(t => { d[t.id] = t.div; }); return d; })(),

  // Real 2026 standings snapshot (as recorded on the league's sheet):
  // pts = total season points, lastWeek, behind, rank = playoff rank.
  standingsSnapshot: (() => {
    const s = {};
    TEAMS_2026.forEach(t => { s[t.id] = { pts: t.pts, lastWeek: t.lastWeek, behind: t.behind, rank: t.rank }; });
    return s;
  })(),

  // Custom display names: the real league shows sheet codes ("B3"), so none
  // have custom names in the snapshot. The custom-name demo (spec §3) lives
  // on My Team: naming for Team B3 starts free.
  teamNames: {},
  freeNameUsed: (() => { const f = {}; TEAMS_2026.forEach(t => { f[t.id] = t.id !== 7; }); return f; })(),
  nameRequests: [],
  nameHistory: { 7: [] },

  // League-night tee order (spec §11) — demo order, admin-editable.
  teeOrder: TONIGHT_PAIRINGS.map(p => p.id),

  // Administrator-entered hole events (demo).
  events: [
    { hole: 3, label: 'Closest to the pin' },
    { hole: 5, label: 'Longest drive' },
    { hole: 9, label: 'Hole-in-one pot' }
  ],

  // Tonight's 8 demo matches (golfers carry their imported PH).
  matches: TONIGHT_PAIRINGS.map(p => {
    return {
      id: p.id, a: p.a, b: p.b, status: p.status, tee: p.tee,
      golfers: [
        { name: realGolfer(p.a, 0).name, team: p.a, ph: realPh(p.a, 0), src: 'import' },
        { name: realGolfer(p.a, 1).name, team: p.a, ph: realPh(p.a, 1), src: 'import' },
        { name: realGolfer(p.b, 0).name, team: p.b, ph: realPh(p.b, 0), src: 'import' },
        { name: realGolfer(p.b, 1).name, team: p.b, ph: realPh(p.b, 1), src: 'import' }
      ],
      scores: (TONIGHT_SCORES[p.id] ||
        [null,null,null,null,null,null,null,null,null].map(() => [null, null, null, null]))
        .map(r => r.slice())
    };
  }),

  // Admin > User Management (spec §15): the 32 real golfers' accounts plus
  // clearly-labeled demo rows exercising Invited/Inactive states.
  members: TEAMS_2026.map(t => t.golfers.map(g => ({ name: g.name, team: t.id, role: 'Player', status: 'Active' })))
    .flat()
    .concat([
      { name: 'League Admin (demo account)', team: null, role: 'Admin', status: 'Active' },
      { name: 'Demo Invited Player (example)', team: null, role: 'Player', status: 'Invited' },
      { name: 'Demo Former Player (example)', team: null, role: 'Player', status: 'Inactive' }
    ]),
  inviteCounter: 0,

  // Audit trail (spec §16/§10/§3). Seeded with one explicitly-labeled demo
  // example; corrections/config changes append live entries.
  audit: [
    { week: 1, actor: 'League Admin (demo)', text: 'PROTOTYPE DEMO example of the audit format — real corrections made with the tool below appear here the same way, dated "Tonight" (spec §16).' }
  ],

  // Matches touched by an admin correction (display badge). Live only.
  corrected: {},

  // Handicap-engine sandbox (Prototype Demo Data; see demo fixtures above).
  // `rounds` starts empty; the Handicap tab seeds them via "Load demo rounds".
  hcpDemo: {
    golferName: 'Demo Golfer',
    note: 'Prototype demo data — not a real 2026 league golfer; handicap history did not exist for testing, so it is demo.',
    opponents: HCP_DEMO_OPPONENTS,
    canned: HCP_DEMO_CANNED_ROUNDS.map(r => r.slice()),
    cannedNext: 0,
    rounds: [],
    established: false,      // establishment walk-through pressed at round 3
    audit: []                // establishment/retro-recalc audit (demo, §7/§18)
  }
};