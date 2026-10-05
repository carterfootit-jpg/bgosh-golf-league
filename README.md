# B'gosh Golf League — Prototype 4

A visual/interactive prototype only — **not** the production application. Plain HTML/CSS/JS, no packages, no backend, no accounts, no email sending. localStorage is the only storage.

Prototype 4 replaces Prototype 3's invented/sample teams and players with the **real 2026 B'gosh league dataset** (16 teams, 32 golfers, 4 divisions) imported from the league's official standings sheet, and prototypes the **finalized §7 handicap pipeline** end-to-end.

## View it

Open `index.html` directly in a browser (the simplest way):

```
xdg-open bgosh-golf-league/prototype/index.html
```

Or serve the folder (equivalent result):

```
python3 -m http.server 8080 --directory bgosh-golf-league/prototype
```

then visit http://localhost:8080.

To run the automated regression checks (44 checks implementing the task's §18 verification list), serve the folder and open `test.html`.

## Real 2026 data included

- All 16 teams with their real sheet codes (A1–A4, B1–B4, C1–C4, D1–D4), real rosters, total points, Last Week, Points Behind and Playoff Ranking exactly as recorded on the league's standings sheet. Standings screens use this snapshot directly.
- Division standings remain ordered by total points. Playoff Picture shows the real snapshot values.
- Carter (Team **B3**, with Kristen) is the logged-in example player throughout — Tonight's Matchup, score entry, My Team, the Handicap tab.

### Handicap sign normalization (important)

The league's historical standings sheet writes handicaps in an **inverted sign convention**: `sheet −3` for Carter means a **plus golfer** (conventional golf notation **+3** — a golfer who gives strokes), `sheet −1` means +1 (Nick B, Jackson, Matt F), `sheet 0` is scratch, and positive values like Kristen's `sheet 6` mean the golfer receives 6 strokes.

- The sheet values are imported **verbatim** into `SHEET_2026` in `data.js`.
- `normalizeSheetHandicap()` converts each value ONCE into an unambiguous internal representation — **receive-space** numbers: positive = receives that many strokes, negative = a plus golfer who gives.
- Display code (`fmtHdcp`) only formats; it never re-negates: plus golfers render `+3`, receivers and scratch render bare numbers.
- These imported values are the final league handicaps actually in use for match strokes at snapshot time — the prototype does **not** pretend to have calculated them, and does **not** fabricate Handicap Index / Score Differential history for the real golfers (none was provided).
- Calculated handicap examples live in a clearly separate sandbox (`DB.hcpDemo`) and are labeled **Prototype Demo Data** everywhere they appear.

## What's inside

| File | Purpose |
|---|---|
| `index.html` | Page shell (header, tab nav, toast) + Prototype 4 labeling |
| `data.js` | Real 2026 sheet import + sign normalization, season course config sample (holes/par/ranks/slope/rating/allowance), demo-night pairings/scores, members, demo handicap sandbox fixtures |
| `handicap.js` | **NEW** — the §7 pipeline as separate functions: selection progression, Adjusted Gross Score (Par+5 / Net Double Bogey), Score Differential (PCC 0), differential selection, Handicap Index, Course Handicap, allowance, Playing Handicap, match netting; establishment walkthrough |
| `logic.js` | Match scoring: hole points, team net (SUM), overall points, 20-point totals, gross/net cell notation; reads the handicap engine's match netting |
| `views-a.js` | Tonight (home + tee order), Score Entry, Match Review/Submit, Tonight's Scores, match detail (+ actual-vs-adjusted inspection) |
| `views-b.js` | Standings (real 4-division snapshot, Last Week, Points Behind, Playoff Picture), My Team (real B3 roster + §3 naming demo) |
| `views-c.js` | Admin demo: tee-order editor, Season Course Configuration incl. §7 season settings, handicap-sandbox launcher, email previews (nothing sent), user management, submitted-match correction + audit, name requests |
| `views-d.js` | **NEW** — Handicap tab: real 2026 snapshot table; §7 engine sandbox with auditable round-by-round record; establishment walkthrough; season settings summary |
| `app.js` | Navigation (6 tabs), header, draft persistence, scroll-position preservation, reset |
| `checks.js` | Automated regression checks loaded by `test.html` (44 checks) |
| `styles.css` | Mobile-first styling; Prototype 4 additions (provisional tags, handicap steps, AGS disclosure, season-settings inputs) |

## The finalized §7 handicap engine (all stages functional)

Each stage is a separate function; the Handicap tab's sandbox renders every intermediate value so the calculation is auditable:

1. **Eligible rounds / progression** (`selectionPlan`) — 0–2: none; 3–4 → lowest 1; 5–6 → lowest 2; 7–8 → lowest 3; 9–10 → lowest 4; >10 → most-recent-10 window, lowest 4 (oldest drops each new round).
2. **Adjusted Gross Score** (`adjustedGrossScore`) — before establishment the cap is Par+5; after establishment Net Double Bogey (par + 2 + strokes received on that hole from the **full Course Handicap**, never the reduced Playing Handicap). Actual gross scores are never modified — kept intact for match scoring/display; the distinction is inspectable on the match-detail screen and in the sandbox table.
3. **Score Differential** (`scoreDifferential`) — (113/Slope) × (AGS − Course Rating), nearest tenth. **PCC is fixed at 0** by league rule; no PCC engine exists.
4. **Differential selection** (`selectDifferentials`) — lowest-first per the progression, window per stage 1.
5. **Handicap Index** — arithmetic mean of the selected differentials, nearest tenth (half-even on exact .05 ties, USGA convention).
6. **Course Handicap** (`courseHandicapFrom`) — (HI/2 rounded to tenth) × (Slope/113) + (CR − 9-hole Par); result kept to the nearest tenth; precision preserved through the chain. Plus handicaps supported (negative receive-space).
7. **Handicap Allowance** — season configuration (Admin → Season Course Configuration).
8. **Playing Handicap** (`playingHandicapFrom`) — CH × allowance, whole strokes, **.5 rounded upward** for both signs.
9. **Match netting / stroke allocation** (`matchNetting`, `strokesOn`) — all four PHs compared; lowest plays from 0; others receive the difference (plus/negative PHs work correctly); strokes distributed by configured hole rank 1–9, cycling above 9 and 18.

Not implemented (B'gosh has not adopted it): USGA best-8-of-20, WHS caps, exceptional-score adjustments, and any PCC engine.

## Provisional rounds + third-round establishment (§7)

- Golfers with 0–2 eligible rounds have **no** Handicap Index — never displayed as 0.0. The UI shows **"Handicap: Not Established"** and PROVISIONAL tags; such golfers receive zero handicap strokes (the B'gosh pre-establishment rule), and the prototype never manufactures them a PH nor infers they are the match's lowest.
- Matches involving an unestablished golfer stay PROVISIONAL/UNOFFICIAL even after submission.
- On the demo golfer, `establishmentWalkthrough()` (real JS logic, run on loadable demo rounds) demonstrates: completing round 3 establishes the initial HI (lowest 1 of 3), the earlier provisional matches are **retroactively recalculated** (strokes/net scores/team points change), an audit line explains the change, and the matches can then become official.
- This is a prototype demonstration on demo data; the underlying calculations are the same functions the app uses.

## Prototype 3 features preserved

- Mobile-first navigation (6 tabs), Tonight's Scores statuses (FINAL / THRU-n · UNOFFICIAL / NOT STARTED), draft score entry, Match Review with explicit Submit Match, 20-point validation, completed-match detail with team-totals-only primary result and gross / gross-net cells, Points Behind, Playoff Picture, Tee Order + admin editor, admin corrections/audit, User Management (passwords never viewable), email previews (nothing sent), season course configuration, permission concepts, localStorage behavior + footer reset, scroll-preserving score adjustment (verified at 500px scroll).
- Score entry: the old arbitrary 1–12 maximum is **gone** (any gross score ≥ 1 can be entered; the blank + initializes to the hole's par; after that ± adjust normally).

## Not simulated / demo-data labeling (spec TBDs)

- Tonight's schedule, pairings, tee times and all match scores are **Prototype Demo Data** (no 2026 schedule or results were provided). The real standings snapshot only reflects demo-night changes when a demo match is submitted.
- Historical handicap derivation for the real 32 golfers: not provided, not fabricated — the Handicap tab states this explicitly on the real-golfer view.
- Tie-breaking for equal points (§2/§19): snapshot order shown; nothing invented.
- Play-in pairings / winner-to-bye assignment (§2/§19): not simulated.
- Additional substitute rules (§9), postponed-match handicap rules (§11), team identity across seasons (§3/§19): TBD, not simulated.
- Weekly recap "top" selection rules and email trigger/timing (§17/§19): previews carry the TBD labels; no demo email recipients are shown (real members' contact info never existed in the prototype).
- No backend, no database, no email sending, no accounts.

## Regression checks

`test.html` runs 44 automated checks (`checks.js`) covering: dataset integrity (16 teams once, 32 golfer names, 4×4 divisions, exact sheet values), sign normalization (+3/+1 display and receive semantics), import-vs-calculated separation, the full selection progression (3/4/5/6/7/8/9/10/11+ rounds, rolling window), Par+5 and Net-Double-Bogey caps (full CH, not PH), PCC = 0, rounding (tenth, half-even; HI/2; .5-up PH), match netting with plus/provisional golfers (including the real B3-vs-B4 example), stroke cycling above 9/18, no-max score entry, blank + par initialization, the 20-point invariant, provisional display strings, establishment walkthrough, season par consistency and prototype-v4 storage keys.

## Notes

- State (entered scores, tee order, course/season handicap configuration, team name changes, corrections, sandbox round history) persists in browser `localStorage`; **"Reset sample data"** in the footer restores the pristine Prototype 4 state.
- No accounts, no network calls, no package installs; loading the page is the whole setup.