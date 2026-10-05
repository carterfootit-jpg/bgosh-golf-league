/* B'gosh Golf League — Prototype 4 UI controller.
   Mobile-first plain JS. No packages, no backend. localStorage is the only
   storage. Carter (Team B3, id 7, Player role) is the logged-in example; a
   clearly separated Admin demo covers §15/§16/§10/§11/§17. Standings and
   rosters are the REAL 2026 league snapshot; tonight's scores and the
   handicap sandbox are Prototype Demo Data. TBD spec rules are NOT simulated. */

/* ---------- tiny DOM mini-API ---------- */
function qs$(s) {
  const el = document.querySelector(s);
  const obj = el ? { el: el, on: (ev, fn) => el.addEventListener(ev, fn) } : null;
  return obj;
}
function qsa$(s) {
  const list = Array.from(document.querySelectorAll(s));
  list.forEach(el => { el.on = (ev, fn) => el.addEventListener(ev, fn); });
  return list;
}

const MY_NAME = "Carter";                 // real 2026 golfer (B3 sheet name; no surname invented)
const MY_TEAM = 7;                        // internal id of sheet team "B3"
const MY_TEAM_LABEL = "B3";
const MY_MATCH_ID = "m3";
const WEEK = "Tonight (prototype demo night)";
const STORE_KEY = "bgosh_proto4_state_v1";
const DRAFT_KEY = "bgosh_proto4_draft_v1";
const TEE_KEY = "bgosh_proto4_tee_v1";

let DB;
let sel = { tab: "home", date: "tonight", hole: 0, match: MY_MATCH_ID, entry: [] };
const $ = s => document.querySelector(s);

function store() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && d.version === DEFAULT_DB.version) {
        return d;
      }
    }
  } catch (e) {}
  return null;
}
function saveDB() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch (e) {}
}

/* ---------- helpers ---------- */
function esc(s) {
  return String(s).replace(/[&<>"']/g, cn => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[cn]));
}
/* Display a receive-space handicap to the golfer: plus golfers (who GIVE
   strokes) are the ONLY ones shown with a sign (conventional golf notation,
   spec §7 example "Carter +2"). Receivers and scratch show a bare number.
   h == null → em dash (caller renders Not Established separately). */
function fmtHdcp(h) { return h == null ? "&ndash;" : (h < 0 ? "+" + (-h) : String(h)); }
function hdcpLabelFor(name, teamId) {
  const t = DB.teams.find(x => x.id === teamId);
  const g = t && t.golfers.find(x => x.name === name);
  // Imported 2026 Playing Handicap snapshot (normalized from the sheet).
  return g && g.hdcp ? fmtHdcp(g.hdcp.receive) : "&ndash;";
}
function provisionalTag() { return ' <span class="tag provisional">PROVISIONAL</span>'; }
function fmtHalf(v) {
  const r = Math.round(v * 2) / 2;
  return r % 1 === 0 ? String(r) : r.toFixed(1);
}
function toast(msg) {
  const t = $("#toast");
  t.innerHTML = msg;
  t.classList.add("show");
  clearTimeout(toast._tm);
  toast._tm = setTimeout(() => t.classList.remove("show"), 3000);
}
function iconS(name) {
  if (name === "pin") return '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>';
  if (name === "pencil") return '<svg class="ic" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12h8M8 16h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  if (name === "eye") return '<svg class="ic" viewBox="0 0 24 24"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>';
  if (name === "chart") return '<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="11" width="4" height="9" fill="currentColor"/><rect x="10" y="6" width="4" height="14" fill="currentColor"/><rect x="17" y="3" width="4" height="17" fill="currentColor"/></svg>';
  if (name === "check") return '<svg class="ic" viewBox="0 0 24 24"><path d="M4 12l5 6L20 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if (name === "home") return '<svg class="ic" viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  if (name === "key") return '<svg class="ic" viewBox="0 0 24 24"><circle cx="8" cy="15" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 12L20 3M17 6l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  if (name === "user") return '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  if (name === "mail") return '<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 7l9 6 9-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  if (name === "warn") return '<svg class="ic" viewBox="0 0 24 24"><path d="M12 3L2 21h20z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 9v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.5" r="1.2" fill="currentColor"/></svg>';
  if (name === "info") return '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16.5" r="1.2" fill="currentColor"/></svg>';
  return "";
}
function statusChipHTML(m) {
  if (m.status === "final") return '<span class="chip chip-final">FINAL</span>';
  if (m.status === "not_started") return '<span class="chip chip-ns">NOT STARTED</span>';
  const thru = m.scores.filter(r => r.every(v => v != null)).length;
  if (thru > 0) return '<span class="chip chip-pr">THRU ' + thru + " &middot; UNOFFICIAL</span>";
  return '<span class="chip chip-pr">IN PROGRESS &middot; UNOFFICIAL</span>';
}
const curStatusChip = statusChipHTML;
const chipHTML = statusChipHTML;

/* ---------- navigation ---------- */
function go(tab, param) {
  sel.tab = tab;
  sel.top = 0; // navigation shows the new screen from its top
  if (param !== undefined) sel.match = param;
  if (tab === "handicap") { sel.hcpDetail = sel.hcpDetail || "real"; }
  render();
}
/* Same-screen re-render (a +/− tap, an admin edit): remember the scroll y and
   restore it after redrawing, so the page never jumps to the top (spec §12). */
function rerenderSame() {
  sel.top = window.pageYOffset;
  render();
}
function setMain(html) { $("#main").innerHTML = html; }
function render() {
  renderHeader();
  if (sel.tab === "home") viewHome();
  else if (sel.tab === "scoreentry") viewScoreEntry();
  else if (sel.tab === "review") viewReview();
  else if (sel.tab === "scorelist") viewScoreList();
  else if (sel.tab === "match") viewMatch();
  else if (sel.tab === "standings") viewStandings();
  else if (sel.tab === "team") viewTeam();
  else if (sel.tab === "handicap") viewHandicap();
  else if (sel.tab === "admin") viewAdmin();
  else viewHome();
  window.scrollTo(0, sel.top || 0);
  sel.top = 0;
}
function renderHeader() {
  const tabs = [
    ["home", "Tonight"],
    ["scorelist", "Scores"],
    ["standings", "Standings"],
    ["team", "My Team"],
    ["handicap", "Handicap"],
    ["admin", "Admin Demo"]
  ];
  let h = '<div class="head-in"><div><div class="brand">B&rsquo;gosh <span class="brand-golf">Golf League</span></div>';
  h += '<div class="proto-note">Prototype 4 &middot; 2026 snapshot + demo data</div></div>';
  h += '<div class="who">' + esc(MY_NAME) + " &middot; B3 <span class=\"chip chip-role\">Player</span></div></div>";
  h += '<nav class="tabs">';
  tabs.forEach(t => {
    h += '<button class="tab' + (sel.tab === t[0] || (sel.tab === "scoreentry" && t[0] === "home") || (sel.tab === "review" && t[0] === "home") ? " on" : "") + '" data-tab="' + t[0] + '">' + t[1] + "</button>";
  });
  h += "</nav>";
  $("#hdr").innerHTML = h;
  qsa$(".tab").forEach(b => b.on("click", () => {
    if (b.dataset.tab === "home") { sel.match = MY_MATCH_ID; }
    go(b.dataset.tab);
  }));
}
function dBar(label, note) {
  return '<div class="datebar"><span class="datebar-t">' + label + "</span>" + (note ? '<span class="mut small">' + note + "</span>" : "") + "</div>";
}

/* ---------- shared match widgets ---------- */
function curMatch() { return DB.matches.filter(x => x.id === sel.match)[0]; }
function isMine(m) { return m.a === MY_TEAM || m.b === MY_TEAM; }
const canEditMatch = isMine;

function scorecardTable(m, c) {
  let h = '<div class="scrollx"><table class="gridtbl sctbl"><tr><th>Hole</th><th>Par</th><th>Rank</th>';
  m.golfers.forEach(g => { h += "<th>" + esc(g.name.split(" ")[0]) + "</th>"; });
  h += "<th>Team Net</th></tr>";
  for (let hi = 0; hi < 9; hi++) {
    h += "<tr><td><b>H" + (hi + 1) + "</b></td><td>" + CH()[hi].par + "</td><td>" + CH()[hi].rank + "</td>";
    let t0 = 0, t1 = 0, have = true;
    for (let gi = 0; gi < 4; gi++) {
      const raw = m.scores[hi][gi];
      if (raw === null) { h += '<td class="mut">&ndash;</td>'; have = false; continue; }
      const st = strokesOn(CH()[hi].rank, c.strokes[gi]);
      const net = raw - st;
      if (gi < 2) t0 += net; else t1 += net;
      h += "<td>" + strokeCell(raw, st) + "</td>";
    }
    if (have) h += "<td>" + t0 + " / " + t1 + "</td>"; else h += '<td class="mut">&ndash;</td>';
    h += "</tr>";
  }
  h += "</table></div>";
  h += '<p class="note">Cell = gross, or gross/net when a stroke(s) was received (two strokes: 5&sol;3). Team net hole = SUM of partners; ties split 0.5.</p>';
  return h;
}

/* ---------- draft score helpers ---------- */
// Load persisted draft entry (9 rows x 4 golfers of string values) if present.
function loadEntryDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (Array.isArray(d) && d.length === 9 && d[0].length === 4) return d;
  } catch (e) {}
  return null;
}

function preloadEntry(matchId) {
  if (matchId) sel.match = matchId;
  sel.hole = 0;
  const m = curMatch();
  const saved = loadEntryDraft();
  if (saved) {
    sel.entry = saved.map(row => row.slice());
    // Mirror any locally persisted draft into the live match (kept unofficial).
    for (let i = 0; i < 9; i++) for (let g = 0; g < 4; g++) {
      const v = sel.entry[i][g];
      m.scores[i][g] = v === "" ? null : +v;
    }
  } else {
    sel.entry = m.scores.map(r => r.map(v => (v === null ? "" : String(v))));
  }
}
function draftSet(i, gi, v) {
  sel.entry[i][gi] = v;
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(sel.entry)); } catch (e) {}
}
// Live "Running: X – Y" update while typing (no re-render: keeps input focus).
// The entry grid itself stays put; only the bar is touched.
function updateRunningBar(m) {
  const tmp = JSON.parse(JSON.stringify(m));
  const i = sel.hole;
  for (let g = 0; g < 4; g++) {
    const v = sel.entry[i][g];
    tmp.scores[i][g] = v === "" ? null : +v;
  }
  const c = matchCalc(tmp);
  const bar = $("#runningbar");
  if (bar) bar.innerHTML = "Running: <b>" + fmtHalf(c.pts[0]) + "</b> &ndash; <b>" + fmtHalf(c.pts[1]) + "</b> " + statusChipHTML(tmp) + (c.provisional ? provisionalTag() : "");
}
function commit() {
  const m = curMatch();
  for (let i = 0; i < 9; i++) {
    for (let g = 0; g < 4; g++) {
      const v = sel.entry[i][g];
      m.scores[i][g] = v === "" ? null : +v;
    }
  }
  m.status = "in_progress"; // draft stays unofficial until explicit submit (spec §13)
  DB.draftDirty = true;
  saveDB();
}

/* ---------- boot ---------- */
function loadTee() {
  try {
    const raw = localStorage.getItem(TEE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length === 8 && arr.every(id => typeof id === "string" && findMatch(id))) return arr;
    }
  } catch (e) {}
  return null;
}
function saveTee(arr) {
  try { localStorage.setItem(TEE_KEY, JSON.stringify(arr)); } catch (e) {}
}

DB = store() || JSON.parse(JSON.stringify(DEFAULT_DB));

window.addEventListener("DOMContentLoaded", () => {
  DB = store() || JSON.parse(JSON.stringify(DEFAULT_DB));
  // If a persisted draft exists, restore it into sel.entry for seamless editing.
  const saved = loadEntryDraft();
  if (saved) sel.entry = saved.map(row => row.slice());
  render();
  // NOTE: qs$ (not $) — $ returns a raw element without .on; binding with $
  // silently failed in Prototype 2, leaving the reset button dead.
  const st = qs$("#storereset");
  st.on("click", () => {
    try {
      localStorage.removeItem(STORE_KEY);
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(TEE_KEY);
    } catch (e) {}
    DB = JSON.parse(JSON.stringify(DEFAULT_DB));
    sel = { tab: "home", date: "tonight", hole: 0, match: MY_MATCH_ID, entry: [], stick: null, top: undefined };
    render();
    toast("Prototype data reset to 2026 defaults.");
  });
});