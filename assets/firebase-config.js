// 1. Go to https://console.firebase.google.com -> Create project (free)
// 2. Build > Realtime Database -> Create Database -> Start in TEST MODE for now
// 3. Project settings (gear icon) > General > Your apps > Web app (</>) > copy the config below
// 4. Paste your own values here. This file is safe to commit to a PUBLIC GitHub repo
//    as long as you set proper Realtime Database security rules (see README.md).

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
