# CrickScore - Tournament Passkey Edition

No Firebase Authentication is used. Tournament name acts as the login name and a 4-digit number is the password.

Flow:
1. Open admin.html.
2. Create a tournament and 4-digit passkey, or log in to an existing tournament.
3. Correct credentials open index.html.
4. Teams, schedules, scoring, scorecard and points are scoped to that tournament.
5. The session is stored in sessionStorage, so closing the browser/tab requires login again.

Replace the placeholders in assets/firebase-config.js with the Firebase config you already use. Enable Realtime Database. Do not create Firebase Authentication users.

The scoring page includes 0/1/2/3/4/6, wide, no-ball, bye, leg-bye, wicket, ball area, shot type, commentary and revert. This starter version can be extended with full batsman/bowler/wicket-detail workflows.

Security note: this is an application-level passkey gate. For a public production deployment, enforce write access with Firebase Realtime Database Security Rules/backend authorization too.
