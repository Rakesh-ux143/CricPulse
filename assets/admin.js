"use strict";

/*
=========================================================
CRICKSCORE TOURNAMENT ADMIN
NO FIREBASE AUTHENTICATION REQUIRED

Tournament Name = Username
4 Digit Password = Password

Everything is stored under:

tournaments/
    tournamentId/
        name
        password
        teams
        schedules
        matches
        pointsTable
=========================================================
*/


// -------------------------------------------------------
// GLOBAL VARIABLES
// -------------------------------------------------------

let currentTournament = null;
let currentTournamentId = null;


// -------------------------------------------------------
// SHORTCUT
// -------------------------------------------------------

function $(id) {
    return document.getElementById(id);
}


// -------------------------------------------------------
// GENERATE UNIQUE ID
// -------------------------------------------------------

function generateId() {

    return Date.now().toString(36) +
           Math.random().toString(36).substring(2, 8);

}


// -------------------------------------------------------
// CLEAN TEXT
// -------------------------------------------------------

function cleanText(value) {

    return String(value || "").trim();

}


// -------------------------------------------------------
// FIREBASE CHECK
// -------------------------------------------------------

if (
    typeof firebase === "undefined" ||
    typeof db === "undefined"
) {

    alert(
        "Firebase is not initialized. Please check firebase-config.js"
    );

}


// -------------------------------------------------------
// PAGE LOAD
// -------------------------------------------------------

document.addEventListener("DOMContentLoaded", function () {

    setupLogin();

    setupCreateTournament();

});


// =======================================================
// LOGIN
// =======================================================

function setupLogin() {

    $("loginForm").addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const tournamentName =
                cleanText($("loginTournament").value);

            const password =
                cleanText($("loginPassword").value);


            // -------------------------------
            // VALIDATION
            // -------------------------------

            if (!tournamentName) {

                showLoginMessage(
                    "Enter tournament name.",
                    true
                );

                return;

            }


            if (!/^\d{4}$/.test(password)) {

                showLoginMessage(
                    "Password must contain exactly 4 numbers.",
                    true
                );

                return;

            }


            try {

                const snapshot =
                    await db
                    .ref("tournaments")
                    .once("value");


                const tournaments =
                    snapshot.val() || {};


                let foundTournament = null;
                let foundId = null;


                // --------------------------------
                // FIND TOURNAMENT
                // --------------------------------

                Object.keys(tournaments).forEach(function (id) {

                    const tournament =
                        tournaments[id];

                    if (
                        tournament &&
                        tournament.name &&
                        tournament.name.toLowerCase() ===
                        tournamentName.toLowerCase()
                    ) {

                        foundTournament =
                            tournament;

                        foundId = id;

                    }

                });


                if (!foundTournament) {

                    showLoginMessage(
                        "Tournament not found.",
                        true
                    );

                    return;

                }


                // --------------------------------
                // CHECK PASSWORD
                // --------------------------------

                if (
                    String(foundTournament.password) !==
                    String(password)
                ) {

                    showLoginMessage(
                        "Incorrect tournament password.",
                        true
                    );

                    return;

                }


                // --------------------------------
                // LOGIN SUCCESS
                // --------------------------------

                currentTournament =
                    foundTournament;

                currentTournamentId =
                    foundId;


                // Save session
                sessionStorage.setItem(
                    "crickscoreTournamentId",
                    foundId
                );


                showAdminPanel();


            }

            catch (error) {

                console.error(error);

                showLoginMessage(
                    "Unable to connect to Firebase.",
                    true
                );

            }

        }
    );

}


// =======================================================
// CREATE TOURNAMENT
// =======================================================

function setupCreateTournament() {

    $("createTournamentForm").addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const name =
                cleanText($("newTournamentName").value);

            const password =
                cleanText($("newTournamentPassword").value);


            // --------------------------------
            // VALIDATION
            // --------------------------------

            if (!name) {

                showCreateMessage(
                    "Enter tournament name.",
                    true
                );

                return;

            }


            if (!/^\d{4}$/.test(password)) {

                showCreateMessage(
                    "Password must be exactly 4 numbers.",
                    true
                );

                return;

            }


            try {

                // --------------------------------
                // CHECK DUPLICATE TOURNAMENT
                // --------------------------------

                const snapshot =
                    await db
                    .ref("tournaments")
                    .once("value");


                const tournaments =
                    snapshot.val() || {};


                const duplicate =
                    Object.values(tournaments)
                    .some(function (tournament) {

                        return (
                            tournament &&
                            tournament.name &&
                            tournament.name.toLowerCase() ===
                            name.toLowerCase()
                        );

                    });


                if (duplicate) {

                    showCreateMessage(
                        "This tournament already exists.",
                        true
                    );

                    return;

                }


                // --------------------------------
                // CREATE ID
                // --------------------------------

                const id =
                    generateId();


                // --------------------------------
                // TOURNAMENT OBJECT
                // --------------------------------

                const tournament = {

                    id: id,

                    name: name,

                    password: password,

                    createdAt:
                        new Date().toISOString(),

                    teams: {},

                    schedules: {},

                    matches: {},

                    pointsTable: {}

                };


                // --------------------------------
                // SAVE
                // --------------------------------

                await db
                    .ref("tournaments/" + id)
                    .set(tournament);


                // --------------------------------
                // LOGIN CREATOR AUTOMATICALLY
                // --------------------------------

                currentTournament =
                    tournament;

                currentTournamentId =
                    id;


                sessionStorage.setItem(
                    "crickscoreTournamentId",
                    id
                );


                showAdminPanel();


                alert(
                    "Tournament created successfully!\n\n" +
                    "Tournament: " + name + "\n" +
                    "Password: " + password
                );

            }

            catch (error) {

                console.error(error);

                showCreateMessage(
                    "Could not create tournament.",
                    true
                );

            }

        }
    );

}


// =======================================================
// SHOW ADMIN
// =======================================================

function showAdminPanel() {

    $("loginPage").style.display =
        "none";

    $("createTournamentPage").style.display =
        "none";

    $("adminPage").style.display =
        "block";


    $("currentTournamentName").textContent =
        currentTournament.name;


    loadTeams();

}


// =======================================================
// SHOW LOGIN
// =======================================================

function showLogin() {

    $("loginPage").style.display =
        "flex";

    $("createTournamentPage").style.display =
        "none";

    $("adminPage").style.display =
        "none";


    $("loginTournament").value = "";

    $("loginPassword").value = "";

    $("loginMessage").textContent = "";

}


// Make available to HTML
window.showLogin = showLogin;


// =======================================================
// SHOW CREATE TOURNAMENT
// =======================================================

function showCreateTournament() {

    $("loginPage").style.display =
        "none";

    $("createTournamentPage").style.display =
        "flex";

    $("adminPage").style.display =
        "none";

}

window.showCreateTournament =
    showCreateTournament;


// =======================================================
// LOGIN MESSAGE
// =======================================================

function showLoginMessage(
    message,
    error = false
) {

    $("loginMessage").textContent =
        message;

    $("loginMessage").className =
        error ? "error" : "success";

}


// =======================================================
// CREATE MESSAGE
// =======================================================

function showCreateMessage(
    message,
    error = false
) {

    $("createMessage").textContent =
        message;

    $("createMessage").className =
        error ? "error" : "success";

}


// =======================================================
// LOGOUT / LOCK
// =======================================================

function logoutTournament() {

    currentTournament =
        null;

    currentTournamentId =
        null;


    sessionStorage.removeItem(
        "crickscoreTournamentId"
    );


    showLogin();

}

window.logoutTournament =
    logoutTournament;


// =======================================================
// ADD TEAM
// =======================================================

$("teamForm").addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        if (!currentTournamentId) {

            alert(
                "Please login to a tournament first."
            );

            return;

        }


        const teamName =
            cleanText($("teamName").value);

        const shortName =
            cleanText($("teamShort").value)
            .toUpperCase();


        if (!teamName) {

            alert(
                "Enter team name."
            );

            return;

        }


        try {

            // --------------------------------
            // GET EXISTING TEAMS
            // --------------------------------

            const snapshot =
                await db
                .ref(
                    "tournaments/" +
                    currentTournamentId +
                    "/teams"
                )
                .once("value");


            const teams =
                snapshot.val() || {};


            // --------------------------------
            // TEAM NUMBER
            // --------------------------------

            const teamNumber =
                Object.keys(teams).length + 1;


            const teamId =
                generateId();


            // --------------------------------
            // TEAM OBJECT
            // --------------------------------

            const team = {

                id: teamId,

                number: teamNumber,

                label:
                    "Team " +
                    teamNumber,

                name:
                    teamName,

                shortName:
                    shortName,

                players: {},

                createdAt:
                    new Date().toISOString()

            };


            // --------------------------------
            // SAVE TEAM
            // --------------------------------

            await db
                .ref(
                    "tournaments/" +
                    currentTournamentId +
                    "/teams/" +
                    teamId
                )
                .set(team);


            // --------------------------------
            // CLEAR FORM
            // --------------------------------

            $("teamName").value = "";

            $("teamShort").value = "";


            alert(
                "Team " +
                teamNumber +
                " saved successfully."
            );


            loadTeams();

        }

        catch (error) {

            console.error(error);

            alert(
                "Unable to save team."
            );

        }

    }
);


// =======================================================
// LOAD TEAMS
// =======================================================

async function loadTeams() {

    if (!currentTournamentId) {
        return;
    }


    try {

        const snapshot =
            await db
            .ref(
                "tournaments/" +
                currentTournamentId +
                "/teams"
            )
            .once("value");


        const teams =
            snapshot.val() || {};


        renderTeams(teams);

    }

    catch (error) {

        console.error(error);

    }

}


// =======================================================
// DISPLAY TEAMS
// =======================================================

function renderTeams(teams) {

    const container =
        $("teamsList");


    container.innerHTML = "";


    const teamEntries =
        Object.entries(teams);


    if (teamEntries.length === 0) {

        container.innerHTML =
            "<p>No teams added yet.</p>";

        return;

    }


    teamEntries
    .sort(function (a, b) {

        return (
            Number(a[1].number || 0) -
            Number(b[1].number || 0)
        );

    })
    .forEach(function ([id, team]) {


        const div =
            document.createElement("div");


        div.className =
            "team-item";


        div.innerHTML = `

            <h3>
                ${team.label}
                -
                ${team.name}
            </h3>

            <p>
                Short Name:
                ${team.shortName || "-"}
            </p>

            <p>
                Players:
                ${Object.keys(team.players || {}).length}
            </p>

            <button
                class="admin-btn"
                onclick="editTeam('${id}')"
            >
                EDIT
            </button>

            <button
                class="admin-btn danger"
                onclick="deleteTeam('${id}')"
            >
                DELETE
            </button>

        `;


        container.appendChild(div);

    });

}


// =======================================================
// DELETE TEAM
// =======================================================

async function deleteTeam(teamId) {

    if (!currentTournamentId) {
        return;
    }


    const confirmDelete =
        confirm(
            "Are you sure you want to delete this team?"
        );


    if (!confirmDelete) {
        return;
    }


    try {

        await db
            .ref(
                "tournaments/" +
                currentTournamentId +
                "/teams/" +
                teamId
            )
            .remove();


        loadTeams();

    }

    catch (error) {

        console.error(error);

        alert(
            "Unable to delete team."
        );

    }

}

window.deleteTeam =
    deleteTeam;


// =======================================================
// EDIT TEAM
// =======================================================

async function editTeam(teamId) {

    if (!currentTournamentId) {
        return;
    }


    const snapshot =
        await db
        .ref(
            "tournaments/" +
            currentTournamentId +
            "/teams/" +
            teamId
        )
        .once("value");


    const team =
        snapshot.val();


    if (!team) {

        alert(
            "Team not found."
        );

        return;

    }


    const newName =
        prompt(
            "Enter new team name:",
            team.name
        );


    if (
        newName === null ||
        !cleanText(newName)
    ) {

        return;

    }


    const newShort =
        prompt(
            "Enter short name:",
            team.shortName || ""
        );


    try {

        await db
            .ref(
                "tournaments/" +
                currentTournamentId +
                "/teams/" +
                teamId
            )
            .update({

                name:
                    cleanText(newName),

                shortName:
                    cleanText(newShort)
                    .toUpperCase(),

                updatedAt:
                    new Date().toISOString()

            });


        loadTeams();

    }

    catch (error) {

        console.error(error);

        alert(
            "Unable to update team."
        );

    }

}

window.editTeam =
    editTeam;


// =======================================================
// AUTO LOGIN FROM SESSION
// =======================================================

async function restoreSession() {

    const tournamentId =
        sessionStorage.getItem(
            "crickscoreTournamentId"
        );


    if (!tournamentId) {
        return;
    }


    try {

        const snapshot =
            await db
            .ref(
                "tournaments/" +
                tournamentId
            )
            .once("value");


        const tournament =
            snapshot.val();


        if (!tournament) {

            sessionStorage.removeItem(
                "crickscoreTournamentId"
            );

            return;

        }


        currentTournament =
            tournament;

        currentTournamentId =
            tournamentId;


        showAdminPanel();

    }

    catch (error) {

        console.error(error);

    }

}


restoreSession();
