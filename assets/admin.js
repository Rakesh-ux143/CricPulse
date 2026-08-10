let currentMatchId = null;
let matchRef = null;
let state = null;

db.ref("currentMatchId").on("value", (snap) => {
  currentMatchId = snap.val();
  if (matchRef) matchRef.off();
  if (!currentMatchId) {
    state = null;
    render();
    return;
  }
  matchRef = db.ref("matches/" + currentMatchId);
  matchRef.on("value", (snap2) => {
    state = snap2.val();
    render();
  });
});

function playersArr(team) {
  if (!state?.[team]?.players) return [];
  return Object.entries(state[team].players).map(([id, p]) => ({ id, ...p }));
}

// ---------- SETUP ----------
function createTeams() {
  const nameA = document.getElementById("teamAName").value.trim() || "Team A";
  const nameB = document.getElementById("teamBName").value.trim() || "Team B";
  const id = newId("match");
  db.ref("matches/" + id).set({
    status: "setup",
    createdAt: Date.now(),
    teamA: { name: nameA, players: {} },
    teamB: { name: nameB, players: {} },
  });
  db.ref("currentMatchId").set(id);
}

function addPlayer(team) {
  const input = document.getElementById(team + "PlayerInput");
  const name = input.value.trim();
  if (!name) return;
  const id = newId("p");
  matchRef.child(`${team}/players/${id}`).set({ name });
  input.value = "";
}

function removePlayer(team, id) {
  matchRef.child(`${team}/players/${id}`).remove();
}

// ---------- TOSS / START ----------
function startInnings() {
  const battingTeam = document.getElementById("battingSelect").value;
  const bowlingTeam = battingTeam === "teamA" ? "teamB" : "teamA";
  const strikerId = document.getElementById("strikerSelect").value;
  const nonStrikerId = document.getElementById("nonStrikerSelect").value;
  const bowlerId = document.getElementById("bowlerSelect").value;
  if (!strikerId || !nonStrikerId || !bowlerId || strikerId === nonStrikerId) {
    alert("Pick two different openers and a bowler.");
    return;
  }
  const battingCard = {};
  playersArr(battingTeam).forEach((p) => {
    battingCard[p.id] = { name: p.name, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, howOut: "" };
  });
  const bowlingCard = {};
  playersArr(bowlingTeam).forEach((p) => {
    bowlingCard[p.id] = { name: p.name, balls: 0, runs: 0, wickets: 0 };
  });

  const updates = {
    status: "live",
    innings: state.innings ? state.innings + 1 : 1,
    battingTeam,
    bowlingTeam,
    strikerId,
    nonStrikerId,
    bowlerId,
    score: { runs: 0, wickets: 0, balls: 0 },
    battingCard,
    bowlingCard,
    target: state.innings === 1 ? (state.score.runs + 1) : (state.target || null),
    history: state.history || [],
  };
  // snapshot innings 1 so the completed match keeps a full two-innings summary
  if (state.innings === 1) {
    updates.firstInnings = {
      teamKey: state.battingTeam,
      teamName: state[state.battingTeam].name,
      score: state.score,
      battingCard: state.battingCard,
      bowlingCard: state.bowlingCard,
    };
  }
  matchRef.update(updates);
}

// ---------- SCORING ----------
function logBall(text) {
  const h = state.history ? [...state.history] : [];
  h.push(`${formatOvers(state.score.balls)} — ${text}`);
  return h.slice(-60); // keep last 60 events
}

function addRuns(runs) {
  const s = state.score;
  const bc = { ...state.battingCard };
  const wc = { ...state.bowlingCard };
  const striker = bc[state.strikerId];
  const bowler = wc[state.bowlerId];

  striker.runs += runs;
  striker.balls += 1;
  if (runs === 4) striker.fours += 1;
  if (runs === 6) striker.sixes += 1;
  bowler.balls += 1;
  bowler.runs += runs;

  const newBalls = s.balls + 1;
  const updates = {
    score: { runs: s.runs + runs, wickets: s.wickets, balls: newBalls },
    battingCard: bc,
    bowlingCard: wc,
    history: logBall(`${runs} run${runs === 1 ? "" : "s"}`),
  };

  let strikerId = state.strikerId;
  let nonStrikerId = state.nonStrikerId;
  if (runs % 2 === 1) [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
  if (newBalls % 6 === 0) {
    [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
    updates.needNewBowler = true;
  }
  updates.strikerId = strikerId;
  updates.nonStrikerId = nonStrikerId;

  matchRef.update(updates);
}

function addExtra(type) {
  const s = state.score;
  const wc = { ...state.bowlingCard };
  const bowler = wc[state.bowlerId];
  const isLegal = type === "bye" || type === "legbye";
  const runs = 1;

  bowler.runs += type === "wide" || type === "noball" ? runs : 0;
  if (isLegal) bowler.balls += 1;

  const newBalls = isLegal ? s.balls + 1 : s.balls;
  const updates = {
    score: { runs: s.runs + runs, wickets: s.wickets, balls: newBalls },
    bowlingCard: wc,
    history: logBall(type),
  };
  if (isLegal && newBalls % 6 === 0) {
    updates.strikerId = state.nonStrikerId;
    updates.nonStrikerId = state.strikerId;
    updates.needNewBowler = true;
  }
  matchRef.update(updates);
}

function addWicket() {
  const bc = { ...state.battingCard };
  const wc = { ...state.bowlingCard };
  bc[state.strikerId].out = true;
  bc[state.strikerId].howOut = `b. ${wc[state.bowlerId].name}`;
  bc[state.strikerId].balls += 1;
  wc[state.bowlerId].balls += 1;
  wc[state.bowlerId].wickets += 1;

  const s = state.score;
  const newBalls = s.balls + 1;
  matchRef.update({
    score: { runs: s.runs, wickets: s.wickets + 1, balls: newBalls },
    battingCard: bc,
    bowlingCard: wc,
    history: logBall("WICKET"),
    needNewBatsman: true,
    needNewBowler: newBalls % 6 === 0,
    strikerId: null,
  });
}

function selectNewBatsman() {
  const id = document.getElementById("newBatsmanSelect").value;
  if (!id) return;
  matchRef.update({ strikerId: id, needNewBatsman: false });
}

function selectNewBowler() {
  const id = document.getElementById("newBowlerSelect").value;
  if (!id) return;
  const wc = { ...state.bowlingCard };
  if (!wc[id]) wc[id] = { name: playersArr(state.bowlingTeam).find((p) => p.id === id)?.name, balls: 0, runs: 0, wickets: 0 };
  matchRef.update({ bowlerId: id, bowlingCard: wc, needNewBowler: false });
}

function endInnings() {
  matchRef.update({ status: state.innings === 1 ? "innings_break" : "completed" });
}

function newMatch() {
  if (!confirm("Start a new match? This one will be saved to match history.")) return;
  if (state && state.status !== "completed") {
    matchRef.update({ status: "abandoned" });
  }
  db.ref("currentMatchId").set(null);
}

function deleteMatchForever() {
  if (!confirm("Permanently delete this match? This cannot be undone.")) return;
  matchRef.remove();
  db.ref("currentMatchId").set(null);
}

// ---------- RENDER ----------
function render() {
  const el = document.getElementById("adminRoot");
  if (!state || state.status === undefined) {
    el.innerHTML = setupHTML();
    return;
  }
  if (state.status === "setup") {
    el.innerHTML = setupHTML() + tossHTML();
    return;
  }
  if (state.status === "innings_break") {
    el.innerHTML = `<div class="panel"><h2>Innings Break</h2><p class="muted">First innings: ${state.score.runs}/${state.score.wickets}. Target for chase: ${state.score.runs + 1}.</p>${tossHTML(true)}</div>`;
    return;
  }
  if (state.status === "completed") {
    el.innerHTML = `<div class="panel"><h2>Match Completed</h2><p>${matchResultText(state)}</p><div class="btn-row"><a class="btn secondary" href="scorecard.html?id=${currentMatchId}">View Summary</a><button class="btn gold" onclick="newMatch()">Start New Match</button></div></div>`;
    return;
  }
  el.innerHTML = liveHTML();
}

function setupHTML() {
  const a = playersArr("teamA");
  const b = playersArr("teamB");
  if (!state) {
    return `<div class="panel"><h2>1. Create Teams</h2>
      <label>Team A name</label><input id="teamAName" placeholder="e.g. Mumbai Kings" />
      <label>Team B name</label><input id="teamBName" placeholder="e.g. Chennai Warriors" />
      <div class="btn-row"><button class="btn" onclick="createTeams()">Create Teams</button></div></div>`;
  }
  return `<div class="panel"><h2>Squad — ${state.teamA.name}</h2>
      <div class="btn-row"><input id="teamAPlayerInput" placeholder="Player name" style="flex:1;" /><button class="btn secondary" onclick="addPlayer('teamA')">Add</button></div>
      ${a.map((p) => `<span class="tag" style="margin:3px;">${p.name} <a href="#" onclick="removePlayer('teamA','${p.id}');return false;" style="color:var(--red);">✕</a></span>`).join("")}
    </div>
    <div class="panel"><h2>Squad — ${state.teamB.name}</h2>
      <div class="btn-row"><input id="teamBPlayerInput" placeholder="Player name" style="flex:1;" /><button class="btn secondary" onclick="addPlayer('teamB')">Add</button></div>
      ${b.map((p) => `<span class="tag" style="margin:3px;">${p.name} <a href="#" onclick="removePlayer('teamB','${p.id}');return false;" style="color:var(--red);">✕</a></span>`).join("")}
    </div>`;
}

function tossHTML(chase) {
  const a = playersArr("teamA");
  const b = playersArr("teamB");
  const opt = (arr) => arr.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
  return `<div class="panel"><h2>${chase ? "Start 2nd Innings" : "2. Start Match"}</h2>
    <label>Batting team</label>
    <select id="battingSelect" onchange="fillPlayerSelects()">
      <option value="teamA">${state.teamA.name}</option>
      <option value="teamB">${state.teamB.name}</option>
    </select>
    <label>Striker</label><select id="strikerSelect"></select>
    <label>Non-striker</label><select id="nonStrikerSelect"></select>
    <label>Opening bowler</label><select id="bowlerSelect"></select>
    <div class="btn-row"><button class="btn" onclick="startInnings()">Start Innings</button></div>
  </div>
  <script>fillPlayerSelects()</script>`;
}

function fillPlayerSelects() {
  setTimeout(() => {
    const battingTeam = document.getElementById("battingSelect")?.value || "teamA";
    const bowlingTeam = battingTeam === "teamA" ? "teamB" : "teamA";
    const batOpts = playersArr(battingTeam).map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
    const bowlOpts = playersArr(bowlingTeam).map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
    if (document.getElementById("strikerSelect")) document.getElementById("strikerSelect").innerHTML = batOpts;
    if (document.getElementById("nonStrikerSelect")) document.getElementById("nonStrikerSelect").innerHTML = batOpts;
    if (document.getElementById("bowlerSelect")) document.getElementById("bowlerSelect").innerHTML = bowlOpts;
  }, 0);
}

function liveHTML() {
  const battingTeam = state.battingTeam;
  const bowlingTeam = state.bowlingTeam;
  const striker = state.battingCard?.[state.strikerId];
  const nonStriker = state.battingCard?.[state.nonStrikerId];
  const bowler = state.bowlingCard?.[state.bowlerId];

  if (state.needNewBatsman) {
    const bench = playersArr(battingTeam).filter((p) => !state.battingCard[p.id]?.out && p.id !== state.nonStrikerId);
    return `<div class="panel"><h2>Wicket! Select next batsman</h2>
      <select id="newBatsmanSelect">${bench.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}</select>
      <div class="btn-row"><button class="btn" onclick="selectNewBatsman()">Confirm</button></div></div>`;
  }
  if (state.needNewBowler) {
    const options = playersArr(bowlingTeam).filter((p) => p.id !== state.bowlerId);
    return `<div class="panel"><h2>Over complete — select next bowler</h2>
      <select id="newBowlerSelect">${options.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}</select>
      <div class="btn-row"><button class="btn" onclick="selectNewBowler()">Confirm</button></div></div>`;
  }

  return `
  <div class="panel scoreboard">
    <span class="tag live"><span class="live-dot"></span>LIVE — Innings ${state.innings}</span>
    <div class="team-names">${state[battingTeam].name}</div>
    <div class="score-big mono">${state.score.runs}/${state.score.wickets}</div>
    <div class="overs">Overs ${formatOvers(state.score.balls)} ${state.target ? `· Target ${state.target}` : ""}</div>
  </div>
  <div class="panel">
    <div class="grid-2">
      <div class="card"><div class="muted">${striker?.name || "-"} *</div><div class="mono">${striker?.runs ?? 0} (${striker?.balls ?? 0})</div></div>
      <div class="card"><div class="muted">${nonStriker?.name || "-"}</div><div class="mono">${nonStriker?.runs ?? 0} (${nonStriker?.balls ?? 0})</div></div>
    </div>
    <div class="card" style="margin-top:10px;"><div class="muted">Bowler: ${bowler?.name || "-"}</div><div class="mono">${bowler?.wickets ?? 0}-${bowler?.runs ?? 0} (${formatOvers(bowler?.balls ?? 0)} ov)</div></div>
  </div>
  <div class="panel">
    <h3 style="margin:0 0 8px;">Score Ball</h3>
    <div class="btn-row">
      <button class="btn secondary" onclick="addRuns(0)">0</button>
      <button class="btn secondary" onclick="addRuns(1)">1</button>
      <button class="btn secondary" onclick="addRuns(2)">2</button>
      <button class="btn secondary" onclick="addRuns(3)">3</button>
      <button class="btn gold" onclick="addRuns(4)">4</button>
      <button class="btn gold" onclick="addRuns(6)">6</button>
    </div>
    <div class="btn-row">
      <button class="btn secondary" onclick="addExtra('wide')">Wide</button>
      <button class="btn secondary" onclick="addExtra('noball')">No Ball</button>
      <button class="btn secondary" onclick="addExtra('bye')">Bye</button>
      <button class="btn secondary" onclick="addExtra('legbye')">Leg Bye</button>
      <button class="btn danger" onclick="addWicket()">Wicket</button>
    </div>
    <div class="btn-row">
      <button class="btn secondary" onclick="endInnings()">End Innings</button>
      <button class="btn danger" onclick="newMatch()">Start New Match</button>
    </div>
    <a href="#" onclick="deleteMatchForever();return false;" class="muted" style="font-size:12px;">Delete this match permanently</a>
  </div>
  <div class="panel"><h3 style="margin:0 0 8px;">Ball Log</h3>
    <div class="muted mono" style="max-height:160px;overflow-y:auto;">${(state.history || []).slice().reverse().map((h) => `<div>${h}</div>`).join("")}</div>
  </div>`;
}
