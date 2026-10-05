/* B'gosh Golf League — Prototype 4 UI (part 3): Admin demo area
   (spec §15, §16, §10, §11, §17). Passwords are never displayed or
   simulated; account access is handled through invitations and password
   resets only. Emails are PREVIEWS ONLY — nothing is sent, no email service. */

// Editing buffer for the submitted-match correction tool (spec §16):
// corrDraft holds 9 rows x 4 golfers of string gross scores; corrMatchId is
// the submitted match being edited. The real match is untouched until Save.
let corrDraft = [];
let corrMatchId = "";
// Course-config editing buffer (saved only via "Save Course Configuration").
let courseDraft = [];
// Tee-order editing buffer.
let teeDraft = [];

function viewAdmin() {
  let h = dBar("Admin Demo Area &middot; clearly separated from player tools");
  h += '<div class="banner-warn">You are entering an <b>administrative demo</b>. In the real app this area is role-restricted; in this prototype it is open but visually separated. Team/standings data is the real 2026 snapshot; match scores and member examples are Prototype Demo Data.</div>';
  h += '<section class="card"><h2 class="sec-t">Admin Dashboard</h2>';

  /* ---- Tee Order editing (spec §11) ---- */
  h += '<div class="adm-sec" id="tee-sec"><h3 class="div-t">Tee Order — Tonight (prototype demo night)</h3>';
  h += '<div class="proto-note">Administrators set/edit the tee order for the league night (spec &sect;11). Players see it read-only on Tonight. Prototype-only local state; the noon league-day email preview at the bottom uses it.</div>';
  h += '<div id="teebox"></div></div>';

  /* ---- Course Configuration (spec §10) ---- */
  h += '<div class="adm-sec" id="course-sec"><h3 class="div-t">Season Course Configuration</h3>';
  h += '<div class="proto-note">The 9-hole season settings (spec &sect;10): hole number, par, handicap/stroke rank per hole &mdash; plus the season&rsquo;s 9-hole <b>Slope Rating</b>, <b>Course Rating</b> and <b>Handicap Allowance</b> used by the &sect;7 handicap pipeline. <b>Season-long:</b> established for the season, changed only going forward.</div>';
  h += '<div class="banner-unoff2">Sample values &mdash; the league&rsquo;s real course ratings/allowance were not provided (Prototype Demo Data). Editing applies going forward; matches already played keep the configuration they were calculated under (spec &sect;10/&sect;18; here: the audit trail is the record).</div>';
  h += '<div id="coursebox"></div></div>';

  /* ---- Handicap engine demo (spec §7) ---- */
  h += '<div class="adm-sec"><h3 class="div-t">Handicap Engine &middot; §7 walkthrough sandbox</h3>';
  h += '<div class="proto-note">Runs the finalized &sect;7 pipeline end-to-end on demo data (a demo golfer + demo opponents). See the player-side <b>Handicap</b> tab for the auditable round-by-round record.</div>';
  h += '<button class="b2" id="sandboxbtn">Open Handicap walkthrough (Handicap tab)</button>';
  h += '<div class="mut small">Prototype demo only — no real golfer&rsquo;s handicap history exists in the 2026 snapshot, so nothing here is tied to a real player.</div></div>';

  /* ---- Email previews (spec §17: future feature; nothing is sent) ---- */
  h += '<div class="adm-sec" id="mail-sec"><h3 class="div-t">Email Previews &middot; prototype only — nothing is sent</h3>';
  h += '<div class="banner-unoff2">' + iconS("mail") + " Email is a <b>future feature</b> (spec &sect;17). Local preview of the automated emails would communicate; the sending trigger/timing is TBD (spec &sect;19) and no email service exists.</div>";
  h += '<div id="mailbox"></div></div>';

  h += '<div class="adm-sec"><h3 class="div-t">User Management</h3>';
  h += '<div class="proto-note">Accounts, team association, roles, Active/Inactive. Passwords are never viewable &mdash; invitations &amp; password resets only (spec &sect;15). The 32 league golfers carry real roster names; roles/status of demo rows are sample data.</div>';
  h += '<div class="row2"><button class="cta" id="invbtn">' + iconS("mail") + " Invite User</button></div>";
  h += '<div class="adm-scroll"><table class="gridtbl"><tr><th>Member</th><th>Team</th><th>Role</th><th>Status</th><th></th></tr>';
  DB.members.forEach((meb, idx) => {
    h += "<tr><td><b>" + esc(meb.name) + "</b></td><td>" + (meb.team ? teamName(meb.team) : "&mdash;") + "</td><td>" + meb.role + "</td><td>" + meb.status + "</td>";
    h += '<td class="actcell">';
    h += '<button class="minibtn" data-user="' + idx + '" data-act="reset">' + iconS("key") + " Reset pw</button> ";
    h += '<button class="minibtn" data-user="' + idx + '" data-act="role">' + (meb.role === "Admin" ? "Make Player" : "Make Admin") + "</button> ";
    h += '<button class="minibtn" data-user="' + idx + '" data-act="status">' + (meb.status === "Active" ? "Set Inactive" : "Set Active") + "</button>";
    h += '<div class="assoc"><button class="minibtn" data-user="' + idx + '" data-act="assoc">' + iconS("user") + (meb.team ? " Move team" : " Associate team") + "</button></div>";
    h += "</td></tr>";
  });
  h += "</table></div>";

  h += '<div class="adm-sec"><h3 class="div-t">Team-Name Requests</h3>';
  if (!DB.nameRequests.length) h += '<div class="mut">No pending requests.</div>';
  DB.nameRequests.forEach(r => {
    h += '<div class="reqrow"><div><b>' + esc(teamName(r.team)) + '</b> requests &ldquo;' + esc(r.requested) + "&rdquo;</div>";
    h += '<div><button class="minibtn" data-req="' + r.id + '" data-act="yes">Approve</button> <button class="minibtn" data-req="' + r.id + '" data-act="no">Reject</button></div></div>';
  });
  h += "</div>";

  h += '<div class="adm-sec"><h3 class="div-t">Submitted-Match Correction</h3>';
  h += '<div class="proto-note">Edits the underlying gross scores of an already-submitted match; nets/points/standings recalculate automatically (spec &sect;16). Correcting a match whose points are currently included in the real standings snapshot adjusts its totals going forward (demo).</div>';
  h += '<select id="selmatch" class="inpsel">';
  DB.matches.filter(mm => mm.status === "final").forEach(mm => {
    h += '<option value="' + mm.id + '">' + esc(teamName(mm.a)) + " vs " + esc(teamName(mm.b)) + "</option>";
  });
  h += "</select>";
  h += '<div id="corrbox"></div></div>';

  h += '<div class="adm-sec"><h3 class="div-t">Correction Audit History</h3>';
  h += '<div class="adm-scroll"><table class="gridtbl"><tr><th>When</th><th>Entry</th></tr>';
  DB.audit.forEach(a => { h += "<tr><td>W" + a.week + "</td><td><b>" + esc(a.actor) + ":</b> " + esc(a.text) + "</td></tr>"; });
  h += "</table></div></div>";

  h += "</section>";

  setMain(h);
  qs$("#sandboxbtn").on("click", () => { sel.hcpDetail = "sandbox"; go("handicap"); });
  qs$("#invbtn").on("click", () => {
    const nm = "Demo Invited Member " + (DB.inviteCounter + 1);
    DB.inviteCounter++;
    DB.members.push({ name: nm, team: null, role: "Player", status: "Invited" });
    saveDB();
    toast("Invitation sent to " + nm + " (prototype: simulated).");
    rerenderSame();
  });
  qsa$(".minibtn").forEach(b => b.on("click", () => {
    const idx = b.dataset.user !== undefined ? +b.dataset.user : null;
    const act = b.dataset.act;
    if (b.dataset.req) {
      resolveNameRequest(b.dataset.req, b.dataset.act === "yes");
    } else if (act === "reset") toast("Password-reset email sent (simulated; passwords are never viewable).");
    else if (act === "role") {
      DB.members[idx].role = DB.members[idx].role === "Admin" ? "Player" : "Admin";
      saveDB(); rerenderSame();
    } else if (act === "status") {
      DB.members[idx].status = DB.members[idx].status === "Active" ? "Inactive" : "Active";
      saveDB(); rerenderSame();
    } else if (act === "assoc") {
      const meb = DB.members[idx];
      const t = parseInt(prompt("Associate " + meb.name + " with which team number? (1-16, empty = none)", meb.team || ""), 10);
      if (isNaN(t)) { meb.team = null; }
      else if (t >= 1 && t <= 16) meb.team = t;
      saveDB(); rerenderSame();
    }
  }));
  qs$("#selmatch").on("change", refreshCorrBox);
  refreshCorrBox();
  renderTeeBox();
  renderCourseBox();
  renderMailBox();
}

// Approve/Reject a pending team-name request (spec §3: history preserved,
// existing name stays until an approval, rejections also audited).
function resolveNameRequest(id, approve) {
  const r = DB.nameRequests.filter(x => x.id === id)[0];
  if (!r) return;
  if (approve) {
    DB.teamNames[r.team] = r.requested;
    DB.nameHistory[r.team].push({ week: 7, text: 'Admin approval: name changed to "' + r.requested + '"' });
    toast("Approved: " + teamName(r.team) + " is now \"" + r.requested + "\" (sample).");
  } else {
    DB.nameHistory[r.team].push({ week: 7, text: 'Admin rejection: "' + r.requested + '" refused; existing name kept.' });
    toast("Rejected: \u201c" + r.requested + "\u201d (existing name kept).");
  }
  DB.nameRequests = DB.nameRequests.filter(x => x.id !== id);
  saveDB(); rerenderSame();
}

function refreshCorrBox() {
  const fallback = DB.matches.filter(mm => mm.status === "final")[0];
  const chosen = qs$("#selmatch") ? qs$("#selmatch").el.value : (fallback ? fallback.id : "");
  const m = findMatch(chosen) || fallback;
  if (!m) { $("#corrbox").innerHTML = '<div class="mut">No submitted matches to correct.</div>'; return; }
  const c = matchCalc(m);
  corrDraft = m.scores.map(r => r.map(v => (v === null ? "" : String(v))));
  corrMatchId = m.id;
  let h = '<div class="mut small">Editing: ' + esc(teamName(m.a)) + " vs " + esc(teamName(m.b)) + "</div>";
  h += '<table class="gridtbl"><tr><th>Golfer</th><th>Gross per hole (editable)</th></tr>';
  m.golfers.forEach((g, gi) => {
    h += "<tr><td>" + esc(g.name) + "</td><td>";
    for (let hi = 0; hi < 9; hi++) {
      h += '<input class="corrin" data-h="' + hi + '" data-g="' + gi + '" inputmode="numeric" value="' + esc(corrDraft[hi][gi]) + '" style="width:3em">';
    }
    h += "</td></tr>";
  });
  h += "</table>";
  h += '<div class="corrline" id="corrlive">Recalculated: <b>' + fmtHalf(c.pts[0]) + "</b>&ndash;<b>" + fmtHalf(c.pts[1]) + "</b> &middot; totals <span id=\"corrtotal\">" + fmtHalf(c.pts[0] + c.pts[1]) + "</span>/20</div>";
  h += '<button class="cta" id="savecorr">' + iconS("check") + " Save Correction</button>";
  $("#corrbox").innerHTML = h;
  qsa$(".corrin").forEach(inp => {
    const hi = +inp.dataset.h, gi = +inp.dataset.g;
    inp.addEventListener("input", () => {
      const v = inp.value.replace(/[^0-9]/g, "");
      inp.value = v;
      corrDraft[hi][gi] = v;
      recalcCorrection();
    });
  });
  qs$("#savecorr").on("click", () => commitCorrection(corrMatchId));
}

function recalcCorrection() {
  const m = findMatch(corrMatchId);
  if (!m) return;
  const c = matchCalc({ golfers: m.golfers, scores: corrDraft.map(r => r.map(v => (v === "" ? null : +v))) });
  const lbl = $("#corrlive");
  if (lbl) lbl.innerHTML = "Recalculated: <b>" + fmtHalf(c.pts[0]) + "</b>&ndash;<b>" + fmtHalf(c.pts[1]) + "</b> &middot; totals <span id=\"corrtotal\">" + fmtHalf(c.pts[0] + c.pts[1]) + "</span>/20";
}

// Writes the edited buffer into the submitted match, marks it corrected, and
// appends an audit entry (spec §16: audit trail, no silent overwrites).
function commitCorrection(matchId) {
  const m = findMatch(matchId);
  if (!m) return;
  m.scores = corrDraft.map(r => r.map(v => (v === "" ? null : +v)));
  const c = matchCalc(m);
  if (!c.complete) { toast("All 9 holes need scores before the correction can be saved."); return; }
  DB.corrected[m.id] = true;
  const txt = "Corrected a submitted match: " + teamName(m.a) + " vs " + teamName(m.b) + " (prototype demo night) — underlying scores edited; match now " + fmtHalf(c.pts[0]) + "\u2013" + fmtHalf(c.pts[1]) + "; standings updated.";
  DB.audit.push({ week: "night", actor: "League Admin (demo)", text: txt });
  saveDB();
  toast("Correction saved; nets, points and standings recalculated (audit entry added).");
  rerenderSame();
}

/* ================= TEE ORDER (admin editing, spec §11) ================= */
function renderTeeBox() {
  const order = currentTeeOrder();
  teeDraft = order.slice();
  let h = "";
  h += '<div class="teelist" id="teelist">';
  order.forEach((mid, idx) => {
    const mm = findMatch(mid);
    h += '<div class="teeeditrow" data-idx="' + idx + '">';
    h += '<span class="teenum">' + (idx + 1) + "</span>";
    h += '<span class="teemain"><b>' + esc(teamName(mm.a)) + " vs " + esc(teamName(mm.b)) + "</b>";
    h += '<span class="mut small"> ' + esc(TEE_SLOTS[idx]) + "</span></span>";
    h += '<span class="tee-actions"><button class="minibtn" data-move="up" data-idx="' + idx + '" ' + (idx === 0 ? "disabled" : "") + ">&uarr;</button>";
    h += '<button class="minibtn" data-move="down" data-idx="' + idx + '" ' + (idx === 7 ? "disabled" : "") + ">&darr;</button>";
    h += "</span></div>";
  });
  h += "</div>";
  h += '<div class="row2"><button class="cta" id="savetee">' + iconS("check") + " Save Tee Order</button></div>";
  $("#teebox").innerHTML = h;
  qsa$(".teeeditrow [data-move]").forEach(b => b.on("click", () => {
    const idx = +b.dataset.idx;
    const dir = b.dataset.move === "up" ? -1 : +1;
    const order = currentTeeOrder();
    const j = idx + dir;
    if (j < 0 || j > 7) return;
    const arr = order.slice();
    const t = arr[idx]; arr[idx] = arr[j]; arr[j] = t;
    saveTee(arr);
    teeDraft = arr;
    rerenderSame();
  }));
  qs$("#savetee").on("click", () => {
    saveTee(teeDraft);
    toast("Tee order saved for tonight (prototype-local; the noon email is preview-only, nothing sent).");
    rerenderSame();
  });
}

/* ============ SEASON COURSE CONFIGURATION (spec §10 + §7 settings) ============ */
function renderCourseBox() {
  const c = DB.course, s = DB.season;
  courseDraft = c.map(x => ({ h: x.h, par: x.par, rank: x.rank }));
  seasonDraft = { slope: s.slope, cr: s.cr, allowance: s.allowance };
  let h = '<div class="proto-note">Nine holes &middot; total par <b>' + coursePar() + "</b></div>";
  h += '<div class="adm-scroll"><table class="gridtbl coursetbl"><tr><th>Hole</th><th>Par</th><th>Stroke rank (1 first)</th></tr>';
  for (let i = 0; i < 9; i++) {
    h += '<tr><td><b>' + courseDraft[i].h + "</b></td>";
    h += '<td><input class="corrin" data-cf="par" data-i="' + i + '" inputmode="numeric" value="' + courseDraft[i].par + '"></td>';
    h += '<td><input class="corrin" data-cf="rank" data-i="' + i + '" inputmode="numeric" value="' + courseDraft[i].rank + '"></td>';
    h += "</tr>";
  }
  h += "</table></div>";
  h += '<div class="mut small">Ranks must remain a permutation of 1&ndash;9 (validation on save).</div>';
  h += '<h4 class="div-t">Season handicap settings (spec &sect;7/&sect;10)</h4>';
  h += '<div class="hcard">';
  h += '<label class="hfield"><span>9-hole Slope Rating</span><input id="cfg-slope" inputmode="numeric" value="' + seasonDraft.slope + '"></label>';
  h += '<label class="hfield"><span>9-hole Course Rating</span><input id="cfg-cr" inputmode="decimal" value="' + seasonDraft.cr + '"></label>';
  h += '<label class="hfield"><span>Handicap Allowance %</span><input id="cfg-allow" inputmode="numeric" value="' + seasonDraft.allowance + '"></label>';
  h += "</div>";
  h += '<div class="mut small">These are season configuration values (single set stored with the season — spec &sect;10). Slope/Rating feed the &sect;7 Score Differential and Course Handicap formulas; the Allowance feeds Playing Handicap.</div>';
  h += '<div class="row2"><button class="cta" id="savecourse">' + iconS("check") + " Save Course Configuration</button>";
  h += '<button class="b2" id="revertcourse">Revert</button></div>';
  $("#coursebox").innerHTML = h;
  qsa$(".corrin[data-cf]").forEach(inp => inp.addEventListener("input", () => {
    const i = +inp.dataset.i;
    courseDraft[i][inp.dataset.cf] = inp.value.replace(/[^0-9]/g, "");
  }));
  ["cfg-slope", "cfg-cr", "cfg-allow"].forEach(id => {
    const el = qs$("#" + id);
    if (el) el.on("input", () => {
      const v = el.el.value.replace(/[^0-9.]/g, "");
      el.el.value = v;
      seasonDraft[id === "cfg-slope" ? "slope" : id === "cfg-cr" ? "cr" : "allowance"] = v === "" ? 0 : parseFloat(v);
    });
  });
  qs$("#savecourse").on("click", saveCourseConfig);
  qs$("#revertcourse").on("click", () => { rerenderSame(); });
}
let seasonDraft = { slope: 113, cr: 33.8, allowance: 85 };

function saveCourseConfig() {
  const pars = courseDraft.map(x => parseInt(x.par, 10));
  const ranks = courseDraft.map(x => parseInt(x.rank, 10));
  if (pars.some(p => !p || p < 3 || p > 5)) { toast("Pars must be 3, 4 or 5."); return; }
  if (ranks.some(r => !r || r < 1 || r > 9)) { toast("Ranks must be 1-9."); return; }
  const sorted = ranks.slice().sort((a, b) => a - b);
  for (let i = 0; i < 9; i++) {
    if (sorted[i] !== i + 1) { toast("Error: ranks must be a permutation of 1-9."); return; }
  }
  const slope = parseFloat(seasonDraft.slope);
  const cr = parseFloat(seasonDraft.cr);
  const allow = parseFloat(seasonDraft.allowance);
  if (!(slope >= 55 && slope <= 155)) { toast("Slope Rating must be between 55 and 155 (USGA 9-hole bounds)."); return; }
  if (!(cr >= 20 && cr <= 45)) { toast("Course Rating must be between 20 and 45 (9-hole)."); return; }
  if (!(allow > 0 && allow <= 100)) { toast("Handicap Allowance must be > 0 and <= 100 %."); return; }
  const changed = courseDraft.some((x, i) => x.par !== DB.course[i].par || x.rank !== DB.course[i].rank) ||
    slope !== DB.season.slope || cr !== DB.season.cr || allow !== DB.season.allowance;
  if (!changed) { toast("No changes to save."); return; }
  DB.course = courseDraft.map((x, i) => ({ h: i + 1, par: pars[i], rank: ranks[i] }));
  DB.season = { slope: slope, cr: cr, par: pars.reduce((s, p) => s + p, 0), allowance: allow };
  DB.audit.push({ week: "night", actor: "League Admin (demo)", text: "Season Course Configuration updated going forward: " + DB.course.map(x => "H" + x.h + " par " + x.par + " rank " + x.rank).join(", ") + " — slope " + DB.season.slope + ", rating " + DB.season.cr + ", allowance " + DB.season.allowance + "%. (Season-long settings; matches already played keep the configuration they were calculated under.)" });
  saveDB();
  toast("Course configuration saved (goes forward; matches already played keep their config).");
  rerenderSame();
}

/* ================= EMAIL PREVIEWS (spec §17 — nothing is sent) ================= */
function renderMailBox() {
  const order = currentTeeOrder();
  let h = "";
  // League-day (noon) tee-order email: the only required content is the tee
  // order for that day; extra contents are not defined, so none are invented.
  h += '<div class="mailprev"><div class="mailhd"><b>Preview 1 — League-day tee order (auto at noon on league day &mdash; trigger TBD &sect;19)</b></div>';
  h += '<div class="mailmeta">To: all league members &middot; from: B&rsquo;gosh Golf League</div>';
  h += '<div class="mailbody"><p><b>Tee order for tonight (prototype demo night)</b></p><ol class="maillist">';
  order.forEach((mid, idx) => {
    const mm = findMatch(mid);
    h += "<li>" + esc(teamName(mm.a)) + " vs " + esc(teamName(mm.b)) + " &mdash; " + esc(TEE_SLOTS[idx]) + "</li>";
  });
  h += "</ol>";
  h += '<p class="mut small">Prototype preview &mdash; nothing is sent; no demo recipients are shown because the member accounts are real league golfers (their contact addresses were never provided). Additional required content for this email is not defined (spec &sect;17).</p></div></div>';

  // Weekly recap email: required content per spec §17. "Top" selection rules
  // and the exact sending trigger/timing are TBD (§19) — labeled, not invented.
  h += '<div class="mailprev"><div class="mailhd"><b>Preview 2 — Weekly recap (prototype; "top" selection rules &amp; send timing TBD &sect;19)</b></div>';
  h += '<div class="mailmeta">To: league members (demo)</div>';
  h += '<div class="mailbody"><p><b>Weekly recap — prototype demo night</b></p>';

  h += '<p class="mailsec-t">Top gross performances &middot; Prototype Demo Data (selection rule TBD)</p>';
  recapTopPerformances("gross").forEach(x => {
    h += '<div class="mailrow"><span>' + esc(x.name) + ' <span class="mut">(' + esc(x.teamLabel) + ")</span></span><b>" + x.value + "</b></div>";
  });

  h += '<p class="mailsec-t">Top net performances &middot; Prototype Demo Data (selection rule TBD)</p>';
  recapTopPerformances("net").forEach(x => {
    h += '<div class="mailrow"><span>' + esc(x.name) + ' <span class="mut">(' + esc(x.teamLabel) + ")</span></span><b>" + x.value + "</b></div>";
  });

  h += '<p class="mailsec-t">Standings (division leaders — real 2026 snapshot)</p>';
  standingsRows().forEach(d => {
    const t = d.teams[0];
    h += '<div class="mailrow"><span>Div ' + d.div + ": " + esc(t.name) + "</span><b>" + fmtHalf(t.pts) + " pts</b></div>";
  });

  h += '<p class="mailsec-t">Player handicaps (real 2026 snapshot — sheet values normalized)</p>';
  h += '<div class="mailcols">';
  const seenCount = { n: 0 };
  DB.teams.forEach(t => t.golfers.forEach(g => {
    seenCount.n++;
    h += '<div class="mailrow"><span>' + esc(g.name) + ' <span class="mut">(' + esc(t.code) + ")</span></span><b>" + fmtHdcp(g.hdcp.receive) + "</b></div>";
  }));
  h += "</div>";
  h += '<p class="mut small">' + seenCount.n + " golfers — handicaps as of the 2026 standings snapshot; no historical handicap-derivation data exists for these golfers (nothing fabricated). Prototype preview &mdash; nothing is sent.</p>";
  h += "</div></div>";

  $("#mailbox").innerHTML = h;
}

/* Demo "top performances" for the recap preview. The real selection rule is
   TBD (spec §19): the prototype shows a clearly-labeled demo only, from
   tonight's demo (not real) match scores. */
function recapTopPerformances(kind) {
  const rows = [];
  DB.matches.forEach(mm => mm.golfers.forEach((g, gi) => {
    const c = matchCalc(mm);
    const v = kind === "gross" ? c.gross[gi] : c.netT[gi];
    if (mm.scores.every(r => r[gi] !== null)) {
      rows.push({ name: g.name, teamLabel: teamName(g.team) + " \u00b7 " + (kind === "gross" ? "gross " : "net ") + v, value: v });
    }
  }));
  rows.sort((x, y) => x.value - y.value);
  return rows.slice(0, 3);
}