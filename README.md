# CrickPulse Final

Flow:
1. Website opens on Tournament Name/User ID + 4-digit Password.
2. Login is enabled only when both fields are valid.
3. Create Tournament creates the tournament and opens the dashboard.
4. Reopening/returning requires Tournament Name + Password again.
5. Teams, players, schedules and match data are automatically saved in Firebase.
6. Live scoring supports runs, wides, no-balls, byes, leg-byes, wickets and revert.
7. Wicket details include dismissal, caught-by/fielder and bowler.
8. Scorecard marks the striker with * and shows the non-striker normally.
9. Chasing display shows runs needed and balls remaining.
10. Points table gives 2 points for a win and ranks by NRR.

IMPORTANT:
Keep your existing working assets/firebase-config.js. Replace the placeholder values in this package with your existing Firebase config before deployment.
For production/public use, protect Firebase Realtime Database with proper Security Rules/server-side authorization. The tournament password in this client-side demo is an application gate, not a secure authentication system.
