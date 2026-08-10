const CRICPULSE_SESSION = "cricpulseTournament";
function getTournamentSession() {
  try { return JSON.parse(sessionStorage.getItem(CRICPULSE_SESSION) || "null"); }
  catch { sessionStorage.removeItem(CRICPULSE_SESSION); return null; }
}
function setTournamentSession(t) {
  sessionStorage.setItem(CRICPULSE_SESSION, JSON.stringify({
    id: t.id, name: t.name, loginAt: Date.now()
  }));
}
function clearTournamentSession() { sessionStorage.removeItem(CRICPULSE_SESSION); }
function requireTournamentLogin() {
  if (!getTournamentSession()) {
    window.location.replace("admin.html");
    return false;
  }
  return true;
}
function logoutTournament() {
  clearTournamentSession();
  window.location.replace("admin.html");
}
function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
