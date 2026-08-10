// Shared helpers

function formatOvers(balls) {
  const o = Math.floor(balls / 6);
  const b = balls % 6;
  return `${o}.${b}`;
}

function newId(prefix) {
  return prefix + "_" + Math.random().toString(36).slice(2, 9);
}

function renderNav(active) {
  const items = [
    ["index.html", "Home"],
    ["admin.html", "Admin Panel"],
    ["matches.html", "Matches"],
    ["live-score.html", "Live Match"],
    ["scorecard.html", "Scorecard"],
    ["teams.html", "Teams"],
    ["players.html", "Players"],
  ];
  const nav = document.createElement("div");
  nav.className = "nav";
  nav.innerHTML =
    `<span class="brand">🏏 SCORER</span>` +
    items
      .map(
        ([href, label]) =>
          `<a href="${href}" class="${active === href ? "active" : ""}">${label}</a>`
      )
      .join("");
  document.body.prepend(nav);
}

function strikeRate(runs, balls) {
  if (!balls) return "0.0";
  return ((runs / balls) * 100).toFixed(1);
}

function economy(runs, balls) {
  if (!balls) return "0.00";
  return (runs / (balls / 6)).toFixed(2);
}

// Watches whichever match is currently active (live/setup) and calls
// callback(matchData, matchId) whenever it changes. callback(null, null) if none.
function watchCurrentMatch(callback) {
  let liveMatchRef = null;
  db.ref("currentMatchId").on("value", (snap) => {
    const id = snap.val();
    if (liveMatchRef) liveMatchRef.off();
    if (!id) {
      callback(null, null);
      return;
    }
    liveMatchRef = db.ref("matches/" + id);
    liveMatchRef.on("value", (snap2) => callback(snap2.val(), id));
  });
}

// Human-readable result line for a match object (works for live or completed)
function matchResultText(m) {
  if (!m) return "";
  if (m.status === "abandoned") return "Match abandoned";
  if (!m.firstInnings) {
    const name = m[m.battingTeam]?.name || "Batting team";
    return `${name} ${m.score?.runs ?? 0}/${m.score?.wickets ?? 0}`;
  }
  const first = m.firstInnings;
  const secondTeamName = m[m.battingTeam]?.name || "Chasing team";
  const second = m.score;
  if (m.status !== "completed") {
    return `${secondTeamName} need ${Math.max((m.target || 0) - second.runs, 0)} more runs`;
  }
  if (second.runs >= (m.target || Infinity)) {
    const wicketsLeft = 10 - second.wickets;
    return `${secondTeamName} won by ${wicketsLeft} wicket${wicketsLeft === 1 ? "" : "s"}`;
  }
  if (second.runs === (m.target || 0) - 1) {
    return "Match tied";
  }
  const margin = (m.target || 0) - 1 - second.runs;
  return `${first.teamName} won by ${margin} run${margin === 1 ? "" : "s"}`;
}
