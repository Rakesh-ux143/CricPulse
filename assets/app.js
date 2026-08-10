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
