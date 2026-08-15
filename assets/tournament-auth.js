const CRICPULSE_SESSION = "cricpulseTournament";
function getTournamentSession() {

    const data =
        sessionStorage.getItem("crickpulseTournament");

    if (!data) {
        return null;
    }

    try {
        return JSON.parse(data);
    } catch (error) {
        sessionStorage.removeItem(
            "crickpulseTournament"
        );

        return null;
    }
}


function requireTournament() {

    const tournament =
        getTournamentSession();

    if (!tournament) {

        window.location.replace("admin.html");

        return null;
    }

    return tournament;
}


function logoutTournament() {

    sessionStorage.removeItem(
        "crickpulseTournament"
    );

    window.location.replace("admin.html");
}
function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
function requireTournamentLogin() {
  return requireTournament();
}
