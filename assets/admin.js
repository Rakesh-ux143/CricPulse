/* CrickScore Admin Engine
   Requires the project's existing Firebase initialization (db) and app.js.
   All live scoring writes to /match so the existing Live Match / Scorecard /
   OBS pages continue to update in real time.
*/
(function () {
  "use strict";

  const root = document.getElementById("adminRoot");
  const setupRoot = document.getElementById("setupRoot");
  const scoringRoot = document.getElementById("scoringRoot");

  const state = { match: null, teams: {}, schedules: {}, tab: "setup" };

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => "id_" + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  const overs = balls => `${Math.floor((balls || 0) / 6)}.${(balls || 0) % 6}`;
  const sr = (r,b) => b ? ((r/b)*100).toFixed(2) : "0.00";
  const econ = (r,b) => b ? ((r/(b/6))).toFixed(2) : "0.00";

  function dbReady() {
    if (typeof db === "undefined") {
      document.body.insertAdjacentHTML("afterbegin",
        '<div class="panel" style="margin:10px">Firebase database object <b>db</b> is missing. Keep your existing assets/firebase-config.js and assets/app.js.</div>');
      return false;
    }
    return true;
  }

  function tab(name) {
    state.tab = name;
    document.querySelectorAll(".admin-tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
    document.querySelectorAll(".admin-section").forEach(s => s.classList.toggle("active", s.id === "tab-" + name));
    if (name === "scoring") renderScoring();
  }

  document.querySelectorAll(".admin-tab").forEach(b => b.addEventListener("click", () => tab(b.dataset.tab)));

  async function loadTeams() {
    if (!dbReady()) return;
    db.ref("teams").on("value", snap => {
      state.teams = snap.val() || {};
      renderTeams();
      fillTeamSelects();
      renderSetup();
    });
  }

  function renderTeams() {
    const el = document.getElementById("teamList");
    const entries = Object.entries(state.teams);
    if (!entries.length) { el.innerHTML = '<span class="muted">No teams added yet.</span>'; return; }
    el.innerHTML = entries.map(([id,t]) => `
      <div class="card" style="margin-bottom:8px">
        <b>${esc(t.name)}</b> <span class="tag">${esc(t.short || "")}</span>
        <div class="muted2">${Object.keys(t.players || {}).length} players</div>
        <div>${Object.values(t.players || {}).map(p => `<span class="ball-chip">${esc(p.name)}</span>`).join("")}</div>
      </div>`).join("");
  }

  function fillTeamSelects() {
    ["schA","schB"].forEach(id => {
      const s = document.getElementById(id); if (!s) return;
      const old = s.value;
      s.innerHTML = '<option value="">Select team</option>' +
        Object.entries(state.teams).map(([id,t]) => `<option value="${id}">${esc(t.name)}</option>`).join("");
      if (old) s.value = old;
    });
  }

  document.getElementById("teamForm").addEventListener("submit", async e => {
    e.preventDefault();
    if (!dbReady()) return;
    const name = document.getElementById("teamName").value.trim();
    const short = document.getElementById("teamShort").value.trim().toUpperCase();
    const names = document.getElementById("teamPlayers").value.split(/\n/).map(x=>x.trim()).filter(Boolean);
    if (!name || names.length < 2) return alert("Enter a team name and at least 2 players.");
    const players = {};
    names.forEach(n => players[uid()] = { name:n });
    await db.ref("teams/" + uid()).set({ name, short, players, createdAt:Date.now() });
    e.target.reset();
    alert("Team saved.");
  });

  async function loadSchedules() {
    db.ref("schedules").on("value", snap => {
      state.schedules = snap.val() || {};
      renderSchedules();
    });
  }

  document.getElementById("scheduleForm").addEventListener("submit", async e => {
    e.preventDefault();
    const a = document.getElementById("schA").value, b = document.getElementById("schB").value;
    if (!a || !b || a === b) return alert("Select two different teams.");
    const id = uid();
    await db.ref("schedules/" + id).set({
      teamAId:a, teamBId:b,
      teamA:state.teams[a]?.name || "Team A",
      teamB:state.teams[b]?.name || "Team B",
      type:document.getElementById("schType").value,
      datetime:document.getElementById("schDate").value,
      venue:document.getElementById("schVenue").value.trim(),
      overs:Number(document.getElementById("schOvers").value || 20),
      status:"scheduled", createdAt:Date.now()
    });
    e.target.reset();
    document.getElementById("schOvers").value = 20;
  });

  function renderSchedules() {
    const el = document.getElementById("scheduleList");
    const list = Object.entries(state.schedules).sort((a,b)=>(a[1].datetime||"").localeCompare(b[1].datetime||""));
    if (!list.length) { el.innerHTML = '<span class="muted">No fixtures yet.</span>'; return; }
    el.innerHTML = `<table class="mini-table"><thead><tr><th>Match</th><th>Type</th><th>Date</th><th>Venue</th><th></th></tr></thead><tbody>` +
      list.map(([id,s]) => `<tr>
        <td>${esc(s.teamA)} vs ${esc(s.teamB)}</td><td>${esc(s.type)}</td>
        <td>${s.datetime ? new Date(s.datetime).toLocaleString() : "-"}</td><td>${esc(s.venue||"-")}</td>
        <td><button class="btn secondary" onclick="window.useSchedule('${id}')">Use</button>
        <button class="btn secondary danger" onclick="window.deleteSchedule('${id}')">Delete</button></td>
      </tr>`).join("") + "</tbody></table>";
  }

  window.deleteSchedule = id => db.ref("schedules/"+id).remove();
  window.useSchedule = id => {
    const s = state.schedules[id]; if (!s) return;
    const a = Object.entries(state.teams).find(([k])=>k===s.teamAId);
    const b = Object.entries(state.teams).find(([k])=>k===s.teamBId);
    if (!a || !b) return alert("Teams from this fixture are not available.");
    document.getElementById("setupA").value = a[0];
    document.getElementById("setupB").value = b[0];
    document.getElementById("setupOvers").value = s.overs || 20;
    document.getElementById("setupType").value = s.type || "League";
    tab("setup");
  };

  function teamOptions() {
    return '<option value="">Select team</option>' +
      Object.entries(state.teams).map(([id,t]) => `<option value="${id}">${esc(t.name)}</option>`).join("");
  }

  function renderSetup() {
    if (!setupRoot) return;
    const m = state.match;
    setupRoot.innerHTML = `
      <div class="form-grid three">
        <div><label>Batting team</label><select id="setupA">${teamOptions()}</select></div>
        <div><label>Bowling team</label><select id="setupB">${teamOptions()}</select></div>
        <div><label>Overs</label><input id="setupOvers" type="number" min="1" max="100" value="${m?.oversLimit || 20}"></div>
        <div><label>Match type</label><select id="setupType"><option>League</option><option>Qualifier</option><option>Eliminator</option><option>Semifinal</option><option>Final</option></select></div>
      </div>
      <div style="margin-top:12px">
        <button class="btn" id="startMatchBtn">${m && m.status === "live" ? "Restart Match" : "Start Match"}</button>
        ${m ? `<button class="btn secondary" id="continueBtn">Continue Current Match</button>` : ""}
      </div>
      ${m ? `<div class="card" style="margin-top:12px"><b>Current:</b> ${esc(m.teamA?.name)} vs ${esc(m.teamB?.name)} · ${m.score?.runs||0}/${m.score?.wickets||0} · ${overs(m.score?.balls||0)} ov · ${esc(m.status)}</div>` : ""}
    `;
    if (m?.teamA?.id) document.getElementById("setupA").value = m.teamA.id;
    if (m?.teamB?.id) document.getElementById("setupB").value = m.teamB.id;
    if (m?.matchType) document.getElementById("setupType").value = m.matchType;

    document.getElementById("startMatchBtn").onclick = startMatch;
    const c = document.getElementById("continueBtn"); if (c) c.onclick = () => tab("scoring");
  }

  function playersFor(teamId) {
    return Object.entries(state.teams[teamId]?.players || {}).map(([id,p]) => ({id,name:p.name}));
  }

  async function startMatch() {
    const aId = document.getElementById("setupA").value, bId = document.getElementById("setupB").value;
    const limit = Number(document.getElementById("setupOvers").value || 20);
    if (!aId || !bId || aId === bId) return alert("Choose two different teams.");
    const A = state.teams[aId], B = state.teams[bId];
    const ap = playersFor(aId), bp = playersFor(bId);
    if (ap.length < 2 || bp.length < 2) return alert("Each team needs at least 2 players.");
    const striker = ap[0], non = ap[1], bowler = bp[0];
    const battingCard = {};
    ap.forEach(p => battingCard[p.id] = {name:p.name,runs:0,balls:0,fours:0,sixes:0,out:false,howOut:"not out"});
    const bowlingCard = {};
    bp.forEach(p => bowlingCard[p.id] = {name:p.name,runs:0,balls:0,wickets:0});
    const match = {
      status:"live", createdAt:Date.now(), matchType:document.getElementById("setupType").value,
      oversLimit:limit, battingTeam:"teamA",
      teamA:{id:aId,name:A.name,players:A.players}, teamB:{id:bId,name:B.name,players:B.players},
      strikerId:striker.id, nonStrikerId:non.id, bowlerId:bowler.id,
      battingCard,bowlingCard, score:{runs:0,wickets:0,balls:0},
      history:[], currentOver:[], firstInnings:null, undoStack:[]
    };
    await db.ref("match").set(match);
    tab("scoring");
  }

  async function readMatch() {
    const snap = await db.ref("match").once("value");
    state.match = snap.val();
    renderSetup();
    if (state.tab === "scoring") renderScoring();
  }

  function renderScoring() {
    const m = state.match;
    if (!m || m.status !== "live") {
      scoringRoot.innerHTML = `<div class="panel"><span class="tag">No live match</span><p class="muted">Start a match from Match Setup.</p></div>`;
      return;
    }
    const s = m.battingCard?.[m.strikerId], n = m.battingCard?.[m.nonStrikerId], b = m.bowlingCard?.[m.bowlerId];
    const balls = (m.history || []).slice(-12).reverse().map(x=>`<span class="ball-chip">${esc(x)}</span>`).join("");
    const outCount = m.score.wickets || 0;
    scoringRoot.innerHTML = `
      <div class="panel scoreboard">
        <span class="tag live"><span class="live-dot"></span>LIVE</span>
        <div class="team-names" style="margin-top:8px">${esc(m[m.battingTeam]?.name||"Batting")}</div>
        <div class="score-big mono">${m.score.runs}/${m.score.wickets}</div>
        <div class="overs">Overs ${overs(m.score.balls)} · ${m.oversLimit} overs</div>
      </div>

      <div class="panel">
        <h3>Current Players</h3>
        <div class="grid-2">
          <div class="card"><div class="strike">${esc(s?.name||"-")} *</div><div class="mono">${s?.runs||0} (${s?.balls||0}) · SR ${sr(s?.runs||0,s?.balls||0)}</div></div>
          <div class="card"><div>${esc(n?.name||"-")}</div><div class="mono">${n?.runs||0} (${n?.balls||0}) · SR ${sr(n?.runs||0,n?.balls||0)}</div></div>
        </div>
        <div class="card" style="margin-top:8px"><div>Bowler: <b>${esc(b?.name||"-")}</b></div><div class="mono">${b?.wickets||0}-${b?.runs||0} (${overs(b?.balls||0)} ov) · Econ ${econ(b?.runs||0,b?.balls||0)}</div></div>
      </div>

      <div class="panel">
        <h3>Ball Outcome</h3>
        <div class="score-actions">
          ${[0,1,2,3,4,5,6].map(r=>`<button class="btn" onclick="window.scoreLegal(${r})">${r === 0 ? "DOT" : r}</button>`).join("")}
          <button class="btn secondary" onclick="window.scoreWide()">WIDE</button>
          <button class="btn secondary" onclick="window.scoreNoBall()">NO BALL</button>
          <button class="btn secondary" onclick="window.scoreBye()">BYE</button>
          <button class="btn secondary" onclick="window.scoreLegBye()">LEG BYE</button>
          <button class="btn danger" onclick="window.scoreWicket()">WICKET</button>
        </div>
      </div>

      <div class="panel">
        <h3>Where did the ball go?</h3>
        <div class="wide-grid">
          ${["Cover","Point","Mid-off","Mid-on","Straight","Square leg","Fine leg","Third man","Slip","Gully","Deep cover","Deep mid-wicket"].map(x=>`<button class="btn secondary" onclick="window.setArea('${x}')">${x}</button>`).join("")}
        </div>
        <div class="muted2" style="margin-top:8px">Selected area: <b id="selectedArea">${esc(m.selectedArea||"Not selected")}</b></div>
      </div>

      <div class="panel">
        <h3>Recent balls</h3><div>${balls || '<span class="muted">No balls yet</span>'}</div>
        <div style="margin-top:12px"><button class="btn secondary" onclick="window.undoBall()">↩ Revert Last Ball</button></div>
      </div>

      <div class="panel">
        <h3>Dismissal / Innings Control</h3>
        <div class="form-grid">
          <div><label>Dismissal</label><select id="dismissalType"><option>Bowled</option><option>Caught</option><option>LBW</option><option>Run Out</option><option>Stumped</option><option>Hit Wicket</option><option>Retired Hurt</option></select></div>
          <div><label>New batsman</label><select id="newBatter">${playersFor(m[m.battingTeam]?.id).filter(p=>!m.battingCard[p.id]?.out && p.id!==m.strikerId && p.id!==m.nonStrikerId).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></div>
        </div>
        <button class="btn danger" style="margin-top:10px" onclick="window.confirmWicketAndReplace()">Confirm Wicket + New Batter</button>
      </div>
    `;
  }

  async function pushSnapshot() {
    const m = state.match;
    m.undoStack = (m.undoStack || []).slice(-19).concat([JSON.stringify({
      battingCard:m.battingCard,bowlingCard:m.bowlingCard,score:m.score,strikerId:m.strikerId,nonStrikerId:m.nonStrikerId,
      bowlerId:m.bowlerId,history:m.history,currentOver:m.currentOver,selectedArea:m.selectedArea,status:m.status,
      battingTeam:m.battingTeam,firstInnings:m.firstInnings,target:m.target
    })]);
    await db.ref("match").set(m);
  }

  function rotate(m, runs) {
    if (runs % 2 === 1) [m.strikerId,m.nonStrikerId] = [m.nonStrikerId,m.strikerId];
  }

  function legalBall(m) {
    m.score.balls++;
    const b = m.bowlingCard[m.bowlerId]; if (b) b.balls++;
    if (m.score.balls % 6 === 0) [m.strikerId,m.nonStrikerId] = [m.nonStrikerId,m.strikerId];
  }

  function addHistory(m, text) {
    const area = m.selectedArea ? ` · ${m.selectedArea}` : "";
    m.history = (m.history || []).concat([text + area]);
    m.currentOver = (m.currentOver || []).concat([text]);
    if (m.currentOver.length >= 6) m.currentOver = [];
  }

  async function commit(mutator) {
    const snap = await db.ref("match").once("value");
    const m = snap.val();
    if (!m || m.status !== "live") return;
    state.match = m;
    mutator(m);
    await pushSnapshot();
    state.match = m;
    renderScoring();
  }

  window.setArea = async area => {
    await db.ref("match/selectedArea").set(area);
    state.match.selectedArea = area;
    renderScoring();
  };

  window.scoreLegal = r => commit(m => {
    const s=m.battingCard[m.strikerId], b=m.bowlingCard[m.bowlerId];
    s.runs += r; s.balls++; if(r===4)s.fours++; if(r===6)s.sixes++;
    b.runs += r; legalBall(m); rotate(m,r); addHistory(m, r===0?"0":String(r));
    checkEnd(m);
  });

  window.scoreWide = () => {
    const extra = prompt("Wide runs (enter total wide runs, minimum 1):", "1");
    const total = Number(extra); if (!Number.isInteger(total) || total < 1) return;
    commit(m => {
      m.score.runs += total; m.bowlingCard[m.bowlerId].runs += total;
      addHistory(m, `Wd${total>1?`+${total-1}`:""}`); // no legal ball
      // Wide with odd number of total runs changes striker.
      rotate(m,total);
      checkEnd(m);
    });
  };

  window.scoreNoBall = () => {
    const bat = prompt("Runs scored off the bat on this no-ball (0-6):","0");
    const r=Number(bat); if(!Number.isInteger(r)||r<0||r>6)return;
    commit(m=>{
      const s=m.battingCard[m.strikerId], b=m.bowlingCard[m.bowlerId];
      m.score.runs += 1+r; b.runs += 1+r;
      s.runs += r; if(r===4)s.fours++; if(r===6)s.sixes++;
      // no-ball is not legal, but a bat run is credited.
      if(r>0) rotate(m,r);
      addHistory(m, `Nb${r?`+${r}`:""}`);
      checkEnd(m);
    });
  };

  async function scoreExtra(kind) {
    const r=prompt(`${kind} runs (minimum 1):`,"1"); const n=Number(r);
    if(!Number.isInteger(n)||n<1)return;
    commit(m=>{
      const b=m.bowlingCard[m.bowlerId];
      m.score.runs += n;
      if(kind==="Bye" || kind==="Leg-bye") { /* not charged to bowler */ }
      else b.runs += n;
      legalBall(m); rotate(m,n); addHistory(m, `${kind==="Leg-bye"?"Lb":"B"}${n}`); checkEnd(m);
    });
  }
  window.scoreBye=()=>scoreExtra("Bye");
  window.scoreLegBye=()=>scoreExtra("Leg-bye");

  window.scoreWicket = () => {
    if (!confirm("Record a wicket? Use the control below to select the new batsman.")) return;
    tab("scoring");
    document.getElementById("dismissalType")?.focus();
  };

  window.confirmWicketAndReplace = () => commit(m=>{
    const s=m.battingCard[m.strikerId], b=m.bowlingCard[m.bowlerId];
    if(!s)return;
    const type=document.getElementById("dismissalType").value;
    const newId=document.getElementById("newBatter").value;
    s.out=true; s.howOut=type; m.score.wickets++; b.wickets++;
    legalBall(m); addHistory(m, `W`);
    if(newId) {
      m.strikerId=newId;
      const np=m.battingCard[newId];
      np.out=false;
    }
    checkEnd(m);
  });

  function checkEnd(m) {
    const totalBatters=Object.keys(m.battingCard||{}).length;
    if(m.score.wickets >= Math.max(1,totalBatters-1) || m.score.balls >= m.oversLimit*6) {
      if(!m.firstInnings) {
        m.firstInnings={
          teamName:m[m.battingTeam]?.name, score:{...m.score},
          battingCard:JSON.parse(JSON.stringify(m.battingCard)),
          bowlingCard:JSON.parse(JSON.stringify(m.bowlingCard))
        };
        m.target=m.score.runs+1;
        m.battingTeam=m.battingTeam==="teamA"?"teamB":"teamA";
        const ap=playersFor(m[m.battingTeam]?.id);
        const bp=playersFor(m[m.battingTeam==="teamA"?"teamB":"teamA"]?.id);
        m.battingCard={}; ap.forEach(p=>m.battingCard[p.id]={name:p.name,runs:0,balls:0,fours:0,sixes:0,out:false,howOut:"not out"});
        m.bowlingCard={}; bp.forEach(p=>m.bowlingCard[p.id]={name:p.name,runs:0,balls:0,wickets:0});
        m.strikerId=ap[0]?.id; m.nonStrikerId=ap[1]?.id; m.bowlerId=bp[0]?.id;
        m.score={runs:0,wickets:0,balls:0}; m.history=[];
        return;
      }
      finishMatch(m);
    }
    if(m.target && m.score.runs >= m.target) finishMatch(m);
  }

  async function finishMatch(m) {
    m.status="completed";
    const id=uid();
    m.completedAt=Date.now();
    await db.ref("matches/"+id).set(m);
    await db.ref("match").set(m);
  }

  window.undoBall = async () => {
    const snap=await db.ref("match").once("value"); const m=snap.val();
    const stack=m?.undoStack||[];
    if(!stack.length) return alert("Nothing to revert.");
    const prev=JSON.parse(stack[stack.length-1]);
    m.battingCard=prev.battingCard; m.bowlingCard=prev.bowlingCard; m.score=prev.score;
    m.strikerId=prev.strikerId; m.nonStrikerId=prev.nonStrikerId; m.bowlerId=prev.bowlerId;
    m.history=prev.history; m.currentOver=prev.currentOver; m.selectedArea=prev.selectedArea;
    m.status=prev.status; m.battingTeam=prev.battingTeam; m.firstInnings=prev.firstInnings; m.target=prev.target;
    m.undoStack=stack.slice(0,-1);
    await db.ref("match").set(m); state.match=m; renderScoring();
  };

  db.ref("match").on("value", snap => { state.match=snap.val(); renderSetup(); if(state.tab==="scoring")renderScoring(); });
  loadTeams(); loadSchedules(); readMatch();
})();
